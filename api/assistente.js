function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite'
];
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
export const maxDuration = 120;

export async function POST(request) {
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405);
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return json({ error: 'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.' }, 500);

  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'Richiesta non valida.' }, 400); }
  const question = String(body?.question || '').trim();
  if (!question) return json({ error: 'Scrivi una domanda.' }, 400);

  const mode = body?.mode === 'opponent' ? 'opponent' : 'normal';
  const team = body?.team || null;
  const opponent = body?.opponent || null;
  const formation = body?.formation || null;
  const notes = String(body?.notes || '');
  const knowledge = sanitizeKnowledge(body?.knowledge);

  const system = [
    'Sei l’assistente tattico di EA SPORTS FC 27 Clubs.',
    'Usa i dati forniti e non inventare numeri.',
    'recent5 è la forma recente. cumulative/summary descrivono il totale disponibile.',
    'Passaggi riusciti/tentati = passMade/passAttempts. Contrasti riusciti/tentati = tackleMade/tackleAttempts.',
    'Distingui dati osservati da inferenze tattiche.',
    'Fonti ufficiali EA > evidenza community ripetuta > singola opinione di creator.',
    'Rispondi in italiano, massimo 220 parole, massimo 4 sezioni. Risposta pratica subito; niente elenco giocatore-per-giocatore salvo richiesta esplicita.'
  ].join('\n');

  const prompt = `${system}\n\nRICHIESTA:\n${question}\n\nDATI:\n${JSON.stringify({ mode, team, opponent, formation, notes, knowledge })}`;
  let last = null;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await callGemini({ apiKey, model, prompt, short: attempt === 1 });
        return json({ answer: text, model, source: 'gemini' });
      } catch (error) {
        last = normalizeError(error);
        if (!RETRYABLE.has(last.status) && !/high demand|temporarily|unavailable|overloaded/i.test(last.message)) break;
        await sleep(attempt === 0 ? 900 : 1700);
      }
    }
  }

  return json({
    answer: localFallback({ mode, team, opponent }),
    model: null,
    source: 'local-fallback',
    detail: last?.message || 'Gemini non disponibile.'
  }, 200);
}

async function callGemini({ apiKey, model, prompt, short }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const finalPrompt = short
      ? `${prompt}\n\nRIDUCI: massimo 140 parole, massimo 3 sezioni.`
      : prompt;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: short ? 850 : 1200 }
      }),
      signal: controller.signal
    });
    const raw = await response.text();
    const data = safeJson(raw);
    if (!response.ok) {
      const e = new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
      e.status = response.status;
      throw e;
    }
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join('').trim();
    if (!text) throw Object.assign(new Error('Gemini non ha restituito testo.'), { status: 502 });
    return text;
  } catch (error) {
    if (error?.name === 'AbortError') throw Object.assign(new Error('Timeout Gemini.'), { status: 504 });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(raw) { try { return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
function normalizeError(error) { return { message: String(error?.message || 'Errore Gemini.'), status: Number.isFinite(error?.status) ? error.status : null }; }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function sanitizeKnowledge(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    updatedAt: value.updatedAt || null,
    videosAnalyzed: Number(value.videosAnalyzed || 0),
    insights: Array.isArray(value.insights) ? value.insights.slice(0, 30).map(item => ({
      sourceType: item?.sourceType || null, title: item?.title || null, url: item?.url || null,
      publishedAt: item?.publishedAt || null, evidenceLevel: item?.evidenceLevel || null,
      confidence: item?.confidence || null, summary: item?.summary || null,
      coachingPoints: item?.coachingPoints || [], tacticalFindings: item?.tacticalFindings || [],
      patchOrMetaClaims: item?.patchOrMetaClaims || [], caveats: item?.caveats || []
    })) : []
  };
}

function localFallback({ mode, team, opponent }) {
  const source = mode === 'opponent' ? opponent : team;
  const summary = source?.summary || {};
  const recent = summary.recent5 || {};
  const cumulative = summary.cumulative || {};
  const name = source?.team?.name || 'Squadra';
  const lines = [
    'ANALISI AUTOMATICA',
    `${name}: ultime 5 ${recent.wins || 0}V-${recent.draws || 0}P-${recent.losses || 0}S, ${recent.goals || 0} gol fatti / ${recent.against || 0} subiti.`,
    `Totale disponibile: ${cumulative.matches || 0} partite, ${cumulative.goals || 0} gol fatti / ${cumulative.against || 0} subiti.`
  ];
  if (recent.passRate != null) lines.push(`Passaggi recenti: ${Number(recent.passRate).toFixed(1)}%.`);
  if (recent.tackleRate != null) lines.push(`Contrasti recenti: ${Number(recent.tackleRate).toFixed(1)}%.`);
  if (mode === 'opponent') lines.push('Usa questi dati come base tattica finché Gemini non torna disponibile.');
  return lines.join('\n');
}
