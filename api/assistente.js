const { GoogleGenAI } = require('@google/genai');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito. Usa POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chiave GEMINI_API_KEY non configurata nei segreti di Vercel.' });
  }

  try {
    const { clubData, modulo, formazione, comeGiochiamo, domandaUtente } = req.body;

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Sei l'Assistente Tattico Senior di FC 27 Pro Clubs per la squadra "Sisal FC 2021".
Fornisci consigli tattici ed esecutivi chiari e diretti.
REGOLE RIGIDE:
1. Rispondi SEMPRE in italiano.
2. Usa solo testo semplice (niente elenchi puntati complessi o marcatori pesanti, massimo 2 brevi paragrafi).
3. Lunghezza MAX: 170 parole.
4. Non inventare dati non presenti nel contesto.
5. Considera le meccaniche di FC 27: difesa contenitiva con L2/LT, gestione dei filtranti, posizionamento dei difensori centrali, transizioni veloci.`;

    const prompt = `
Dati Squadra: ${JSON.stringify(clubData || {})}
Modulo Impostato: ${modulo || 'Non specificato'}
Titolari Schierati: ${JSON.stringify(formazione || {})}
Stile/Istruzioni squadra: ${comeGiochiamo || 'Nessuna indicazione fornita'}

Domanda del Mister/Giocatore: ${domandaUtente || 'Fornisci una breve analisi tattica per migliorare il rendimento generale.'}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5,
        maxOutputTokens: 300,
      }
    });

    return res.status(200).json({ risposta: response.text });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Errore nell\'elaborazione della risposta da parte dell\'Assistente IA.',
      details: error.message 
    });
  }
};
