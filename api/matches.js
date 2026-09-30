export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const clubId = req.query.clubId || '328794';
  const targetUrl = `https://proclubs.ea.com/api/fc/clubs/matches?matchType=leagueMatch&platform=common-gen5&clubIds=${clubId}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.ea.com/'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json(data);
    }

    // Fallback
    const fallbackRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      return res.status(200).json(data);
    }

    return res.status(500).json({ error: 'EA Sports ha bloccato la richiesta.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
