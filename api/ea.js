module.exports = async (req, res) => {
  const ok = ["allTimeLeaderboard/search", "clubs/matches", "members/stats"];
  const { path, ...rest } = req.query;
  if (!ok.includes(path)) return res.status(400).json({ error: "percorso non valido" });
  const qs = new URLSearchParams({ platform: "common-gen5", ...rest });
  try {
    const r = await fetch(`https://proclubs.ea.com/api/fc/${path}?${qs}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        Accept: "application/json",
        Referer: "https://www.ea.com/",
      },
    });
    const text = await r.text();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: "EA non risponde" });
  }
};
