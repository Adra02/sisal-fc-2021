const TRACKER_HOSTS = new Set(['proclubstracker.com', 'www.proclubstracker.com']);
const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TRACKER_PAGE_MAX_BYTES = 2_500_000;
const TRACKER_FETCH_TIMEOUT_MS = 20_000;

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

function sameTrackerClubUrl(candidate, expectedUrl, clubId) {
  try {
    const actual = new URL(String(candidate || expectedUrl));
    const expected = new URL(expectedUrl);
    const match = actual.pathname.match(/^\/club\/(\d+)\/?$/i);
    return Boolean(
      actual.protocol === 'https:' &&
      TRACKER_HOSTS.has(actual.hostname.toLowerCase()) &&
      expected.protocol === 'https:' &&
      TRACKER_HOSTS.has(expected.hostname.toLowerCase()) &&
      match && match[1] === String(clubId)
    );
  } catch {
    return false;
  }
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

function textNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function extractLabeledTotals(text) {
  const source = String(text || '').replace(/\u00a0/g, ' ');
  const flat = source.replace(/[*_`#]/g, '').replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const find = (patterns) => {
    for (const pattern of patterns) {
      const m = flat.match(pattern);
      if (m) {
        const n = textNumber(m[1]);
        if (n != null) return n;
      }
    }
    return null;
  };

  const totals = {
    matches: find([
      /(?:^|[\n;,.|])\s*[-•*]?\s*(?:MATCHES|PARTITE|GAMES PLAYED|MATCHES PLAYED|GAMES|PLAYED)\s*(?:[:=|]|[-–]|\bis\b|\bare\b)?\s*(\d+)/i,
      /(?:MATCHES|PARTITE|GAMES PLAYED|MATCHES PLAYED|GAMES|PLAYED)\s+(\d+)/i,
      /(\d+)\s*(?:matches|games played|matches played|games|partite)\b/i
    ]),
    wins: find([
      /(?:^|[\n;,.|])\s*[-•*]?\s*(?:WINS|VITTORIE)\s*(?:[:=|]|[-–]|\bis\b|\bare\b)?\s*(\d+)/i,
      /(?:WINS|VITTORIE)\s+(\d+)/i,
      /(\d+)\s*(?:wins|vittorie)\b/i
    ]),
    draws: find([
      /(?:^|[\n;,.|])\s*[-•*]?\s*(?:DRAWS|TIES|PAREGGI)\s*(?:[:=|]|[-–]|\bis\b|\bare\b)?\s*(\d+)/i,
      /(?:DRAWS|TIES|PAREGGI)\s+(\d+)/i,
      /(\d+)\s*(?:draws|ties|pareggi)\b/i
    ]),
    losses: find([
      /(?:^|[\n;,.|])\s*[-•*]?\s*(?:LOSSES|SCONFITTE)\s*(?:[:=|]|[-–]|\bis\b|\bare\b)?\s*(\d+)/i,
      /(?:LOSSES|SCONFITTE)\s+(\d+)/i,
      /(\d+)\s*(?:losses|sconfitte)\b/i
    ]),
    goals: find([
      /(?:^|[\n;,.|])\s*[-•*]?\s*(?:GOALS FOR|GOALS SCORED|GOALS|GOL FATTI|GF)\s*(?:[:=|]|[-–]|\bis\b|\bare\b)?\s*(\d+)/i,
      /(?:GOALS FOR|GOALS SCORED|GOL FATTI|GF)\s+(\d+)/i,
      /(\d+)\s*(?:goals for|goals scored|gol fatti)\b/i
    ]),
    against: find([
      /(?:^|[\n;,.|])\s*[-•*]?\s*(?:GOALS AGAINST|GOALS CONCEDED|GOL SUBITI|AGAINST|GA)\s*(?:[:=|]|[-–]|\bis\b|\bare\b)?\s*(\d+)/i,
      /(?:GOALS AGAINST|GOALS CONCEDED|GOL SUBITI|AGAINST|GA)\s+(\d+)/i,
      /(\d+)\s*(?:goals against|goals conceded|gol subiti)\b/i
    ])
  };

  // Also accept a compact record such as: 123 matches, 60 W, 12 D, 51 L, 301 GF, 265 GA.
  if (Object.values(totals).some(v => v == null)) {
    const compact = flat.match(/(?:^|[\n;,])\s*(\d+)\s*(?:matches|games|played)\b[^\n]{0,180}?\b(?:W|wins?)\s*[:=\-]?\s*(\d+)\b[^\n]{0,80}?\b(?:D|draws?|ties?)\s*[:=\-]?\s*(\d+)\b[^\n]{0,80}?\b(?:L|losses?)\s*[:=\-]?\s*(\d+)\b[^\n]{0,120}?\b(?:GF|goals? for|goals? scored)\s*[:=\-]?\s*(\d+)\b[^\n]{0,80}?\b(?:GA|goals? against|goals? conceded)\s*[:=\-]?\s*(\d+)\b/i);
    if (compact) {
      totals.matches ??= textNumber(compact[1]);
      totals.wins ??= textNumber(compact[2]);
      totals.draws ??= textNumber(compact[3]);
      totals.losses ??= textNumber(compact[4]);
      totals.goals ??= textNumber(compact[5]);
      totals.against ??= textNumber(compact[6]);
    }
  }

  return totals;
}

function extractTrackerResult(text) {
  const json = extractJson(text);
  if (json) {
    return { result: json, method: 'json' };
  }
  const totals = extractLabeledTotals(text);
  const required = ['matches','wins','draws','losses','goals','against'];
  if (required.every(k => totals[k] != null)) {
    return {
      result: { ok: true, clubId: null, clubName: null, totals, sourceSection: 'Pro Clubs Tracker club overview', evidence: normalizeText(text).slice(0, 1200), warnings: ['Gemini ha restituito testo con etichette; i sei valori sono stati normalizzati automaticamente.'] },
      method: 'labeled-text'
    };
  }
  return { result: null, method: 'none' };
}

function normalizeTotals(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    matches: finiteNonNegativeInteger(input.matches ?? input.gamesPlayed ?? input.games),
    wins: finiteNonNegativeInteger(input.wins),
    draws: finiteNonNegativeInteger(input.draws ?? input.ties),
    losses: finiteNonNegativeInteger(input.losses),
    goals: finiteNonNegativeInteger(input.goals ?? input.goalsScored ?? input.gf),
    against: finiteNonNegativeInteger(input.against ?? input.goalsAgainst ?? input.goalsConceded ?? input.ga)
  };
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

function retrievalStatus(data, submittedUrl, clubId) {
  const metadata = data?.candidates?.[0]?.url_context_metadata;
  const urls = Array.isArray(metadata?.url_metadata) ? metadata.url_metadata : [];
  const successful = urls.filter(item => String(item?.url_retrieval_status || '').toUpperCase() === 'URL_RETRIEVAL_STATUS_SUCCESS');
  const matching = successful.filter(item => sameTrackerClubUrl(item?.retrieved_url, submittedUrl, clubId));
  return { metadata, urls, successful, matching, ok: matching.length > 0 };
}

async function fetchTrackerPage(url, clubId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRACKER_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SisalFC2021-GeminiImporter/27.0)',
        'accept': 'text/html,application/xhtml+xml,application/json;q=0.9,text/plain;q=0.8,*/*;q=0.7',
        'accept-language': 'it-IT,it;q=0.9,en;q=0.8'
      }
    });
    const text = await response.text();
    const finalUrl = response.url || url;
    const normalized = text.slice(0, TRACKER_PAGE_MAX_BYTES);
    const blocked = /just a moment|cf-chl-|cloudflare ray id|enable javascript and cookies to continue/i.test(normalized);
    const structurallyCorrect = sameTrackerClubUrl(finalUrl, url, clubId);
    return {
      ok: response.ok && structurallyCorrect && !blocked,
      status: response.status,
      finalUrl,
      contentType: response.headers.get('content-type') || '',
      text: normalized,
      blocked,
      structurallyCorrect,
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      finalUrl: url,
      contentType: '',
      text: '',
      blocked: false,
      structurallyCorrect: false,
      error: String(error?.message || error || 'Errore di rete')
    };
  } finally {
    clearTimeout(timer);
  }
}

async function askGeminiToReadTracker(apiKey, url, clubId, page) {
  const pageAvailable = Boolean(page?.ok && page.text);
  const fallbackSection = pageAvailable
    ? [
        '',
        'FALLBACK: CONTENUTO DELLA STESSA PAGINA SCARICATO DAL SERVER',
        'Quello che segue è esclusivamente il contenuto della stessa pagina pubblica indicata nell URL. Usalo come fonte dati per estrarre il record storico richiesto.',
        '<TRACKER_PAGE_HTML>',
        page.text,
        '</TRACKER_PAGE_HTML>'
      ].join('\n')
    : '';

  const prompt = [
    'Leggi direttamente la pagina pubblica Pro Clubs Tracker indicata qui sotto usando URL Context.',
    'Devi estrarre SOLTANTO il record TOTALE STORICO del club indicato, non le ultime 5 partite e non le statistiche dei singoli giocatori.',
    '',
    `URL ESATTO: ${url}`,
    `CLUB ID ATTESO: ${clubId}`,
    '',
    'Trova la sezione generale del club (Club Overview / Overall record o equivalente) e recupera:',
    'partite totali / matches / games played',
    'vittorie totali / wins',
    'pareggi totali / draws / ties',
    'sconfitte totali / losses',
    'gol segnati totali / goals for / goals scored',
    'gol subiti totali / goals against / goals conceded',
    '',
    'REGOLE:',
    'Usa esclusivamente dati visibili nella pagina del club indicata.',
    'Non usare memoria, supposizioni, altre squadre o altre pagine.',
    'I sei valori devono appartenere allo stesso record storico generale.',
    'Controlla che vittorie + pareggi + sconfitte = partite.',
    '',
    'RISPOSTA: NON usare JSON. NON usare markdown. Restituisci ESATTAMENTE queste sei righe, sostituendo ogni ... con il numero letto:',
    'MATCHES: ...',
    'WINS: ...',
    'DRAWS: ...',
    'LOSSES: ...',
    'GOALS: ...',
    'AGAINST: ...',
    'Alla fine aggiungi una riga: CLUB_ID: ' + clubId,
    fallbackSection
  ].join('\n');

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ url_context: {} }],
      generationConfig: { maxOutputTokens: 700 }
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

  const retrieval = retrievalStatus(data, url, clubId);
  const candidate = data?.candidates?.[0];
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const modelText = parts.map(part => part?.text || '').filter(Boolean).join('\n').trim();
  const parsed = extractTrackerResult(modelText);
  if (!parsed.result) {
    const preview = normalizeText(modelText).slice(0, 500);
    throw Object.assign(
      new Error(`Gemini ha letto la richiesta ma non ha restituito i sei valori in un formato riconoscibile.${preview ? ` Risposta ricevuta: ${preview}` : ' La risposta era vuota.'}`),
      { code: 'TRACKER_AI_UNREADABLE_RESPONSE' }
    );
  }

  const proof = retrieval.ok ? 'url-context' : pageAvailable ? 'server-fetch-to-gemini' : null;
  if (!proof) {
    const statuses = retrieval.urls.map(x => `${x?.retrieved_url || 'URL'}=${x?.url_retrieval_status || 'unknown'}`).join(', ');
    throw Object.assign(
      new Error(`Gemini non è riuscito a leggere la pagina ProClubTracker e non è disponibile un contenuto di fallback verificabile. ${statuses || 'Nessun tentativo URL verificabile.'}`),
      { code: 'TRACKER_URL_NOT_RETRIEVED', retrieval: retrieval.urls, page: { status: page?.status || null, error: page?.error || null } }
    );
  }

  return {
    result: parsed.result,
    parseMethod: parsed.method,
    retrievalMetadata: candidate?.url_context_metadata || null,
    model: GEMINI_MODEL,
    proof,
    page: {
      status: page?.status || null,
      finalUrl: page?.finalUrl || url,
      contentType: page?.contentType || '',
      bytesSentToGemini: pageAvailable ? Buffer.byteLength(page.text, 'utf8') : 0
    }
  };
}

async function importTrackerTotals(url) {
  const { parsed, clubId } = normalizeTrackerUrl(url);
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY non configurata su Vercel.'), { code: 'GEMINI_NOT_CONFIGURED' });

  // Fetch the exact public page first so Gemini has a deterministic fallback even when
  // URL Context is unable to retrieve a dynamic/blocked page.
  const page = await fetchTrackerPage(parsed.href, clubId);
  const { result, parseMethod, retrievalMetadata, model, proof, page: pageInfo } = await askGeminiToReadTracker(apiKey, parsed.href, clubId, page);

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
      parseMethod,
      proof,
      sourceSection: normalizeText(result.sourceSection) || null,
      evidence: normalizeText(result.evidence) || null,
      warnings: Array.isArray(result.warnings) ? result.warnings.map(normalizeText).filter(Boolean).slice(0, 10) : [],
      retrieval: retrievalMetadata?.url_metadata || [],
      page: pageInfo
    }
  };
}

export { importTrackerTotals, validateTotals, normalizeTrackerUrl, normalizeTotals, extractJson, extractLabeledTotals, extractTrackerResult, fetchTrackerPage, sameTrackerClubUrl };
