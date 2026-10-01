export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Configura GEMINI_API_KEY nelle Environment Variables di Vercel.' });

  const { question, notes, data } = req.body || {};
  if (!question) return res.status(400).json({ error: 'Domanda mancante.' });

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const prompt = [
    'Sei l\'assistente analitico di una squadra EA SPORTS FC Clubs.',
    'Usa esclusivamente i dati ricevuti. Non inventare statistiche.',
    'Se una informazione non è presente, dillo chiaramente.',
    'Rispondi in italiano, in modo concreto e leggibile.',
    '',
    `DOMANDA:\n${question}`,
    '',
    `NOTE TATTICHE:\n${String(notes || '')}`,
    '',
    `DATI:\n${JSON.stringify(data || {})}`
  ].join('\n');

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: result?.error?.message || 'Errore Gemini.' });

    const answer = result?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    return res.status(200).json({ answer: answer || 'Gemini non ha restituito una risposta.' });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Errore del server.' });
  }
}
