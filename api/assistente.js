"use strict";

const GEMINI_MODEL = "gemini-3.8-flash";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  GEMINI_MODEL +
  ":generateContent";

const MAX_CONTEXT_CHARS = 6000;
const MAX_QUESTION_CHARS = 1500;
const MAX_NOTES_CHARS = 1500;


function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
}


function truncateText(value, maxLength) {

  const text = String(value ?? "");

  if (text.length <= maxLength) {
    return text;
  }

  return (
    text.slice(0, Math.max(0, maxLength - 40)) +
    "\n...[TRONCATO DAL SERVER]..."
  );
}


function safeJson(value) {

  try {
    return JSON.stringify(value);
  } catch (error) {
    return "{}";
  }

}


function cleanRoster(roster) {

  if (!Array.isArray(roster)) {
    return [];
  }

  return roster.map(player => ({
    name:
      player?.name ??
      player?.proName ??
      player?.gamertag ??
      "Giocatore",

    gamesPlayed:
      Number(player?.gamesPlayed ?? 0),

    goals:
      Number(player?.goals ?? 0),

    assists:
      Number(player?.assists ?? 0),

    ratingAve:
      Number(player?.ratingAve ?? 0),

    position:
      player?.position ?? ""
  }));

}


function cleanMatches(matches) {

  if (!Array.isArray(matches)) {
    return [];
  }

  return matches
    .slice(0, 20)
    .map(match => ({

      date:
        match?.timestamp ??
        match?.date ??
        null,

      type:
        match?.type ??
        match?.matchType ??
        "leagueMatch",

      ourClubName:
        match?.ourClubName ??
        "Sisal FC 2021",

      opponentName:
        match?.opponentName ??
        "Avversario",

      ourScore:
        match?.ourScore === null ||
        match?.ourScore === undefined
          ? null
          : Number(match.ourScore),

      opponentScore:
        match?.opponentScore === null ||
        match?.opponentScore === undefined
          ? null
          : Number(match.opponentScore)

    }));

}


function buildContext(body) {

  const contextObject = {

    club: {
      name:
        body?.club?.name ??
        "Sisal FC 2021",

      id:
        body?.club?.id ??
        "328794",

      platform:
        body?.club?.platform ??
        "common-gen5"
    },

    formation:
      body?.formation ??
      "4-1-2-1-2",

    roster:
      cleanRoster(body?.roster),

    matches:
      cleanMatches(body?.matches),

    tacticalNotes:
      truncateText(
        body?.notes ?? "",
        MAX_NOTES_CHARS
      )

  };


  let serialized =
    safeJson(contextObject);


  if (
    serialized.length >
    MAX_CONTEXT_CHARS
  ) {

    serialized =
      truncateText(
        serialized,
        MAX_CONTEXT_CHARS
      );

  }


  return serialized;

}


function buildPrompt(body) {

  const formation =
    body?.formation ||
    "4-1-2-1-2";


  const question =
    truncateText(
      body?.question || "",
      MAX_QUESTION_CHARS
    );


  const context =
    buildContext(body);


  return `
Sei il coach tattico IA del club "Sisal FC 2021" su EA SPORTS FC 27 Clubs.

Rispondi esclusivamente in italiano.

Il tuo compito è aiutare una squadra competitiva a migliorare tattica, organizzazione e rendimento.

MODULO ATTUALMENTE SELEZIONATO:
${formation}

DATI DISPONIBILI:
${context}

REGOLE IMPORTANTI:

1. Usa i dati reali presenti nel contesto.
2. Non inventare giocatori, statistiche, risultati o informazioni.
3. Se manca un dato, dillo chiaramente.
4. Non cambiare il modulo selezionato.
5. Dai consigli specifici per i ruoli.
6. Considera difesa manuale, contenimento L2/LT, secondo uomo, coperture e linee di passaggio.
7. Considera transizione positiva e negativa.
8. Considera la distanza tra difesa, centrocampo e attacco.
9. Evita consigli generici quando puoi essere concreto.
10. Se analizzi una statistica, usa il valore realmente fornito.
11. Se analizzi le partite, considera i risultati presenti nei dati.
12. Quando consigli un movimento, specifica quale ruolo deve farlo.
13. Rispondi come un vero coach di Clubs competitivo.
14. Mantieni la risposta chiara e leggibile.
15. Non dire che hai visto dati che non sono stati forniti.

STRUTTURA CONSIGLIATA:

### Analisi
Breve spiegazione del problema.

### Cosa fare
Indicazioni pratiche.

### Ruoli coinvolti
Indica quali giocatori/ruoli devono modificare il comportamento.

### Durante la partita
Cosa fare concretamente in partita.

DOMANDA DEL CAPITANO:
${question}
`.trim();

}


function extractGeminiText(data) {

  const candidates =
    Array.isArray(data?.candidates)
      ? data.candidates
      : [];


  if (!candidates.length) {
    return "";
  }


  const parts =
    candidates[0]?.content?.parts;


  if (!Array.isArray(parts)) {
    return "";
  }


  return parts
    .filter(
      part =>
        typeof part?.text === "string"
    )
    .map(part => part.text)
    .join("\n")
    .trim();

}


async function readRequestBody(req) {

  if (
    req &&
    req.body !== undefined
  ) {

    if (
      typeof req.body === "string"
    ) {

      try {

        return JSON.parse(req.body);

      } catch (error) {

        throw new Error(
          "Il body JSON della richiesta non è valido."
        );

      }

    }

    return req.body;

  }

  return {};

}


module.exports = async function handler(
  req,
  res
) {

  setCorsHeaders(res);


  if (req.method === "OPTIONS") {

    return res
      .status(204)
      .end();

  }


  if (req.method !== "POST") {

    return res
      .status(405)
      .json({
        error:
          "Metodo non consentito. Usa POST."
      });

  }


  const apiKey =
    process.env.GEMINI_API_KEY;


  if (!apiKey) {

    return res
      .status(500)
      .json({
        error:
          "GEMINI_API_KEY non configurata nelle Environment Variables di Vercel."
      });

  }


  try {

    const body =
      await readRequestBody(req);


    const question =
      String(
        body?.question || ""
      ).trim();


    if (!question) {

      return res
        .status(400)
        .json({
          error:
            "La domanda è obbligatoria."
        });

    }


    const prompt =
      buildPrompt(body);


    const url =
      `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;


    const geminiResponse =
      await fetch(
        url,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              contents: [
                {
                  role: "user",

                  parts: [
                    {
                      text: prompt
                    }
                  ]

                }
              ],

              generationConfig: {

                temperature: 0.55,

                topP: 0.9,

                maxOutputTokens: 1800

              }

            })

        }
      );


    let geminiData;


    try {

      geminiData =
        await geminiResponse.json();

    } catch (error) {

      return res
        .status(502)
        .json({
          error:
            "Gemini ha restituito una risposta non interpretabile."
        });

    }


    if (!geminiResponse.ok) {

      const upstreamMessage =
        geminiData?.error?.message ||
        geminiData?.error?.status ||
        "Errore API Gemini.";


      return res
        .status(502)
        .json({
          error:
            `Gemini: ${upstreamMessage}`
        });

    }


    const answer =
      extractGeminiText(
        geminiData
      );


    if (!answer) {

      return res
        .status(502)
        .json({
          error:
            "Gemini non ha restituito contenuto testuale."
        });

    }


    return res
      .status(200)
      .json({

        ok: true,

        model:
          GEMINI_MODEL,

        answer

      });


  } catch (error) {

    console.error(
      "Errore assistente:",
      error
    );


    return res
      .status(500)
      .json({
        error:
          error?.message ||
          "Errore interno del server."
      });

  }

};