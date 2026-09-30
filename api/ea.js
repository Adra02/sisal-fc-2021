module.exports = async (req, res) => {
  const ok = ["allTimeLeaderboard/search", "clubs/matches", "members/stats"];
  const { path, ...rest } = req.query;
  if (!ok.includes(path)) return res.status(400).json({ error: "percorso non valido" });
  const qs = new URLSearchParams({ platform: "common-gen5", ...rest });
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://www.ea.com",
    Referer: "https://www.ea.com/",
  };
  try {
    const r = await fetch(`https://proclubs.ea.com/api/fc/${path}?${qs}`, { headers });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: "EA ha risposto " + r.status, detail: text.slice(0, 120) });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.status(200).send(text);
  } catch (e) {
    res.status(502).json({ error: "EA non risponde", detail: String((e && e.message) || e) });
  }
};
