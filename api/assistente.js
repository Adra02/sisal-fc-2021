// Funzione serverless Vercel. La chiave GEMINI_API_KEY è letta solo qui, mai nel frontend.
import { readFile } from "node:fs/promises";
import path from "node:path";

const MODELS = [...new Set([process.env.GEMINI_MODEL, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"].filter(Boolean))];
const MAX_QUESTION = 600;
const MAX_CONTEXT_CHARS = 45000;
const MAX_WORDS = 330;
const TIMEOUT_MS = 25000;
const hits = new Map(); // limite semplice per IP (best effort)

const SYSTEM = `Sei l'assistente tattico di un club di EA SPORTS FC 27 Clubs. Rispondi SEMPRE in italiano.
REGOLE DI STILE: massimo 280 parole e massimo 4 sezioni brevi. Testo semplice, niente tabelle. Sii concreto e tattico.
Se la domanda è "chi è nel ruolo sbagliato", NON fare liste lunghe: rispondi con 1) chi, 2) perché, 3) i dati che lo dimostrano, 4) cosa provare.
REGOLE SUI DATI:
- "cumulative" sono statistiche su tutta la stagione/dati caricati: NON sono le ultime 5 partite.
- "recent5" sono solo le ultime 5 partite: NON sono statistiche totali. Non confondere mai i due gruppi.
- Se un dato è null o N/D, dillo: non inventarlo. L'OVR va usato solo se presente.
- Il reparto osservato è un'inferenza dai dati, non una certezza: usa "sembra", "potrebbe".
- Usa la conoscenza FC27 fornita solo se pertinente e segnala se è riferita a un'altra edizione o non verificata.
- Mostra i numeri grezzi (es. 55/66) quando parli di passaggi o contrasti.`;

function limitWords(text, max) {
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text.trim();
  const cut = words.slice(0, max).join(" ");
  const last = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  return (last > cut.length * 0.6 ? cut.slice(0, last + 1) : cut + "…").trim();
}

async function pickKnowledge(question) {
  try {
    const file = path.join(process.cwd(), "knowledge", "fc27-knowledge.json");
    const kb = JSON.parse(await readFile(file, "utf8"));
    const words = new Set(question.toLowerCase().match(/[a-zàèéìòù0-9-]{4,}/g) || []);
    const scored = (kb.entries || []).map((e) => {
      const hay = `${e.title} ${e.summary} ${(e.tags || []).join(" ")}`.toLowerCase();
      let s = e.priority === 1 ? 2 : 0;
      words.forEach((w) => { if (hay.includes(w)) s += 1; });
      return { e, s };
    }).sort((a, b) => b.s - a.s).slice(0, 6);
    return scored.map(({ e }) => `- [${e.edition}${e.verified ? "" : ", non verificato"}] ${e.title}: ${String(e.summary).slice(0, 420)}`).join("\n");
  } catch {
    return "";
  }
}

async function callGemini(model, body, key) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo non consentito." });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "Gemini non è temporaneamente disponibile.", code: "no_key" });

  const ip = String(req.headers["x-forwarded-for"] || "ip").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= 12) return res.status(429).json({ error: "Troppe richieste: riprova tra un minuto." });
  hits.set(ip, [...recent, now]);

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== "object") return res.status(400).json({ error: "Richiesta non valida." });

  const question = String(body.question || "").replace(/[\u0000-\u001f]/g, " ").trim();
  if (question.length < 3 || question.length > MAX_QUESTION) return res.status(400).json({ error: "Domanda non valida (da 3 a 600 caratteri)." });
  const contextText = JSON.stringify(body.context ?? {});
  if (contextText.length > MAX_CONTEXT_CHARS) return res.status(413).json({ error: "Dati troppo grandi da inviare." });
  const history = (Array.isArray(body.history) ? body.history : []).slice(-4)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
    .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text.slice(0, 800) }] }));
  while (history.length && history[0].role !== "user") history.shift();

  const knowledge = await pickKnowledge(question);
  const prompt = `DATI DEL CLUB (JSON):\n${contextText}\n\nCONOSCENZA FC27 (retrieval, non addestramento):\n${knowledge || "nessuna"}\n\nDOMANDA: ${question}`;
  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [...history, { role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 1500 },
  };

  let lastStatus = 0;
  for (const model of MODELS) {
    try {
      const r = await callGemini(model, payload, key);
      lastStatus = r.status;
      if (r.ok) {
        const data = await r.json();
        const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
        if (!text) {
          if (data?.promptFeedback?.blockReason) return res.status(422).json({ error: "Richiesta bloccata dai filtri di Gemini." });
          continue;
        }
        return res.status(200).json({ text: limitWords(text, MAX_WORDS), model });
      }
      if (r.status === 400 || r.status === 401 || r.status === 403) {
        return res.status(502).json({ error: "Gemini non è temporaneamente disponibile.", code: r.status === 400 ? "bad_request" : "key_or_permission" });
      }
    } catch (e) {
      lastStatus = e?.name === "AbortError" ? 408 : 0;
    }
  }
  return res.status(502).json({ error: "Gemini non è temporaneamente disponibile.", code: `upstream_${lastStatus}` });
}
