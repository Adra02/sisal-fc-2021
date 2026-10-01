module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.' });

  const body = req.body || {};
  const question = String(body.question || '').trim();
  if (!question) return res.status(400).json({ error: 'Scrivi una domanda.' });

  // 3.8 è il modello principale attuale. In caso di 429/503 il codice
  // segue la strategia consigliata da Google: retry con backoff e fallback.
  const models = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite'
  ];

  const mode = body.mode === 'opponent' ? 'opponent' : 'normal';
  const system = mode === 'opponent'
    ? [
        'Sei un analista tattico di EA SPORTS FC Clubs.',
        'Devi fare scouting dell AVVERSARIO usando esclusivamente i dati JSON compattati ricevuti.',
        'Non inventare valori o fatti. Distingui chiaramente dati osservati da inferenze tattiche.',
        'Analizza: rendimento complessivo, forma recente, produzione offensiva, solidita difensiva, efficienza passaggi/contrasti quando disponibili, giocatori chiave, dipendenza da singoli giocatori, pattern contro avversari, punti forti, punti deboli, come limitarli, dove attaccarli, piano gara consigliato e limiti dei dati.',
        'Rispondi in italiano con sezioni chiare e consigli concreti per una squadra Clubs.'
      ].join('\n')
    : [
        'Sei l assistente tattico di una squadra EA SPORTS FC Clubs.',
        'Usa esclusivamente i dati ricevuti. Non inventare statistiche, risultati, giocatori o prestazioni.',
        'Distingui sempre tra dato misurato e inferenza tattica.',
        'Quando mancano dati, dichiaralo esplicitamente.',
        'Analizza giocatori, forma, gol, assist, voti, passaggi, contrasti, partite e formazione quando richiesto.',
        'Rispondi in italiano, in modo pratico, ordinato e utile a un capitano.'
      ].join('\n');

  const payload = {
    ourTeam: body.team || null,
    opponent: body.opponent || null,
    currentFormation: body.formation || null,
    notes: String(body.notes || ''),
    instruction: question
  };

  const prompt = `${system}\n\nRICHIESTA UTENTE:\n${question}\n\nDATI:\n${JSON.stringify(payload)}`;

  async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function callModel(model, attempt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1800,
          topP: 0.9
        }
      })
    });
    const text = await response.text();
    let data = {};
    try { data = JSON.parse(text); } catch (_) {}
    if (response.ok) {
      const answer = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
      if (answer) return { answer, model };
      throw new Error('Il modello non ha restituito testo.');
    }
    const err = new Error(data?.error?.message || `Errore Gemini HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  let lastError = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await wait(1500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 600));
        const result = await callModel(model, attempt);
        return res.status(200).json({ answer: result.answer, model: result.model });
      } catch (error) {
        lastError = error;
        const retryable = [408, 429, 500, 502, 503, 504].includes(error.status);
        if (!retryable) break;
      }
    }
  }

  const detail = lastError?.message || 'Errore temporaneo del servizio Gemini.';
  return res.status(503).json({
    error: `Gemini non ha risposto dopo i tentativi e i modelli di riserva. Dettaglio: ${detail}`
  });
};
