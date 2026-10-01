module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo non consentito.' });

  const clubId = String(req.query?.clubId || '328794').trim();
  const platform = String(req.query?.platform || 'common-gen5').trim();
  if (!/^\d+$/.test(clubId)) return res.status(400).json({ error: 'clubId non valido.' });
  if (!/^[a-z0-9-]+$/i.test(platform)) return res.status(400).json({ error: 'platform non valido.' });

  const types = ['leagueMatch', 'playoffMatch', 'friendlyMatch'];
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.ea.com/',
    'Origin': 'https://www.ea.com'
  };

  const results = await Promise.allSettled(types.map(async type => {
    const url = `https://proclubs.ea.com/api/fc/clubs/matches?platform=${encodeURIComponent(platform)}&clubIds=${encodeURIComponent(clubId)}&matchType=${encodeURIComponent(type)}&maxResultCount=5`;
    const r = await fetch(url, { headers, cache: 'no-store' });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { throw new Error(`${type}: risposta EA non JSON (HTTP ${r.status})`); }
    if (!r.ok) throw new Error(`${type}: EA HTTP ${r.status}`);
    const list = Array.isArray(data) ? data : (Array.isArray(data?.matches) ? data.matches : (Array.isArray(data?.items) ? data.items : []));
    return { type, list };
  }));

  const errors = results.filter(x => x.status === 'rejected').map(x => x.reason?.message || 'Errore EA');
  const seen = new Set();
  const matches = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const m of r.value.list) {
      const id = String(m?.matchId ?? m?.id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      matches.push(m);
    }
  }

  if (!matches.length && errors.length) return res.status(502).json({ error: 'EA non ha restituito partite.', details: errors });
  matches.sort((a,b) => Number(b?.timestamp ?? b?.date ?? 0) - Number(a?.timestamp ?? a?.date ?? 0));
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).json({ clubId, platform, fetchedAt: new Date().toISOString(), matches, errors });
};
