const TRACKER_HOSTS = new Set(['proclubstracker.com', 'www.proclubstracker.com']);
const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function normalizeTrackerUrl(url) {
  let parsed;
  try { parsed = new URL(String(url || '').trim()); } catch {
    throw Object.assign(new Error('Link ProClubTracker non valido.'), { code: 'TRACKER_URL_INVALID' });
  }
  if (parsed.protocol !== 'https:' || !TRACKER_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw Object.assign(new Error('Usa un link HTTPS della pagina club di proclubstracker.com.'), { code: 'TRACKER_HOST_NOT_ALLOWED' });
  }
  const match = parsed.pathname.match(/^\/club\/(\d+)\/?$/i);
  if (!match) {
    throw Object.assign(new Error('Il link deve essere quello di un club, ad esempio https://proclubstracker.com/club/328794?platform=common-gen5&div=4'), { code: 'TRACKER_CLUB_URL_REQUIRED' });
  }
  parsed.hash = '';
  return { parsed, clubId: match[1] };
}

function safeJson(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function finiteNonNegativeInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function extractJson(text) {
  const source = normalizeText(text)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const value = JSON.parse(source);
    return value && typeof value === 'object' ? value : null;
  } catch {}
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const value = JSON.parse(source.slice(start, end + 1));
      return value && typeof value === 'object' ? value : null;
    } catch {}
  }
  return null;
}

function normalizeTotals(value) {
  const input = value && typeof value === 'object' ? value : {};
  const totals = {
    matches: finiteNonNegativeInteger(input.matches ?? input.gamesPlayed ?? input.games),
    wins: finiteNonNegativeInteger(input.wins),
    draws: finiteNonNegativeInteger(input.draws ?? input.ties),
    losses: finiteNonNegativeInteger(input.losses),
    goals: finiteNonNegativeInteger(input.goals ?? input.goalsScored ?? input.gf),
    against: finiteNonNegativeInteger(input.against ?? input.goalsAgainst ?? input.goalsConceded ?? input.ga)
  };
  return totals;
}

function validateTotals(stats) {
  const totals = normalizeTotals(stats);
  const required = ['matches', 'wins', 'draws', 'losses', 'goals', 'against'];
  const missing = required.filter(k => totals[k] == null);
  if (missing.length) return { ok: false, reason: `Dati mancanti: ${missing.join(', ')}` };
  if (totals.wins + totals.draws + totals.losses !== totals.matches) {
    return { ok: false, reason: 'Vittorie + pareggi + sconfitte non coincidono con le partite.' };
  }
  return { ok: true, totals };
}

function hasSuccessfulUrlRetrieval(data, submittedUrl, clubId) {
  const metadata = data?.candidates?.[0]?.url_context_metadata?.url_metadata;
  if (!Array.isArray(metadata) || !metadata.length) return false;
  return metadata.some(item => {
    if (String(item?.url_retrieval_status || '').toUpperCase() !== 'URL_RETRIEVAL_STATUS_SUCCESS') return false;
    try {
      const retrieved = new URL(String(item.retrieved_url || ''));
      if (!TRACKER_HOSTS.has(retrieved.hostname.toLowerCase())) return false;
      const match = retrieved.pathname.match(/^\/club\/(\d+)\/?$/i);
      return Boolean(match && match[1] === clubId);
    } catch {
      return false;
    }
  });
}

async function askGeminiToReadTracker(apiKey, url, clubId) {
  const prompt = [
    'Sei il lettore dati ufficiale del sito Sisal FC 2021.',
    'Devi leggere ESCLUSIVAMENTE la pagina Pro Clubs Tracker indicata nell’URL fornito tramite lo strumento URL Context di Gemini.',
    'NON usare la tua memoria, conoscenza generale, altre pagine, ricerca web o supposizioni per inventare numeri.',
    '',
    `URL DA LEGGERE: ${url}`,
    `CLUB ID ATTESO: ${clubId}`,
    '',
    'OBIETTIVO:',
    'estrarre il record TOTALE STORICO del club dalla pagina, non le ultime partite, non la forma recente, non il record di una singola divisione, non il record di un singolo giocatore.',
    'Usa la sezione del club che rappresenta l’overall record/Club Overview del club.',
    '',
    'ESTRAI ESATTAMENTE:',
    'matches = partite totali / games played',
    'wins = vittorie totali',
    'draws = pareggi totali',
    'losses = sconfitte totali',
    'goals = gol segnati totali / goals scored',
    'against = gol subiti totali / goals against / goals conceded',
    '',
    'CONTROLLO OBBLIGATORIO:',
    'wins + draws + losses DEVE essere uguale a matches.',
    'Se trovi valori appartenenti a sezioni diverse o più record possibili e non puoi identificare con certezza il totale storico del club, restituisci ok=false.',
    'Non calcolare il totale sommando dati dei giocatori.',
    'Non usare le ultime 5 partite per sostituire il totale storico.',
    '',
    'RISPONDI SOLO CON JSON VALIDO, SENZA MARKDOWN:',
    JSON.stringify({
      ok: true,
      clubId: '...',
      clubName: '...',
      totals: { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, against: 0 },
      sourceSection: 'Club Overview',
      evidence: 'Breve descrizione della sezione/etichette lette',
      warnings: []
    })
  ].join('\n');

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ url_context: {} }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 900
      }
    })
  });
  const raw = await response.text();
  const data = safeJson(raw);
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
    error.code = 'TRACKER_GEMINI_ERROR';
    error.status = response.status;
    throw error;
  }
  if (!hasSuccessfulUrlRetrieval(data, url, clubId)) {
    throw Object.assign(
      new Error('Gemini non ha confermato di aver letto con successo la pagina ProClubTracker indicata. Per sicurezza non salvo nessun totale.'),
      { code: 'TRACKER_URL_NOT_RETRIEVED' }
    );
  }
  const text = data?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('').trim();
  const result = extractJson(text);
  if (!result) {
    throw Object.assign(new Error('Gemini ha letto la pagina ma non ha restituito un risultato strutturato verificabile.'), { code: 'TRACKER_AI_INVALID_JSON' });
  }
  return { result, retrievalMetadata: data.candidates[0].url_context_metadata, model: GEMINI_MODEL };
}

async function importTrackerTotals(url) {
  const { parsed, clubId } = normalizeTrackerUrl(url);
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY non configurata su Vercel.'), { code: 'GEMINI_NOT_CONFIGURED' });

  const { result, retrievalMetadata, model } = await askGeminiToReadTracker(apiKey, parsed.href, clubId);
  if (String(result.clubId ?? clubId) !== String(clubId)) {
    throw Object.assign(new Error(`Gemini ha identificato un club diverso: atteso ${clubId}.`), { code: 'TRACKER_CLUB_ID_MISMATCH' });
  }
  if (result.ok === false) {
    throw Object.assign(new Error(result.reason || 'Gemini non ha identificato con certezza il totale storico del club.'), { code: 'TRACKER_AI_UNCERTAIN' });
  }
  const check = validateTotals(result.totals);
  if (!check.ok) throw Object.assign(new Error(`Gemini ha restituito dati non coerenti: ${check.reason}`), { code: 'TRACKER_TOTALS_INVALID' });

  const totals = check.totals;
  return {
    source: 'proclubtracker-ai',
    url: parsed.href,
    clubId,
    clubName: normalizeText(result.clubName) || null,
    importedAt: new Date().toISOString(),
    totals,
    derived: {
      goalDifference: totals.goals - totals.against,
      winRate: totals.matches ? 100 * totals.wins / totals.matches : 0
    },
    ai: {
      model,
      sourceSection: normalizeText(result.sourceSection) || null,
      evidence: normalizeText(result.evidence) || null,
      warnings: Array.isArray(result.warnings) ? result.warnings.map(normalizeText).filter(Boolean).slice(0, 10) : [],
      retrieval: retrievalMetadata?.url_metadata || []
    }
  };
}

export { importTrackerTotals, validateTotals, normalizeTrackerUrl, normalizeTotals, extractJson };
