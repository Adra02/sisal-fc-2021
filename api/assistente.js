module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Prende la chiave direttamente ed esclusivamente dalle variabili d'ambiente
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Chiave API Gemini non configurata." });
  }

  try {
    const { messaggio, clubData, formazioneData, comeGiochiamo } = req.body || {};

    const promptSistema = `
Sei l'assistente IA esperto e match analyst del club 'Sisal FC 2021' su EA Sports FC 27 Pro Clubs.
Conosci perfettamente il meta di FC 27 Pro Clubs:
1. La difesa manuale è fondamentale (contenimento con L2/LT, i Bot difensivi non pressano e tendono a farsi superare sui lanci lunghi se non protetti).
2. I passaggi filtranti alti e bassi sono letali: serve sempre copertura preventiva.
3. Bisogna valorizzare i PlayStyle+ dei giocatori reali (es. Passaggio Filtrante+, Tiro a Giro+, Intercettazione+).
4. I Bot non devono MAI stare in attacco; la fase offensiva è gestita solo dai giocatori umani. I Bot restano in Porta o in Difesa Centrale.

DATI CLUB ATTUALI:
${JSON.stringify(clubData || {}, null, 2)}

FORMAZIONE ATTUALE:
${JSON.stringify(formazioneData || {}, null, 2)}

FILOSOFIA DI GIOCO SQUADRA:
"${comeGiochiamo || 'Nessuna nota specifica inserita.'}"

RICHIESTA UTENTE:
"${messaggio || 'Fornisci un'analisi generale e consigli tattici per la prossima serata.'}"

REGOLE PER LA RISPOSTA:
- Rispondi in italiano.
- Massimo 170 parole.
- Usa un tono chiaro, professionale e motivante da match analyst.
- Non inventare dati o statistiche non presenti.
- Modello utilizzato: gemini-1.5-flash.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptSistema }] }]
      })
    });

    const data = await response.json();
    const rispostaTesto = data.candidates?.[0]?.content?.parts?.[0]?.text || "Impossibile generare un consiglio al momento. Riprova più tardi.";

    return res.status(200).json({ risposta: rispostaTesto, modello: "gemini-1.5-flash" });
  } catch (error) {
    return res.status(500).json({ error: "Errore durante la comunicazione con Gemini IA." });
  }
};
