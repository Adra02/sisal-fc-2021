const GEMINI_MODEL = String(process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
const DEFAULT_PLATFORM = 'common-gen5';
const CALL_TIMEOUT_MS = 60000;
export const maxDuration = 240;

const nullableNumber = { type: ['number', 'null'] };
const nullableString = { type: ['string', 'null'] };

const playerItemSchema = {
  type: 'object',
  additionalProperties: false,
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
  required: [
    'playerId','name','position','ovr','games','goals','assists','rating',
    'passMade','passAttempts','passAccuracy','tackleMade','tackleAttempts',
    'tackleSuccess','shots','saves','cleanSheets','mom','redcards','minutes'
  ]
};

const matchItemSchema = {
  type: 'object',
  additionalProperties: false,
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
};

const funItemSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: nullableString,
    player: nullableString,
    value: { type: ['string','number','null'] },
    text: nullableString
  },
  required: ['title','player','value','text']
};

const fullSyncSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean' },
    club: {
      type: 'object',
      additionalProperties: false,
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
      required: [
        'id','name','platform','division','skillRating','gamesPlayed','wins',
        'draws','losses','goals','goalsAgainst','goalDifference','clubUrl'
      ]
    },
    sections: {
      type: 'object',
      additionalProperties: false,
      properties: {
        stats: {
          type: 'object',
          additionalProperties: false,
          properties: {
            available: { type: 'boolean' },
            notes: { type: 'array', items: { type: 'string' } }
          },
          required: ['available','notes']
        },
        fun: {
          type: 'object',
          additionalProperties: false,
          properties: {
            available: { type: 'boolean' },
            items: { type: 'array', items: funItemSchema },
            notes: { type: 'array', items: { type: 'string' } }
          },
          required: ['available','items','notes']
        },
        players: {
          type: 'object',
          additionalProperties: false,
          properties: {
            available: { type: 'boolean' },
            items: { type: 'array', items: playerItemSchema },
            notes: { type: 'array', items: { type: 'string' } }
          },
          required: ['available','items','notes']
        },
        matches: {
          type: 'object',
          additionalProperties: false,
          properties: {
            available: { type: 'boolean' },
            items: { type: 'array', items: matchItemSchema },
            notes: { type: 'array', items: { type: 'string' } }
          },
          required: ['available','items','notes']
        }
      },
      required: ['stats','fun','players','matches']
    },
    sourceUrls: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } }
  },
  required: ['ok','club','sections','sourceUrls','notes']
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
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  const error = new Error('Gemini ha restituito un JSON non leggibile.');
  error.status = 502;
  error.code = 'INVALID_JSON_OUTPUT';
  throw error;
}

function normalizeError(error) {
  const details = error?.details && Array.isArray(error.details) ? error.details : [];
  const quotaFailure = details.find(x => String(x?.['@type'] || '').includes('QuotaFailure'));
  const violations = Array.isArray(quotaFailure?.violations) ? quotaFailure.violations : [];
  const violation = violations[0] || {};
  const retryInfo = details.find(x => String(x?.['@type'] || '').includes('RetryInfo')) || {};
  return {
    name: String(error?.name || 'Error'),
    message: String(error?.message || 'Errore Gemini sconosciuto.'),
    status: Number.isFinite(error?.status) ? error.status : null,
    code: String(error?.code || ''),
    quotaId: String(violation?.quotaId || ''),
    quotaMetric: String(violation?.quotaMetric || ''),
    quotaValue: String(violation?.quotaValue || ''),
    quotaDimensions: violation?.quotaDimensions ?? null,
    retryAfterSeconds: parseRetrySeconds(retryInfo?.retryDelay),
    rawDetails: details.slice(0, 5)
  };
}

function parseRetrySeconds(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.ceil(value));
  const match = String(value || '').match(/([0-9]+(?:\.[0-9]+)?)s/);
  return match ? Math.max(0, Math.ceil(Number(match[1]))) : null;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = CALL_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!response.ok) {
      const error = new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
      error.status = response.status;
      error.code = data?.error?.status || `HTTP_${response.status}`;
      error.details = Array.isArray(data?.error?.details) ? data.error.details : [];
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

function collectUrls(data) {
  const urls = new Set();
  for (const step of Array.isArray(data?.steps) ? data.steps : []) {
    if (step?.type === 'url_context_result') {
      for (const item of Array.isArray(step.result) ? step.result : []) {
        const u = item?.retrieved_url || item?.url;
        if (typeof u === 'string') urls.add(u);
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
    .slice(0, 30);
}

function addUrls(result) {
  return [...new Set([
    ...(Array.isArray(result?.sourceUrls) ? result.sourceUrls : []),
    ...(Array.isArray(result?.__sourceUrls) ? result.__sourceUrls : [])
  ].filter(url => /^https:\/\/(www\.)?proclubstracker\.com\//i.test(String(url))))].slice(0, 30);
}

function normalizeFull(result, requestedName) {
  const club = result?.club || {};
  const sections = result?.sections || {};
  const players = Array.isArray(sections.players?.items) ? sections.players.items : [];
  const matches = Array.isArray(sections.matches?.items) ? sections.matches.items.slice(0, 5) : [];
  const fun = Array.isArray(sections.fun?.items) ? sections.fun.items : [];
  const id = String(club.id ?? '').trim();
  const normalized = {
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
    sections: {
      stats: {
        available: sections.stats?.available === true,
        notes: Array.isArray(sections.stats?.notes) ? sections.stats.notes.map(String).slice(0, 20) : []
      },
      fun: {
        available: sections.fun?.available === true || fun.length > 0,
        items: fun.map(x => ({
          title: x?.title ?? null,
          player: x?.player ?? null,
          value: x?.value ?? null,
          text: x?.text ?? null
        })),
        notes: Array.isArray(sections.fun?.notes) ? sections.fun.notes.map(String).slice(0, 20) : []
      },
      players: {
        available: sections.players?.available === true || players.length > 0,
        items: players.map((p, i) => ({
          playerId: p?.playerId == null ? `pct-player-${id || 'club'}-${i}` : String(p.playerId),
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
        notes: Array.isArray(sections.players?.notes) ? sections.players.notes.map(String).slice(0, 20) : []
      },
      matches: {
        available: sections.matches?.available === true || matches.length > 0,
        items: matches.map((m, i) => ({
          id: m?.id == null ? `pct-match-${id || 'club'}-${i}` : String(m.id),
          timestamp: m?.timestamp ?? null,
          homeTeam: m?.homeTeam ? String(m.homeTeam) : null,
          awayTeam: m?.awayTeam ? String(m.awayTeam) : null,
          homeScore: m?.homeScore ?? null,
          awayScore: m?.awayScore ?? null,
          result: m?.result ? String(m.result) : null
        })),
        notes: Array.isArray(sections.matches?.notes) ? sections.matches.notes.map(String).slice(0, 20) : []
      }
    },
    sourceUrls: addUrls(result),
    notes: Array.isArray(result?.notes) ? result.notes.map(String).slice(0, 30) : []
  };
  return normalized;
}

function fullPrompt(name, platform) {
  return [
    'SEI IL MOTORE LIVE DI UN DASHBOARD EA SPORTS FC 27 CLUBS.',
    '',
    `CLUB RICHIESTO: "${name}"`,
    `PIATTAFORMA PRIORITARIA: ${platform || DEFAULT_PLATFORM} = PS5 / Xbox Series X|S / PC (current-gen).`,
    '',
    'OBIETTIVO: con QUESTA SOLA RICHIESTA devi fare tutto il flusso completo:',
    '1) trovare il club corretto su Pro Clubs Tracker;',
    '2) leggere la pagina pubblica del club;',
    '3) individuare e leggere, quando disponibili, le sezioni pubbliche 📊 Stats, 🎉 Fun, 👥 Players e ⚽ Matches dello STESSO club;',
    '4) restituire un UNICO JSON completo che contenga tutte e quattro le sezioni.',
    '',
    'REGOLE DI RICERCA:',
    '- Usa Google Search per trovare il club SOLO su proclubstracker.com.',
    '- Dopo aver identificato il club corretto, usa URL Context per leggere la pagina del club e le URL pubbliche specifiche delle sezioni che trovi nei link della pagina o nella ricerca.',
    '- Verifica sempre che nome, Club ID e piattaforma corrispondano al club richiesto prima di copiare i dati.',
    '- Non usare dati provenienti da altri club e non inventare URL.',
    '',
    '📊 STATS:',
    '- Estrai Club ID, nome, piattaforma, divisione, skill rating, partite, vittorie, pareggi, sconfitte, gol fatti, gol subiti, differenza reti.',
    '',
    '👥 PLAYERS:',
    '- Estrai TUTTI i giocatori realmente leggibili nella sezione Players, non solo i primi 3.',
    '- Usa le statistiche CUMULATIVE mostrate da Pro Clubs Tracker: nome, posizione, OVR/overall, PG/games played, gol, assist, rating medio e, quando visibili, passaggi riusciti/tentati, pass accuracy, tackle riusciti/tentati, tackle success, tiri, parate, clean sheets, MOTM, rossi, minuti.',
    '- Se è visibile solo una percentuale, compila la percentuale e lascia numeratore/denominatore null. Non inventare.',
    '- PG deve essere quello CUMULATIVO della sezione Players, non il numero di presenze nelle ultime 5 partite.',
    '',
    '⚽ MATCHES:',
    '- Estrai le 5 partite PIÙ RECENTI visibili, dalla più recente alla meno recente.',
    '- Per ogni partita: ID, timestamp/data, casa, trasferta, punteggio e W/D/L dal punto di vista del club richiesto.',
    '',
    '🎉 FUN:',
    '- Estrai solo gli elementi Fun realmente visibili: titolo, giocatore se presente, valore se presente, testo/descrizione se presente.',
    '- Non inventare premi, roast o classifiche.',
    '',
    'PRECISIONE:',
    '- Valore non visibile = null.',
    '- Non dedurre OVR dal rating e non dedurre PG dalle partite recenti.',
    '- Non trasformare opinioni o spiegazioni del sito in statistiche.',
    '- Se una sezione non è leggibile, metti available=false e una breve nota, senza inventare.',
    '- La rosa Players completa è la priorità: cerca la pagina Players pubblica corretta prima di arrenderti.',
    '',
    'OUTPUT OBBLIGATORIO: esclusivamente JSON conforme allo schema fornito. Nessun testo prima o dopo il JSON.'
  ].join('\n');
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
  const platform = String(body?.platform || DEFAULT_PLATFORM);
  const startedAt = Date.now();

  try {
    const data = await fetchWithTimeout('https://generativelanguage.googleapis.com/v1/interactions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: fullPrompt(name, platform),
        tools: [
          { type: 'google_search' },
          { type: 'url_context' }
        ],
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: fullSyncSchema
        },
        generation_config: {
          temperature: 0.1,
          max_output_tokens: 12000
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
    parsed.sourceUrls = addUrls({ ...parsed, __sourceUrls: collectUrls(data) });
    const normalized = normalizeFull(parsed, name);

    if (!normalized.club.id || !normalized.club.clubUrl) {
      return reply({
        ok: false,
        error: 'Gemini non ha identificato con certezza il Club ID e la pagina pubblica di Pro Clubs Tracker.',
        code: 'CLUB_NOT_VERIFIED',
        model: GEMINI_MODEL,
        geminiRequests: 1,
        elapsedMs: Date.now() - startedAt,
        sourceUrls: normalized.sourceUrls,
        partial: normalized
      }, 502);
    }

    if (!normalized.sections.players.items.length) {
      return reply({
        ok: false,
        error: 'Il club è stato trovato, ma la sezione Players non è stata letta. Nessun dato parziale è stato applicato.',
        code: 'PLAYERS_NOT_READ',
        model: GEMINI_MODEL,
        geminiRequests: 1,
        elapsedMs: Date.now() - startedAt,
        club: normalized.club,
        sections: normalized.sections,
        sourceUrls: normalized.sourceUrls,
        notes: normalized.notes
      }, 502);
    }

    return reply({
      ok: true,
      club: normalized.club,
      sections: normalized.sections,
      players: normalized.sections.players.items,
      matches: normalized.sections.matches.items,
      fun: normalized.sections.fun,
      sourceUrls: normalized.sourceUrls,
      sourceNotes: [
        ...normalized.notes,
        ...normalized.sections.stats.notes,
        ...normalized.sections.players.notes,
        ...normalized.sections.matches.notes,
        ...normalized.sections.fun.notes
      ].filter(Boolean).slice(0, 60),
      source: 'Gemini ' + GEMINI_MODEL + ' + Google Search + URL Context + Pro Clubs Tracker',
      fetchedAt: new Date().toISOString(),
      model: GEMINI_MODEL,
      geminiRequests: 1,
      elapsedMs: Date.now() - startedAt
    });
  } catch (error) {
    const e = normalizeError(error);
    let message = e.message;
    if (e.status === 429) {
      if (/PerDay/i.test(e.quotaId)) message = `Gemini ha rifiutato la richiesta per una quota giornaliera del progetto/modello${e.quotaValue ? ` (limite ${e.quotaValue})` : ''}.`;
      else if (/PerMinute|PerModelPerMinute|InputTokensPerModelPerMinute/i.test(e.quotaId)) message = `Gemini ha rifiutato la richiesta per un rate limit temporaneo${e.quotaValue ? ` (limite ${e.quotaValue})` : ''}.`;
      else message = 'Gemini ha restituito HTTP 429 (quota/rate limit).';
    }
    if (e.status === 503) message = 'Gemini non è disponibile in questo momento.';
    return reply({
      ok: false,
      error: message,
      detail: e.message,
      code: e.code || 'GEMINI_REQUEST_FAILED',
      status: e.status,
      model: GEMINI_MODEL,
      geminiRequests: 1,
      quota: e.quotaId || e.quotaMetric ? {
        id: e.quotaId || null,
        metric: e.quotaMetric || null,
        limit: e.quotaValue || null,
        retryAfterSeconds: e.retryAfterSeconds
      } : null,
      elapsedMs: Date.now() - startedAt
    }, e.status && e.status >= 400 ? Math.min(e.status, 504) : 502);
  }
}
