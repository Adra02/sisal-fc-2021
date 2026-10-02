const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite'
];

const DEFAULT_PLATFORM = 'common-gen5';
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const CALL_TIMEOUT_MS = 35000;
export const maxDuration = 240;

const nullableNumber = { type: ['number', 'string', 'null'] };
const nullableString = { type: ['string', 'null'] };

const overviewSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean' },
    club: {
      type: 'object', additionalProperties: false,
      properties: {
        id: nullableString,
        name: nullableString,
        platform: nullableString,
        division: nullableNumber,
        skillRating: nullableNumber,
        gamesPlayed: nullableNumber,
        wins: nullableNumber,
        draws: nullableNumber,
        losses: nullableNumber,
        goals: nullableNumber,
        goalsAgainst: nullableNumber,
        goalDifference: nullableNumber,
        clubUrl: nullableString
      },
      required: ['id','name','platform','division','skillRating','gamesPlayed','wins','draws','losses','goals','goalsAgainst','goalDifference','clubUrl']
    },
    sourceUrls: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } }
  },
  required: ['ok','club','sourceUrls','notes']
};

const playersSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    ok: { type: 'boolean' },
    clubId: nullableString,
    items: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          playerId: nullableString,
          name: nullableString,
          position: nullableString,
          ovr: nullableNumber,
          games: nullableNumber,
          goals: nullableNumber,
          assists: nullableNumber,
          rating: nullableNumber,
          passMade: nullableNumber,
          passAttempts: nullableNumber,
          passAccuracy: nullableNumber,
          tackleMade: nullableNumber,
          tackleAttempts: nullableNumber,
          tackleSuccess: nullableNumber,
          shots: nullableNumber,
          saves: nullableNumber,
          cleanSheets: nullableNumber,
          mom: nullableNumber,
          redcards: nullableNumber,
          minutes: nullableNumber
        },
        required: ['playerId','name','position','ovr','games','goals','assists','rating','passMade','passAttempts','passAccuracy','tackleMade','tackleAttempts','tackleSuccess','shots','saves','cleanSheets','mom','redcards','minutes']
      }
    },
    sourceUrls: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } }
  },
  required: ['ok','clubId','items','sourceUrls','notes']
};

const matchesSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    ok: { type: 'boolean' },
    clubId: nullableString,
    items: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          id: nullableString,
          timestamp: nullableNumber,
          homeTeam: nullableString,
          awayTeam: nullableString,
          homeScore: nullableNumber,
          awayScore: nullableNumber,
          result: nullableString
        },
        required: ['id','timestamp','homeTeam','awayTeam','homeScore','awayScore','result']
      }
    },
    sourceUrls: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } }
  },
  required: ['ok','clubId','items','sourceUrls','notes']
};

const funSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    ok: { type: 'boolean' },
    clubId: nullableString,
    items: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          title: nullableString,
          player: nullableString,
          value: { type: ['string','number','null'] },
          text: nullableString
        },
        required: ['title','player','value','text']
      }
    },
    sourceUrls: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } }
  },
  required: ['ok','clubId','items','sourceUrls','notes']
};

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate'
    }
  });
}

function normalizeName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 100);
}

function cleanModelJson(text) {
  const cleaned = String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const a = cleaned.indexOf('{');
  const b = cleaned.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(cleaned.slice(a, b + 1));
  const error = new Error('Gemini ha restituito un formato JSON non leggibile.');
  error.status = 502;
  error.code = 'INVALID_JSON_OUTPUT';
  throw error;
}

function normalizeError(error) {
  return {
    name: String(error?.name || 'Error'),
    message: String(error?.message || 'Errore Gemini sconosciuto.'),
    status: Number.isFinite(error?.status) ? error.status : null,
    code: String(error?.code || '')
  };
}

function retryable(error) {
  const status = error?.status;
  const message = String(error?.message || '');
  return RETRYABLE.has(status) || /high demand|temporarily|unavailable|overloaded|try again later|rate.?limit|timeout|busy/i.test(message);
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function fetchWithTimeout(url, options = {}, timeoutMs = CALL_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) {}
    if (!response.ok) {
      const error = new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
      error.status = response.status;
      error.code = data?.error?.status || `HTTP_${response.status}`;
      throw error;
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeout = new Error('Timeout durante la lettura live di Pro Clubs Tracker.');
      timeout.status = 504;
      timeout.code = 'TIMEOUT';
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function collectUrlsFromSteps(data) {
  const urls = new Set();
  for (const step of Array.isArray(data?.steps) ? data.steps : []) {
    if (step?.type === 'url_context_result') {
      for (const item of Array.isArray(step.result) ? step.result : []) {
        if (typeof item?.url === 'string') urls.add(item.url);
      }
    }
    if (step?.type === 'google_search_result') {
      for (const item of Array.isArray(step.result) ? step.result : []) {
        if (typeof item?.url === 'string') urls.add(item.url);
      }
    }
    for (const block of Array.isArray(step?.content) ? step.content : []) {
      if (block?.type === 'text' && Array.isArray(block.annotations)) {
        for (const annotation of block.annotations) {
          if (typeof annotation?.url === 'string') urls.add(annotation.url);
        }
      }
    }
  }
  return [...urls]
    .filter(url => /^https:\/\/(www\.)?proclubstracker\.com\//i.test(url))
    .slice(0, 20);
}

function outputText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const step of Array.isArray(data?.steps) ? data.steps : []) {
    if (step?.type !== 'model_output') continue;
    for (const block of Array.isArray(step?.content) ? step.content : []) {
      if (typeof block?.text === 'string' && block.text.trim()) parts.push(block.text);
    }
  }
  return parts.join('\n').trim();
}

async function askGemini(apiKey, model, input, schema) {
  const data = await fetchWithTimeout('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      model,
      input,
      tools: [
        { type: 'google_search', search_types: ['web_search'] },
        { type: 'url_context' }
      ],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema
      },
      generation_config: {
        max_output_tokens: 2600
      },
      store: false
    })
  });
  const text = outputText(data);
  if (!text) {
    const error = new Error('Gemini non ha restituito dati.');
    error.status = 502;
    error.code = 'EMPTY_MODEL_OUTPUT';
    throw error;
  }
  const parsed = cleanModelJson(text);
  parsed.__sourceUrls = collectUrlsFromSteps(data);
  return parsed;
}

function addUrls(result) {
  return [...new Set([
    ...(Array.isArray(result?.sourceUrls) ? result.sourceUrls : []),
    ...(Array.isArray(result?.__sourceUrls) ? result.__sourceUrls : [])
  ].filter(url => /^https:\/\/(www\.)?proclubstracker\.com\//i.test(String(url))))].slice(0, 20);
}

async function askWithFallback(apiKey, input, schema, accept) {
  let lastError = null;
  for (const model of MODELS) {
    try {
      const result = await askGemini(apiKey, model, input, schema);
      result.sourceUrls = addUrls(result);
      if (accept(result)) return { result, model };
      const error = new Error('Risposta incompleta per la sezione richiesta.');
      error.code = 'INCOMPLETE_SECTION';
      lastError = error;
    } catch (error) {
      lastError = error;
      const meta = normalizeError(error);
      if (!retryable(meta) && meta.code !== 'INCOMPLETE_SECTION' && meta.code !== 'INVALID_JSON_OUTPUT') {
        // Try the next model anyway: a different model can still read the same public source.
      }
    }
    await sleep(250);
  }
  throw lastError || new Error('Gemini non ha restituito dati.');
}

function overviewPrompt(name) {
  return `SEI IL MOTORE LIVE PER UN DASHBOARD EA SPORTS FC 27 CLUBS.\n\nCLUB CERCATO: "${name}"\nPIATTAFORMA PRIORITARIA: current-gen (PS5 / Xbox Series X|S / PC).\n\nOBIETTIVO: identifica il club corretto su Pro Clubs Tracker e trova la sua pagina pubblica principale. Usa Google Search limitata a proclubstracker.com per localizzare il club e poi URL Context per leggere la pagina.\n\nESTRAI SOLTANTO DATI REALMENTE VISIBILI SU PRO CLUBS TRACKER: Club ID, nome, piattaforma, divisione, skill rating, partite, vittorie, pareggi, sconfitte, gol fatti, gol subiti, differenza reti.\n\nIMPORTANTE: restituisci anche clubUrl, cioè l'URL esatto della pagina pubblica del club che hai letto. Non inventare URL. Se il club non viene trovato, ok=false e spiega perché nelle notes.`;
}

function playersPrompt(name, clubUrl, clubId) {
  return `SEI IL MOTORE LIVE DELLA SEZIONE PLAYERS DI PRO CLUBS TRACKER PER EA SPORTS FC 27.\n\nCLUB: "${name}"\nCLUB ID ATTESO: "${clubId || ''}"\nPAGINA PRINCIPALE: ${clubUrl || '(non disponibile; cercala)'}\n\nUSA SOLO proclubstracker.com. Usa URL Context sulla pagina principale e, se necessario, Google Search per trovare la pagina/URL pubblico specifico della sezione Players dello stesso club.\n\nNON fermarti ai giocatori principali o ai primi 3. Devi estrarre TUTTE le righe giocatore realmente leggibili.\n\nUSA LE STATISTICHE CUMULATIVE DELLA SEZIONE PLAYERS: nome, posizione, OVR/overall se presente, PG/games played, gol, assist, voto medio/rating, passaggi riusciti/tentati se esposti, pass accuracy se esposta, tackle riusciti/tentati se esposti, tackle success se esposta, tiri, parate, clean sheets, MOTM, rossi, minuti se esposti.\n\nSe Pro Clubs Tracker mostra solo una percentuale e non i due valori numeratore/denominatore, lascia passMade/passAttempts o tackleMade/tackleAttempts a null e compila comunque passAccuracy/tackleSuccess con la percentuale reale.\n\nNessun valore inventato. Valore non visibile = null. Nomi esattamente come pubblicati. Se la pagina è leggibile ma non contiene la rosa completa, cerca un URL pubblico Players dello stesso club prima di arrenderti.`;
}

function matchesPrompt(name, clubUrl, clubId) {
  return `SEI IL MOTORE LIVE DELLA SEZIONE MATCHES DI PRO CLUBS TRACKER PER EA SPORTS FC 27.\n\nCLUB: "${name}"\nCLUB ID ATTESO: "${clubId || ''}"\nPAGINA PRINCIPALE: ${clubUrl || '(non disponibile; cercala)'}\n\nUSA SOLO proclubstracker.com. Usa URL Context sulla pagina principale e, se necessario, Google Search per trovare l'URL pubblico della sezione Matches dello stesso club.\n\nESTRAI LE 5 PARTITE PIU' RECENTI VISIBILI. Ordinale dalla più recente alla meno recente. Per ogni partita restituisci ID, timestamp/data, casa, trasferta, risultato numerico e W/D/L dal punto di vista del club richiesto.\n\nNon restituire partite più vecchie se hai già 5 partite recenti. Non inventare dati mancanti.`;
}

function funPrompt(name, clubUrl, clubId) {
  return `SEI IL MOTORE LIVE DELLA SEZIONE FUN DI PRO CLUBS TRACKER PER EA SPORTS FC 27.\n\nCLUB: "${name}"\nCLUB ID ATTESO: "${clubId || ''}"\nPAGINA PRINCIPALE: ${clubUrl || '(non disponibile; cercala)'}\n\nUSA SOLO proclubstracker.com. Usa URL Context sulla pagina principale e, se necessario, Google Search per trovare l'URL pubblico della sezione Fun/analytics del medesimo club.\n\nESTRAI SOLO GLI ELEMENTI FUN REALMENTE PRESENTI: titolo, giocatore se presente, valore se presente, testo/descrizione se presente. Non inventare classifiche, roast o premi che non siano visibili.`;
}

function num(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function normalizeOverview(result, requestedName) {
  const club = result?.club || {};
  const id = String(club.id ?? '').trim();
  return {
    ...result,
    ok: result?.ok !== false,
    club: {
      id: /^\d+$/.test(id) ? id : null,
      name: club.name ? String(club.name) : requestedName,
      platform: club.platform ? String(club.platform) : DEFAULT_PLATFORM,
      division: club.division ?? null,
      skillRating: club.skillRating ?? null,
      gamesPlayed: club.gamesPlayed ?? null,
      wins: club.wins ?? null,
      draws: club.draws ?? null,
      losses: club.losses ?? null,
      goals: club.goals ?? null,
      goalsAgainst: club.goalsAgainst ?? null,
      goalDifference: club.goalDifference ?? null,
      clubUrl: /^https:\/\/(www\.)?proclubstracker\.com\//i.test(String(club.clubUrl || '')) ? club.clubUrl : null
    },
    sourceUrls: addUrls(result),
    notes: Array.isArray(result?.notes) ? result.notes.map(String).slice(0, 20) : []
  };
}

function normalizePlayers(result, clubId) {
  const items = Array.isArray(result?.items) ? result.items : [];
  return {
    available: items.length > 0,
    items: items.map((p, i) => ({
      playerId: p?.playerId == null ? `pct-player-${clubId || 'club'}-${i}` : String(p.playerId),
      name: p?.name ? String(p.name) : null,
      position: p?.position ? String(p.position) : null,
      ovr: p?.ovr ?? null,
      games: p?.games ?? null,
      goals: p?.goals ?? null,
      assists: p?.assists ?? null,
      rating: p?.rating ?? null,
      passMade: p?.passMade ?? null,
      passAttempts: p?.passAttempts ?? null,
      passAccuracy: p?.passAccuracy ?? null,
      tackleMade: p?.tackleMade ?? null,
      tackleAttempts: p?.tackleAttempts ?? null,
      tackleSuccess: p?.tackleSuccess ?? null,
      shots: p?.shots ?? null,
      saves: p?.saves ?? null,
      cleanSheets: p?.cleanSheets ?? null,
      mom: p?.mom ?? null,
      redcards: p?.redcards ?? null,
      minutes: p?.minutes ?? null
    })).filter(p => p.name),
    sourceUrls: addUrls(result),
    notes: Array.isArray(result?.notes) ? result.notes.map(String).slice(0, 20) : []
  };
}

function normalizeMatches(result, clubId) {
  const items = Array.isArray(result?.items) ? result.items.slice(0, 5) : [];
  return {
    available: items.length > 0,
    items: items.map((m, i) => ({
      id: m?.id == null ? `pct-match-${clubId || 'club'}-${i}` : String(m.id),
      timestamp: m?.timestamp ?? null,
      homeTeam: m?.homeTeam ? String(m.homeTeam) : null,
      awayTeam: m?.awayTeam ? String(m.awayTeam) : null,
      homeScore: m?.homeScore ?? null,
      awayScore: m?.awayScore ?? null,
      result: m?.result ? String(m.result) : null
    })),
    sourceUrls: addUrls(result),
    notes: Array.isArray(result?.notes) ? result.notes.map(String).slice(0, 20) : []
  };
}

function normalizeFun(result) {
  const items = Array.isArray(result?.items) ? result.items : [];
  return {
    available: items.length > 0,
    items: items.map(x => ({
      title: x?.title ?? null,
      player: x?.player ?? null,
      value: x?.value ?? null,
      text: x?.text ?? null
    })),
    sourceUrls: addUrls(result),
    notes: Array.isArray(result?.notes) ? result.notes.map(String).slice(0, 20) : []
  };
}

export async function POST(request) {
  if (request.method !== 'POST') return reply({ error: 'Metodo non consentito.' }, 405);

  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return reply({ error: 'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.', code: 'MISSING_API_KEY' }, 500);

  let body;
  try { body = await request.json(); } catch (_) {
    return reply({ error: 'Richiesta JSON non valida.', code: 'BAD_JSON' }, 400);
  }

  const name = normalizeName(body?.name);
  if (!name) return reply({ error: 'Inserisci il nome della squadra.', code: 'MISSING_CLUB_NAME' }, 400);

  const started = Date.now();
  const attempts = [];
  let overview;
  let overviewModel = null;
  try {
    const out = await askWithFallback(apiKey, overviewPrompt(name), overviewSchema, result => {
      const c = result?.club || {};
      return result?.ok !== false && /^\d+$/.test(String(c.id || '')) && !!c.clubUrl;
    });
    overview = normalizeOverview(out.result, name);
    overviewModel = out.model;
    attempts.push({ section: 'stats', model: out.model, status: 'ok' });
  } catch (error) {
    const e = normalizeError(error);
    attempts.push({ section: 'stats', ...e });
    return reply({ ok: false, error: e.message, code: e.code || 'STATS_FAILED', attempts }, e.status && e.status >= 400 ? Math.min(e.status, 504) : 502);
  }

  const clubId = overview.club.id;
  const clubUrl = overview.club.clubUrl;

  if (!clubId) {
    return reply({ ok: false, error: 'Gemini ha trovato una pagina, ma non un Club ID valido.', code: 'NO_CLUB_ID', attempts }, 502);
  }

  if (Date.now() - started > 200000) {
    return reply({ ok: false, error: 'Timeout generale durante la sincronizzazione.', code: 'TOTAL_TIMEOUT', attempts }, 504);
  }

  const rawSections = await Promise.allSettled([
    askWithFallback(apiKey, playersPrompt(name, clubUrl, clubId), playersSchema, result => Array.isArray(result?.items) && result.items.some(p => p?.name)),
    askWithFallback(apiKey, matchesPrompt(name, clubUrl, clubId), matchesSchema, result => Array.isArray(result?.items)),
    askWithFallback(apiKey, funPrompt(name, clubUrl, clubId), funSchema, result => Array.isArray(result?.items))
  ]);

  const playerResult = rawSections[0].status === 'fulfilled'
    ? normalizePlayers(rawSections[0].value.result, clubId)
    : { available:false, items:[], sourceUrls:[], notes:[normalizeError(rawSections[0].reason).message] };
  const matchResult = rawSections[1].status === 'fulfilled'
    ? normalizeMatches(rawSections[1].value.result, clubId)
    : { available:false, items:[], sourceUrls:[], notes:[`Matches non lette: ${normalizeError(rawSections[1].reason).message}`] };
  const funResult = rawSections[2].status === 'fulfilled'
    ? normalizeFun(rawSections[2].value.result)
    : { available:false, items:[], sourceUrls:[], notes:[`Fun non letta: ${normalizeError(rawSections[2].reason).message}`] };

  attempts.push(rawSections[0].status === 'fulfilled'
    ? { section: 'players', model: rawSections[0].value.model, status: playerResult.items.length ? 'ok' : 'empty' }
    : { section: 'players', status: 'failed', error: normalizeError(rawSections[0].reason) });
  attempts.push(rawSections[1].status === 'fulfilled'
    ? { section: 'matches', model: rawSections[1].value.model, status: matchResult.items.length ? 'ok' : 'empty' }
    : { section: 'matches', status: 'failed', error: normalizeError(rawSections[1].reason) });
  attempts.push(rawSections[2].status === 'fulfilled'
    ? { section: 'fun', model: rawSections[2].value.model, status: funResult.items.length ? 'ok' : 'empty' }
    : { section: 'fun', status: 'failed', error: normalizeError(rawSections[2].reason) });

  if (!playerResult.items.length) {
    return reply({
      ok: false,
      error: 'Il club è stato trovato ma Gemini non ha letto la rosa completa da Pro Clubs Tracker. Nessun dato parziale è stato applicato.',
      code: 'PLAYERS_NOT_READ',
      club: overview.club,
      sections: { stats: { available: true, notes: overview.notes }, players: playerResult, matches: matchResult, fun: funResult },
      sourceUrls: [...new Set([clubUrl, ...overview.sourceUrls, ...playerResult.sourceUrls, ...matchResult.sourceUrls, ...funResult.sourceUrls].filter(Boolean))],
      attempts
    }, 502);
  }

  const combinedSourceUrls = [...new Set([
    clubUrl,
    ...overview.sourceUrls,
    ...playerResult.sourceUrls,
    ...matchResult.sourceUrls,
    ...funResult.sourceUrls
  ].filter(Boolean))].slice(0, 20);

  const sourceNotes = [
    ...overview.notes,
    ...playerResult.notes,
    ...matchResult.notes,
    ...funResult.notes
  ].filter(Boolean).slice(0, 40);

  return reply({
    ok: true,
    club: overview.club,
    sections: {
      stats: { available: true, notes: overview.notes },
      fun: funResult,
      players: playerResult,
      matches: matchResult
    },
    players: playerResult.items,
    matches: matchResult.items,
    fun: funResult,
    sourceUrls: combinedSourceUrls,
    sourceNotes,
    source: 'Gemini Google Search + URL Context + Pro Clubs Tracker',
    fetchedAt: new Date().toISOString(),
    model: overviewModel,
    attempts
  });
}
