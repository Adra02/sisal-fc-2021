module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "metodo non valido" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Manca la chiave GEMINI_API_KEY su Vercel." });
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const msgs = Array.isArray(body && body.messages) ? body.messages.slice(-8) : [];
  if (!msgs.length) return res.status(400).json({ error: "messaggio vuoto" });
  const contents = msgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content).slice(0, 12000) }],
  }));
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 1500, temperature: 0.6 } }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || "Gemini ha risposto con un errore." });
    const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
    res.status(200).json({ text: parts.map((p) => p.text || "").join("").trim() || "Nessuna risposta." });
  } catch (e) {
    res.status(502).json({ error: "Gemini non risponde." });
  }
};
