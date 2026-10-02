function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite'
];

const TRANSIENT = new Set([408, 429, 500, 502, 503, 504]);
export const maxDuration = 120;

export async function POST(request) {
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405);

  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return json({ error: 'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.' }, 500);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Richiesta non valida.' }, 400);
  }

  const question = String(body?.question || '').trim();
  if (!question) return json({ error: 'Scrivi una domanda.' }, 400);

  const mode = body?.mode === 'opponent' ? 'opponent' : 'normal';
  const team = body?.team || null;
  const opponent = body?.opponent || null;
  const formation = body?.formation || null;
  const notes = String(body?.notes || '');
  const knowledge = sanitizeKnowledge(body?.knowledge);

  const system = mode === 'opponent'
    ? [
        'Sei un analista tattico professionale di EA SPORTS FC Clubs.',
        'Stai facendo scouting dell’avversario sulla base dei dati reali forniti dal dashboard.',
        'Usa solo i numeri disponibili e non inventare dati.',
        'I dati cumulative sono separati da recent5. Le ultime 5 servono per la forma recente; le statistiche cumulative descrivono il totale disponibile.',
        'Passaggi riusciti/tentati = passMade/passAttempts. Contrasti riusciti/tentati = tackleMade/tackleAttempts. Calcola le percentuali come riusciti ÷ tentati × 100.',
        'Non trasformare un’inferenza tattica in un fatto. Collega sempre l’inferenza ai dati che la sostengono.',
        'La knowledge FC27 usa fonti ufficiali EA come priorità e fonti community come evidenza secondaria.',
        'Rispondi in italiano, massimo 220 parole, massimo 4 sezioni. Dai subito il punto pratico più importante e non fare un elenco giocatore-per-giocatore salvo richiesta esplicita.'
      ].join('\n')
    : [
        'Sei l’assistente tattico professionale di una squadra EA SPORTS FC Clubs.',
        'Usa tutti i dati numerici forniti e non inventare statistiche.',
        'I dati cumulative sono separati da recent5. Le ultime 5 servono per la forma; le statistiche cumulative descrivono il totale disponibile.',
        'Passaggi riusciti/tentati = passMade/passAttempts. Contrasti riusciti/tentati = tackleMade/tackleAttempts. Calcola le percentuali come riusciti ÷ tentati × 100.',
        'Non dichiarare una statistica mancante quando il relativo valore numerico è presente.',
        'Distingui sempre tra dato osservato e inferenza tattica.',
        'La knowledge FC27 usa fonti ufficiali EA come priorità e fonti community come evidenza secondaria.',
        'Rispondi in italiano, massimo 220 parole, massimo 4 sezioni. Dai la risposta pratica per prima e non fare un elenco giocatore-per-giocatore salvo richiesta esplicita.'
      ].join('\n');

  const payload = {
    question,
    mode,
    team,
    opponent,
    formation,
    notes,
    knowledge,
    knowledgePolicy: 'official EA > repeated community evidence > single creator opinion'
  };

  const prompt = `${system}\n\nRICHIESTA UTENTE:\n${question}\n\nDATI STRUTTURATI:\n${JSON.stringify(payload)}`;

  let lastError = null;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const answer = await askGemini({ model, apiKey, prompt, short: attempt === 1 });
        return json({ answer: answer.text, model, source: 'gemini' }, 200);
      } catch (error) {
        lastError = error;
        if (!TRANSIENT.has(error?.status)) break;
        await wait(600 * (attempt + 1));
      }
    }
  }

  return fallback({ mode, team, opponent, error: lastError });
}

async function askGemini({ model, apiKey, prompt, short }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const finalPrompt = short
    ? `${prompt}\n\nRIDUCI ANCORA: massimo 140 parole, massimo 3 sezioni, niente introduzione.`
    : prompt;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: short ? 850 : 1200
        }
      }),
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

    const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!text) throw new Error('Gemini non ha restituito testo.');
    return { text };
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Timeout Gemini.');
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeKnowledge(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    updatedAt: value.updatedAt || null,
    videosAnalyzed: Number(value.videosAnalyzed || 0),
    insights: Array.isArray(value.insights)
      ? value.insights.slice(0, 30).map(item => ({
          sourceType: item?.sourceType || null,
          title: item?.title || null,
          url: item?.url || null,
          publishedAt: item?.publishedAt || null,
          evidenceLevel: item?.evidenceLevel || null,
          confidence: item?.confidence || null,
          summary: item?.summary || null,
          coachingPoints: item?.coachingPoints || [],
          tacticalFindings: item?.tacticalFindings || [],
          patchOrMetaClaims: item?.patchOrMetaClaims || [],
          caveats: item?.caveats || []
        }))
      : []
  };
}

function fallback({ mode, team, opponent, error }) {
  const source = mode === 'opponent' ? opponent : team;
  const summary = source?.summary;
  if (!summary) {
    return json({
      answer: 'Gemini non è disponibile in questo momento e non ci sono abbastanza dati per generare un’analisi automatica.',
      model: null,
      source: 'local-fallback',
      detail: error?.message || 'Gemini non disponibile.'
    }, 200);
  }

  const recent = summary.recent5 || {};
  const cumulative = summary.cumulative || {};
  const lines = [
    'ANALISI AUTOMATICA',
    `${source?.team?.name || 'Squadra'}: ultime 5 ${recent.wins || 0}V-${recent.draws || 0}P-${recent.losses || 0}S, ${recent.goals || 0} gol fatti e ${recent.against || 0} subiti.`,
    `Totale disponibile: ${cumulative.matches || 0} partite, ${cumulative.goals || 0} gol fatti e ${cumulative.against || 0} subiti.`
  ];

  if (recent.passRate != null) lines.push(`Passaggi recenti: ${Number(recent.passRate).toFixed(1)}%.`);
  if (recent.tackleRate != null) lines.push(`Contrasti recenti: ${Number(recent.tackleRate).toFixed(1)}%.`);
  if (mode === 'opponent') lines.push('Usa questi dati come base per impostare la partita finché Gemini non torna disponibile.');

  return json({
    answer: lines.join('\n'),
    model: null,
    source: 'local-fallback',
    detail: error?.message || 'Gemini non disponibile.'
  }, 200);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
