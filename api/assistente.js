"use strict";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  GEMINI_MODEL +
  ":generateContent";

const MAX_CONTEXT_CHARS = 3000;
const MAX_QUESTION_CHARS = 1500;
const MAX_NOTES_CHARS = 1000;

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
    text.slice(0, Math.max(0, maxLength - 30)) +
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

  return roster.map((player) => ({
    name: player?.name ?? "",
    gamesPlayed: Number(player?.gamesPlayed ?? 0),
    goals: Number(player?.goals ?? 0),
    assists: Number(player?.assists ?? 0),
    ratingAve: Number(player?.ratingAve ?? 0),
    position: player?.position ?? ""
  }));
}

function cleanMatches(matches) {
  if (!Array.isArray(matches)) {
    return [];
  }

  return matches.slice(0, 20).map((match) => ({
    date: match?.timestamp ?? match?.date ?? null,
    type: match?.type ?? "leagueMatch",
    ourClubName: match?.ourClubName ?? "Sisal FC 2021",
    opponentName: match?.opponentName ?? "Avversario",
    ourScore:
      match?.ourScore === null || match?.ourScore === undefined
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
      name: body?.club?.name ?? "Sisal FC 2021",
      id: body?.club?.id ?? "328794",
      platform: body?.club?.platform ?? "common-gen5"
    },
    formation: body?.formation ?? "4-2-3-1",
    roster: cleanRoster(body?.roster),
    matches: cleanMatches(body?.matches),
    tacticalNotes: truncateText(
      body?.notes ?? "",
      MAX_NOTES_CHARS
    )
  };

  let serialized = safeJson(contextObject);

  if (serialized.length > MAX_CONTEXT_CHARS) {
    serialized = truncateText(
      serialized,
      MAX_CONTEXT_CHARS
    );
  }

  return serialized;
}

function buildPrompt(body) {
  const formation = body?.formation || "4-2-3-1";

  const question = truncateText(
    body?.question || "",
    MAX_QUESTION_CHARS
  );

  const context = buildContext(body);

  return `
Sei l'assistente tattico di "Sisal FC 2021", squadra che gioca EA Sports FC Pro Clubs.

Devi rispondere in italiano.

OBIETTIVO:
Fornire indicazioni tattiche pratiche e specifiche per il modulo attualmente selezionato.

MODULO ATTUALE:
${formation}

MECCANICHE DA CONSIDERARE:
- Difesa manuale e contenimento con L2/LT quando pertinente.
- Pressione del secondo uomo solo quando la copertura rimane sicura.
- Compattezza verticale e orizzontale.
- Transizione negativa immediata dopo perdita palla.
- Transizione positiva dopo recupero.
- Copertura delle linee di passaggio.
- Attenzione alla profondità e agli spazi tra centrale e terzino.
- Coordinazione tra pressione del primo uomo e copertura del secondo.
- Gestione prudente dei terzini/esterni quando la squadra è sbilanciata.
- In costruzione, privilegia triangoli, linee di passaggio sicure e cambio lato quando un corridoio è congestionato.

REGOLE:
1. Basa l'analisi sui dati forniti nel contesto.
2. Non inventare statistiche, risultati o informazioni mancanti.
3. Se un dato non è presente, dichiaralo esplicitamente.
4. Non cambiare il modulo richiesto dall'utente.
5. Quando proponi un movimento, specifica quale ruolo dovrebbe farlo.
6. Evita consigli generici quando puoi essere specifico.
7. Non presentare come fatto certo qualcosa che dipende dalle impostazioni personali del giocatore.
8. Rispondi in modo operativo, come un coach di una squadra competitiva.
9. Mantieni la risposta indicativamente entro 500-700 parole, salvo necessità.
10. Usa una struttura leggibile con titoli brevi.

CONTESTO DATI:
${context}

DOMANDA:
${question}
`.trim();
}

function extractGeminiText(data) {
  const candidates = Array.isArray(data?.candidates)
    ? data.candidates
    : [];

  if (!candidates.length) {
    return "";
  }

  const parts = candidates[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .filter((part) => typeof part?.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

async function readRequestBody(req) {
  if (req && req.body !== undefined) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch (error) {
        throw new Error("Il body JSON della richiesta non è valido.");
      }
    }

    return req.body;
  }

  return {};
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo non consentito. Usa POST."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "Variabile GEMINI_API_KEY non configurata nelle Environment Variables di Vercel."
    });
  }

  try {
    const body = await readRequestBody(req);

    const question = String(body?.question || "").trim();

    if (!question) {
      return res.status(400).json({
        error: "La domanda è obbligatoria."
      });
    }

    const prompt = buildPrompt(body);

    const url =
      `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
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
          maxOutputTokens: 1400
        }
      })
    });

    let geminiData;

    try {
      geminiData = await geminiResponse.json();
    } catch (error) {
      return res.status(502).json({
        error:
          "Gemini ha restituito una risposta non interpretabile."
      });
    }

    if (!geminiResponse.ok) {
      const upstreamMessage =
        geminiData?.error?.message ||
        geminiData?.error?.status ||
        "Errore API Gemini.";

      return res.status(502).json({
        error: `Gemini: ${upstreamMessage}`
      });
    }

    const answer = extractGeminiText(geminiData);

    if (!answer) {
      return res.status(502).json({
        error:
          "Gemini non ha restituito contenuto testuale."
      });
    }

    return res.status(200).json({
      ok: true,
      model: GEMINI_MODEL,
      answer
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error?.message ||
        "Errore interno del server."
    });
  }
};