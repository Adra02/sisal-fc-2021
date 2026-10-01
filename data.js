function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (isObject(value)) return Object.entries(value).map(([id, item]) => ({ __id: id, ...item }));
  return [];
}

function first(obj, keys, fallback = '') {
  if (!obj || typeof obj !== 'object') return fallback;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return fallback;
}

function numberValue(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = String(value ?? '').replace(',', '.').trim();
  if (!normalized) return fallback;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

function looksLikePlayer(record) {
  if (!isObject(record)) return false;
  return Boolean(
    first(record, ['playername', 'playerName', 'displayName', 'username', 'gamertag', 'player']) ||
    (first(record, ['pos', 'position', 'role']) &&
      ['goals', 'assists', 'rating', 'games', 'matches', 'appearances', 'gp'].some(k => record[k] !== undefined))
  );
}

function findPlayerRecords(raw) {
  const output = [];
  const seen = new Set();

  function visit(value, depth = 0) {
    if (depth > 6 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (!isObject(value)) return;

    if (looksLikePlayer(value)) {
      if (!seen.has(value)) {
        seen.add(value);
        output.push(value);
      }
      return;
    }

    // Prefer common wrapper properties first.
    for (const key of ['players', 'members', 'roster', 'data', 'results', 'users', 'items']) {
      if (value[key] !== undefined) visit(value[key], depth + 1);
    }

    for (const [key, child] of Object.entries(value)) {
      if (['players', 'members', 'roster', 'data', 'results', 'users', 'items'].includes(key)) continue;
      if (depth < 4) visit(child, depth + 1);
    }
  }

  visit(raw);
  return output;
}

function normalizePlayer(record, index) {
  return {
    id: String(first(record, ['playerId', 'id', '__id'], index + 1)),
    name: String(first(record, ['playername', 'playerName', 'displayName', 'username', 'gamertag', 'name', 'player'], `Giocatore ${index + 1}`)),
    position: String(first(record, ['pos', 'position', 'role'], '')),
    ovr: numberValue(first(record, ['ovr', 'overall', 'overallRating'], 0)),
    games: numberValue(first(record, ['games', 'matches', 'appearances', 'gp'], 0)),
    goals: numberValue(first(record, ['goals', 'g'], 0)),
    assists: numberValue(first(record, ['assists', 'a'], 0)),
    rating: numberValue(first(record, ['rating', 'averageRating', 'avgRating'], 0)),
    clubId: String(first(record, ['clubId', 'clubID'], '')),
  };
}

function normalizePlayers(raw) {
  const records = findPlayerRecords(raw);
  if (!records.length) {
    throw new Error('Questo file non contiene giocatori riconoscibili.');
  }

  const players = records.map(normalizePlayer);
  const unique = new Map();
  for (const player of players) {
    const key = player.id || player.name.toLowerCase();
    if (!unique.has(key)) unique.set(key, player);
  }
  return [...unique.values()];
}

function looksLikeMatch(record) {
  return isObject(record) && (
    record.matchId !== undefined ||
    record.clubs !== undefined ||
    record.aggregate !== undefined
  );
}

function findMatchList(raw) {
  if (Array.isArray(raw)) return raw;
  if (!isObject(raw)) return [];
  for (const key of ['matches', 'data', 'results', 'items']) {
    if (Array.isArray(raw[key])) return raw[key];
  }
  if (looksLikeMatch(raw)) return [raw];
  return [];
}

function normalizeClubMap(rawClubs) {
  const clubs = [];
  if (Array.isArray(rawClubs)) {
    for (const club of rawClubs) clubs.push({
      id: String(first(club, ['clubId', 'id', '__id'], '')),
      name: String(first(club, ['clubName', 'name', 'club'], 'Club')),
      goals: numberValue(first(club, ['goals', 'score'], 0)),
      goalsAgainst: numberValue(first(club, ['goalsAgainst'], 0)),
      wins: numberValue(first(club, ['wins'], 0)),
      losses: numberValue(first(club, ['losses'], 0)),
      ties: numberValue(first(club, ['ties', 'draws'], 0)),
      });
    return clubs;
  }

  if (isObject(rawClubs)) {
    for (const [id, club] of Object.entries(rawClubs)) {
      const details = isObject(club?.details) ? club.details : {};
      clubs.push({
        id: String(first(club, ['clubId', 'id'], id)),
        name: String(first(details, ['name', 'clubName'], first(club, ['clubName', 'name'], 'Club'))),
        goals: numberValue(first(club, ['goals', 'score'], 0)),
        goalsAgainst: numberValue(first(club, ['goalsAgainst'], 0)),
        wins: numberValue(first(club, ['wins'], 0)),
        losses: numberValue(first(club, ['losses'], 0)),
        ties: numberValue(first(club, ['ties', 'draws'], 0)),
          });
    }
  }
  return clubs;
}

function normalizeMatchPlayers(rawPlayers) {
  const records = [];

  if (Array.isArray(rawPlayers)) {
    for (const item of rawPlayers) records.push(item);
  } else if (isObject(rawPlayers)) {
    for (const [clubId, byPlayer] of Object.entries(rawPlayers)) {
      if (isObject(byPlayer)) {
        for (const [playerId, stats] of Object.entries(byPlayer)) {
          if (isObject(stats)) records.push({ __clubId: clubId, __id: playerId, ...stats });
        }
      }
    }
  }

  return records.map((record, index) => ({
    id: String(first(record, ['playerId', 'id', '__id'], index + 1)),
    clubId: String(first(record, ['clubId', '__clubId'], '')),
    name: String(first(record, ['playername', 'playerName', 'displayName', 'username', 'gamertag', 'name'], `Giocatore ${index + 1}`)),
    position: String(first(record, ['pos', 'position', 'role'], '')),
    goals: numberValue(first(record, ['goals', 'g'], 0)),
    assists: numberValue(first(record, ['assists', 'a'], 0)),
    rating: numberValue(first(record, ['rating', 'averageRating', 'avgRating'], 0)),
    games: 1,
    wins: numberValue(first(record, ['wins'], 0)),
    losses: numberValue(first(record, ['losses'], 0)),
  }));
}

function normalizeMatches(raw) {
  const list = findMatchList(raw);
  if (!list.length) throw new Error('Questo file non contiene partite riconoscibili.');

  return list.filter(isObject).map((match, index) => ({
    id: String(first(match, ['matchId', 'id'], index + 1)),
    timestamp: first(match, ['timestamp', 'date', 'createdAt'], ''),
    timeAgo: first(match, ['timeAgo'], ''),
    clubs: normalizeClubMap(match.clubs),
    players: normalizeMatchPlayers(match.players),
    aggregate: isObject(match.aggregate) ? match.aggregate : {},
  }));
}

function detectType(raw, filename = '') {
  const name = String(filename).toLowerCase();
  if (/match|partit|oppos/.test(name)) return 'matches';
  if (/player|giocator|roster|squadra|member|utente/.test(name)) return 'players';

  const matches = findMatchList(raw);
  if (matches.length && matches.some(looksLikeMatch)) return 'matches';

  const players = findPlayerRecords(raw);
  if (players.length) return 'players';

  return null;
}

function inferClub(matches, players = []) {
  const counts = new Map();

  for (const player of players) {
    if (!player.clubId) continue;
    const key = player.clubId;
    const existing = counts.get(key) || { count: 0, name: '' };
    existing.count += 1000;
    counts.set(key, existing);
  }

  for (const match of matches) {
    for (const club of match.clubs) {
      const key = club.id || club.name;
      if (!key) continue;
      const existing = counts.get(key) || { count: 0, name: '' };
      existing.count += 1;
      if (!existing.name && club.name) existing.name = club.name;
      counts.set(key, existing);
    }
  }

  let best = null;
  for (const [id, data] of counts) {
    if (!best || data.count > best.count) best = { id, name: data.name || 'La tua squadra', count: data.count };
  }
  return best || { id: '', name: 'SISAL FC 2021' };
}

window.FCData = { normalizePlayers, normalizeMatches, detectType, inferClub };
