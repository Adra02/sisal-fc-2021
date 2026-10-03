const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
export const maxDuration = 60;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
function safeJson(raw) { try { return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
function clampText(v, n = 1200) { return String(v || '').slice(0, n); }
function sanitizeObject(value, maxKeys = 30) {
  if (!value || typeof value !== 'object') return value ?? null;
  if (Array.isArray(value)) return value.slice(0, 50).map(x => sanitizeObject(x, 20));
  const out = {};
  for (const key of Object.keys(value).slice(0, maxKeys)) {
    const v = value[key];
    if (typeof v === 'string') out[key] = v.slice(0, 500);
    else if (typeof v === 'number' || typeof v === 'boolean' || v == null) out[key] = v;
    else out[key] = sanitizeObject(v, 15);
  }
  return out;
}
function sanitizeClub(value) {
  if (!value || typeof value !== 'object') return null;
  return sanitizeObject({
    dataStatus: value.dataStatus,
    team: value.team,
    summary: value.summary,
    players: value.players,
    recent5: value.recent5
  }, 12);
}
function promptFor(body) {
  const mode = body?.mode === 'opponent' ? 'scouting dell’avversario' : 'analisi della propria squadra';
  return [
    'Sei l’assistente tattico di EA SPORTS FC 27 Clubs.',
    `Stai facendo ${mode}.`,
    'Rispondi esclusivamente sulla base dei dati reali del club presenti nel contesto.',
    'Non inventare numeri, giocatori, risultati o caratteristiche.',
    'Distingui sempre tra dati osservati e inferenze tattiche.',
    'Recent5 indica le ultime 5 partite disponibili; cumulative indica i dati cumulativi disponibili.',
    'Usa passMade/passAttempts e tackleMade/tackleAttempts per calcolare le percentuali quando i due valori esistono.',
    'Se un dato è null o assente, dichiaralo come non disponibile.',
    'Puoi usare la knowledge FC27 come contesto tattico generale, ma non per inventare dati del club.',
    'Rispondi in italiano, massimo 300 parole, con sezioni brevi e leggibili.',
    '',
    `RICHIESTA UTENTE:\n${clampText(body?.question, 1600)}`,
    '',
    `CONTESTO:\n${JSON.stringify({
      mode: body?.mode || 'normal',
      formation: sanitizeObject(body?.formation, 10),
      notes: clampText(body?.notes, 1200),
      team: sanitizeClub(body?.team),
      opponent: body?.mode === 'opponent' ? sanitizeClub(body?.opponent) : null,
      knowledge: sanitizeObject(body?.knowledge, 8)
    })}`
  ].join('\n');
}

async function askGemini(apiKey, prompt) {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1600,
        thinkingConfig: { thinkingLevel: 'low' }
      }
    })
  });
  const raw = await response.text();
  const data = safeJson(raw);
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
    error.status = response.status;
    error.details = data?.error?.details || [];
    throw error;
  }
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join('')?.trim();
  if (!text) throw new Error('Gemini non ha restituito testo.');
  return text;
}

export async function POST(request) {
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405);
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return json({ error: 'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.', code: 'MISSING_GEMINI_API_KEY', model: GEMINI_MODEL }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'Richiesta JSON non valida.', code: 'BAD_JSON' }, 400); }
  const question = String(body?.question || '').trim();
  if (!question) return json({ error: 'Scrivi una domanda.', code: 'MISSING_QUESTION' }, 400);
  const startedAt = Date.now();
  try {
    const answer = await askGemini(apiKey, promptFor(body));
    return json({ ok: true, answer, model: GEMINI_MODEL, source: 'gemini', geminiRequests: 1, searchGrounding: false, elapsedMs: Date.now() - startedAt }, 200);
  } catch (error) {
    const status = Number(error?.status || 502);
    const quotaDetails = Array.isArray(error?.details) ? error.details.filter(Boolean).slice(0, 4) : [];
    return json({
      ok: false,
      error: error?.message || 'Errore Gemini.',
      code: status === 429 ? 'GEMINI_QUOTA' : 'GEMINI_REQUEST_FAILED',
      model: GEMINI_MODEL,
      status,
      searchGrounding: false,
      geminiRequests: 1,
      quotaDetails,
      elapsedMs: Date.now() - startedAt
    }, Math.min(Math.max(status, 400), 504));
  }
}
