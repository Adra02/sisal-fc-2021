const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
const normalize = value => clean(value).toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

const isObj = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!isObj(value)) return [];
  return Object.entries(value).map(([id, item]) => ({
    ...(isObj(item) ? item : { value: item }),
    __id: id
  }));
}

function first(obj, keys, fallback = undefined) {
  if (!isObj(obj)) return fallback;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return fallback;
}

function deepFirst(obj, keys, fallback = undefined) {
  if (!isObj(obj)) return fallback;
  const direct = first(obj, keys, undefined);
  if (direct !== undefined) return direct;
  for (const value of Object.values(obj)) {
    if (isObj(value)) {
      const found = deepFirst(value, keys, undefined);
      if (found !== undefined) return found;
    }
  }
  return fallback;
}

function num(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = clean(value).replace(',', '.').replace(/%$/, '');
  if (!text) return fallback;
  const n = Number(text);
  return Number.isFinite(n) ? n : fallback;
}

function maybeNum(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = num(value, NaN);
  return Number.isFinite(n) ? n : null;
}

function clubNameFromObject(obj) {
  const details = isObj(obj?.details) ? obj.details : null;
  return clean(first(details, ['name', 'clubName'], first(obj, ['clubName', 'name', 'club'], '')));
}

function clubIdFromObject(obj, fallback = '') {
  return String(first(obj, ['clubId', 'clubID', 'club_id', 'id', '__id'], fallback) ?? fallback).trim();
}

function collectSearchCandidates(raw) {
  const out = [];
  const seen = new Set();
  const visit = (value, path = '') => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(item => visit(item, path));
      return;
    }
    const id = clubIdFromObject(value, '');
    const name = clubNameFromObject(value);
    if (id && name) {
      const key = `${id}|${normalize(name)}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ id, name, raw: value, path });
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === 'customKit' || key === 'raw') continue;
      if (child && typeof child === 'object') visit(child, path ? `${path}.${key}` : key);
    }
  };
  visit(raw);
  return out;
}

function scoreSearchCandidate(candidate, requestedName) {
  const a = normalize(candidate?.name);
  const b = normalize(requestedName);
  if (!a || !b) return -1;
  if (a === b) return 1000;
  if (a.includes(b)) return 850;
  if (b.includes(a) && a.length >= 4) return 650;
  const aa = new Set(a.split(/[^a-z0-9]+/).filter(Boolean));
  const bb = new Set(b.split(/[^a-z0-9]+/).filter(Boolean));
  let common = 0;
  for (const token of aa) if (bb.has(token)) common += 1;
  return common ? 300 + Math.round((common / Math.max(aa.size, bb.size)) * 300) : 0;
}

function chooseClub(candidates, requestedName) {
  const ranked = (Array.isArray(candidates) ? candidates : [])
    .map(item => ({ ...item, score: scoreSearchCandidate(item, requestedName) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < 550) return null;
  return best;
}

function extractObjectByClubId(raw, clubId) {
  const wanted = String(clubId);
  if (isObj(raw) && isObj(raw[wanted])) return raw[wanted];
  let found = null;
  const visit = value => {
    if (found || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (String(first(value, ['clubId', 'clubID', 'club_id', 'id'], '')) === wanted) {
      found = value;
      return;
    }
    Object.values(value).forEach(child => {
      if (child && typeof child === 'object') visit(child);
    });
  };
  visit(raw);
  return found;
}

function extractMembers(raw, clubId) {
  const preferred = first(raw, ['members', 'players', 'membersStats', 'data', 'results', 'items'], null);
  const source = preferred !== null ? asArray(preferred) : asArray(raw);
  const out = [];
  const seen = new Set();
  for (const item of source) {
    if (!isObj(item)) continue;
    const name = clean(first(item, ['playername', 'playerName', 'displayName', 'username', 'gamertag', 'name', 'player'], ''));
    const id = String(first(item, ['playerId', 'playerID', 'player_id', 'id', '__id'], '') ?? '').trim();
    if (!name && !id) continue;
    const key = `${id}|${normalize(name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: id || `player-${out.length + 1}`,
      name: name || `Giocatore ${out.length + 1}`,
      position: clean(first(item, ['pos', 'position', 'role'], '')),
      ovr: maybeNum(deepFirst(item, ['ovr', 'overall', 'overallRating', 'overall_rating', 'overallrating'], null)),
      games: num(deepFirst(item, ['games', 'gamesPlayed', 'matches', 'appearances', 'gp'], 0)),
      goals: num(deepFirst(item, ['goals', 'goal'], 0)),
      assists: num(deepFirst(item, ['assists', 'assist'], 0)),
      rating: maybeNum(deepFirst(item, ['rating', 'averageRating', 'avgRating', 'ratingAverage'], null)),
      clubId: String(first(item, ['clubId', 'clubID', 'club_id'], clubId) ?? clubId),
      shots: num(deepFirst(item, ['shots', 'shot'], 0)),
      passesMade: num(deepFirst(item, ['passesmade', 'passesMade', 'passesMadeTotal'], 0)),
      passAttempts: num(deepFirst(item, ['passattempts', 'passAttempts', 'passesAttempted'], 0)),
      passAccuracy: maybeNum(deepFirst(item, ['passAccuracy', 'passAccuracyPct', 'passPercent', 'passRate'], null)),
      tacklesMade: num(deepFirst(item, ['tacklesmade', 'tacklesMade', 'tacklesWon'], 0)),
      tackleAttempts: num(deepFirst(item, ['tackleattempts', 'tackleAttempts', 'tacklesAttempted'], 0)),
      tackleSuccess: maybeNum(deepFirst(item, ['tackleSuccess', 'tackleSuccessPct', 'tacklePercent', 'tackleRate'], null)),
      saves: num(deepFirst(item, ['saves', 'save'], 0)),
      cleanSheets: num(deepFirst(item, ['cleanSheets', 'cleansheets'], 0)),
      mom: num(deepFirst(item, ['mom', 'motm', 'manOfTheMatch'], 0)),
      redcards: num(deepFirst(item, ['redcards', 'redCards'], 0)),
      secondsPlayed: num(deepFirst(item, ['secondsPlayed', 'timePlayed'], 0)),
      raw: item
    });
  }
  return out;
}

function extractClubs(raw) {
  const value = raw?.clubs ?? raw?.club ?? raw;
  let objects;
  if (Array.isArray(value)) objects = value;
  else if (isObj(value)) objects = Object.entries(value).map(([id, item]) => ({ ...(isObj(item) ? item : {}), __id: id }));
  else objects = [];
  return objects.filter(isObj).map(x => {
    const details = isObj(x.details) ? x.details : {};
    return {
      id: clubIdFromObject(x, clubIdFromObject(details, x.__id || '')),
      name: clean(first(details, ['name', 'clubName'], first(x, ['name', 'clubName'], 'Club'))),
      goals: num(first(x, ['goals', 'score'], 0)),
      against: num(first(x, ['goalsAgainst'], 0)),
      wins: num(first(x, ['wins'], 0)),
      losses: num(first(x, ['losses'], 0)),
      draws: num(first(x, ['ties', 'draws'], 0)),
      result: first(x, ['result'], null),
      dnf: first(x, ['winnerByDnf', 'dnf'], null)
    };
  }).filter(x => x.id || x.name);
}

function extractPlayersFromMatch(raw, clubId) {
  const value = raw?.players ?? raw?.members ?? raw?.playerStats ?? raw?.playerStatsByClub ?? [];
  return extractMembers(value, clubId);
}

function normalizeMatches(raw, clubId) {
  let source;
  if (Array.isArray(raw)) source = raw;
  else if (Array.isArray(raw?.matches)) source = raw.matches;
  else source = asArray(raw?.matches ?? raw);
  return source.filter(isObj).map((m, index) => {
    const clubs = extractClubs(m.clubs ?? m.club ?? {});
    const own = clubs.find(c => String(c.id) === String(clubId));
    const timestamp = first(m, ['timestamp', 'date', 'createdAt', 'matchDate'], '');
    return {
      id: String(first(m, ['matchId', 'matchID', 'id'], `match-${clubId}-${index}`)),
      timestamp,
      timeAgo: first(m, ['timeAgo'], ''),
      clubs,
      players: extractPlayersFromMatch(m, clubId),
      aggregate: isObj(m.aggregate) ? m.aggregate : {},
      matchType: first(m, ['matchType'], null),
      ownResult: own?.result ?? null,
      dnf: own?.dnf ?? null,
      raw: m
    };
  }).filter(m => m.clubs.length >= 1);
}

function normalizeOverall(raw, clubId) {
  const o = extractObjectByClubId(raw, clubId) || raw || {};
  return {
    gamesPlayed: maybeNum(first(o, ['gamesPlayed', 'games', 'matches', 'matchesPlayed'], null)),
    wins: maybeNum(first(o, ['wins'], null)),
    draws: maybeNum(first(o, ['ties', 'draws'], null)),
    losses: maybeNum(first(o, ['losses'], null)),
    goals: maybeNum(first(o, ['goals', 'goalsFor'], null)),
    goalsAgainst: maybeNum(first(o, ['goalsAgainst', 'goalsConceded'], null)),
    points: maybeNum(first(o, ['points'], null)),
    division: maybeNum(first(o, ['division', 'currentDivision', 'seasonDivision'], null)),
    skillRating: maybeNum(first(o, ['skillRating', 'skillrating'], null)),
    raw: o
  };
}

export {
  clean,
  normalize,
  asArray,
  first,
  deepFirst,
  num,
  maybeNum,
  collectSearchCandidates,
  chooseClub,
  extractObjectByClubId,
  extractMembers,
  normalizeMatches,
  normalizeOverall
};
