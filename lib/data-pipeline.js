import { detectKnownProClubsFile } from './proclubs-schema.js';
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
  const shotsRaw = deepFirst(p, ['shots', 'shot'], null);
  const goalsValue = num(deepFirst(p, ['goals', 'goal'], 0));
  const shotRate = maybeNum(deepFirst(p, ['shotSuccessRate', 'goalConversionRate', 'goalConversion', 'conversionRate', 'shotAccuracy', 'shotAccuracyPct'], null));
  const explicitShots = maybeNum(shotsRaw);
  const estimatedShotsRaw = explicitShots == null && goalsValue > 0 && shotRate != null && shotRate > 0
    ? (goalsValue * 100 / shotRate)
    : null;
  const resolvedShots = explicitShots != null
    ? explicitShots
    : (estimatedShotsRaw != null ? Math.round(estimatedShotsRaw) : null);
  return {
    id: id || `player-${index + 1}`,
    name: nameOfPlayer(p, index),
    position: clean(first(p, ['favoritePosition', 'position', 'role', 'pos'], '')),
    favoritePosition: clean(first(p, ['favoritePosition'], '')) || null,
    proName: clean(first(p, ['proName', 'proname'], '')) || null,
    ovr: maybeNum(deepFirst(p, ['proOverall', 'proOverallStr', 'ovr', 'overall', 'overallRating', 'overall_rating', 'overallrating'], null)),
    proPosCode: maybeNum(deepFirst(p, ['proPos'], null)),
    proStyle: maybeNum(deepFirst(p, ['proStyle'], null)),
    proHeight: maybeNum(deepFirst(p, ['proHeight'], null)),
    proNationality: maybeNum(deepFirst(p, ['proNationality'], null)),
    games: maybeNum(deepFirst(p, ['gamesPlayed', 'games', 'matches', 'appearances', 'gp'], null)),
    goals: goalsValue,
    assists: num(deepFirst(p, ['assists', 'assist'], 0)),
    rating: maybeNum(deepFirst(p, ['ratingAve', 'ratingAverage', 'averageRating', 'avgRating', 'rating'], null)),
    winRate: maybeNum(deepFirst(p, ['winRate'], null)),
    clubId: String(first(p, ['clubId', 'clubID', 'club_id'], clubId) ?? clubId ?? '').trim(),
    shots: resolvedShots,
    shotsKnown: resolvedShots != null,
    shotsExplicit: explicitShots != null,
    shotsEstimated: explicitShots == null && estimatedShotsRaw != null,
    shotsEstimateRaw: estimatedShotsRaw,
    goalConversionRate: shotRate,
    shotAccuracy: shotRate,
    goalsConceded: maybeNum(deepFirst(p, ['goalsconceded', 'goalsConceded'], null)),
    cleansheetsAny: maybeNum(deepFirst(p, ['cleansheetsany', 'cleanSheetsAny'], null)),
    ballDiveSaves: num(deepFirst(p, ['ballDiveSaves','balldivesaves'], 0)),
    crossSaves: num(deepFirst(p, ['crossSaves','crosssaves'], 0)),
    goodDirectionSaves: num(deepFirst(p, ['goodDirectionSaves','gooddirectionsaves'], 0)),
    parrySaves: num(deepFirst(p, ['parrySaves','parrysaves'], 0)),
    punchSaves: num(deepFirst(p, ['punchSaves','punchsaves'], 0)),
    reflexSaves: num(deepFirst(p, ['reflexSaves','reflexsaves'], 0)),
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
    fouls: maybeNum(deepFirst(p, ['fouls', 'foulsCommitted', 'foulsMade', 'foulCount', 'foulsTotal'], null)),
    secondsPlayed: secondsPlayedRaw == null ? (minutesRaw == null ? null : num(minutesRaw) * 60) : num(secondsPlayedRaw),
    platform: clean(first(p, ['platform', 'platformName', 'console', 'consoleName', 'platformType', 'platformtype'], '')) || null,
    previousGoals: ['prevGoals','prevGoals1','prevGoals2','prevGoals3','prevGoals4','prevGoals5','prevGoals6','prevGoals7','prevGoals8','prevGoals9','prevGoals10'].map(key => maybeNum(first(p, [key], null))),
    rawProCodes: { proPos: first(p, ['proPos'], null), proStyle: first(p, ['proStyle'], null), proNationality: first(p, ['proNationality'], null) }
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

function extractHistoricalTotals(raw) {
  const candidates = [];
  const walk = (value, depth = 0, path = []) => {
    if (depth > 5) return;
    if (Array.isArray(value)) {
      value.slice(0, 80).forEach((child, index) => walk(child, depth + 1, [...path, String(index)]));
      return;
    }
    if (!isObj(value)) return;
    const keys = Object.keys(value).map(k => String(k).toLowerCase());
    const hasMatches = keys.some(k => ['matches','games','gamesplayed','matchesplayed','played','partite'].includes(k));
    const hasW = keys.some(k => ['wins','vittorie','win'].includes(k));
    const hasD = keys.some(k => ['draws','ties','pareggi','draw'].includes(k));
    const hasL = keys.some(k => ['losses','sconfitte','loss'].includes(k));
    const hasGF = keys.some(k => ['goals','goalsfor','goalscored','gf','gol fatti'].includes(k));
    const hasGA = keys.some(k => ['goalsagainst','goalsconceded','ga','against','gol subiti'].includes(k));
    const score = Number(hasMatches) * 4 + Number(hasW) * 2 + Number(hasD) * 2 + Number(hasL) * 2 + Number(hasGF) * 2 + Number(hasGA) * 2;
    if (score >= 10) candidates.push({ value, path, score });
    for (const [k, child] of Object.entries(value)) if (isObj(child)) walk(child, depth + 1, [...path, k]);
  };
  walk(raw);
  const read = (obj, keys) => {
    for (const key of keys) if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return maybeNum(obj[key]);
    return null;
  };
  const normalized = candidates.map(c => {
    const v = c.value;
    return {
      score: c.score,
      path: c.path,
      totals: {
        matches: read(v, ['matches','games','gamesPlayed','matchesPlayed','played','partite']),
        wins: read(v, ['wins','vittorie','win']),
        draws: read(v, ['draws','ties','pareggi','draw']),
        losses: read(v, ['losses','sconfitte','loss']),
        goals: read(v, ['goals','goalsFor','goalsScored','gf','gol fatti']),
        against: read(v, ['goalsAgainst','goalsConceded','ga','against','gol subiti'])
      }
    };
  }).filter(x => Object.values(x.totals).every(v => Number.isInteger(v) && v >= 0)).sort((a,b) => b.score - a.score);
  return normalized[0] || null;
}

function extractClubIdentity(raw) {
  const candidates = [];
  const walk = (value, depth = 0) => {
    if (depth > 5) return;
    if (Array.isArray(value)) { value.slice(0,80).forEach(child => walk(child, depth + 1)); return; }
    if (!isObj(value)) return;
    const id = first(value, ['clubId','clubID','club_id','id'], undefined);
    const name = first(value, ['clubName','club_name','name','teamName','team_name'], undefined);
    if (id !== undefined || name !== undefined) {
      const safeId = id == null ? '' : String(id).trim();
      const safeName = name == null ? '' : clean(name);
      if (safeId || safeName) candidates.push({id: safeId, name: safeName, score: (safeId ? 2 : 0) + (safeName ? 2 : 0)});
    }
    for (const child of Object.values(value)) if (isObj(child)) walk(child, depth + 1);
  };
  if (Array.isArray(raw)) return { id: '', name: '' };
  walk(raw);
  candidates.sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id));
  return candidates[0] ? {id:candidates[0].id,name:candidates[0].name} : {id:'',name:''};
}



function extractClubSummary(raw, aiProfile = null) {
  const record = Array.isArray(raw) ? raw.find(isObj) : (isObj(raw) ? raw : null);
  if (!record && !isObj(aiProfile)) return null;
  const source = record || {};
  const nested = isObj(source.clubInfo) ? source.clubInfo : {};
  const read = keys => {
    const direct = first(source, keys, null);
    if (direct !== null && direct !== undefined && direct !== '') return direct;
    const nestedValue = first(nested, keys, null);
    if (nestedValue !== null && nestedValue !== undefined && nestedValue !== '') return nestedValue;
    return first(aiProfile, keys, null);
  };
  const n = keys => maybeNum(read(keys));
  const text = keys => { const x = read(keys); return x == null || x === '' ? null : clean(x); };
  const out = {
    clubId: text(['clubId','club_id']),
    clubName: text(['clubName','club_name','name']) || clean(first(nested,['name','clubName'],'')) || clean(first(aiProfile,['clubName'],'')) || null,
    platform: text(['platform']), currentDivision: text(['currentDivision','currentDivisionId','division']),
    gamesPlayed: n(['gamesPlayed','matches','games']), gamesPlayedPlayoff: n(['gamesPlayedPlayoff','playoffGamesPlayed']),
    wins: n(['wins']), draws: n(['ties','draws']), losses: n(['losses']), goals: n(['goals']), goalsAgainst: n(['goalsAgainst','goalsConceded']),
    shots: n(['shots','totalShots','shotsTotal','shotsFor','totalShotsTaken']),
    goalConversionRate: n(['goalConversionRate','goalConversion','conversionRate','conversion','scoringEfficiency','finishingRate','realizationRate','realization','goalToShotRate','goalsPerShot']),
    cleanSheets: n(['cleanSheets']), points: n(['points']), promotions: n(['promotions']), relegations: n(['relegations']), bestDivision: n(['bestDivision']),
    reputationtier: n(['reputationtier','reputationTier']), leagueAppearances: n(['leagueAppearances'])
  };
  return Object.values(out).some(value => value !== null && value !== undefined && value !== '') ? out : null;
}
function extractClubInfo(raw) {
  if (!isObj(raw)) return null;
  const entries = Object.values(raw).filter(isObj); const record = entries.find(x => first(x,['name','clubId'],null) != null) || raw; const kit = isObj(record.customKit) ? record.customKit : {};
  return {
    name:clean(first(record,['name','clubName'],''))||null,
    clubId:first(record,['clubId'],null), regionId:first(record,['regionId'],null), teamId:first(record,['teamId'],null),
    stadium:clean(first(kit,['stadName'],''))||null,
    kitId:first(kit,['kitId'],null),
    homeKitId:first(kit,['customKitId'],null), awayKitId:first(kit,['customAwayKitId'],null), thirdKitId:first(kit,['customThirdKitId'],null), goalkeeperKitId:first(kit,['customKeeperKitId'],null),
    selectedKitType:first(kit,['selectedKitType'],null),
    seasonalTeamId:first(kit,['seasonalTeamId'],null), seasonalKitId:first(kit,['seasonalKitId'],null),
    crestAssetId:first(kit,['crestAssetId'],null), crestColor:first(kit,['crestColor'],null),
    homeColors:[1,2,3,4].map(i=>first(kit,[`kitColor${i}`],null)),
    awayColors:[1,2,3,4].map(i=>first(kit,[`kitAColor${i}`],null)),
    thirdColors:[1,2,3,4].map(i=>first(kit,[`kitThrdColor${i}`],null)),
    dCustomKit:first(kit,['dCustomKit'],null)
  };
}
function extractOverallStats(raw) {
  const record = Array.isArray(raw) ? raw.find(isObj) : (isObj(raw) ? raw : null); if (!record) return null; const n=keys=>maybeNum(first(record,keys,null));
  return {clubId:first(record,['clubId'],null),bestDivision:n(['bestDivision']),bestFinishGroup:first(record,['bestFinishGroup'],null),finishesInDivision1Group1:n(['finishesInDivision1Group1']),finishesInDivision2Group1:n(['finishesInDivision2Group1']),finishesInDivision3Group1:n(['finishesInDivision3Group1']),finishesInDivision4Group1:n(['finishesInDivision4Group1']),finishesInDivision5Group1:n(['finishesInDivision5Group1']),finishesInDivision6Group1:n(['finishesInDivision6Group1']),gamesPlayed:n(['gamesPlayed']),gamesPlayedPlayoff:n(['gamesPlayedPlayoff']),goals:n(['goals']),goalsAgainst:n(['goalsAgainst']),shots:n(['shots','totalShots','shotsTotal','shotsFor','totalShotsTaken']),goalConversionRate:n(['goalConversionRate','goalConversion','conversionRate','conversion','scoringEfficiency','finishingRate','realizationRate','realization','goalToShotRate','goalsPerShot']),promotions:n(['promotions']),relegations:n(['relegations']),losses:n(['losses']),draws:n(['ties','draws']),wins:n(['wins']),lastMatches:Array.from({length:10},(_,i)=>maybeNum(record[`lastMatch${i}`])),lastOpponents:Array.from({length:10},(_,i)=>record[`lastOpponent${i}`]==null||record[`lastOpponent${i}`]===''?null:String(record[`lastOpponent${i}`])),wstreak:n(['wstreak']),unbeatenstreak:n(['unbeatenstreak']),skillRating:n(['skillRating']),reputationtier:n(['reputationtier']),leagueAppearances:n(['leagueAppearances'])};
}
function compactCareerPlayer(p){return p?{games:p.games==null?null:num(p.games),goals:num(p.goals),assists:num(p.assists),mom:num(p.mom),rating:p.rating==null?null:num(p.rating),favoritePosition:p.favoritePosition||null,proPosCode:p.proPosCode==null?null:num(p.proPosCode),previousGoals:Array.isArray(p.previousGoals)?p.previousGoals:[]}:null;}
function sourceFieldSummary(fileRecords){
  const out={};
  const categories=['totals','season','clubInfo','overallStats','players','career','league','playoffs','friendlies','playoffAchievements'];
  const shape=(value,depth=0)=>{
    if(value==null||depth>2)return null;
    if(Array.isArray(value)){return value.length?shape(value[0],depth+1):[];}
    if(!isObj(value))return typeof value;
    return Object.keys(value).slice(0,100).reduce((acc,k)=>{acc[k]=shape(value[k],depth+1);return acc;},{});
  };
  for(const category of categories){
    const f=fileRecords?.[category]; const source=f?.raw ?? f?.parsed;
    if(source)out[category]={fileName:f.fileName||null,detected:f.detected||null,aiRecognition:f.aiRecognition||null,fieldShape:shape(source)};
  }
  return out;
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
      fouls: maybeNum(first(c, ['fouls', 'foulsCommitted', 'foulsMade', 'foulCount', 'foulsTotal'], null)),
      result: first(c, ['result'], null),
      matchType: first(c, ['matchType', 'match_type', 'matchtype', 'type'], null),
      gameNumber: first(c, ['gameNumber'], null), seasonId: first(c, ['season_id','seasonId'], null), winnerByDnf: first(c, ['winnerByDnf'], null), teamCode: first(c, ['TEAM','team','teamId'], null)
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
      shotsKnown: Object.prototype.hasOwnProperty.call(value, 'shots'),
      passesMade: num(first(value, ['passesmade', 'passesMade'], 0)),
      passAttempts: num(first(value, ['passattempts', 'passAttempts'], 0)),
      tacklesMade: num(first(value, ['tacklesmade', 'tacklesMade'], 0)),
      tackleAttempts: num(first(value, ['tackleattempts', 'tackleAttempts'], 0)),
      saves: num(value.saves),
      secondsPlayed: num(first(value, ['secondsPlayed', 'gameTime'], 0)),
      rating: maybeNum(first(value, ['rating', 'averageRating'], null)),
      mom: num(first(value, ['mom', 'motm'], 0)),
      fouls: maybeNum(first(value, ['fouls', 'foulsCommitted', 'foulsMade', 'foulCount', 'foulsTotal'], null)),
      cleanSheets: num(first(value, ['cleansheetsdef', 'cleanSheets'], 0)),
      cleanSheetsDef: maybeNum(first(value, ['cleansheetsdef','cleanSheetsDef'], null)),
      cleanSheetsGK: maybeNum(first(value, ['cleansheetsgk','cleanSheetsGK'], null)),
      cleansheetsAny: maybeNum(first(value, ['cleansheetsany','cleanSheetsAny'], null)),
      goalsConceded: maybeNum(first(value, ['goalsconceded','goalsConceded'], null))
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
    if (p.shotsKnown) merged.shotsKnown = true;
    for (const field of ['games', 'goals', 'assists', 'shots', 'passesMade', 'cleanSheets', 'mom', 'redcards', 'fouls']) {
      if (num(p[field]) > num(previous[field])) merged[field] = num(p[field]);
    }
    if (p.passAttempts != null && (previous.passAttempts == null || num(p.passAttempts) > num(previous.passAttempts))) merged.passAttempts = num(p.passAttempts);
    if (p.tackleAttempts != null && (previous.tackleAttempts == null || num(p.tackleAttempts) > num(previous.tackleAttempts))) merged.tackleAttempts = num(p.tackleAttempts);
    for (const field of ['ovr', 'rating', 'passAccuracy', 'tackleSuccess', 'shotAccuracy', 'winRate', 'secondsPlayed']) {
      if (merged[field] == null && p[field] != null) merged[field] = p[field];
    }
    for (const field of ['position', 'favoritePosition', 'proName', 'clubId', 'platform']) {
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
  return num(p.secondsPlayed) > 0 || num(p.goals) !== 0 || num(p.assists) !== 0 || num(p.passAttempts) > 0 || num(p.passesMade) > 0 || num(p.tackleAttempts) > 0 || num(p.tacklesMade) > 0 || num(p.shots) > 0 || num(p.saves) > 0 || num(p.mom) > 0 || num(p.redcards) > 0 || num(p.fouls) > 0;
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
    shotsKnown: false,
    passesMade: 0,
    passAttempts: 0,
    tacklesMade: 0,
    tackleAttempts: 0,
    saves: 0,
    cleanSheets: 0,
    cleanSheetsDef: 0,
    cleanSheetsGK: 0,
    mom: 0,
    redcards: 0,
    fouls: 0,
    foulsKnown: false,
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
      if (p.shotsKnown) existing.shotsKnown = true;
      existing.passesMade += num(p.passesMade);
      existing.passAttempts += num(p.passAttempts);
      existing.tacklesMade += num(p.tacklesMade);
      existing.tackleAttempts += num(p.tackleAttempts);
      existing.saves += num(p.saves);
      existing.cleanSheets += num(p.cleanSheets);
      existing.cleanSheetsDef += p.cleanSheetsDef == null ? 0 : num(p.cleanSheetsDef);
      existing.cleanSheetsGK += p.cleanSheetsGK == null ? 0 : num(p.cleanSheetsGK);
      existing.mom += num(p.mom);
      existing.redcards += num(p.redcards);
      if (p.fouls != null) { existing.fouls += num(p.fouls); existing.foulsKnown = true; }
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
    fouls: x.foulsKnown ? x.fouls : null,
    games: x.appearances
  }));
}

function aggregateMatchWindow(matches, clubId, limit = 5) {
  const ordered = [...matches].sort((a, b) => num(b.timestamp) - num(a.timestamp)).slice(0, limit);
  const team = {
    ...teamResults(ordered, clubId),
    assists: 0, shots: 0, saves: 0, playerCleanSheets: 0, mom: 0, redcards: 0,
    passMade: 0, passAttempts: 0, tackleMade: 0, tackleAttempts: 0, ratingSum: 0, ratingCount: 0, matchesWithPlayerStats: 0
  };
  let playerStatMatches = 0;
  for (const m of ordered) {
    let hasPlayerStats = false;
    for (const p of m.players) {
      if (clubId && p.clubId && String(p.clubId) !== String(clubId)) continue;
      if (!p.name || !activeMatchPlayer(p)) continue;
      hasPlayerStats = true;
      team.assists += num(p.assists); team.shots += num(p.shots); team.saves += num(p.saves); team.playerCleanSheets += num(p.cleanSheets); team.mom += num(p.mom); team.redcards += num(p.redcards);
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

  // V32.1.8: unifica il valore tiri della finestra con la stessa sorgente usata
  // dal pannello Efficienza. Prima qui restava il vecchio player-sum (spesso 0).
  const shooting = teamShootingStats(ordered, clubId);
  team.shots = shooting.complete ? shooting.shots : null;
  team.shotsKnown = shooting.shotsKnown;
  team.shotsCoverage = shooting.coverage;
  team.goalConversionRate = team.shots != null && team.shots > 0 ? 100 * team.goals / team.shots : null;
  team.shotsPerGoal = team.shots != null && team.goals > 0 ? team.shots / team.goals : null;
  team.shotsPerMatch = team.shots != null && team.matches > 0 ? team.shots / team.matches : null;

  return { matches: ordered, players: aggregateMatchPlayers(ordered, clubId), team };
}

function mergePlayerSources(primary, derivedAll, recent5, clubId, careerPlayers = []) {
  const byName = new Map();
  const careerByName = new Map((careerPlayers||[]).map(p=>[normalizeName(p.name),p]));
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
      career: careerByName.has(key) ? compactCareerPlayer(careerByName.get(key)) : null,
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
      shotsKnown: Boolean(p.shotsKnown),
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
      fouls: p.fouls,
      secondsPlayed: p.secondsPlayed,
      platform: p.platform || null,
      career: careerByName.has(key) ? compactCareerPlayer(careerByName.get(key)) : null,
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
    shotsKnown: Boolean(p.shotsKnown),
    passesMade: num(p.passesMade),
    passAttempts: num(p.passAttempts),
    passAccuracy: p.passAccuracy == null ? null : num(p.passAccuracy),
    tacklesMade: num(p.tacklesMade),
    tackleAttempts: num(p.tackleAttempts),
    tackleSuccess: p.tackleSuccess == null ? null : num(p.tackleSuccess),
    saves: num(p.saves),
    cleanSheets: num(p.cleanSheets),
    cleanSheetsDef: p.cleanSheetsDef == null ? null : num(p.cleanSheetsDef),
    cleanSheetsGK: p.cleanSheetsGK == null ? null : num(p.cleanSheetsGK),
    cleansheetsAny: p.cleansheetsAny == null ? null : num(p.cleansheetsAny),
    goalsConceded: p.goalsConceded == null ? null : num(p.goalsConceded),
    ballDiveSaves: num(p.ballDiveSaves), crossSaves: num(p.crossSaves), goodDirectionSaves: num(p.goodDirectionSaves), parrySaves: num(p.parrySaves), punchSaves: num(p.punchSaves), reflexSaves: num(p.reflexSaves),
    mom: num(p.mom),
    redcards: num(p.redcards),
    fouls: p.fouls == null ? null : num(p.fouls),
    secondsPlayed: num(p.secondsPlayed),
    rating: p.rating == null ? null : num(p.rating)
  };
}

function dedupeMatches(matches) {
  const seen = new Set();
  return matches.filter(m => {
    const rawId = String(m.id || '').trim();
    const key = String(m.competition || 'unknown') + ':' + (rawId || `${m.timestamp}:${JSON.stringify(m.clubs)}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchFoulsForClub(match, own) {
  if (!match || !own) return { value: null, source: 'missing' };
  const aggregate = match.aggregate?.[String(own.id)];
  if (aggregate?.fouls != null) return { value: num(aggregate.fouls), source: 'team-aggregate' };
  if (own.fouls != null) return { value: num(own.fouls), source: 'club-total' };

  let found = false;
  let total = 0;
  for (const player of match.players || []) {
    if (own.id != null && player.clubId && String(player.clubId) !== String(own.id)) continue;
    if (player.fouls == null) continue;
    found = true;
    total += num(player.fouls);
  }
  return found ? { value: total, source: 'player-sum' } : { value: null, source: 'missing' };
}

function teamResults(matches, clubId) {
  let wins = 0, draws = 0, losses = 0, goals = 0, against = 0;
  let fouls = 0, foulsAvailableMatches = 0;
  let cleanSheets = 0, bothScored = 0, played = 0;

  for (const m of matches || []) {
    const own = m.clubs.find(c => String(c.id) === String(clubId)) || m.clubs[0];
    const opponent = m.clubs.find(c => String(c.id) !== String(own?.id)) || m.clubs[1];
    if (!own) continue;

    played += 1;
    const gf = num(own.goals);
    const ga = num(opponent?.goals);
    goals += gf;
    against += ga;

    if (gf > ga) wins += 1;
    else if (gf < ga) losses += 1;
    else draws += 1;

    if (ga === 0) cleanSheets += 1;
    if (gf > 0 && ga > 0) bothScored += 1;

    const foulInfo = matchFoulsForClub(m, own);
    if (foulInfo.value != null) {
      fouls += foulInfo.value;
      foulsAvailableMatches += 1;
    }
  }

  const points = wins * 3 + draws;
  const goalDifference = goals - against;

  return {
    matches: played,
    wins,
    draws,
    losses,
    goals,
    against,
    goalDifference,
    points,
    cleanSheets,
    cleanSheetRate: played ? 100 * cleanSheets / played : 0,
    bothScored,
    bothScoredRate: played ? 100 * bothScored / played : 0,
    fouls: foulsAvailableMatches ? fouls : null,
    foulsAvailableMatches,
    foulsCoverage: played ? 100 * foulsAvailableMatches / played : 0,
    foulsPerAvailableMatch: foulsAvailableMatches ? fouls / foulsAvailableMatches : null,
    winRate: played ? 100 * wins / played : 0,
    drawRate: played ? 100 * draws / played : 0,
    lossRate: played ? 100 * losses / played : 0,
    goalDifferencePerMatch: played ? goalDifference / played : 0,
    goalsPerMatch: played ? goals / played : 0,
    concededPerMatch: played ? against / played : 0,
    pointsPerMatch: played ? points / played : 0,
    pointsRate: played ? 100 * points / (3 * played) : 0
  };
}

function teamShootingStats(matches, clubId) {
  const list = Array.isArray(matches) ? matches : [];
  let shots = 0, knownMatches = 0, aggregateMatches = 0, playerMatches = 0;
  for (const m of list) {
    const own = m?.clubs?.find(c => String(c.id) === String(clubId)) || m?.clubs?.[0];
    if (!own) continue;
    const aggregate = m?.aggregate?.[String(own.id)];
    if (aggregate?.shotsKnown) {
      shots += num(aggregate.shots);
      knownMatches += 1;
      aggregateMatches += 1;
      continue;
    }
    const activePlayers = (m?.players || []).filter(p => {
      if (clubId && p.clubId && String(p.clubId) !== String(clubId)) return false;
      return Boolean(p.name && activeMatchPlayer(p));
    });
    const allShotsExplicit = activePlayers.length > 0 && activePlayers.every(p => p.shotsExplicit === true);
    if (allShotsExplicit) {
      shots += activePlayers.reduce((sum, p) => sum + num(p.shots), 0);
      knownMatches += 1;
      playerMatches += 1;
    }
  }
  const totalMatches = list.length;
  return {
    shots: knownMatches ? shots : null,
    shotsKnown: knownMatches > 0,
    knownMatches,
    totalMatches,
    coverage: totalMatches ? 100 * knownMatches / totalMatches : 0,
    complete: totalMatches > 0 && knownMatches === totalMatches,
    aggregateMatches,
    playerMatches
  };
}


function deriveHistoricalShooting({ players = [], historicalGoals = null, historicalMatches = null, totalsProfile = null, overallProfile = null } = {}) {
  const valid = value => {
    const n = maybeNum(value);
    return n == null || !Number.isFinite(n) ? null : n;
  };
  const goals = valid(historicalGoals);
  const matches = valid(historicalMatches);
  const explicitShots = valid(totalsProfile?.shots) ?? valid(overallProfile?.shots);
  const explicitConversion = valid(totalsProfile?.goalConversionRate) ?? valid(overallProfile?.goalConversionRate);
  const cleanSheets = valid(totalsProfile?.cleanSheets) ?? valid(overallProfile?.cleanSheets);

  let shots = null;
  let goalConversionRate = null;
  let source = 'missing';
  let sourceLabel = 'non disponibili';
  let estimated = false;
  let playerGoalsCovered = 0;
  let playerShotsBasis = 0;
  let playersUsed = 0;
  let goalCoverage = null;

  if (explicitShots != null && explicitShots > 0) {
    shots = Math.round(explicitShots);
    goalConversionRate = goals != null && goals >= 0 ? (100 * goals / explicitShots) : explicitConversion;
    source = 'profile-explicit';
    sourceLabel = 'osservati nel profilo storico';
  } else if (explicitConversion != null && explicitConversion > 0 && goals != null && goals >= 0) {
    shots = Math.round(goals * 100 / explicitConversion);
    goalConversionRate = explicitConversion;
    source = 'profile-conversion-estimate';
    sourceLabel = 'stimati dalla % realizzativa storica';
    estimated = true;
  } else {
    const cumulativePlayers = (players || []).filter(p => p?.sourceScope === 'season-player-file');
    const pool = cumulativePlayers.length ? cumulativePlayers : (players || []);

    for (const player of pool) {
      const playerGoals = valid(player?.goals);
      const rate = valid(player?.goalConversionRate ?? player?.shotAccuracy);
      if (playerGoals == null || playerGoals <= 0 || rate == null || rate <= 0) continue;

      const rawShots = player?.shotsExplicit && valid(player?.shots) != null
        ? valid(player.shots)
        : (valid(player?.shotsEstimateRaw) ?? (playerGoals * 100 / rate));
      if (rawShots == null || rawShots <= 0) continue;

      playerGoalsCovered += playerGoals;
      playerShotsBasis += rawShots;
      playersUsed += 1;
    }

    if (playerGoalsCovered > 0 && playerShotsBasis > 0) {
      const weightedConversion = 100 * playerGoalsCovered / playerShotsBasis;
      goalCoverage = goals != null && goals > 0 ? Math.min(100, 100 * playerGoalsCovered / goals) : null;

      if (goals != null && goals > 0 && weightedConversion > 0) {
        shots = Math.round(goals * 100 / weightedConversion);
        goalConversionRate = 100 * goals / shots;
        source = 'players-conversion-estimate';
        sourceLabel = 'calcolati da gol + realizzazione giocatori';
        estimated = true;
      } else {
        shots = Math.round(playerShotsBasis);
        goalConversionRate = weightedConversion;
        source = 'players-only-estimate';
        sourceLabel = 'calcolati dai giocatori disponibili';
        estimated = true;
      }
    }
  }

  return {
    shots,
    shotsKnown: shots != null,
    shotsEstimated: estimated,
    goalConversionRate,
    shotsPerGoal: shots != null && goals != null && goals > 0 ? shots / goals : null,
    shotsPerMatch: shots != null && matches != null && matches > 0 ? shots / matches : null,
    goals,
    matches,
    cleanSheets,
    source,
    sourceLabel,
    playersUsed,
    playerGoalsCovered,
    playerShotsBasis: playerShotsBasis > 0 ? playerShotsBasis : null,
    goalCoverage,
    confidence: source === 'profile-explicit' ? 'high' : (goalCoverage != null && goalCoverage >= 75 ? 'high' : (playersUsed >= 2 ? 'medium' : 'low'))
  };
}

function performanceComponents(player, scope='season') {
  const p=player||{}; const games=Math.max(0,num(scope==='recent5'?(p.appearances??p.games):p.games)); if(!games)return [];
  const role=clean(first(p,['position','favoritePosition'],'')).toLowerCase();
  const isGK=/gk|goalkeeper|keeper|portiere/.test(role), isDEF=/def|cb|lb|rb|lwb|rwb/.test(role), isMID=/mid|cm|cdm|lm|rm|cam/.test(role), isATT=/att|st|lw|rw|cf|forward/.test(role);
  const out=[]; const add=(key,value,weight)=>{if(value==null||!Number.isFinite(Number(value))||weight<=0)return;out.push([key,Math.max(0,Math.min(100,Number(value))),weight]);};
  if(p.rating!=null)add('rating',num(p.rating)*10,30); if(p.ovr!=null)add('ovr',num(p.ovr),20);
  add('goalInvolvement',Math.min(100,((num(p.goals)+num(p.assists))/games)/2*100),isATT?30:isMID?20:isDEF?10:5);
  if(p.passAccuracy!=null)add('passAccuracy',num(p.passAccuracy),isATT?10:isMID?15:isDEF?15:10);
  if(p.tackleSuccess!=null)add('tackleSuccess',num(p.tackleSuccess),isATT?0:isMID?10:isDEF?20:5);
  if(p.winRate!=null)add('winRate',num(p.winRate),isGK||isDEF?5:isMID?5:10);
  if(isGK){add('saveRate',Math.min(100,(num(p.saves)/games)/5*100),10);add('cleanSheetRate',Math.min(100,(num(p.cleanSheets)/games)*100),10);}
  return out;
}
function weightedPerformanceIndex(player,scope='season'){const parts=performanceComponents(player,scope);if(!parts.length)return null;const total=parts.reduce((a,x)=>a+x[2],0);return total?Math.round(parts.reduce((a,x)=>a+x[1]*x[2],0)/total):null;}
function enrichPlayerAnalytics(player){
  const p={...player}; const recent=p.recent5?{...p,...p.recent5,ovr:p.ovr,position:p.position,favoritePosition:p.favoritePosition,winRate:p.recent5.matches?100*num(p.recent5.wins)/num(p.recent5.matches):null}:null; const cum=weightedPerformanceIndex(p,'season'); const recentIdx=recent?weightedPerformanceIndex(recent,'recent5'):null; const games=Math.max(0,num(p.games));
  p.goalsPerGame=games?num(p.goals)/games:null; p.assistsPerGame=games?num(p.assists)/games:null; p.goalInvolvementPerGame=games?(num(p.goals)+num(p.assists))/games:null; p.shotsPerGame=games&&p.shots!=null?num(p.shots)/games:null; p.passPerGame=games?num(p.passesMade)/games:null; p.tacklePerGame=games?num(p.tacklesMade)/games:null; p.cleanSheetRate=games?100*num(p.cleanSheets)/games:null;
  p.performanceIndex=recentIdx==null?cum:Math.round(cum*.60+recentIdx*.40); p.recent5Index=recentIdx; p.indexScope='Indice 0-100: 60% cumulativo + 40% ultime 5; pesi adattati al reparto e ai dati presenti'; return p;
}
function buildMatchTrend(matches,clubId,limit=30){
  const ordered=[...(matches||[])].sort((a,b)=>num(a.timestamp)-num(b.timestamp)); const sliced=ordered.slice(Math.max(0,ordered.length-limit)); let cumulativeGF=0,cumulativeGA=0,cumulativePoints=0,wins=0,draws=0,losses=0;
  return sliced.map((m,index)=>{const own=m.clubs.find(c=>String(c.id)===String(clubId))||m.clubs[0];const opp=m.clubs.find(c=>String(c.id)!==String(own?.id))||m.clubs[1];if(!own)return null;const gf=num(own.goals),ga=num(opp?.goals);let result='D',points=1;if(gf>ga){result='W';points=3;wins++}else if(gf<ga){result='L';points=0;losses++}else draws++;cumulativeGF+=gf;cumulativeGA+=ga;cumulativePoints+=points;return {index:index+1,id:m.id,timestamp:m.timestamp,competition:m.competition,opponent:opp?.name||'Avversario',gf,ga,gd:gf-ga,result,points,cumulativeGF,cumulativeGA,cumulativeGD:cumulativeGF-cumulativeGA,cumulativePoints,wins,draws,losses};}).filter(Boolean);
}

function impactScore(player, recent5) {
  const r = recent5 || player?.recent5 || null;
  const apps = num(r?.appearances ?? r?.games);
  if (!apps) return 0;
  const rating = num(r?.rating);
  const goals = num(r?.goals), assists = num(r?.assists);
  const goalInvolvement = (goals + assists) / apps;
  const momRate = num(r?.mom) / apps;
  const pass = r?.passAttempts > 0 ? num(r.passesMade) / num(r.passAttempts) : null;
  const tackle = r?.tackleAttempts > 0 ? num(r.tacklesMade) / num(r.tackleAttempts) : null;
  const defensive = (num(r?.tacklesMade) + num(r?.saves)) / apps;
  const parts = [];
  if (rating > 0) parts.push(Math.max(0, Math.min(10, rating)) * 4.8);
  parts.push(Math.min(35, goalInvolvement * 35));
  parts.push(Math.min(18, momRate * 36));
  if (pass != null) parts.push(Math.min(12, pass * 12));
  if (tackle != null) parts.push(Math.min(8, tackle * 8));
  parts.push(Math.min(9, defensive * 2));
  return Math.round(Math.max(0, Math.min(100, parts.reduce((a, b) => a + b, 0))));
}

function funRecords(matches, players, clubId) {
  const ordered = [...matches].sort((a, b) => num(b.timestamp) - num(a.timestamp));
  const recent5 = ordered.slice(0, 5);
  const rows = ordered.map(m => {
    const own = m.clubs.find(c => String(c.id) === String(clubId)) || m.clubs[0];
    const opp = m.clubs.find(c => String(c.id) !== String(own?.id)) || m.clubs[1];
    return own ? { m, own, opp, gf: num(own.goals), ga: num(opp?.goals) } : null;
  }).filter(Boolean);
  const recentRows = rows.slice(0, 5);
  const r5 = teamResults(recent5, clubId);
  const records = [];
  const playerScopeLabel = players.some(p => p.sourceScope === 'season-player-file') ? 'cumulative' : 'archivio partite';
  const add = (title, value, subtitle = '') => records.push({ title, value, subtitle });

  const topGoal = [...players].sort((a, b) => num(b.goals) - num(a.goals) || num(b.games) - num(a.games))[0];
  const topAssist = [...players].sort((a, b) => num(b.assists) - num(a.assists) || num(b.games) - num(a.games))[0];
  const topApps = [...players].sort((a, b) => num(b.games) - num(a.games) || num(b.goals) - num(a.goals))[0];
  const rated = [...players].filter(p => num(p.games) >= 3 && num(p.rating) > 0).sort((a, b) => num(b.rating) - num(a.rating))[0];
  const goalRate = [...players].filter(p => num(p.games) > 0).sort((a, b) => num(b.goals) / num(b.games) - num(a.goals) / num(a.games))[0];
  const assistRate = [...players].filter(p => num(p.games) > 0).sort((a, b) => num(b.assists) / num(b.games) - num(a.assists) / num(a.games))[0];
  const passers = [...players]
    .map(p => ({ ...p, pct: p.passAttempts > 0 ? 100 * num(p.passesMade) / num(p.passAttempts) : p.passAccuracy }))
    .filter(p => p.pct != null && num(p.games) > 0)
    .sort((a, b) => num(b.pct) - num(a.pct));
  const tacklers = [...players]
    .map(p => ({ ...p, pct: p.tackleAttempts > 0 ? 100 * num(p.tacklesMade) / num(p.tackleAttempts) : p.tackleSuccess }))
    .filter(p => p.pct != null && num(p.games) > 0)
    .sort((a, b) => num(b.pct) - num(a.pct));

  if (topGoal?.goals) add('Capocannoniere', topGoal.name, `${topGoal.goals} gol · ${topGoal.games ?? 0} PG · ${playerScopeLabel}`);
  if (topAssist?.assists) add('Assistman', topAssist.name, `${topAssist.assists} assist · ${topAssist.games ?? 0} PG · ${playerScopeLabel}`);
  if (topApps?.games) add('Ironman', topApps.name, `${topApps.games} PG · ${playerScopeLabel}`);
  if (rated) add('Rating migliore', rated.name, `${Number(rated.rating).toFixed(2)} · minimo 3 PG · ${playerScopeLabel}`);
  if (goalRate?.goals) add('Gol/partita migliore', goalRate.name, `${(num(goalRate.goals) / Math.max(1, num(goalRate.games))).toFixed(2)} · ${playerScopeLabel}`);
  if (assistRate?.assists) add('Assist/partita migliore', assistRate.name, `${(num(assistRate.assists) / Math.max(1, num(assistRate.games))).toFixed(2)} · ${playerScopeLabel}`);
  if (passers[0]) add('Passaggi più precisi', passers[0].name, `${Number(passers[0].pct).toFixed(1)}% · ${playerScopeLabel}`);
  if (tacklers[0]) add('Contrasti più efficaci', tacklers[0].name, `${Number(tacklers[0].pct).toFixed(1)}% · ${playerScopeLabel}`);

  const biggestWin = [...rows].filter(x => x.gf > x.ga).sort((a, b) => (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)[0];
  const biggestLoss = [...rows].filter(x => x.gf < x.ga).sort((a, b) => (b.ga - b.gf) - (a.ga - a.gf) || b.ga - a.ga)[0];
  if (biggestWin) add('Vittoria più larga', `${biggestWin.gf}-${biggestWin.ga}`, `vs ${biggestWin.opp?.name || 'Avversario'} · archivio`);
  if (biggestLoss) add('Sconfitta più larga', `${biggestLoss.gf}-${biggestLoss.ga}`, `vs ${biggestLoss.opp?.name || 'Avversario'} · archivio`);
  const cleanSheets = rows.filter(x => x.ga === 0).length;
  if (cleanSheets) add('Clean sheet', `${cleanSheets}`, 'partite senza gol subiti · archivio');
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
    if (row.gf > row.ga) { current += 1; best = Math.max(best, current); } else current = 0;
  }
  if (best > 1) add('Striscia vittorie', `${best}`, 'vittorie consecutive · archivio');

  const form = recentRows.map(x => x.gf > x.ga ? 'W' : x.gf < x.ga ? 'L' : 'D');
  const currentFormStreak = (() => {
    if (!form.length) return null;
    const first = form[0]; let n = 0;
    for (const x of form) { if (x !== first) break; n += 1; }
    return { result: first, count: n };
  })();

  const impactAll = players.map(p => ({
    name: p.name,
    position: p.position || null,
    score: impactScore(p, p.recent5),
    appearances: num(p.recent5?.appearances),
    goals: num(p.recent5?.goals),
    assists: num(p.recent5?.assists),
    rating: p.recent5?.rating == null ? null : num(p.recent5.rating),
    source: 'U5'
  })).filter(x => x.appearances > 0).sort((a, b) => b.score - a.score || b.goals - a.goals || b.assists - a.assists);

  const recentPerformance = (players || []).map(p => ({ p, r: p.recent5 })).filter(x => num(x.r?.appearances) > 0);
  const recentHot = recentPerformance.sort((a, b) => impactScore(b.p, b.r) - impactScore(a.p, a.r))[0];
  const recentCold = recentPerformance.sort((a, b) => impactScore(a.p, a.r) - impactScore(b.p, b.r))[0];

  const redFlags = [];
  const quietScorers = players.filter(p => num(p.games) >= 5 && num(p.goals) === 0)
    .sort((a, b) => num(b.games) - num(a.games)).slice(0, 3);
  for (const p of quietScorers) redFlags.push({ title: 'Zero gol', value: p.name, subtitle: `${p.games} PG · ${playerScopeLabel} senza gol` });

  const inaccurate = players
    .map(p => ({ ...p, acc: p.passAttempts > 0 ? 100 * num(p.passesMade) / num(p.passAttempts) : p.passAccuracy }))
    .filter(p => p.acc != null && num(p.acc) < 65 && num(p.games) > 0)
    .sort((a, b) => num(a.acc) - num(b.acc))[0];
  if (inaccurate) redFlags.push({ title: 'Passaggi da rivedere', value: inaccurate.name, subtitle: `${num(inaccurate.acc).toFixed(1)}% · ${playerScopeLabel}` });

  const redCardPlayer = players.filter(p => num(p.redcards) > 0).sort((a, b) => num(b.redcards) - num(a.redcards))[0];
  if (redCardPlayer) redFlags.push({ title: 'Cartellini rossi', value: redCardPlayer.name, subtitle: `${redCardPlayer.redcards} rossi · ${playerScopeLabel}` });

  const lowRecent = recentPerformance.sort((a, b) => num(a.r.appearances) - num(b.r.appearances))[0];
  if (lowRecent && players.length > 1 && num(lowRecent.r.appearances) === 1) redFlags.push({ title: 'Presenza minima U5', value: lowRecent.p.name, subtitle: '1 presenza attiva nelle ultime 5' });

  const avgU5Rating = recent5.flatMap(m => m.players)
    .filter(p => (!clubId || !p.clubId || String(p.clubId) === String(clubId)) && activeMatchPlayer(p) && num(p.rating) > 0)
    .map(p => num(p.rating));

  return {
    available: matches.length > 0 || players.length > 0,
    records,
    redFlags,
    form,
    recent5Summary: { ...r5, avgPlayerRating: avgU5Rating.length ? avgU5Rating.reduce((a, b) => a + b, 0) / avgU5Rating.length : null },
    currentFormStreak,
    impactTop3: impactAll.slice(0, 3),
    impactAll,
    recentHot: recentHot ? { name: recentHot.p.name, score: impactScore(recentHot.p, recentHot.r), rating: recentHot.r?.rating ?? null } : null,
    recentCold: recentCold ? { name: recentCold.p.name, score: impactScore(recentCold.p, recentCold.r), rating: recentCold.r?.rating ?? null } : null,
    u5Bomber: recentPerformance.sort((a, b) => num(b.r.goals) - num(a.r.goals) || num(b.r.assists) - num(a.r.assists))[0]?.p?.name || null,
    u5Assistman: recentPerformance.sort((a, b) => num(b.r.assists) - num(a.r.assists) || num(b.r.goals) - num(a.r.goals))[0]?.p?.name || null,
    recent5Matches: recent5.length,
    recent5FormScope: 'ULTIME 5 PARTITE ARCHIVIATE',
    awardsScope: playerScopeLabel === 'cumulative' ? 'STAGIONE / CUMULATIVO DEL FILE GIOCATORI' : 'TUTTO L’ARCHIVIO PARTITE'
  };
}

function categoryFromFileName(fileName) {
  const name = clean(fileName).toLocaleLowerCase('it-IT');
  if (/playoff.*achievement|achievement.*playoff|premi.*playoff|obiettivi.*playoff/.test(name)) return 'playoffAchievements';
  if (/dati.*totali|totali.*dati|total.*data|totals?/.test(name)) return 'totals';
  if (/stagione.*corrente|corrente.*stagione|current.*season|season.*current/.test(name)) return 'season';
  if (/informazioni?.*club|info.*club|club.*info/.test(name)) return 'clubInfo';
  if (/overall.*stats|overallstats|stats.*overall/.test(name)) return 'overallStats';
  if (/carriera|player.*career|career.*stats|career/.test(name)) return 'career';
  if (/giocator|players?|members?.*stats|player.*statistics/.test(name)) return 'players';
  if (/playoff|play-off|post[- ]?season/.test(name)) return 'playoffs';
  if (/friendly|friendlymatch|amichevol|amichevole/.test(name)) return 'friendlies';
  if (/league|campionat|division/.test(name)) return 'league';
  return null;
}

function detectMatchCategory(raw, fileName = '') {
  const matches = getMatchList(raw);
  const rawTypes = [];
  const pushType = value => { if (value !== undefined && value !== null && value !== '') rawTypes.push(String(value).trim()); };
  if (isObj(raw)) pushType(first(raw, ['matchType','match_type','matchtype','type'], undefined));
  for (const m of matches) {
    pushType(first(m, ['matchType','match_type','matchtype','type'], undefined));
    for (const c of Object.values(isObj(m?.clubs) ? m.clubs : {})) pushType(first(c, ['matchType','match_type','matchtype','type'], undefined));
  }
  const types = [...new Set(rawTypes.map(x => x.toLowerCase()))];
  const direct = new Map([
    ['leaguematch','league'], ['league','league'], ['regularseason','league'],
    ['playoffmatch','playoffs'], ['playoff','playoffs'], ['playoffs','playoffs'],
    ['friendlymatch','friendlies'], ['friendly','friendlies'], ['friendlies','friendlies']
  ]);
  const directCats = [...new Set(types.map(t => direct.get(t)).filter(Boolean))];
  if (directCats.length === 1) return {category:directCats[0],confidence:'high',reason:`matchType: ${types.join(', ')}`};
  if (directCats.length > 1) return {category:null,confidence:'ambiguous',reason:`matchType multipli: ${types.join(', ')}`};
  const byName = categoryFromFileName(fileName);
  if (['league','playoffs','friendlies'].includes(byName)) return {category:byName,confidence:'medium',reason:`indizio dal nome file: ${clean(fileName)}`};
  if (types.length === 1 && types[0] === '1') return {category:'league',confidence:'high',reason:'matchType numerico 1 (formato EA rilevato nei dati forniti)'};
  return {category:null,confidence:'unknown',reason:types.length ? `matchType non riconosciuto: ${types.join(', ')}` : 'nessun matchType disponibile'};
}

function looksLikePlayerStats(raw) {
  if (!isObj(raw)) return false;
  if (Array.isArray(raw.members) || isObj(raw.members)) return true;
  const keys = Object.keys(raw).map(k => k.toLowerCase());
  return ['gamesplayed','ratingave','prooverall','favoriteposition','passsuccessrate','tacklesuccessrate'].some(k => keys.includes(k));
}

function detectDataFile(raw, fileName = '') {
  const known = detectKnownProClubsFile(raw, fileName);
  if (known?.confidence === 'exact') {
    const historical = (known.category === 'totals' || (known.mirrorCategories || []).includes('totals')) ? extractHistoricalTotals(raw) : null;
    return {
      ...known,
      rows: Array.isArray(raw) ? raw.length : 1,
      parsed: raw,
      historicalTotals: historical?.totals || null,
      mirrorCategories: known.mirrorCategories || [],
      clubIdentity: extractClubIdentity(raw)
    };
  }
  const named = categoryFromFileName(fileName);
  const totals = extractHistoricalTotals(raw);
  const identity = extractClubIdentity(raw);
  if (named === 'totals' || totals) {
    if (totals) return {category:'totals',confidence:named==='totals'?'high':'medium',reason:named==='totals'?'nome file + record storico coerente':'record storico con partite/vittorie/pareggi/sconfitte/gol',rows:1,parsed:raw,historicalTotals:totals.totals,clubIdentity:identity};
    if (named === 'totals') return {category:'totals',confidence:'medium',reason:'nome file identifica Dati totali ma la struttura non è ancora normalizzabile',rows:1,parsed:raw,historicalTotals:null,clubIdentity:identity};
  }
  if (named && ['season','clubInfo','overallStats','career','playoffAchievements'].includes(named)) {
    return {category:named,confidence:'high',reason:`indizio dal nome file: ${clean(fileName)}`,rows:Array.isArray(raw)?raw.length:1,parsed:raw,clubIdentity:identity};
  }
  if (looksLikePlayerStats(raw)) {
    const players=normalizePlayersFile(raw,'');
    if (players.length) return {category:named==='career'?'career':'players',confidence:'high',reason:'struttura members/statistiche giocatore',rows:players.length,parsed:players,clubIdentity:identity};
  }
  const matches=getMatchList(raw);
  if (matches.length) {
    const matchCategory=detectMatchCategory(raw,fileName);
    if (matchCategory.category) {
      const parsed=normalizeMatchesFile(raw,matchCategory.category);
      if (parsed.length) return {category:matchCategory.category,confidence:matchCategory.confidence,reason:matchCategory.reason,rows:parsed.length,parsed,clubIdentity:identity};
    }
  }
  const players=normalizePlayersFile(raw,'');
  if (players.length && players.some(p=>p.name && (p.games!=null || p.goals || p.assists || p.rating!=null))) {
    return {category:named==='career'?'career':'players',confidence:'medium',reason:'struttura statistiche giocatore',rows:players.length,parsed:players,clubIdentity:identity};
  }
  return {category:named || null,confidence:named?'low':'unknown',reason:named?`nome file: ${clean(fileName)}`:'struttura non riconosciuta',rows:Array.isArray(raw)?raw.length:(isObj(raw)?1:0),parsed:raw,clubIdentity:identity};
}


function rosterReconciliation(primaryPlayers, derivedAll) {
  const primaryByName = new Map(primaryPlayers.map(p => [normalizeName(p.name), p]));
  const derivedByName = new Map(derivedAll.map(p => [normalizeName(p.name), p]));
  const matchOnlyPlayers = derivedAll.filter(p => !primaryByName.has(normalizeName(p.name))).map(p => ({ name: p.name, appearances: num(p.games), source: 'match-archive' }));
  const rosterOnlyPlayers = primaryPlayers.filter(p => !derivedByName.has(normalizeName(p.name))).map(p => ({ name: p.name, games: p.games == null ? null : num(p.games), source: 'player-file' }));
  const activityMismatches = primaryPlayers.map(p => {
    const d = derivedByName.get(normalizeName(p.name));
    const seasonGames = p.games == null ? null : num(p.games);
    const archivedGames = d ? num(d.games) : 0;
    if (seasonGames === 0 && archivedGames > 0) return { name: p.name, seasonGames, archivedGames, type: 'season-zero-archive-active' };
    return null;
  }).filter(Boolean);
  return {
    matchOnlyPlayers,
    rosterOnlyPlayers,
    activityMismatches,
    matchOnlyCount: matchOnlyPlayers.length,
    rosterOnlyCount: rosterOnlyPlayers.length,
    activityMismatchCount: activityMismatches.length,
    note: 'La riconciliazione è per nome; nessun filtro per piattaforma.'
  };
}

function dataQualityReport(primaryPlayers, matches, clubId, reconciliation) {
  const errors = [];
  const warnings = [];
  const notes = [];
  const checkRange = (p, field, min, max) => {
    if (p[field] == null) return;
    const n = num(p[field], NaN);
    if (!Number.isFinite(n) || n < min || n > max) errors.push(`${p.name}: ${field} fuori intervallo (${p[field]})`);
  };
  for (const p of primaryPlayers) {
    for (const f of ['games', 'goals', 'assists', 'shots', 'passesMade', 'passAttempts', 'tacklesMade', 'tackleAttempts', 'saves', 'mom', 'redcards', 'secondsPlayed']) {
      if (p[f] != null && num(p[f]) < 0) errors.push(`${p.name}: ${f} negativo`);
    }
    checkRange(p, 'rating', 0, 10);
    checkRange(p, 'winRate', 0, 100);
    checkRange(p, 'passAccuracy', 0, 100);
    checkRange(p, 'tackleSuccess', 0, 100);
    checkRange(p, 'shotAccuracy', 0, 100);
  }
  for (const m of matches) {
    if (!m.id) errors.push('Partita senza ID');
    if (m.clubs.length < 2) errors.push(`Partita ${m.id}: meno di due squadre`);
    if (m.clubs.length >= 2 && (!Number.isFinite(num(m.clubs[0].goals, NaN)) || !Number.isFinite(num(m.clubs[1].goals, NaN)))) errors.push(`Partita ${m.id}: punteggio non numerico`);
  }
  if (reconciliation.matchOnlyCount) warnings.push(`${reconciliation.matchOnlyCount} giocatori compaiono nelle partite ma non nel file Giocatori: non vengono esclusi.`);
  if (reconciliation.rosterOnlyCount) notes.push(`${reconciliation.rosterOnlyCount} giocatori del file Giocatori non risultano nel campione di partite caricate; questo non è un errore se l'archivio è parziale.`);
  if (reconciliation.activityMismatchCount) warnings.push(`${reconciliation.activityMismatchCount} giocatori hanno 0 PG nel cumulativo ma attività nell'archivio caricato: differenza di scope da verificare, non una fusione automatica.`);
  if (primaryPlayers.length && matches.length < 5) notes.push('Le partite archiviate sono un campione più piccolo del cumulativo del file Giocatori; U5 usa solo le gare realmente archiviate.');
  if (!matches.length) notes.push('Nessuna partita archiviata: U5 e forma non sono calcolabili.');
  const penalties = errors.length * 25 + warnings.length * 6;
  return {
    score: Math.max(0, 100 - penalties),
    ok: errors.length === 0,
    errors,
    warnings,
    notes,
    clubId: clubId || null
  };
}

function sourceDataPreview(fileRecords) {
  const categories = ['totals','season','clubInfo','overallStats','players','career','league','playoffs','friendlies','playoffAchievements'];
  const out = {};
  const safeRich = value => {
    if (value == null) return null;
    try {
      const json = JSON.stringify(value);
      return json.length > 14000 ? `${json.slice(0,14000)}…[TRONCATO]` : value;
    } catch { return value; }
  };
  for (const category of categories) {
    const f = fileRecords?.[category];
    const source = f?.raw ?? f?.parsed;
    if (!source) continue;
    if (category === 'players' || category === 'career') {
      const list = Array.isArray(source) ? source : normalizePlayersFile(source, '');
      out[category] = list.slice(0, 120);
      if (isObj(source) && source.positionCount) out[category + 'Meta'] = {positionCount: source.positionCount};
    } else if (['league','playoffs','friendlies'].includes(category)) {
      out[category] = Array.isArray(source) ? source.slice(0, 20) : safeRich(source);
    } else {
      out[category] = safeRich(source);
    }
  }
  return out;
}

function buildTeam({ fileRecords, role }) {
  const playersRaw = fileRecords?.players?.parsed ?? null;
  const seasonPlayers = normalizePlayersFile(fileRecords?.season?.parsed ?? null, '');
  const careerPlayers = normalizePlayersFile(fileRecords?.career?.parsed ?? null, '');
  const matchGroups = [
    normalizeMatchesFile(fileRecords?.league?.parsed ?? null, 'league'),
    normalizeMatchesFile(fileRecords?.playoffs?.parsed ?? null, 'playoffs'),
    normalizeMatchesFile(fileRecords?.friendlies?.parsed ?? null, 'friendlies')
  ].flat();

  const primaryPlayers = normalizePlayersFile(playersRaw, '');
  const fallbackPlayers = primaryPlayers.length ? primaryPlayers : (seasonPlayers.length ? seasonPlayers : careerPlayers);
  const uniqueMatchGroups = dedupeMatches(matchGroups);
  const rawIdentities = [fileRecords?.clubInfo?.aiRecognition, fileRecords?.season?.aiRecognition, fileRecords?.totals?.aiRecognition]
    .filter(Boolean)
    .map(x => ({id:String(x.clubId||'').trim(),name:clean(x.clubName||'')}));
  for (const category of ['clubInfo','season','totals','players']) {
    const x=extractClubIdentity(fileRecords?.[category]?.parsed);
    if(x.id||x.name) rawIdentities.push({id:String(x.id||''),name:clean(x.name||'')});
  }
  const preferredRawIdentity = rawIdentities.find(x=>x.id||x.name) || {id:'',name:''};
  const inferred = inferClub(uniqueMatchGroups, primaryPlayers.length ? primaryPlayers : fallbackPlayers);
  const clubId = preferredRawIdentity.id || inferred.id;
  const teamClub = uniqueMatchGroups.flatMap(m => m.clubs).find(c => String(c.id) === String(clubId));
  const clubName = teamClub?.name || (role === 'own' ? 'Sisal FC 2021' : 'Avversario');
  const matches = uniqueMatchGroups
    .filter(m => !clubId || m.clubs.some(c => String(c.id) === String(clubId)))
    .sort((a, b) => num(b.timestamp) - num(a.timestamp));

  const derivedAll = aggregateMatchPlayers(matches, clubId);
  const recent5Window = aggregateMatchWindow(matches, clubId, 5);
  const players = mergePlayerSources(fallbackPlayers, derivedAll, recent5Window.players, clubId, careerPlayers)
    .map(enrichPlayerAnalytics)
    .sort((a, b) => num(b.performanceIndex) - num(a.performanceIndex) || num(b.goals) - num(a.goals) || num(b.assists) - num(a.assists) || normalizeName(a.name).localeCompare(normalizeName(b.name)));
  const reconciliation = rosterReconciliation(fallbackPlayers, derivedAll);
  const dataQuality = dataQualityReport(fallbackPlayers, matches, clubId, reconciliation);
  const platforms = [...new Set(players.map(p => p.platform).filter(Boolean))];

  const totalsFile = fileRecords?.totals;
  let autoTotals = null;
  const totalsFromAi = totalsFile?.aiRecognition?.totals || null;
  const totalsFromParsed = isObj(totalsFile?.parsed) && totalsFile?.parsed?.matches != null ? totalsFile.parsed : extractHistoricalTotals(totalsFile?.parsed)?.totals;
  const totalValues = totalsFromAi || totalsFromParsed;
  if (totalValues) {
    const totalCheck = ['matches','wins','draws','losses','goals','against'].every(k => Number.isInteger(maybeNum(totalValues[k])) && maybeNum(totalValues[k]) >= 0) && maybeNum(totalValues.wins) + maybeNum(totalValues.draws) + maybeNum(totalValues.losses) === maybeNum(totalValues.matches);
    if (totalCheck) autoTotals = {schemaVersion:1,source:totalsFile?.aiRecognition?.recognizedBy==='gemini'?'dati-totali-ai':'dati-totali-json',totals:{matches:maybeNum(totalValues.matches),wins:maybeNum(totalValues.wins),draws:maybeNum(totalValues.draws),losses:maybeNum(totalValues.losses),goals:maybeNum(totalValues.goals),against:maybeNum(totalValues.against)},goalDifference:maybeNum(totalValues.goals)-maybeNum(totalValues.against),winRate:maybeNum(totalValues.matches)?100*maybeNum(totalValues.wins)/maybeNum(totalValues.matches):0,updatedAt:totalsFile?.uploadedAt||new Date().toISOString(),fileName:totalsFile?.fileName||null,recognizedBy:totalsFile?.aiRecognition?.recognizedBy||'automatic'};
  }

  const totalsSummary=extractClubSummary(fileRecords?.totals?.raw ?? fileRecords?.totals?.parsed ?? null, fileRecords?.totals?.aiRecognition?.profileFields || null);
  const seasonSummary=extractClubSummary(fileRecords?.season?.raw ?? fileRecords?.season?.parsed ?? null, fileRecords?.season?.aiRecognition?.profileFields || null);
  const clubInfo=extractClubInfo(fileRecords?.clubInfo?.raw ?? fileRecords?.clubInfo?.parsed ?? null);
  const overallStats=extractOverallStats(fileRecords?.overallStats?.raw ?? fileRecords?.overallStats?.parsed ?? null);
  const archiveShooting = teamShootingStats(matches, clubId);
  const recent5Shooting = teamShootingStats(recent5Window.matches, clubId);
  const totalsProfile = {
    shots: totalsSummary?.shots ?? null,
    goalConversionRate: totalsSummary?.goalConversionRate ?? null,
    cleanSheets: totalsSummary?.cleanSheets ?? null
  };
  const seasonProfile = {
    shots: seasonSummary?.shots ?? null,
    goalConversionRate: seasonSummary?.goalConversionRate ?? null,
    cleanSheets: seasonSummary?.cleanSheets ?? null
  };
  const overallProfile = {
    shots: overallStats?.shots ?? null,
    goalConversionRate: overallStats?.goalConversionRate ?? null,
    cleanSheets: overallStats?.cleanSheets ?? null
  };
  const historicalGoals = autoTotals?.totals?.goals ?? totalsSummary?.goals ?? overallStats?.goals ?? null;
  const historicalMatches = autoTotals?.totals?.matches ?? totalsSummary?.gamesPlayed ?? overallStats?.gamesPlayed ?? null;
  const historicalShooting = deriveHistoricalShooting({
    players,
    historicalGoals,
    historicalMatches,
    totalsProfile,
    overallProfile
  });
  const playerPositionCount=(fileRecords?.players?.raw && isObj(fileRecords.players.raw) && isObj(fileRecords.players.raw.positionCount)) ? fileRecords.players.raw.positionCount : null;
  const overall = teamResults(matches, clubId);
  const byCompetition = {};
  for (const key of ['league', 'playoffs', 'friendlies']) {
    const categoryMatches = matches.filter(m => m.competition === key);
    byCompetition[key] = teamResults(categoryMatches, clubId);
  }

  const fileStatus = {};
  const allFileCategories = ['totals','season','clubInfo','overallStats','players','career','league','playoffs','friendlies','playoffAchievements'];
  for (const key of allFileCategories) {
    const f = fileRecords?.[key];
    const parsedRows = Array.isArray(f?.parsed) ? f.parsed.length : (f?.parsed ? 1 : 0);
    fileStatus[key] = {
      present: Boolean(f && parsedRows > 0),
      fileName: f?.fileName || null,
      uploadedAt: f?.uploadedAt || null,
      size: f?.size || 0,
      rows: parsedRows,
      detection: f?.detected || null,
      aiRecognition: f?.aiRecognition || null,
      schemaVersion: f?.schemaVersion || null
    };
  }
  const clubIdentitySources = [
    fileRecords?.clubInfo?.aiRecognition, fileRecords?.season?.aiRecognition, fileRecords?.totals?.aiRecognition,
    (()=>{ const x=extractClubIdentity(fileRecords?.clubInfo?.parsed); return (x.id||x.name)?{clubId:x.id||null,clubName:x.name||null}:null; })(),
    (()=>{ const x=extractClubIdentity(fileRecords?.season?.parsed); return (x.id||x.name)?{clubId:x.id||null,clubName:x.name||null}:null; })(),
    preferredRawIdentity.id||preferredRawIdentity.name ? {clubId:preferredRawIdentity.id||null,clubName:preferredRawIdentity.name||null} : null
  ].filter(Boolean);

  return {
    role,
    club: {
      id: preferredRawIdentity.id || clubId,
      name: clean(preferredRawIdentity.name || teamClub?.name || clubName),
      platform: platforms.length ? platforms.join(' / ') : null,
      gamesPlayed: overall.matches,
      wins: overall.wins,
      draws: overall.draws,
      losses: overall.losses,
      goals: overall.goals,
      goalsAgainst: overall.against
    },
    autoTotals,
    recognizedFiles: fileStatus,
    sourceData: sourceDataPreview(fileRecords),
    sourceFields: sourceFieldSummary(fileRecords),
    teamProfile: { totals:totalsSummary, season:seasonSummary, clubInfo, overallStats, playerPositionCount, playoffAchievements: fileRecords?.playoffAchievements?.raw ?? fileRecords?.playoffAchievements?.parsed ?? null },
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
    shooting: {
      historical: historicalShooting,
      archive: archiveShooting,
      recent5: recent5Shooting,
      totalsProfile,
      seasonProfile,
      overallProfile
    },
    matchTrend: buildMatchTrend(matches, clubId, 30),
    playerStatsScope: primaryPlayers.length ? 'season-player-file' : 'uploaded-matches',
    playerStatsScopeLabel: primaryPlayers.length ? 'Statistiche cumulative del file Giocatori (non limitate alle ultime 5 archiviate)' : 'Statistiche ricavate dalle partite caricate',
    fun: funRecords(matches, players, clubId),
    rosterReconciliation: reconciliation,
    dataQuality,
    fileStatus,
    ready: Boolean(players.length || matches.length || Object.values(fileStatus).some(x => x.present)),
    complete: Boolean(
      ['totals','season','clubInfo','overallStats','players','career','league']
        .every(key => fileStatus[key]?.present) &&
      players.length && matches.length
    ),
    requiredCategories: ['totals','season','clubInfo','overallStats','players','career','league'],
    optionalCategories: ['playoffs','friendlies','playoffAchievements']
  };
}

export {
  clean,
  normalizeName,
  parseJsonText,
  normalizePlayersFile,
  normalizeMatchesFile,
  extractHistoricalTotals,
  extractClubIdentity,
  extractClubSummary,
  extractClubInfo,
  extractOverallStats,
  sourceDataPreview,
  detectMatchCategory,
  detectDataFile,
  buildTeam,
  teamResults,
  teamShootingStats,
  buildMatchTrend,
  weightedPerformanceIndex as calculatePlayerPerformanceIndex,
  enrichPlayerAnalytics,
  matchFoulsForClub,
  funRecords,
  impactScore,
  inferClub,
  aggregateMatchPlayers,
  aggregateMatchWindow,
  activeMatchPlayer
};
