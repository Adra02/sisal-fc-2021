function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
const TRANSIENT = new Set([408, 409, 429, 500, 502, 503, 504]);
const TIMEOUT_MS = 30000;

const schema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    club: {
      type: 'object',
      properties: {
        id: { type: ['string', 'null'] },
        name: { type: ['string', 'null'] },
        platform: { type: ['string', 'null'] },
        division: { type: ['string', 'number', 'null'] },
        skillRating: { type: ['number', 'null'] },
        gamesPlayed: { type: ['number', 'null'] },
        wins: { type: ['number', 'null'] },
        draws: { type: ['number', 'null'] },
        losses: { type: ['number', 'null'] },
        goals: { type: ['number', 'null'] },
        goalsAgainst: { type: ['number', 'null'] }
      }
    },
    players: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          playerId: { type: ['string', 'null'] },
          name: { type: 'string' },
          position: { type: ['string', 'null'] },
          ovr: { type: ['number', 'null'] },
          games: { type: ['number', 'null'] },
          goals: { type: ['number', 'null'] },
          assists: { type: ['number', 'null'] },
          rating: { type: ['number', 'null'] },
          passMade: { type: ['number', 'null'] },
          passAttempts: { type: ['number', 'null'] },
          tackleMade: { type: ['number', 'null'] },
          tackleAttempts: { type: ['number', 'null'] },
          shots: { type: ['number', 'null'] },
          saves: { type: ['number', 'null'] },
          redcards: { type: ['number', 'null'] },
          minutes: { type: ['number', 'null'] }
        }
      }
    },
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: ['string', 'null'] },
          timestamp: { type: ['string', 'number', 'null'] },
          homeTeam: { type: ['string', 'null'] },
          awayTeam: { type: ['string', 'null'] },
          homeScore: { type: ['number', 'null'] },
          awayScore: { type: ['number', 'null'] },
          players: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                playerId: { type: ['string', 'null'] },
                name: { type: 'string' },
                position: { type: ['string', 'null'] },
                side: { type: ['string', 'null'] },
                clubId: { type: ['string', 'null'] },
                goals: { type: ['number', 'null'] },
                assists: { type: ['number', 'null'] },
                rating: { type: ['number', 'null'] },
                passMade: { type: ['number', 'null'] },
                passAttempts: { type: ['number', 'null'] },
                tackleMade: { type: ['number', 'null'] },
                tackleAttempts: { type: ['number', 'null'] },
                shots: { type: ['number', 'null'] },
                saves: { type: ['number', 'null'] },
                secondsPlayed: { type: ['number', 'null'] }
              }
            }
          }
        }
      }
    },
    sourceNotes: { type: 'array', items: { type: 'string' } }
  }
};

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405);

  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return json({ error: 'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Richiesta JSON non valida.' }, 400);
  }

  const rawUrl = String(body?.url || '').trim();
  const parsed = parsePCTUrl(rawUrl);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  let lastError = null;
  for (const model of MODELS) {
    try {
      const result = await analyzeWithGemini({ apiKey, model, url: parsed.url, clubId: parsed.clubId, platform: parsed.platform });
      if (!result?.players?.length && !result?.matches?.length && !result?.club?.name) {
        throw new Error('Gemini ha letto la pagina ma non ha trovato dati strutturati della squadra.');
      }
      return json({
        ...result,
        requested: parsed,
        source: 'gemini-url-context-proclubstracker',
        fetchedAt: new Date().toISOString(),
        model
      }, 200);
    } catch (error) {
      lastError = error;
      if (!TRANSIENT.has(error?.status)) break;
      await sleep(700);
    }
  }

  return json({
    error: lastError?.message || 'Non riesco a leggere i dati live dal link Pro Clubs Tracker tramite Gemini.',
    requested: parsed,
    source: 'gemini-url-context-proclubstracker'
  }, lastError?.status === 429 ? 429 : 502);
}

function parsePCTUrl(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, error: 'Il link non è valido.' };
  }
  const host = u.hostname.toLowerCase();
  if (host !== 'proclubstracker.com' && host !== 'www.proclubstracker.com') {
    return { ok: false, error: 'Devi incollare un link di proclubstracker.com.' };
  }
  const match = u.pathname.match(/^\/club\/(\d+)\/?$/i);
  if (!match) return { ok: false, error: 'Il link deve essere del tipo https://proclubstracker.com/club/328794?...' };
  const platform = String(u.searchParams.get('platform') || 'common-gen5').trim();
  if (!/^[a-z0-9-]+$/i.test(platform)) return { ok: false, error: 'La piattaforma nel link non è valida.' };
  return { ok: true, url: u.toString(), clubId: match[1], platform };
}

async function analyzeWithGemini({ apiKey, model, url, clubId, platform }) {
  const prompt = [
    'Sei un estrattore dati per EA SPORTS FC 27 Clubs.',
    'Devi leggere la pagina pubblica di Pro Clubs Tracker indicata nell’URL usando lo strumento URL Context.',
    'NON devi rispondere con un riassunto: devi estrarre dati strutturati reali dalla pagina.',
    'Usa il contenuto della pagina come fonte primaria e non inventare numeri.',
    `URL ESATTO DA LEGGERE: ${url}`,
    `CLUB ID ATTESO: ${clubId}`,
    `PLATFORM ATTESA: ${platform}`,
    'ESTRAI:',
    '1) dati generali del club e record cumulativo disponibile sulla pagina;',
    '2) TUTTI i giocatori che la pagina rende disponibili con statistiche cumulative: PG, gol, assist, voto/rating, OVR se presente e metriche di passaggio/contrasto se presenti;',
    '3) SOLO le 5 partite più recenti disponibili nella pagina, dalla più recente alla più vecchia, con risultato, punteggio e statistiche individuali per i giocatori quando la pagina le mostra.',
    'Per passaggi e contrasti, cerca preferibilmente valori riusciti/tentati. Se la pagina mostra solo la percentuale e non i conteggi, lascia i conteggi nulli e non inventarli.',
    'Per ogni giocatore nelle statistiche della singola partita indica side=home o side=away quando la pagina lo permette. Se non è possibile determinarlo, usa null.',
    'Per i giocatori che non compaiono in una partita non creare una presenza fittizia.',
    'Mantieni distinti dati cumulativi dei giocatori e dati delle ultime 5 partite.',
    'sourceNotes deve segnalare brevemente eventuali campi che la pagina non espone.',
    'Restituisci esclusivamente JSON conforme allo schema richiesto.'
  ].join('\n');

  const payload = {
    model,
    input: prompt,
    tools: [{ type: 'url_context' }],
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema
    }
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
        'Api-Revision': '2026-05-20'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
    if (!response.ok) {
      const error = new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const text = extractText(data);
    if (!text) throw new Error('Gemini non ha restituito il JSON della pagina.');
    return parseJsonOutput(text);
  } catch (error) {
    if (error?.name === 'AbortError') {
      error.status = 504;
      error.message = 'Timeout durante la lettura live della pagina Pro Clubs Tracker.';
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function extractText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const chunks = [];
  for (const step of Array.isArray(data?.steps) ? data.steps : []) {
    if (step?.type !== 'model_output') continue;
    for (const block of Array.isArray(step?.content) ? step.content : []) {
      if (block?.type === 'text' && typeof block.text === 'string') chunks.push(block.text);
    }
  }
  return chunks.join('\n').trim();
}

function parseJsonOutput(text) {
  const cleaned = String(text || '').replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error('Il modello ha restituito un formato JSON non leggibile.');
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
