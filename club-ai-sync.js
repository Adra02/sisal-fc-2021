function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate'
    }
  });
}

// Modelli supportati da URL Context secondo la documentazione Gemini.
// L'ordine parte dai modelli più recenti e usa fallback più leggeri.
const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite'
];

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const MAX_TOTAL_MS = 210000;
const PER_ATTEMPT_MS = 30000;
const MAX_RETRIES_PER_MODEL = 1;
export const maxDuration = 240;

const EXTRACTION_PROMPT = ({ url, clubId, platform }) => `
Sei un estrattore dati per il dashboard di una squadra EA SPORTS FC 27 Clubs.

DEVI LEGGERE ESATTAMENTE QUESTA PAGINA PUBBLICA CON URL CONTEXT:
${url}

Identificativi attesi:
- clubId: ${clubId}
- platform: ${platform}

Obiettivo: trasformare il contenuto reale della pagina Pro Clubs Tracker in dati strutturati utilizzabili dal dashboard.

REGOLE IMPORTANTI:
1. La pagina Pro Clubs Tracker è la fonte primaria. Non inventare numeri.
2. Non usare dati della tua memoria sul club.
3. Distingui SEMPRE statistiche cumulative dei giocatori da statistiche delle singole partite.
4. Restituisci SOLO le 5 partite più recenti realmente visibili/disponibili sulla pagina.
5. Per i giocatori: usa le presenze PG cumulative disponibili nella pagina, non il numero di partite delle ultime 5.
6. Non creare una presenza per un giocatore che non compare in una partita.
7. Per passaggi e contrasti usa, quando la pagina li mostra, riusciti e tentati. Non ricostruire conteggi mancanti partendo da una percentuale.
8. Se un valore non è visibile, usa null.
9. Mantieni il nome del giocatore esattamente come compare nella pagina.
10. Se trovi una sezione di statistiche giocatore più completa, usala per il blocco cumulativo; usa la sezione partita per le ultime 5.
11. Se la pagina mostra più dati storici di 5 partite, restituisci comunque solo le 5 più recenti.
12. Se non riesci a leggere una sezione della pagina, segnala il limite in sourceNotes ma non inventare.

RESTITUISCI ESCLUSIVAMENTE un singolo JSON valido, senza markdown e senza testo prima o dopo, con questa struttura:
{
  "ok": true,
  "club": {
    "id": "...",
    "name": "...",
    "platform": "...",
    "division": null,
    "skillRating": null,
    "gamesPlayed": null,
    "wins": null,
    "draws": null,
    "losses": null,
    "goals": null,
    "goalsAgainst": null
  },
  "players": [
    {
      "playerId": null,
      "name": "...",
      "position": null,
      "ovr": null,
      "games": null,
      "goals": null,
      "assists": null,
      "rating": null,
      "passMade": null,
      "passAttempts": null,
      "tackleMade": null,
      "tackleAttempts": null,
      "shots": null,
      "saves": null,
      "redcards": null,
      "minutes": null
    }
  ],
  "matches": [
    {
      "id": null,
      "timestamp": null,
      "homeTeam": null,
      "awayTeam": null,
      "homeScore": null,
      "awayScore": null,
      "players": [
        {
          "playerId": null,
          "name": "...",
          "position": null,
          "side": null,
          "clubId": null,
          "goals": null,
          "assists": null,
          "rating": null,
          "passMade": null,
          "passAttempts": null,
          "tackleMade": null,
          "tackleAttempts": null,
          "shots": null,
          "saves": null,
          "secondsPlayed": null
        }
      ]
    }
  ],
  "sourceNotes": []
}
`;

export async function POST(request) {
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405);

  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return json({
      error: 'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.',
      code: 'MISSING_API_KEY'
    }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Richiesta JSON non valida.', code: 'BAD_JSON' }, 400);
  }

  const parsed = parsePCTUrl(body?.url);
  if (!parsed.ok) return json({ error: parsed.error, code: 'BAD_URL' }, 400);

  const started = Date.now();
  const attempts = [];
  let lastError = null;

  // Prima proviamo l'Interactions API, che è l'API raccomandata per URL Context.
  for (const model of MODELS) {
    for (let retry = 0; retry <= MAX_RETRIES_PER_MODEL; retry++) {
      if (Date.now() - started > MAX_TOTAL_MS) break;
      try {
        const result = await callInteractions({
          apiKey,
          model,
          url: parsed.url,
          clubId: parsed.clubId,
          platform: parsed.platform,
          attempt: retry
        });
        validateResult(result, parsed);
        return json({
          ...result,
          requested: parsed,
          source: 'gemini-url-context-proclubstracker',
          fetchedAt: new Date().toISOString(),
          model,
          attempts
        });
      } catch (error) {
        lastError = normalizeError(error);
        attempts.push({ api: 'interactions', model, retry, status: lastError.status || null, message: lastError.message });
        if (!isRetryable(lastError)) break;
        await backoff(retry);
      }
    }
    if (Date.now() - started > MAX_TOTAL_MS) break;
  }

  // Secondo percorso di sicurezza: Generate Content + URL Context.
  // È documentato ufficialmente e riduce il rischio di un problema specifico dell'Interactions API.
  const fallbackModels = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
  for (const model of fallbackModels) {
    if (Date.now() - started > MAX_TOTAL_MS) break;
    try {
      const result = await callGenerateContent({
        apiKey,
        model,
        url: parsed.url,
        clubId: parsed.clubId,
        platform: parsed.platform
      });
      validateResult(result, parsed);
      return json({
        ...result,
        requested: parsed,
        source: 'gemini-generate-content-url-context-proclubstracker',
        fetchedAt: new Date().toISOString(),
        model,
        attempts
      });
    } catch (error) {
      lastError = normalizeError(error);
      attempts.push({ api: 'generateContent', model, retry: 0, status: lastError.status || null, message: lastError.message });
      if (!isRetryable(lastError)) {
        // Continua su un altro modello anche per errori non-transitori: alcuni modelli possono
        // avere disponibilità/permessi differenti sul progetto.
        continue;
      }
      await backoff(1);
    }
  }

  return json({
    error: friendlyGeminiError(lastError),
    code: lastError?.code || 'GEMINI_UNAVAILABLE',
    requested: parsed,
    attempts,
    hint: 'Il link è stato validato, ma Gemini non è riuscito a completare la lettura live. Riprova tra qualche secondo.'
  }, chooseErrorStatus(lastError));
}

function parsePCTUrl(value) {
  let u;
  try {
    u = new URL(String(value || '').trim());
  } catch {
    return { ok: false, error: 'Il link non è valido.' };
  }
  const host = u.hostname.toLowerCase();
  if (host !== 'proclubstracker.com' && host !== 'www.proclubstracker.com') {
    return { ok: false, error: 'Devi incollare un link di proclubstracker.com.' };
  }
  const match = u.pathname.match(/^\/club\/(\d+)\/?$/i);
  if (!match) {
    return { ok: false, error: 'Il link deve avere il formato https://proclubstracker.com/club/328794?...' };
  }
  const platform = String(u.searchParams.get('platform') || 'common-gen5').trim();
  if (!/^[a-z0-9-]+$/i.test(platform)) {
    return { ok: false, error: 'La piattaforma nel link non è valida.' };
  }
  return {
    ok: true,
    url: u.toString(),
    clubId: match[1],
    platform
  };
}

async function callInteractions({ apiKey, model, url, clubId, platform, attempt }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_ATTEMPT_MS);
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        model,
        input: EXTRACTION_PROMPT({ url, clubId, platform }),
        tools: [{ type: 'url_context' }],
        store: false,
        generation_config: {
          temperature: 0,
          max_output_tokens: 7000
        }
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    const data = safeJson(raw);
    if (!response.ok) throw apiError(data, response.status);
    if (data?.status === 'failed') {
      const e = new Error(data?.error?.message || 'Gemini ha segnato l’interazione come failed.');
      e.status = 502;
      e.code = 'INTERACTION_FAILED';
      throw e;
    }
    const text = extractInteractionText(data);
    if (!text) {
      const e = new Error('Gemini non ha restituito il JSON della pagina.');
      e.status = 502;
      e.code = 'EMPTY_MODEL_OUTPUT';
      throw e;
    }
    return parseJsonOutput(text);
  } catch (error) {
    if (error?.name === 'AbortError') {
      const e = new Error('Timeout nella lettura live di Pro Clubs Tracker.');
      e.status = 504;
      e.code = 'TIMEOUT';
      throw e;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function callGenerateContent({ apiKey, model, url, clubId, platform }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_ATTEMPT_MS);
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: EXTRACTION_PROMPT({ url, clubId, platform })
          }]
        }],
        tools: [{ url_context: {} }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 7000
        }
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    const data = safeJson(raw);
    if (!response.ok) throw apiError(data, response.status);
    const text = data?.candidates?.[0]?.content?.parts
      ?.map(part => typeof part?.text === 'string' ? part.text : '')
      .join('')
      .trim();
    if (!text) {
      const e = new Error('Gemini non ha restituito il JSON della pagina.');
      e.status = 502;
      e.code = 'EMPTY_MODEL_OUTPUT';
      throw e;
    }
    return parseJsonOutput(text);
  } catch (error) {
    if (error?.name === 'AbortError') {
      const e = new Error('Timeout nella lettura live di Pro Clubs Tracker.');
      e.status = 504;
      e.code = 'TIMEOUT';
      throw e;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function extractInteractionText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const chunks = [];
  for (const step of Array.isArray(data?.steps) ? data.steps : []) {
    if (step?.type !== 'model_output') continue;
    for (const block of Array.isArray(step?.content) ? step.content : []) {
      if (block?.type === 'text' && typeof block?.text === 'string') chunks.push(block.text);
    }
  }
  return chunks.join('\n').trim();
}

function parseJsonOutput(text) {
  const cleaned = stripFences(String(text || '').trim());
  try {
    return JSON.parse(cleaned);
  } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  const e = new Error('Gemini ha restituito un formato non leggibile.');
  e.status = 502;
  e.code = 'INVALID_JSON_OUTPUT';
  throw e;
}

function stripFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function validateResult(result, parsed) {
  if (!result || typeof result !== 'object') throw modelDataError('Risposta Gemini vuota.');
  if (result.club?.id && String(result.club.id) !== String(parsed.clubId)) {
    throw modelDataError(`Gemini ha restituito il club ${result.club.id} invece del club richiesto ${parsed.clubId}.`);
  }
  const players = Array.isArray(result.players) ? result.players : [];
  const matches = Array.isArray(result.matches) ? result.matches : [];
  if (!result.club?.name && players.length === 0 && matches.length === 0) {
    throw modelDataError('Gemini ha letto la pagina ma non ha trovato dati del club.');
  }
  if (matches.length > 5) result.matches = matches.slice(0, 5);
}

function modelDataError(message) {
  const e = new Error(message);
  e.status = 502;
  e.code = 'NO_CLUB_DATA';
  return e;
}

function apiError(data, status) {
  const message = data?.error?.message || `Gemini HTTP ${status}`;
  const e = new Error(message);
  e.status = status;
  e.code = data?.error?.status || `HTTP_${status}`;
  return e;
}

function safeJson(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function normalizeError(error) {
  return {
    message: String(error?.message || 'Errore Gemini sconosciuto.'),
    status: Number.isFinite(error?.status) ? error.status : null,
    code: String(error?.code || '')
  };
}

function isRetryable(error) {
  return RETRYABLE.has(error?.status) || /high demand|temporarily|unavailable|overloaded|try again later/i.test(String(error?.message || ''));
}

function friendlyGeminiError(error) {
  const message = String(error?.message || 'Gemini non disponibile.');
  if (/high demand|temporarily|overloaded|capacity/i.test(message)) {
    return 'Gemini sta riscontrando un picco di richieste. Il sistema ha già provato più modelli e due API differenti, ma il servizio è ancora occupato.';
  }
  if (error?.code === 'TIMEOUT') return 'Gemini ha impiegato troppo tempo a leggere la pagina Pro Clubs Tracker.';
  if (error?.code === 'NO_CLUB_DATA') return 'Gemini ha aperto il link, ma non ha trovato dati strutturati del club nella pagina.';
  if (error?.code === 'INVALID_JSON_OUTPUT') return 'Gemini ha letto la pagina ma ha restituito i dati in un formato non valido. Il sistema ha provato automaticamente altri modelli.';
  return message;
}

function chooseErrorStatus(error) {
  if (error?.status === 401 || error?.status === 403) return error.status;
  if (error?.status === 400) return 502;
  if (error?.status === 429) return 429;
  return 502;
}

async function backoff(retry) {
  const ms = retry === 0 ? 900 : 1800;
  await new Promise(resolve => setTimeout(resolve, ms));
}
