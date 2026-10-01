const https = require('https');

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
    const { clubData, modulo, formazione, comeGiochiamo, domandaUtente } = req.body || {};

    const promptText = `Sei l'Assistente Tattico Senior di FC 27 Pro Clubs per la squadra "Sisal FC 2021".
REGOLE RIGIDE:
1. Rispondi SEMPRE in italiano.
2. Usa solo testo semplice (max 2 brevi paragrafi).
3. Lunghezza MAX: 170 parole.
4. Non inventare dati non presenti nel contesto.
5. Considera le meccaniche di FC 27: difesa contenitiva con L2/LT, gestione dei filtranti, posizionamento dei difensori centrali.

Dati Squadra: ${JSON.stringify(clubData || {})}
Modulo Impostato: ${modulo || 'Non specificato'}
Titolari Schierati: ${JSON.stringify(formazione || {})}
Stile/Istruzioni squadra: ${comeGiochiamo || 'Nessuna indicazione fornita'}

Domanda del Mister/Giocatore: ${domandaUtente || 'Fornisci una breve analisi tattica per migliorare il rendimento generale.'}`;

    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [{ text: promptText }]
        }
      ]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const data = await new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const request = https.request(url, options, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Risposta API non in formato JSON valido'));
            }
          } else {
            reject(new Error(`Errore API Gemini: Status ${response.statusCode} - ${body}`));
          }
        });
      });

      request.on('error', (err) => reject(err));
      request.write(requestBody);
      request.end();
    });

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nessuna risposta generata dall\'assistente.';
    return res.status(200).json({ risposta: aiText });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Errore nell\'elaborazione della risposta da parte dell\'Assistente IA.',
      details: error.message 
    });
  }
};
