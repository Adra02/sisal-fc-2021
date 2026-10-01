export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.' });

  const body = req.body || {};
  const question = String(body.question || '').trim();
  if (!question) return res.status(400).json({ error: 'Scrivi una domanda.' });

  const model = 'gemini-3.8-flash';
  const data = body.data || {};
  const notes = String(body.notes || '');
  const prompt = [
    'Sei l’assistente analitico di una squadra EA SPORTS FC Clubs.',
    'Usa soltanto i dati ricevuti. Non inventare statistiche, partite, giocatori o risultati.',
    'Se un dato non è disponibile, dichiaralo chiaramente.',
    'Rispondi in italiano, in modo pratico e leggibile.',
    '',
    'DOMANDA:', question,
    '',
    'NOTE TATTICHE:', notes,
    '',
    'DATI DEL DASHBOARD:', JSON.stringify(data)
  ].join('\n');

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: result?.error?.message || 'Errore Gemini.' });
    const answer = result?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    return res.status(200).json({ answer: answer || 'Gemini non ha restituito una risposta.' });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Errore del server.' });
  }
}
