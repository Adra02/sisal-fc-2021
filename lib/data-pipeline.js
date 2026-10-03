const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
const normalizeName = value => clean(value).toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const isObj = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!isObj(value)) return [];
  return Object.entries(value).map(([id, item]) => ({ ...(isObj(item) ? item : { value: item }), __id: id }));
}

function first(obj, keys, fallback = undefined) {
  if (!isObj(obj)) return fallback;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return fallback;
}

function deepFirst(obj, keys, fallback = undefined, depth = 0) {
  if (!isObj(obj) || depth > 8) return fallback;
  const direct = first(obj, keys, undefined);
  if (direct !== undefined) return direct;
  for (const value of Object.values(obj)) {
    if (!isObj(value)) continue;
    const found = deepFirst(value, keys, undefined, depth + 1);
    if (found !== undefined) return found;
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

function parseJsonText(text) {
  const raw = String(text ?? '').replace(/^\uFEFF/, '').trim();
  if (!raw) throw new Error('Il file è vuoto.');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Il file deve contenere JSON valido. Il formato .txt va bene se dentro c’è il JSON originale.');
  }
}

function nameOfPlayer(p, index = 0) {
  return clean(first(p, ['playername', 'playerName', 'displayName', 'username', 'gamertag', 'name', 'player'], `Giocatore ${index + 1}`));
}

function normalizePlayer(p, index, clubId = '') {
  const id = String(first(p, ['playerId', 'playerID', 'player_id', 'id', '__id'], `player-${index + 1}`) ?? '').trim();
  const secondsPlayedRaw = deepFirst(p, ['secondsPlayed', 'timePlayed', 'gameTime'], null);
  const minutesRaw = deepFirst(p, ['minutes', 'minutesPlayed'], null);
  const cleanSheetsDef = maybeNum(deepFirst(p, ['cleanSheetsDef', 'cleansheetsdef'], null));
  const cleanSheetsGK = maybeNum(deepFirst(p, ['cleanSheetsGK', 'cleansheetsgk'], null));
  return {
    id: id || `player-${index + 1}`,
    name: nameOfPlayer(p, index),
    position: clean(first(p, ['favoritePosition', 'position', 'role', 'pos'], '')),
    favoritePosition: clean(first(p, ['favoritePosition'], '')) || null,
    proName: clean(first(p, ['proName', 'proname'], '')) || null,
    ovr: maybeNum(deepFirst(p, ['proOverall', 'proOverallStr', 'ovr', 'overall', 'overallRating', 'overall_rating', 'overallrating'], null)),
    games: maybeNum(deepFirst(p, ['gamesPlayed', 'games', 'matches', 'appearances', 'gp'], null)),
    goals: num(deepFirst(p, ['goals', 'goal'], 0)),
    assists: num(deepFirst(p, ['assists', 'assist'], 0)),
    rating: maybeNum(deepFirst(p, ['ratingAve', 'ratingAverage', 'averageRating', 'avgRating', 'rating'], null)),
    winRate: maybeNum(deepFirst(p, ['winRate'], null)),
    clubId: String(first(p, ['clubId', 'clubID', 'club_id'], clubId) ?? clubId ?? '').trim(),
    shots: num(deepFirst(p, ['shots', 'shot'], 0)),
    shotAccuracy: maybeNum(deepFirst(p, ['shotSuccessRate', 'shotAccuracy', 'shotAccuracyPct'], null)),
    passesMade: num(deepFirst(p, ['passesmade', 'passesMade', 'passesMadeTotal'], 0)),
    passAttempts: maybeNum(deepFirst(p, ['passattempts', 'passAttempts', 'passesAttempted'], null)),
    passAccuracy: maybeNum(deepFirst(p, ['passSuccessRate', 'passAccuracy', 'passAccuracyPct', 'passPercent', 'passRate'], null)),
    tacklesMade: num(deepFirst(p, ['tacklesmade', 'tacklesMade', 'tacklesWon'], 0)),
    tackleAttempts: maybeNum(deepFirst(p, ['tackleattempts', 'tackleAttempts', 'tacklesAttempted'], null)),
    tackleSuccess: maybeNum(deepFirst(p, ['tackleSuccessRate', 'tackleSuccess', 'tackleSuccessPct', 'tacklePercent', 'tackleRate'], null)),
    saves: num(deepFirst(p, ['saves', 'save'], 0)),
    cleanSheetsDef,
    cleanSheetsGK,
    cleanSheets: (cleanSheetsDef ?? 0) + (cleanSheetsGK ?? 0),
    mom: num(deepFirst(p, ['manOfTheMatch', 'mom', 'motm'], 0)),
    redcards: num(deepFirst(p, ['redCards', 'redcards'], 0)),
    secondsPlayed: secondsPlayedRaw == null ? (minutesRaw == null ? null : num(minutesRaw) * 60) : num(secondsPlayedRaw)
  };
}

function normalizePlayersFile(raw, clubId = '') {
  let source = [];
  if (Array.isArray(raw)) source = raw;
  else if (isObj(raw)) {
    for (const key of ['players', 'members', 'membersStats', 'playerStats', 'data', 'results', 'items']) {
      if (raw[key] !== undefined) {
        const candidate = asArray(raw[key]);
        if (candidate.length) { source = candidate; break; }
      }
    }
    if (!source.length) source = asArray(raw);
  }
  return dedupePlayers(source.filter(isObj).map((p, i) => normalizePlayer(p, i, clubId)));
}

function normalizeClubs(raw) {
  const entries = Array.isArray(raw)
    ? raw.map((item, i) => [String(i), item])
    : isObj(raw) ? Object.entries(raw) : [];
  return entries.filter(([, c]) => isObj(c)).map(([key, c]) => {
    const details = isObj(c.details) ? c.details : {};
    return {
      id: String(first(c, ['clubId', 'clubID', 'id'], key) ?? key).trim(),
      name: clean(first(details, ['name', 'clubName'], first(c, ['clubName', 'name', 'club'], 'Club'))),
      goals: num(first(c, ['goals', 'score'], 0)),
      against: num(first(c, ['goalsAgainst', 'conceded'], 0)),
      wins: num(first(c, ['wins'], 0)),
      losses: num(first(c, ['losses'], 0)),
      draws: num(first(c, ['ties', 'draws'], 0)),
      result: first(c, ['result'], null),
      matchType: first(c, ['matchType', 'match_type', 'matchtype', 'type'], null)
    };
  }).filter(c => c.id || c.name);
}

function normalizeMatchPlayers(raw) {
  const out = [];
  const pushPlayer = (p, pid, clubId, index) => {
    if (!isObj(p)) return;
    const base = { ...p, __id: p.__id ?? pid, __clubId: p.__clubId ?? clubId };
    out.push(normalizePlayer(base, index, clubId));
  };
  if (Array.isArray(raw)) {
    raw.forEach((p, i) => pushPlayer(p, '', String(first(p, ['clubId', 'clubID', 'club_id'], '')), i));
    return out;
  }
  if (!isObj(raw)) return out;
  let index = 0;
  for (const [clubId, group] of Object.entries(raw)) {
    if (Array.isArray(group)) {
      group.forEach((p, i) => pushPlayer(p, String(i), String(clubId), index++));
    } else if (isObj(group)) {
      for (const [playerId, p] of Object.entries(group)) pushPlayer(p, playerId, String(clubId), index++);
    }
  }
  return out;
}

function looksLikeMatch(value) {
  return isObj(value) && (
    value.matchId !== undefined ||
    value.matchID !== undefined ||
    value.clubs !== undefined ||
    (value.timestamp !== undefined && (value.players !== undefined || value.aggregate !== undefined))
  );
}

function getMatchList(raw) {
  if (Array.isArray(raw)) return raw.filter(looksLikeMatch);
  if (!isObj(raw)) return [];
  for (const key of ['matches', 'partite', 'games', 'results', 'items', 'data']) {
    if (raw[key] !== undefined) {
      const a = asArray(raw[key]).filter(looksLikeMatch);
      if (a.length) return a;
    }
  }
  if (looksLikeMatch(raw)) return [raw];
  return Object.entries(raw).filter(([, value]) => looksLikeMatch(value)).map(([, value]) => value);
}

function normalizeMatchesFile(raw, competition) {
  return getMatchList(raw).map((m, index) => ({
    id: String(first(m, ['matchId', 'matchID', 'id'], `${competition}-${index + 1}`) ?? `${competition}-${index + 1}`),
    timestamp: first(m, ['timestamp', 'date', 'createdAt', 'matchDate'], ''),
    timeAgo: isObj(m.timeAgo) ? `${m.timeAgo.number ?? ''} ${m.timeAgo.unit ?? ''}`.trim() : clean(first(m, ['timeAgo'], '')),
    competition,
    clubs: normalizeClubs(m.clubs ?? m.club ?? {}),
    players: normalizeMatchPlayers(m.players ?? m.members ?? m.playerStats ?? {}),
    aggregate: isObj(m.aggregate) ? summarizeAggregate(m.aggregate) : {}
  })).filter(m => m.clubs.length >= 1);
}

function summarizeAggregate(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const [clubId, value] of Object.entries(raw)) {
    if (!isObj(value)) continue;
    out[String(clubId)] = {
      goals: num(value.goals),
      assists: num(value.assists),
      shots: num(value.shots),
      passesMade: num(first(value, ['passesmade', 'passesMade'], 0)),
      passAttempts: num(first(value, ['passattempts', 'passAttempts'], 0)),
      tacklesMade: num(first(value, ['tacklesmade', 'tacklesMade'], 0)),
      tackleAttempts: num(first(value, ['tackleattempts', 'tackleAttempts'], 0)),
      saves: num(value.saves),
      secondsPlayed: num(first(value, ['secondsPlayed', 'gameTime'], 0)),
      rating: maybeNum(first(value, ['rating', 'averageRating'], null)),
      mom: num(first(value, ['mom', 'motm'], 0)),
      cleanSheets: num(first(value, ['cleansheetsdef', 'cleanSheets'], 0))
    };
  }
  return out;
}

function dedupePlayers(players) {
  const byKey = new Map();
  for (const p of players) {
    const syntheticId = /^player-\d+$/.test(String(p.id || ''));
    const key = syntheticId ? `name:${normalizeName(p.name)}` : `id:${p.id}`;
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, { ...p });
      continue;
    }
    const merged = { ...previous };
    for (const field of ['games', 'goals', 'assists', 'shots', 'passesMade', 'cleanSheets', 'mom', 'redcards']) {
      if (num(p[field]) > num(previous[field])) merged[field] = num(p[field]);
    }
    if (p.passAttempts != null && (previous.passAttempts == null || num(p.passAttempts) > num(previous.passAttempts))) merged.passAttempts = num(p.passAttempts);
    if (p.tackleAttempts != null && (previous.tackleAttempts == null || num(p.tackleAttempts) > num(previous.tackleAttempts))) merged.tackleAttempts = num(p.tackleAttempts);
    for (const field of ['ovr', 'rating', 'passAccuracy', 'tackleSuccess', 'shotAccuracy', 'winRate', 'secondsPlayed']) {
      if (merged[field] == null && p[field] != null) merged[field] = p[field];
    }
    for (const field of ['position', 'favoritePosition', 'proName', 'clubId']) {
      if (!merged[field] && p[field]) merged[field] = p[field];
    }
    byKey.set(key, merged);
  }
  return [...byKey.values()];
}

function inferClub(matches, players) {
  const score = new Map();
  const names = new Map();
  const add = (id, name, weight) => {
    const key = String(id ?? '').trim();
    if (!key) return;
    score.set(key, (score.get(key) || 0) + weight);
    if (name) names.set(key, name);
  };
  for (const p of players) add(p.clubId, '', 25);
  for (const m of matches) for (const c of m.clubs) add(c.id, c.name, 1);
  let best = null;
  for (const [id, points] of score) {
    if (!best || points > best.points || (points === best.points && (names.get(id) || '').length > (names.get(best.id) || '').length)) {
      best = { id, name: names.get(id) || '', points };
    }
  }
  return best || { id: '', name: '', points: 0 };
}

function activeMatchPlayer(p) {
  return num(p.secondsPlayed) > 0 || num(p.goals) !== 0 || num(p.assists) !== 0 || num(p.passAttempts) > 0 || num(p.passesMade) > 0 || num(p.tackleAttempts) > 0 || num(p.tacklesMade) > 0 || num(p.shots) > 0 || num(p.saves) > 0 || num(p.mom) > 0 || num(p.redcards) > 0;
}

function emptyPlayerAggregate(name = '', id = '', clubId = '') {
  return {
    id,
    name,
    position: '',
    clubId,
    appearances: 0,
    goals: 0,
    assists: 0,
    shots: 0,
    passesMade: 0,
    passAttempts: 0,
    tacklesMade: 0,
    tackleAttempts: 0,
    saves: 0,
    cleanSheets: 0,
    mom: 0,
    redcards: 0,
    secondsPlayed: 0,
    ratingSum: 0,
    ratingCount: 0
  };
}

function aggregateMatchPlayers(matches, clubId) {
  const map = new Map();
  for (const m of matches) {
    for (const p of m.players) {
      if (clubId && p.clubId && String(p.clubId) !== String(clubId)) continue;
      if (!p.name || !activeMatchPlayer(p)) continue;
      const key = normalizeName(p.name);
      const existing = map.get(key) || emptyPlayerAggregate(p.name, p.id, clubId || p.clubId || '');
      existing.appearances += 1;
      existing.goals += num(p.goals);
      existing.assists += num(p.assists);
      existing.shots += num(p.shots);
      existing.passesMade += num(p.passesMade);
      existing.passAttempts += num(p.passAttempts);
      existing.tacklesMade += num(p.tacklesMade);
      existing.tackleAttempts += num(p.tackleAttempts);
      existing.saves += num(p.saves);
      existing.cleanSheets += num(p.cleanSheets);
      existing.mom += num(p.mom);
      existing.redcards += num(p.redcards);
      existing.secondsPlayed += num(p.secondsPlayed);
      if (num(p.rating) > 0) { existing.ratingSum += num(p.rating); existing.ratingCount += 1; }
      if (!existing.position && p.position) existing.position = p.position;
      if (!existing.id && p.id) existing.id = p.id;
      if (!existing.clubId && p.clubId) existing.clubId = p.clubId;
      map.set(key, existing);
    }
  }
  return [...map.values()].map(x => ({
    ...x,
    rating: x.ratingCount ? x.ratingSum / x.ratingCount : null,
    passAccuracy: x.passAttempts ? 100 * x.passesMade / x.passAttempts : null,
    tackleSuccess: x.tackleAttempts ? 100 * x.tacklesMade / x.tackleAttempts : null,
    games: x.appearances
  }));
}

function aggregateMatchWindow(matches, clubId, limit = 5) {
  const ordered = [...matches].sort((a, b) => num(b.timestamp) - num(a.timestamp)).slice(0, limit);
  const team = {
    ...teamResults(ordered, clubId),
    passMade: 0,
    passAttempts: 0,
    tackleMade: 0,
    tackleAttempts: 0,
    ratingSum: 0,
    ratingCount: 0,
    matchesWithPlayerStats: 0
  };
  let playerStatMatches = 0;
  for (const m of ordered) {
    let hasPlayerStats = false;
    for (const p of m.players) {
      if (clubId && p.clubId && String(p.clubId) !== String(clubId)) continue;
      if (!p.name || !activeMatchPlayer(p)) continue;
      hasPlayerStats = true;
      team.passMade += num(p.passesMade);
      team.passAttempts += num(p.passAttempts);
      team.tackleMade += num(p.tacklesMade);
      team.tackleAttempts += num(p.tackleAttempts);
      if (num(p.rating) > 0) { team.ratingSum += num(p.rating); team.ratingCount += 1; }
    }
    if (hasPlayerStats) playerStatMatches += 1;
  }
  team.passRate = team.passAttempts ? 100 * team.passMade / team.passAttempts : null;
  team.tackleRate = team.tackleAttempts ? 100 * team.tackleMade / team.tackleAttempts : null;
  team.playerRatingAverage = team.ratingCount ? team.ratingSum / team.ratingCount : null;
  team.matchesWithPlayerStats = playerStatMatches;
  return { matches: ordered, players: aggregateMatchPlayers(ordered, clubId), team };
}

function mergePlayerSources(primary, derivedAll, recent5, clubId) {
  const byName = new Map();
  const derivedByName = new Map(derivedAll.map(p => [normalizeName(p.name), p]));
  const recentByName = new Map(recent5.map(p => [normalizeName(p.name), p]));
  const out = [];

  for (const p of primary) {
    const key = normalizeName(p.name);
    if (!key) continue;
    const observed = derivedByName.get(key);
    const recent = recentByName.get(key);
    out.push({
      ...p,
      clubId: p.clubId || observed?.clubId || clubId,
      sourceScope: 'season-player-file',
      matchAggregate: observed ? compactAggregate(observed) : null,
      recent5: recent ? compactAggregate(recent) : null
    });
    byName.set(key, true);
  }

  for (const p of derivedAll) {
    const key = normalizeName(p.name);
    if (!key || byName.has(key)) continue;
    const recent = recentByName.get(key);
    out.push({
      id: p.id || `match-${out.length + 1}`,
      name: p.name,
      position: p.position || '',
      favoritePosition: p.position || '',
      proName: null,
      ovr: null,
      games: p.games,
      goals: p.goals,
      assists: p.assists,
      rating: p.rating,
      winRate: null,
      clubId: p.clubId || clubId,
      shots: p.shots,
      shotAccuracy: null,
      passesMade: p.passesMade,
      passAttempts: p.passAttempts,
      passAccuracy: p.passAccuracy,
      tacklesMade: p.tacklesMade,
      tackleAttempts: p.tackleAttempts,
      tackleSuccess: p.tackleSuccess,
      saves: p.saves,
      cleanSheets: p.cleanSheets,
      cleanSheetsDef: null,
      cleanSheetsGK: null,
      mom: p.mom,
      redcards: p.redcards,
      secondsPlayed: p.secondsPlayed,
      sourceScope: 'uploaded-matches',
      matchAggregate: compactAggregate(p),
      recent5: recent ? compactAggregate(recent) : null
    });
    byName.set(key, true);
  }

  return out;
}

function compactAggregate(p) {
  if (!p) return null;
  return {
    appearances: num(p.appearances ?? p.games),
    goals: num(p.goals),
    assists: num(p.assists),
    shots: num(p.shots),
    passesMade: num(p.passesMade),
    passAttempts: num(p.passAttempts),
    passAccuracy: p.passAccuracy == null ? null : num(p.passAccuracy),
    tacklesMade: num(p.tacklesMade),
    tackleAttempts: num(p.tackleAttempts),
    tackleSuccess: p.tackleSuccess == null ? null : num(p.tackleSuccess),
    saves: num(p.saves),
    cleanSheets: num(p.cleanSheets),
    mom: num(p.mom),
    redcards: num(p.redcards),
    secondsPlayed: num(p.secondsPlayed),
    rating: p.rating == null ? null : num(p.rating)
  };
}

function dedupeMatches(matches) {
  const seen = new Set();
  return matches.filter(m => {
    const key = String(m.competition || 'unknown') + ':' + String(m.id || `${m.timestamp}:${JSON.stringify(m.clubs)}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function teamResults(matches, clubId) {
  let wins = 0, draws = 0, losses = 0, goals = 0, against = 0;
  for (const m of matches) {
    const own = m.clubs.find(c => String(c.id) === String(clubId)) || m.clubs[0];
    const opponent = m.clubs.find(c => String(c.id) !== String(own?.id)) || m.clubs[1];
    if (!own) continue;
    const gf = num(own.goals), ga = num(opponent?.goals);
    goals += gf;
    against += ga;
    if (gf > ga) wins += 1;
    else if (gf < ga) losses += 1;
    else draws += 1;
  }
  return {
    matches: matches.length,
    wins,
    draws,
    losses,
    goals,
    against,
    winRate: matches.length ? 100 * wins / matches.length : 0,
    goalsPerMatch: matches.length ? goals / matches.length : 0,
    concededPerMatch: matches.length ? against / matches.length : 0
  };
}

function funRecords(matches, players, clubId) {
  const records = [];
  const add = (title, value, subtitle = '') => records.push({ title, value, subtitle });
  const topGoal = [...players].sort((a, b) => num(b.goals) - num(a.goals) || num(b.games) - num(a.games))[0];
  const topAssist = [...players].sort((a, b) => num(b.assists) - num(a.assists) || num(b.games) - num(a.games))[0];
  const topApps = [...players].sort((a, b) => num(b.games) - num(a.games) || num(b.goals) - num(a.goals))[0];
  const rated = [...players].filter(p => num(p.games) >= 3 && num(p.rating) > 0).sort((a, b) => num(b.rating) - num(a.rating))[0];

  const passers = [...players]
    .map(p => ({ ...p, pct: p.passAttempts != null && num(p.passAttempts) > 0 ? 100 * num(p.passesMade) / num(p.passAttempts) : p.passAccuracy }))
    .filter(p => p.pct != null)
    .sort((a, b) => num(b.pct) - num(a.pct));
  const tacklers = [...players]
    .map(p => ({ ...p, pct: p.tackleAttempts != null && num(p.tackleAttempts) > 0 ? 100 * num(p.tacklesMade) / num(p.tackleAttempts) : p.tackleSuccess }))
    .filter(p => p.pct != null)
    .sort((a, b) => num(b.pct) - num(a.pct));

  if (topGoal?.goals) add('Capocannoniere', topGoal.name, `${topGoal.goals} gol · ${topGoal.games ?? 0} PG stagionali`);
  if (topAssist?.assists) add('Assistman', topAssist.name, `${topAssist.assists} assist · ${topAssist.games ?? 0} PG stagionali`);
  if (topApps?.games) add('Più presenze', topApps.name, `${topApps.games} PG stagionali`);
  if (rated) add('Rating migliore', rated.name, `${Number(rated.rating).toFixed(2)} · minimo 3 PG stagionali`);
  if (passers[0]) add('Passaggi più precisi', passers[0].name, `${Number(passers[0].pct).toFixed(1)}%${passers[0].passAttempts ? ` · ${passers[0].passesMade}/${passers[0].passAttempts}` : ' · percentuale EA'}`);
  if (tacklers[0]) add('Contrasti più efficaci', tacklers[0].name, `${Number(tacklers[0].pct).toFixed(1)}%${tacklers[0].tackleAttempts ? ` · ${tacklers[0].tacklesMade}/${tacklers[0].tackleAttempts}` : ' · percentuale EA'}`);

  const rows = matches.map(m => {
    const own = m.clubs.find(c => String(c.id) === String(clubId)) || m.clubs[0];
    const opp = m.clubs.find(c => String(c.id) !== String(own?.id)) || m.clubs[1];
    return own ? { m, own, opp, gf: num(own.goals), ga: num(opp?.goals) } : null;
  }).filter(Boolean);

  const biggestWin = [...rows].filter(x => x.gf > x.ga).sort((a, b) => (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)[0];
  const biggestLoss = [...rows].filter(x => x.gf < x.ga).sort((a, b) => (b.ga - b.gf) - (a.ga - a.gf) || b.ga - a.ga)[0];
  if (biggestWin) add('Vittoria più larga', `${biggestWin.gf}-${biggestWin.ga}`, `vs ${biggestWin.opp?.name || 'Avversario'}`);
  if (biggestLoss) add('Sconfitta più larga', `${biggestLoss.gf}-${biggestLoss.ga}`, `vs ${biggestLoss.opp?.name || 'Avversario'}`);
  const cleanSheets = rows.filter(x => x.ga === 0).length;
  if (cleanSheets) add('Clean sheet', `${cleanSheets}`, 'partite senza gol subiti');
  const spectacle = [...rows].sort((a, b) => (b.gf + b.ga) - (a.gf + a.ga) || b.gf - a.gf)[0];
  if (spectacle && spectacle.gf + spectacle.ga > 0) add('Partita più spettacolare', `${spectacle.gf}-${spectacle.ga}`, `vs ${spectacle.opp?.name || 'Avversario'}`);

  let bestMatch = null;
  for (const m of matches) {
    for (const p of m.players) {
      if (clubId && p.clubId && String(p.clubId) !== String(clubId)) continue;
      if (num(p.rating) > 0 && (!bestMatch || num(p.rating) > bestMatch.rating || (num(p.rating) === bestMatch.rating && num(p.goals) > bestMatch.goals))) {
        bestMatch = { name: p.name, rating: num(p.rating), goals: num(p.goals) };
      }
    }
  }
  if (bestMatch) add('Prestazione singola migliore', bestMatch.name, `${bestMatch.rating.toFixed(2)} · ${bestMatch.goals} gol`);

  let current = 0, best = 0;
  for (const row of [...rows].sort((a, b) => num(a.m.timestamp) - num(b.m.timestamp))) {
    if (row.gf > row.ga) { current += 1; best = Math.max(best, current); }
    else current = 0;
  }
  if (best > 1) add('Striscia vittorie', `${best}`, 'vittorie consecutive');

  const orderedRows = [...rows].sort((a, b) => num(b.m.timestamp) - num(a.m.timestamp));
  const form = orderedRows.slice(0, 10).map(x => x.gf > x.ga ? 'W' : x.gf < x.ga ? 'L' : 'D');
  const redFlags = [];
  const quietScorers = players.filter(p => num(p.games) >= 5 && num(p.goals) === 0).sort((a, b) => num(b.games) - num(a.games)).slice(0, 3);
  for (const p of quietScorers) redFlags.push({ title: 'Zero gol', value: p.name, subtitle: `${p.games} PG stagionali senza gol` });

  const inaccurate = players
    .map(p => ({ ...p, acc: p.passAttempts != null && num(p.passAttempts) > 0 ? 100 * num(p.passesMade) / num(p.passAttempts) : p.passAccuracy }))
    .filter(p => p.acc != null && num(p.acc) < 65)
    .sort((a, b) => num(a.acc) - num(b.acc))[0];
  if (inaccurate) redFlags.push({ title: 'Passaggi da rivedere', value: inaccurate.name, subtitle: `${num(inaccurate.acc).toFixed(1)}%${inaccurate.passAttempts ? ` · ${inaccurate.passesMade}/${inaccurate.passAttempts}` : ' · percentuale EA'}` });

  const redCardPlayer = players.filter(p => num(p.redcards) > 0).sort((a, b) => num(b.redcards) - num(a.redcards))[0];
  if (redCardPlayer) redFlags.push({ title: 'Cartellini rossi', value: redCardPlayer.name, subtitle: `${redCardPlayer.redcards} rossi stagionali` });
  const lowAttendance = players.filter(p => num(p.games) > 0).sort((a, b) => num(a.games) - num(b.games))[0];
  if (lowAttendance && players.length > 1 && num(lowAttendance.games) <= 2) redFlags.push({ title: 'Presenze fantasma', value: lowAttendance.name, subtitle: `solo ${lowAttendance.games} PG stagionali` });

  return { available: records.length > 0, records, redFlags, form };
}

function categoryFromFileName(fileName) {
  const name = clean(fileName).toLocaleLowerCase('it-IT');
  if (/playoff|play-off|post[- ]?season/.test(name)) return 'playoffs';
  if (/friendly|friendlymatch|amichevol|amichevole/.test(name)) return 'friendlies';
  if (/league|campionat|division/.test(name)) return 'league';
  return null;
}

function detectMatchCategory(raw, fileName = '') {
  const matches = getMatchList(raw);
  const rawTypes = [];
  const pushType = value => {
    if (value === undefined || value === null || value === '') return;
    rawTypes.push(String(value).trim());
  };
  if (isObj(raw)) pushType(first(raw, ['matchType', 'match_type', 'matchtype', 'type'], undefined));
  for (const m of matches) {
    pushType(first(m, ['matchType', 'match_type', 'matchtype', 'type'], undefined));
    for (const c of Object.values(isObj(m?.clubs) ? m.clubs : {})) pushType(first(c, ['matchType', 'match_type', 'matchtype', 'type'], undefined));
  }

  const types = [...new Set(rawTypes.map(x => x.toLowerCase()))];
  const direct = new Map([
    ['leaguematch', 'league'], ['league', 'league'], ['regularseason', 'league'],
    ['playoffmatch', 'playoffs'], ['playoff', 'playoffs'], ['playoffs', 'playoffs'],
    ['friendlymatch', 'friendlies'], ['friendly', 'friendlies'], ['friendlies', 'friendlies']
  ]);
  const directCats = [...new Set(types.map(t => direct.get(t)).filter(Boolean))];
  if (directCats.length === 1) return { category: directCats[0], confidence: 'high', reason: `matchType: ${types.join(', ')}` };
  if (directCats.length > 1) return { category: null, confidence: 'ambiguous', reason: `matchType multipli: ${types.join(', ')}` };

  const byName = categoryFromFileName(fileName);
  if (byName) return { category: byName, confidence: 'medium', reason: `indizio dal nome file: ${clean(fileName)}` };

  if (types.length === 1 && types[0] === '1') return { category: 'league', confidence: 'high', reason: 'matchType numerico 1 (formato EA rilevato nei dati forniti)' };

  return { category: null, confidence: 'unknown', reason: types.length ? `matchType non riconosciuto: ${types.join(', ')}` : 'nessun matchType disponibile' };
}

function looksLikePlayerStats(raw) {
  if (!isObj(raw)) return false;
  if (Array.isArray(raw.members) || isObj(raw.members)) return true;
  const keys = Object.keys(raw);
  return ['gamesPlayed', 'ratingAve', 'proOverall', 'favoritePosition', 'passSuccessRate', 'tackleSuccessRate'].some(k => keys.includes(k));
}

function detectDataFile(raw, fileName = '') {
  if (looksLikePlayerStats(raw)) {
    const players = normalizePlayersFile(raw, '');
    if (players.length) return {
      category: 'players',
      confidence: 'high',
      reason: 'struttura members/statistiche cumulative del giocatore',
      rows: players.length,
      parsed: players
    };
  }

  const matches = getMatchList(raw);
  if (matches.length) {
    const matchCategory = detectMatchCategory(raw, fileName);
    if (!matchCategory.category) return {
      category: null,
      confidence: matchCategory.confidence,
      reason: matchCategory.reason,
      rows: matches.length,
      matches
    };
    const parsed = normalizeMatchesFile(raw, matchCategory.category);
    if (parsed.length) return {
      category: matchCategory.category,
      confidence: matchCategory.confidence,
      reason: matchCategory.reason,
      rows: parsed.length,
      parsed
    };
  }

  const players = normalizePlayersFile(raw, '');
  if (players.length && players.some(p => p.name && (p.games != null || p.goals || p.assists || p.rating != null))) {
    return { category: 'players', confidence: 'medium', reason: 'struttura statistiche giocatore', rows: players.length, parsed: players };
  }

  return { category: null, confidence: 'unknown', reason: 'struttura non riconosciuta', rows: 0, parsed: [] };
}

function buildTeam({ fileRecords, role }) {
  const playersRaw = fileRecords?.players?.parsed ?? null;
  const matchGroups = [
    normalizeMatchesFile(fileRecords?.league?.parsed ?? null, 'league'),
    normalizeMatchesFile(fileRecords?.playoffs?.parsed ?? null, 'playoffs'),
    normalizeMatchesFile(fileRecords?.friendlies?.parsed ?? null, 'friendlies')
  ].flat();

  const primaryPlayers = normalizePlayersFile(playersRaw, '');
  const uniqueMatchGroups = dedupeMatches(matchGroups);
  const inferred = inferClub(uniqueMatchGroups, primaryPlayers);
  const clubId = inferred.id;
  const teamClub = uniqueMatchGroups.flatMap(m => m.clubs).find(c => String(c.id) === String(clubId));
  const clubName = teamClub?.name || (role === 'own' ? 'Sisal FC 2021' : 'Avversario');
  const matches = uniqueMatchGroups
    .filter(m => !clubId || m.clubs.some(c => String(c.id) === String(clubId)))
    .sort((a, b) => num(b.timestamp) - num(a.timestamp));

  const derivedAll = aggregateMatchPlayers(matches, clubId);
  const recent5Window = aggregateMatchWindow(matches, clubId, 5);
  const recent10Window = aggregateMatchWindow(matches, clubId, 10);
  const players = mergePlayerSources(primaryPlayers, derivedAll, recent5Window.players, clubId)
    .sort((a, b) => num(b.goals) - num(a.goals) || num(b.assists) - num(a.assists) || normalizeName(a.name).localeCompare(normalizeName(b.name)));

  const overall = teamResults(matches, clubId);
  const byCompetition = {};
  for (const key of ['league', 'playoffs', 'friendlies']) {
    const categoryMatches = matches.filter(m => m.competition === key);
    byCompetition[key] = teamResults(categoryMatches, clubId);
  }

  const fileStatus = {};
  for (const key of ['players', 'league', 'playoffs', 'friendlies']) {
    const f = fileRecords?.[key];
    fileStatus[key] = {
      present: Boolean(f && Array.isArray(f.parsed) && f.parsed.length),
      fileName: f?.fileName || null,
      uploadedAt: f?.uploadedAt || null,
      size: f?.size || 0,
      rows: Array.isArray(f?.parsed) ? f.parsed.length : 0,
      detection: f?.detected || null,
      schemaVersion: f?.schemaVersion || null
    };
  }

  return {
    role,
    club: {
      id: clubId,
      name: clean(teamClub?.name || clubName),
      platform: 'common-gen5',
      gamesPlayed: overall.matches,
      wins: overall.wins,
      draws: overall.draws,
      losses: overall.losses,
      goals: overall.goals,
      goalsAgainst: overall.against
    },
    players,
    matches,
    matchArchive: matches,
    overall,
    byCompetition,
    recent5: {
      matches: recent5Window.matches,
      team: recent5Window.team,
      players: recent5Window.players
    },
    recent10: {
      matches: recent10Window.matches,
      team: recent10Window.team,
      players: recent10Window.players
    },
    playerStatsScope: primaryPlayers.length ? 'season-player-file' : 'uploaded-matches',
    playerStatsScopeLabel: primaryPlayers.length ? 'Statistiche cumulative del file Giocatori (non limitate alle ultime 5 archiviate)' : 'Statistiche ricavate dalle partite caricate',
    fun: funRecords(matches, players, clubId),
    fileStatus,
    ready: Boolean(players.length || matches.length || fileStatus.players.present || fileStatus.league.present || fileStatus.playoffs.present || fileStatus.friendlies.present),
    complete: Boolean(fileStatus.players.present && fileStatus.league.present && fileStatus.playoffs.present && fileStatus.friendlies.present && players.length && matches.length)
  };
}

export {
  clean,
  normalizeName,
  parseJsonText,
  normalizePlayersFile,
  normalizeMatchesFile,
  detectMatchCategory,
  detectDataFile,
  buildTeam,
  teamResults,
  funRecords,
  inferClub,
  aggregateMatchPlayers,
  aggregateMatchWindow,
  activeMatchPlayer
};
