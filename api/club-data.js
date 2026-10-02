module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });

  const body = req.body || {};
  const rawUrl = String(body.url || '').trim();
  if (!rawUrl) return res.status(400).json({ error: 'Manca il link Pro Clubs Tracker.' });

  let parsed;
  try {
    parsed = parsePCTUrl(rawUrl);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const maxMatches = Math.max(1, Math.min(5, Number(body.maxMatches || 5)));
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    'Accept': 'application/json,text/plain,*/*',
    'Accept-Language': 'en-US,en;q=0.9,it;q=0.8',
    'Referer': 'https://www.ea.com/',
    'Origin': 'https://www.ea.com',
    'Cache-Control': 'no-cache'
  };

  try {
    const [info, overall, members, career, matches] = await Promise.all([
      getEA('clubs/info', { platform: parsed.platform, clubIds: parsed.clubId }, headers, true),
      getEA('clubs/overallStats', { platform: parsed.platform, clubIds: parsed.clubId }, headers, false),
      getEA('members/stats', { platform: parsed.platform, clubId: parsed.clubId }, headers, false),
      getEA('members/career/stats', { platform: parsed.platform, clubId: parsed.clubId }, headers, false),
      getEA('clubs/matches', { platform: parsed.platform, clubIds: parsed.clubId, matchType: 'leagueMatch', maxResultCount: String(maxMatches) }, headers, true)
    ]);

    const clubInfo = firstObject(info, parsed.clubId) || {};
    const overallRow = firstObject(overall, parsed.clubId) || firstObject(overall, '') || {};
    const memberRows = flattenRows(members).map((x, i) => normalizeMember(x, i, parsed.clubId));
    const careerRows = flattenRows(career).map((x, i) => normalizeMember(x, i, parsed.clubId));
    const players = mergeMembers(memberRows, careerRows);
    const matchRows = flattenMatches(matches, parsed.clubId).slice(0, maxMatches);

    const clubName = String(firstDeep(clubInfo, ['name', 'clubName'], firstDeep(overallRow, ['name', 'clubName'], 'SISAL FC 2021')));
    const result = {
      fetchedAt: new Date().toISOString(),
      source: 'ea-public-clubs-api',
      sourceUrl: parsed.url,
      requested: parsed,
      club: {
        id: parsed.clubId,
        name: clubName,
        platform: parsed.platform,
        regionId: firstDeep(clubInfo, ['regionId']),
        teamId: firstDeep(clubInfo, ['teamId']),
        division: firstDeep(overallRow, ['division', 'currentDivision', 'seasonDivision']),
        skillRating: firstDeep(overallRow, ['skillRating', 'skillrating']),
        overall: normalizeOverall(overallRow)
      },
      players,
      matches: matchRows
    };

    return res.status(200).json(result);
  } catch (e) {
    return res.status(502).json({
      error: e.message || 'EA non ha restituito dati utilizzabili.',
      source: 'ea-public-clubs-api'
    });
  }

  function parsePCTUrl(value) {
    let u;
    try { u = new URL(value); } catch { throw new Error('Il link non è valido.'); }
    const host = u.hostname.toLowerCase();
    if (host !== 'proclubstracker.com' && host !== 'www.proclubstracker.com') {
      throw new Error('Usa un link di proclubstracker.com.');
    }
    const m = u.pathname.match(/^\/club\/(\d+)/i);
    if (!m) throw new Error('Nel link non trovo il Club ID.');
    const platform = (u.searchParams.get('platform') || 'common-gen5').trim();
    if (!/^[a-z0-9-]+$/i.test(platform)) throw new Error('Platform non valida nel link.');
    return { url: u.toString(), clubId: m[1], platform };
  }

  async function getEA(path, params, hdrs, required) {
    const qs = new URLSearchParams(params);
    const url = `https://proclubs.ea.com/api/fc/${path}?${qs.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const r = await fetch(url, { headers: hdrs, signal: controller.signal });
      const text = await r.text();
      let data = {};
      try { data = JSON.parse(text); } catch { data = {}; }
      if (!r.ok) {
        if (!required) return {};
        throw new Error(`EA ${path}: HTTP ${r.status}${r.status === 403 ? ' (richiesta rifiutata)' : ''}`);
      }
      return data;
    } catch (e) {
      if (!required) return {};
      if (e.name === 'AbortError') throw new Error(`EA ${path}: timeout.`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function toArray(v) { return Array.isArray(v) ? v : (isObj(v) ? Object.entries(v).map(([id, x]) => isObj(x) ? ({ ...x, __id: id }) : ({ value: x, __id: id })) : []); }
  function firstObject(data, preferredId) {
    if (!isObj(data)) return {};
    if (preferredId && isObj(data[preferredId])) return data[preferredId];
    const a = toArray(data);
    return a.find(isObj) || {};
  }
  function flattenRows(data) {
    if (Array.isArray(data)) return data.filter(isObj);
    if (!isObj(data)) return [];
    for (const k of ['players', 'members', 'memberStats', 'membersStats', 'data', 'results', 'items']) {
      if (data[k] !== undefined) {
        const a = toArray(data[k]).filter(isObj);
        if (a.length) return a;
      }
    }
    return toArray(data).filter(isObj);
  }
  function flattenMatches(data, clubId) {
    let list = [];
    if (Array.isArray(data)) list = data;
    else if (isObj(data)) {
      for (const k of ['matches', 'games', 'results', 'items', 'data']) {
        if (data[k] !== undefined) {
          const a = toArray(data[k]).filter(isObj);
          if (a.length) { list = a; break; }
        }
      }
      if (!list.length) list = toArray(data).filter(isObj);
    }
    return list.map((m, i) => normalizeMatch(m, i, clubId)).filter(x => x.clubs.length >= 1);
  }
  function firstDeep(o, keys, fallback) {
    if (!isObj(o)) return fallback;
    for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
    for (const k of Object.keys(o)) if (isObj(o[k])) {
      const x = firstDeep(o[k], keys, undefined);
      if (x !== undefined) return x;
    }
    return fallback;
  }
  function n(v, d = 0) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const x = Number(String(v ?? '').replace(',', '.'));
    return Number.isFinite(x) ? x : d;
  }
  function s(v, d = '') { return String(v === undefined || v === null ? d : v); }
  function normalizeMember(p, i, clubId) {
    return {
      id: s(firstDeep(p, ['playerId', 'playerID', 'id', 'userId', '__id'], `p-${i}`)),
      name: s(firstDeep(p, ['playername', 'playerName', 'displayName', 'username', 'gamertag', 'name', 'player'], `Giocatore ${i + 1}`)),
      position: s(firstDeep(p, ['pos', 'position', 'role'], '')),
      ovr: n(firstDeep(p, ['ovr', 'overall', 'overallRating', 'overall_rating', 'overallrating'], 0)),
      games: n(firstDeep(p, ['games', 'gamesPlayed', 'matches', 'appearances', 'gp'], 0)),
      goals: n(firstDeep(p, ['goals', 'goal'], 0)),
      assists: n(firstDeep(p, ['assists', 'assist'], 0)),
      rating: n(firstDeep(p, ['rating', 'averageRating', 'avgRating', 'ratingAverage'], 0)),
      clubId: s(firstDeep(p, ['clubId', 'clubID', 'club_id'], clubId)),
      shots: n(firstDeep(p, ['shots', 'shot'], 0)),
      passesMade: n(firstDeep(p, ['passesmade', 'passesMade', 'passesCompleted'], 0)),
      passAttempts: n(firstDeep(p, ['passattempts', 'passAttempts', 'passesAttempted'], 0)),
      tacklesMade: n(firstDeep(p, ['tacklesmade', 'tacklesMade', 'tacklesWon'], 0)),
      tackleAttempts: n(firstDeep(p, ['tackleattempts', 'tackleAttempts', 'tacklesAttempted'], 0)),
      saves: n(firstDeep(p, ['saves', 'save'], 0)),
      redcards: n(firstDeep(p, ['redcards', 'redCards'], 0)),
      secondsPlayed: n(firstDeep(p, ['secondsPlayed', 'timePlayed'], 0))
    };
  }
  function mergeMembers(a, b) {
    const map = new Map();
    for (const p of [...a, ...b]) {
      const key = (p.name || '').trim().toLowerCase() || p.id;
      if (!key) continue;
      if (!map.has(key)) { map.set(key, p); continue; }
      const old = map.get(key);
      const x = { ...old };
      for (const k of ['games', 'goals', 'assists', 'shots', 'passesMade', 'passAttempts', 'tacklesMade', 'tackleAttempts', 'saves', 'redcards', 'secondsPlayed']) {
        if (n(p[k]) > n(x[k])) x[k] = n(p[k]);
      }
      if (!x.ovr && p.ovr) x.ovr = p.ovr;
      if (!x.rating && p.rating) x.rating = p.rating;
      if (!x.position && p.position) x.position = p.position;
      map.set(key, x);
    }
    return [...map.values()].sort((x, y) => (y.games || 0) - (x.games || 0));
  }
  function normalizeOverall(o) {
    return {
      gamesPlayed: n(firstDeep(o, ['gamesPlayed', 'games', 'matches', 'totalGames'], 0)),
      wins: n(firstDeep(o, ['wins', 'winCount'], 0)),
      draws: n(firstDeep(o, ['ties', 'draws', 'tieCount'], 0)),
      losses: n(firstDeep(o, ['losses', 'lossCount'], 0)),
      goals: n(firstDeep(o, ['goals', 'goalsFor', 'goalsScored'], 0)),
      goalsAgainst: n(firstDeep(o, ['goalsAgainst', 'goalsConceded'], 0)),
      points: n(firstDeep(o, ['points'], 0)),
      streak: firstDeep(o, ['streak', 'currentStreak'], null)
    };
  }
  function normalizeClubs(raw, fallbackClubId, match) {
    let rows = [];
    if (Array.isArray(raw)) rows = raw;
    else if (isObj(raw)) rows = toArray(raw);
    if (!rows.length && isObj(match)) {
      const ownName = firstDeep(match, ['clubName', 'club_name', 'club'], '');
      const opponentName = firstDeep(match, ['opponentName', 'opponent', 'opponentClubName'], 'Avversario');
      const goals = n(firstDeep(match, ['goals', 'score'], 0));
      const against = n(firstDeep(match, ['goalsAgainst', 'opponentGoals', 'opponentScore'], 0));
      return [{ id:String(fallbackClubId), name:String(ownName||'Club'), goals, against:goalsAgainstOrZero(goals, against) }, { id:'opponent', name:String(opponentName||'Avversario'), goals:against, against:goals }];
    }
    return rows.filter(isObj).map((c, i) => ({ id:s(firstDeep(c, ['clubId', 'clubID', 'id', '__id'], i ? `op-${i}` : fallbackClubId)), name:s(firstDeep(c, ['name', 'clubName', 'club'], i ? 'Avversario' : 'Club')), goals:n(firstDeep(c, ['goals', 'score'], 0)), against:n(firstDeep(c, ['goalsAgainst'], 0)) }));
  }
  function goalsAgainstOrZero(_goals, against) { return against; }
  function normalizeMatch(m, i, clubId) {
    const clubs = normalizeClubs(m.clubs || m.club || m.teams || {}, clubId, m);
    const rawPlayers = m.players || m.playerStats || m.members || {};
    const players = flattenRows(rawPlayers).map((p, j) => normalizeMember(p, j, s(firstDeep(p, ['clubId', 'clubID', '__clubId'], clubId))));
    return { id:s(firstDeep(m, ['matchId', 'matchID', 'id'], `m-${clubId}-${i}`)), timestamp:firstDeep(m, ['timestamp', 'date', 'createdAt'], ''), timeAgo:s(firstDeep(m, ['timeAgo'], '')), clubs, players, aggregate:isObj(m.aggregate)?m.aggregate:{} };
  }
};
