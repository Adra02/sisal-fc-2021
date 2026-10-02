function responseJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

const MAX_MATCHES = 5;
const TIMEOUT_MS = 12000;

export default async function handler(request) {
  if (request.method !== 'POST') {
    return responseJson({ error: 'Metodo non consentito.' }, 405);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return responseJson({ error: 'Richiesta non valida.' }, 400);
  }

  const rawUrl = String(body?.url || '').trim();
  if (!rawUrl) return responseJson({ error: 'Manca il link Pro Clubs Tracker.' }, 400);

  let pct;
  try {
    pct = parsePCTUrl(rawUrl);
  } catch (error) {
    return responseJson({ error: error.message || 'Link non valido.' }, 400);
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; SisalFC27CommandCenter/2.0)',
      'Accept': 'application/json,text/plain,*/*',
      'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache'
    };

    const [info, overall, memberStats, careerStats, leagueMatches, playoffMatches] = await Promise.all([
      getEA('clubs/info', { platform: pct.platform, clubIds: pct.clubId }, headers, true),
      getEA('clubs/overallStats', { platform: pct.platform, clubIds: pct.clubId }, headers, false),
      getEA('members/stats', { platform: pct.platform, clubId: pct.clubId }, headers, false),
      getEA('members/career/stats', { platform: pct.platform, clubId: pct.clubId }, headers, false),
      getEA('clubs/matches', {
        platform: pct.platform,
        clubIds: pct.clubId,
        matchType: 'leagueMatch',
        maxResultCount: String(MAX_MATCHES)
      }, headers, false),
      getEA('clubs/matches', {
        platform: pct.platform,
        clubIds: pct.clubId,
        matchType: 'playoffMatch',
        maxResultCount: String(MAX_MATCHES)
      }, headers, false)
    ]);

    const clubInfo = firstObject(info, pct.clubId);
    const overallRow = firstObject(overall, pct.clubId);

    const currentPlayers = flattenRows(memberStats).map((row, i) => normalizeMember(row, i, pct.clubId));
    const careerPlayers = flattenRows(careerStats).map((row, i) => normalizeMember(row, i, pct.clubId));
    const players = mergeMembers(careerPlayers, currentPlayers);

    const allMatches = [
      ...flattenMatches(leagueMatches, pct.clubId),
      ...flattenMatches(playoffMatches, pct.clubId)
    ];
    const uniqueMatches = [...new Map(allMatches.map(match => [String(match.id), match])).values()]
      .sort((a, b) => matchTime(b) - matchTime(a))
      .slice(0, MAX_MATCHES);

    const fallbackName = String(firstDeep(overallRow, ['name', 'clubName'], 'Sisal FC 2021'));
    const clubName = String(firstDeep(clubInfo, ['name', 'clubName'], fallbackName));

    const result = {
      fetchedAt: new Date().toISOString(),
      source: 'ea-public-clubs-api',
      sourceUrl: pct.url,
      requested: pct,
      club: {
        id: pct.clubId,
        name: clubName,
        platform: pct.platform,
        regionId: firstDeep(clubInfo, ['regionId', 'regionID'], null),
        teamId: firstDeep(clubInfo, ['teamId', 'teamID'], null),
        division: firstDeep(overallRow, ['division', 'currentDivision', 'seasonDivision'], null),
        skillRating: firstDeep(overallRow, ['skillRating', 'skillrating'], null),
        overall: normalizeOverall(overallRow)
      },
      players,
      matches: uniqueMatches
    };

    if (!players.length && !uniqueMatches.length) {
      return responseJson({
        error: 'EA ha risposto, ma non sono riuscito a trovare dati della squadra. Controlla che Club ID e piattaforma del link siano corretti.',
        requested: pct
      }, 502);
    }

    return responseJson(result, 200);
  } catch (error) {
    return responseJson({
      error: error?.message || 'EA non ha restituito dati utilizzabili.',
      requested: pct,
      source: 'ea-public-clubs-api'
    }, 502);
  }
}

function parsePCTUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Il link non è valido.');
  }

  const host = url.hostname.toLowerCase();
  if (host !== 'proclubstracker.com' && host !== 'www.proclubstracker.com') {
    throw new Error('Usa un link di proclubstracker.com.');
  }

  const match = url.pathname.match(/^\/club\/(\d+)\/?$/i);
  if (!match) throw new Error('Nel link non trovo il Club ID. Usa un link /club/XXXXXX.');

  const platform = String(url.searchParams.get('platform') || 'common-gen5').trim();
  if (!/^[a-z0-9-]+$/i.test(platform)) throw new Error('Platform non valida nel link.');

  return { url: url.toString(), clubId: match[1], platform };
}

async function getEA(path, params, headers, required) {
  const url = new URL(`https://proclubs.ea.com/api/fc/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    if (!response.ok) {
      if (!required) return {};
      throw new Error(`EA ${path}: HTTP ${response.status}`);
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      if (!required) return {};
      throw new Error(`EA ${path}: timeout.`);
    }
    if (!required) return {};
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!isObject(value)) return [];
  return Object.entries(value).map(([id, row]) => isObject(row) ? { ...row, __id: id } : { value: row, __id: id });
}

function firstObject(data, preferredId = '') {
  if (!isObject(data)) return {};
  if (preferredId && isObject(data[preferredId])) return data[preferredId];
  return toArray(data).find(isObject) || {};
}

function flattenRows(data) {
  if (Array.isArray(data)) return data.filter(isObject);
  if (!isObject(data)) return [];

  for (const key of ['players', 'members', 'memberStats', 'membersStats', 'data', 'results', 'items']) {
    if (data[key] === undefined) continue;
    const rows = toArray(data[key]).filter(isObject);
    if (rows.length) return rows;
  }
  return toArray(data).filter(isObject);
}

function flattenMatches(data, clubId) {
  if (!data) return [];
  let rows = [];
  if (Array.isArray(data)) rows = data;
  else if (isObject(data)) {
    for (const key of ['matches', 'games', 'results', 'items', 'data']) {
      if (data[key] === undefined) continue;
      const candidate = toArray(data[key]).filter(isObject);
      if (candidate.length) {
        rows = candidate;
        break;
      }
    }
    if (!rows.length) rows = toArray(data).filter(isObject);
  }
  return rows.map((row, i) => normalizeMatch(row, i, clubId)).filter(match => match.clubs.length > 0);
}

function firstDeep(object, keys, fallback = undefined) {
  if (!isObject(object)) return fallback;

  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null && object[key] !== '') return object[key];
  }

  for (const value of Object.values(object)) {
    if (!isObject(value)) continue;
    const found = firstDeep(value, keys, undefined);
    if (found !== undefined) return found;
  }
  return fallback;
}

function number(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value, fallback = '') {
  return value === undefined || value === null ? fallback : String(value);
}

function normalizeMember(row, index, clubId) {
  return {
    id: stringValue(firstDeep(row, ['playerId', 'playerID', 'id', 'userId', '__id'], `p-${clubId}-${index}`)),
    name: stringValue(firstDeep(row, ['playername', 'playerName', 'displayName', 'username', 'gamertag', 'name', 'player'], `Giocatore ${index + 1}`)),
    position: stringValue(firstDeep(row, ['pos', 'position', 'role'], '')),
    ovr: number(firstDeep(row, ['ovr', 'overall', 'overallRating', 'overall_rating', 'overallrating'], 0)),
    games: number(firstDeep(row, ['games', 'gamesPlayed', 'matches', 'appearances', 'gp'], 0)),
    goals: number(firstDeep(row, ['goals', 'goal'], 0)),
    assists: number(firstDeep(row, ['assists', 'assist'], 0)),
    rating: number(firstDeep(row, ['rating', 'averageRating', 'avgRating', 'ratingAverage'], 0)),
    clubId: stringValue(firstDeep(row, ['clubId', 'clubID', 'club_id'], clubId)),
    shots: number(firstDeep(row, ['shots', 'shot'], 0)),
    passesMade: number(firstDeep(row, ['passesmade', 'passesMade', 'passesCompleted'], 0)),
    passAttempts: number(firstDeep(row, ['passattempts', 'passAttempts', 'passesAttempted'], 0)),
    tacklesMade: number(firstDeep(row, ['tacklesmade', 'tacklesMade', 'tacklesWon'], 0)),
    tackleAttempts: number(firstDeep(row, ['tackleattempts', 'tackleAttempts', 'tacklesAttempted'], 0)),
    saves: number(firstDeep(row, ['saves', 'save'], 0)),
    redcards: number(firstDeep(row, ['redcards', 'redCards'], 0)),
    secondsPlayed: number(firstDeep(row, ['secondsPlayed', 'timePlayed', 'minutesPlayed'], 0))
  };
}

function mergeMembers(firstRows, secondRows) {
  const map = new Map();

  for (const player of [...firstRows, ...secondRows]) {
    const nameKey = String(player.name || '').trim().toLowerCase();
    const key = nameKey || String(player.id || '');
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, { ...player });
      continue;
    }

    const merged = { ...map.get(key) };
    for (const field of [
      'games', 'goals', 'assists', 'shots', 'passesMade', 'passAttempts',
      'tacklesMade', 'tackleAttempts', 'saves', 'redcards', 'secondsPlayed'
    ]) {
      if (number(player[field]) > number(merged[field])) merged[field] = number(player[field]);
    }
    for (const field of ['ovr', 'rating']) {
      if (!number(merged[field]) && number(player[field])) merged[field] = number(player[field]);
    }
    if (!merged.position && player.position) merged.position = player.position;
    map.set(key, merged);
  }

  return [...map.values()].filter(player => player.name).sort((a, b) => number(b.games) - number(a.games));
}

function normalizeOverall(row) {
  return {
    gamesPlayed: number(firstDeep(row, ['gamesPlayed', 'games', 'matches', 'totalGames'], 0)),
    wins: number(firstDeep(row, ['wins', 'winCount'], 0)),
    draws: number(firstDeep(row, ['ties', 'draws', 'tieCount'], 0)),
    losses: number(firstDeep(row, ['losses', 'lossCount'], 0)),
    goals: number(firstDeep(row, ['goals', 'goalsFor', 'goalsScored'], 0)),
    goalsAgainst: number(firstDeep(row, ['goalsAgainst', 'goalsConceded'], 0)),
    points: number(firstDeep(row, ['points'], 0)),
    streak: firstDeep(row, ['streak', 'currentStreak'], null)
  };
}

function normalizeMatch(row, index, clubId) {
  const clubs = normalizeClubs(row?.clubs || row?.club || row?.teams || {}, clubId, row);
  const playersRaw = row?.players || row?.playerStats || row?.members || {};
  const players = flattenMatchPlayers(playersRaw, clubId);

  return {
    id: stringValue(firstDeep(row, ['matchId', 'matchID', 'id'], `m-${clubId}-${index}`)),
    timestamp: firstDeep(row, ['timestamp', 'date', 'createdAt', 'gameDate'], ''),
    timeAgo: stringValue(firstDeep(row, ['timeAgo'], '')),
    clubs,
    players,
    aggregate: isObject(row?.aggregate) ? row.aggregate : {}
  };
}

function flattenMatchPlayers(raw, fallbackClubId) {
  if (Array.isArray(raw)) {
    return raw.filter(isObject).map((row, i) => normalizeMember(row, i, fallbackClubId));
  }
  if (!isObject(raw)) return [];

  const output = [];
  for (const [clubId, group] of Object.entries(raw)) {
    if (Array.isArray(group)) {
      group.forEach((player, i) => {
        if (isObject(player)) output.push(normalizeMember({ ...player, __clubId: clubId }, i, clubId));
      });
    } else if (isObject(group)) {
      for (const [playerId, player] of Object.entries(group)) {
        if (isObject(player)) output.push(normalizeMember({ ...player, __id: playerId, __clubId: clubId }, output.length, clubId));
      }
    }
  }
  return output;
}

function normalizeClubs(raw, fallbackClubId, match) {
  let rows = [];
  if (Array.isArray(raw)) rows = raw;
  else if (isObject(raw)) rows = toArray(raw);

  if (!rows.length) {
    const ownName = firstDeep(match, ['clubName', 'club_name', 'club'], 'Club');
    const opponentName = firstDeep(match, ['opponentName', 'opponent', 'opponentClubName'], 'Avversario');
    const ownGoals = number(firstDeep(match, ['goals', 'score', 'homeScore'], 0));
    const opponentGoals = number(firstDeep(match, ['goalsAgainst', 'opponentGoals', 'opponentScore', 'awayScore'], 0));
    return [
      { id: String(fallbackClubId), name: String(ownName), goals: ownGoals },
      { id: `opponent-${fallbackClubId}`, name: String(opponentName), goals: opponentGoals }
    ];
  }

  return rows.filter(isObject).map((club, index) => ({
    id: stringValue(firstDeep(club, ['clubId', 'clubID', 'id', '__id'], index === 0 ? fallbackClubId : `op-${index}`)),
    name: stringValue(firstDeep(club, ['name', 'clubName', 'club'], index === 0 ? 'Club' : 'Avversario')),
    goals: number(firstDeep(club, ['goals', 'score'], 0)),
    against: number(firstDeep(club, ['goalsAgainst'], 0))
  }));
}

function matchTime(match) {
  const value = match?.timestamp;
  if (typeof value === 'number' && Number.isFinite(value)) return value > 1e12 ? value : value * 1000;
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
