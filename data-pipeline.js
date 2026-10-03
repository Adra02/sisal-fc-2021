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
    if (isObj(value)) {
      const found = deepFirst(value, keys, undefined, depth + 1);
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
  const secondsPlayed = num(deepFirst(p, ['secondsPlayed', 'timePlayed'], 0));
  const minutes = num(deepFirst(p, ['minutes', 'minutesPlayed'], 0));
  return {
    id: id || `player-${index + 1}`,
    name: nameOfPlayer(p, index),
    position: clean(first(p, ['pos', 'position', 'role'], '')),
    ovr: maybeNum(deepFirst(p, ['ovr', 'overall', 'overallRating', 'overall_rating', 'overallrating'], null)),
    games: num(deepFirst(p, ['games', 'gamesPlayed', 'matches', 'appearances', 'gp'], 0)),
    goals: num(deepFirst(p, ['goals', 'goal'], 0)),
    assists: num(deepFirst(p, ['assists', 'assist'], 0)),
    rating: maybeNum(deepFirst(p, ['rating', 'averageRating', 'avgRating', 'ratingAverage'], null)),
    clubId: String(first(p, ['clubId', 'clubID', 'club_id'], clubId) ?? clubId ?? '').trim(),
    shots: num(deepFirst(p, ['shots', 'shot'], 0)),
    passesMade: num(deepFirst(p, ['passesmade', 'passesMade', 'passesMadeTotal'], 0)),
    passAttempts: num(deepFirst(p, ['passattempts', 'passAttempts', 'passesAttempted'], 0)),
    passAccuracy: maybeNum(deepFirst(p, ['passAccuracy', 'passAccuracyPct', 'passPercent', 'passRate'], null)),
    tacklesMade: num(deepFirst(p, ['tacklesmade', 'tacklesMade', 'tacklesWon'], 0)),
    tackleAttempts: num(deepFirst(p, ['tackleattempts', 'tackleAttempts', 'tacklesAttempted'], 0)),
    tackleSuccess: maybeNum(deepFirst(p, ['tackleSuccess', 'tackleSuccessPct', 'tacklePercent', 'tackleRate'], null)),
    saves: num(deepFirst(p, ['saves', 'save'], 0)),
    cleanSheets: num(deepFirst(p, ['cleanSheets', 'cleansheets'], 0)),
    mom: num(deepFirst(p, ['mom', 'motm', 'manOfTheMatch'], 0)),
    redcards: num(deepFirst(p, ['redcards', 'redCards'], 0)),
    secondsPlayed: secondsPlayed || minutes * 60
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
      matchType: first(c, ['matchType'], null)
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
  return isObj(value) && (value.matchId !== undefined || value.matchID !== undefined || value.clubs !== undefined || (value.timestamp !== undefined && (value.players !== undefined || value.aggregate !== undefined)));
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
  const mapped = Object.entries(raw).filter(([, value]) => looksLikeMatch(value)).map(([, value]) => value);
  return mapped;
}

function normalizeMatchesFile(raw, competition) {
  return getMatchList(raw).map((m, index) => ({
    id: String(first(m, ['matchId', 'matchID', 'id'], `${competition}-${index + 1}`) ?? `${competition}-${index + 1}`),
    timestamp: first(m, ['timestamp', 'date', 'createdAt', 'matchDate'], ''),
    timeAgo: clean(first(m, ['timeAgo'], '')),
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
    const key = String(p.id || normalizeName(p.name));
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, { ...p });
      continue;
    }
    const merged = { ...previous };
    for (const field of ['games','goals','assists','shots','passesMade','passAttempts','tacklesMade','tackleAttempts','saves','cleanSheets','mom','redcards','secondsPlayed']) {
      merged[field] = Math.max(num(previous[field]), num(p[field]));
    }
    if (num(p.ovr) > num(previous.ovr)) merged.ovr = p.ovr;
    if (num(p.rating) > num(previous.rating)) merged.rating = p.rating;
    if (!merged.position && p.position) merged.position = p.position;
    if (!merged.clubId && p.clubId) merged.clubId = p.clubId;
    if (merged.passAccuracy == null && p.passAccuracy != null) merged.passAccuracy = p.passAccuracy;
    if (merged.tackleSuccess == null && p.tackleSuccess != null) merged.tackleSuccess = p.tackleSuccess;
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

function aggregateFromMatchPlayers(matches, clubId) {
  const map = new Map();
  const get = (p) => {
    const key = p.id && !String(p.id).startsWith('player-') ? `id:${p.id}` : `name:${normalizeName(p.name)}`;
    let x = map.get(key);
    if (!x) x = { id: p.id, name: p.name, position: p.position, clubId, appearances: 0, goals: 0, assists: 0, shots: 0, passesMade: 0, passAttempts: 0, tacklesMade: 0, tackleAttempts: 0, saves: 0, cleanSheets: 0, mom: 0, redcards: 0, secondsPlayed: 0, ratingSum: 0, ratingCount: 0 };
    x.appearances += 1;
    x.goals += num(p.goals); x.assists += num(p.assists); x.shots += num(p.shots);
    x.passesMade += num(p.passesMade); x.passAttempts += num(p.passAttempts);
    x.tacklesMade += num(p.tacklesMade); x.tackleAttempts += num(p.tackleAttempts);
    x.saves += num(p.saves); x.cleanSheets += num(p.cleanSheets); x.mom += num(p.mom);
    x.redcards += num(p.redcards); x.secondsPlayed += num(p.secondsPlayed);
    if (num(p.rating) > 0) { x.ratingSum += num(p.rating); x.ratingCount += 1; }
    if (!x.position && p.position) x.position = p.position;
    map.set(key, x);
  };
  for (const m of matches) {
    for (const p of m.players) {
      if (clubId && p.clubId && String(p.clubId) !== String(clubId)) continue;
      if (!p.name) continue;
      get(p);
    }
    const agg = m.aggregate?.[String(clubId)];
    if (agg) {
      // Aggregate is kept only as a fallback source for team totals, not added to individual appearances.
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

function mergePlayerSources(primary, derived, clubId) {
  const byName = new Map();
  const out = [];
  for (const p of [...primary, ...derived]) {
    const key = normalizeName(p.name);
    if (!key) continue;
    const current = byName.get(key);
    if (!current) {
      const copy = { ...p, clubId: p.clubId || clubId };
      byName.set(key, copy); out.push(copy); continue;
    }
    for (const field of ['games','goals','assists','shots','passesMade','passAttempts','tacklesMade','tackleAttempts','saves','cleanSheets','mom','redcards','secondsPlayed']) {
      if (num(p[field]) > num(current[field])) current[field] = num(p[field]);
    }
    if (current.rating == null && p.rating != null) current.rating = p.rating;
    if (!current.position && p.position) current.position = p.position;
    if (current.ovr == null && p.ovr != null) current.ovr = p.ovr;
    if (!current.passAccuracy && p.passAccuracy != null) current.passAccuracy = p.passAccuracy;
    if (!current.tackleSuccess && p.tackleSuccess != null) current.tackleSuccess = p.tackleSuccess;
  }
  return out;
}

function teamResults(matches, clubId) {
  let wins = 0, draws = 0, losses = 0, goals = 0, against = 0;
  for (const m of matches) {
    const own = m.clubs.find(c => String(c.id) === String(clubId)) || m.clubs[0];
    const opponent = m.clubs.find(c => String(c.id) !== String(own?.id)) || m.clubs[1];
    if (!own) continue;
    const gf = num(own.goals), ga = num(opponent?.goals);
    goals += gf; against += ga;
    if (gf > ga) wins++; else if (gf < ga) losses++; else draws++;
  }
  return { matches: matches.length, wins, draws, losses, goals, against, winRate: matches.length ? 100 * wins / matches.length : 0, goalsPerMatch: matches.length ? goals / matches.length : 0, concededPerMatch: matches.length ? against / matches.length : 0 };
}

function funRecords(matches, players, clubId) {
  const records = [];
  const add = (title, value, subtitle = '') => records.push({ title, value, subtitle });
  const topGoal = [...players].sort((a,b)=>num(b.goals)-num(a.goals)||num(b.games)-num(a.games))[0];
  const topAssist = [...players].sort((a,b)=>num(b.assists)-num(a.assists)||num(b.games)-num(a.games))[0];
  const topApps = [...players].sort((a,b)=>num(b.games)-num(a.games)||num(b.goals)-num(a.goals))[0];
  const rated = [...players].filter(p=>num(p.games)>=3&&num(p.rating)>0).sort((a,b)=>num(b.rating)-num(a.rating))[0];
  const passers = [...players].filter(p=>num(p.passAttempts)>0).map(p=>({...p,pct:100*p.passesMade/p.passAttempts})).sort((a,b)=>b.pct-a.pct||b.passAttempts-a.passAttempts)[0];
  const tacklers = [...players].filter(p=>num(p.tackleAttempts)>0).map(p=>({...p,pct:100*p.tacklesMade/p.tackleAttempts})).sort((a,b)=>b.pct-a.pct||b.tackleAttempts-a.tackleAttempts)[0];
  if(topGoal?.goals) add('Capocannoniere',topGoal.name,`${topGoal.goals} gol`);
  if(topAssist?.assists) add('Assistman',topAssist.name,`${topAssist.assists} assist`);
  if(topApps?.games) add('Più presenze',topApps.name,`${topApps.games} PG`);
  if(rated) add('Rating migliore',rated.name,`${Number(rated.rating).toFixed(2)} · minimo 3 PG`);
  if(passers) add('Passaggi più precisi',passers.name,`${passers.pct.toFixed(1)}% · ${passers.passesMade}/${passers.passAttempts}`);
  if(tacklers) add('Contrasti più efficaci',tacklers.name,`${tacklers.pct.toFixed(1)}% · ${tacklers.tacklesMade}/${tacklers.tackleAttempts}`);
  const rows=matches.map(m=>{const own=m.clubs.find(c=>String(c.id)===String(clubId))||m.clubs[0];const opp=m.clubs.find(c=>String(c.id)!==String(own?.id))||m.clubs[1];return own?{m,own,opp,gf:num(own.goals),ga:num(opp?.goals)}:null}).filter(Boolean);
  const biggestWin=[...rows].filter(x=>x.gf>x.ga).sort((a,b)=>(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf)[0];
  const biggestLoss=[...rows].filter(x=>x.gf<x.ga).sort((a,b)=>(b.ga-b.gf)-(a.ga-a.gf)||b.ga-a.ga)[0];
  if(biggestWin)add('Vittoria più larga',`${biggestWin.gf}-${biggestWin.ga}`,`vs ${biggestWin.opp?.name||'Avversario'}`);
  if(biggestLoss)add('Sconfitta più larga',`${biggestLoss.gf}-${biggestLoss.ga}`,`vs ${biggestLoss.opp?.name||'Avversario'}`);
  const cleanSheets=rows.filter(x=>x.ga===0).length;if(cleanSheets)add('Clean sheet',`${cleanSheets}`,'partite senza gol subiti');
  const spectacle=[...rows].sort((a,b)=>(b.gf+b.ga)-(a.gf+a.ga)||b.gf-a.gf)[0];if(spectacle&&spectacle.gf+spectacle.ga>0)add('Partita più spettacolare',`${spectacle.gf}-${spectacle.ga}`,`vs ${spectacle.opp?.name||'Avversario'}`);
  let bestMatch=null;for(const m of matches)for(const p of m.players){if(clubId&&p.clubId&&String(p.clubId)!==String(clubId))continue;if(num(p.rating)>0&&(!bestMatch||num(p.rating)>bestMatch.rating||(num(p.rating)===bestMatch.rating&&num(p.goals)>bestMatch.goals)))bestMatch={name:p.name,rating:num(p.rating),goals:num(p.goals),matchId:m.id};}
  if(bestMatch)add('Prestazione singola migliore',bestMatch.name,`${bestMatch.rating.toFixed(2)} · ${bestMatch.goals} gol`);
  let current=0,best=0;for(const row of [...rows].sort((a,b)=>num(a.m.timestamp)-num(b.m.timestamp))){if(row.gf>row.ga){current+=1;best=Math.max(best,current)}else current=0}if(best>1)add('Striscia vittorie',`${best}`,'vittorie consecutive');
  const orderedRows=[...rows].sort((a,b)=>num(b.m.timestamp)-num(a.m.timestamp));
  const form=orderedRows.slice(0,10).map(x=>x.gf>x.ga?'W':x.gf<x.ga?'L':'D');
  const redFlags=[];
  const quietScorers=players.filter(p=>num(p.games)>=5&&num(p.goals)===0).sort((a,b)=>num(b.games)-num(a.games)).slice(0,3);
  for(const p of quietScorers)redFlags.push({title:'Zero gol',value:p.name,subtitle:`${p.games} PG senza gol`});
  const inaccurate=players.filter(p=>num(p.passAttempts)>=25).map(p=>({...p,acc:100*num(p.passesMade)/num(p.passAttempts)})).filter(p=>p.acc<65).sort((a,b)=>a.acc-b.acc)[0];
  if(inaccurate)redFlags.push({title:'Passaggi da rivedere',value:inaccurate.name,subtitle:`${inaccurate.acc.toFixed(1)}% · ${inaccurate.passesMade}/${inaccurate.passAttempts}`});
  const redCardPlayer=players.filter(p=>num(p.redcards)>0).sort((a,b)=>num(b.redcards)-num(a.redcards))[0];
  if(redCardPlayer)redFlags.push({title:'Cartellini rossi',value:redCardPlayer.name,subtitle:`${redCardPlayer.redcards} rossi`});
  const lowAttendance=players.filter(p=>num(p.games)>0).sort((a,b)=>num(a.games)-num(b.games))[0];
  if(lowAttendance&&matches.length>=10&&num(lowAttendance.games)<=2)redFlags.push({title:'Presenze fantasma',value:lowAttendance.name,subtitle:`solo ${lowAttendance.games} PG`});
  return {available:records.length>0,records,redFlags,form};
}
function buildTeam({ fileRecords, role }) {
  const playersRaw = fileRecords?.players?.parsed ?? null;
  const league = fileRecords?.league?.parsed ?? null;
  const playoffs = fileRecords?.playoffs?.parsed ?? null;
  const friendlies = fileRecords?.friendlies?.parsed ?? null;
  const matchGroups = [
    normalizeMatchesFile(league, 'league'),
    normalizeMatchesFile(playoffs, 'playoffs'),
    normalizeMatchesFile(friendlies, 'friendlies')
  ].flat();
  const primaryPlayers = normalizePlayersFile(playersRaw, '');
  const inferred = inferClub(matchGroups, primaryPlayers);
  const clubId = inferred.id;
  const teamClub = matchGroups.flatMap(m => m.clubs).find(c => String(c.id) === String(clubId));
  const clubName = teamClub?.name || (role === 'own' ? 'Sisal FC 2021' : 'Avversario');
  const matches = matchGroups.filter(m => !clubId || m.clubs.some(c => String(c.id) === String(clubId))).sort((a,b)=>num(b.timestamp)-num(a.timestamp));
  const playersWithClub = primaryPlayers.map(p => ({ ...p, clubId: p.clubId || clubId }));
  const derived = aggregateFromMatchPlayers(matches, clubId);
  const players = mergePlayerSources(playersWithClub.filter(p=>!clubId || !p.clubId || String(p.clubId)===String(clubId)), derived, clubId)
    .map(p=>({ ...p, clubId: p.clubId || clubId }))
    .sort((a,b)=>num(b.goals)-num(a.goals)||num(b.assists)-num(a.assists)||normalizeName(a.name).localeCompare(normalizeName(b.name)));
  const overall = teamResults(matches, clubId);
  const byCompetition = {};
  for (const key of ['league','playoffs','friendlies']) byCompetition[key] = teamResults(matches.filter(m=>m.competition===key), clubId);
  const fileStatus = {};
  for (const key of ['players','league','playoffs','friendlies']) {
    const f = fileRecords?.[key];
    fileStatus[key] = { present: Boolean(f && Array.isArray(f.parsed) && f.parsed.length), fileName: f?.fileName || null, uploadedAt: f?.uploadedAt || null, size: f?.size || 0, rows: Array.isArray(f?.parsed) ? f.parsed.length : 0 };
  }
  return {
    role,
    club: { id: clubId, name: clean(teamClub?.name || clubName), platform: 'common-gen5', gamesPlayed: overall.matches, wins: overall.wins, draws: overall.draws, losses: overall.losses, goals: overall.goals, goalsAgainst: overall.against },
    players,
    matches,
    fun: funRecords(matches, players, clubId),
    overall,
    byCompetition,
    fileStatus,
    ready: Boolean(players.length || matches.length || fileStatus.players.present || fileStatus.league.present || fileStatus.playoffs.present || fileStatus.friendlies.present),
    complete: Boolean(fileStatus.players.present && fileStatus.league.present && fileStatus.playoffs.present && fileStatus.friendlies.present && players.length && matches.length)
  };
}

export { clean, normalizeName, parseJsonText, normalizePlayersFile, normalizeMatchesFile, buildTeam, teamResults, funRecords, inferClub };
