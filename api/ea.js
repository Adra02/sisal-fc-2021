module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { path, ...rest } = req.query;
  const allowedPaths = ["members/stats", "clubs/matches", "allTimeLeaderboard/search"];

  if (!path || !allowedPaths.includes(path)) {
    return res.status(400).json({ error: "Endpoint non valido o non autorizzato." });
  }

  // Parametri predefiniti stabiliti
  const defaultParams = {
    platform: "common-gen5",
    ...rest
  };

  const queryParams = new URLSearchParams(defaultParams);
  const targetUrl = `https://proclubs.ea.com/api/fc/${path}?${queryParams.toString()}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.ea.com/",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Errore dai server EA: ${response.status}` });
    }

    const data = await response.json();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(data);
  } catch (error) {
    return res.status(502).json({ error: "Impossibile contattare i server EA Sports Pro Clubs." });
  }
};
