const CATEGORY_KEYS = [
  'totals','season','clubInfo','overallStats','players','career',
  'league','playoffs','friendlies','playoffAchievements'
];

const compact = value => String(value ?? '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
const isObj = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));

function asRecords(raw) {
  if (Array.isArray(raw)) return raw.filter(isObj);
  if (!isObj(raw)) return [];
  return Object.values(raw).filter(isObj);
}

function firstObjectRecord(raw) {
  if (Array.isArray(raw)) return raw.find(isObj) || null;
  return isObj(raw) ? raw : (asRecords(raw)[0] || null);
}

function memberList(raw) {
  if (!isObj(raw)) return [];
  const value = raw.members ?? raw.players ?? raw.playerStats ?? raw.membersStats ?? raw.data;
  if (Array.isArray(value)) return value.filter(isObj);
  if (isObj(value)) return Object.values(value).filter(isObj);
  return [];
}

function objectKeySet(value) {
  return new Set(Object.keys(value || {}).map(key => compact(key)));
}

function hasAny(set, keys) { return keys.some(key => set.has(compact(key))); }
function hasAll(set, keys) { return keys.every(key => set.has(compact(key))); }

function isTrackerClubSummary(raw) {
  const record = firstObjectRecord(raw);
  if (!record) return false;
  const keys = objectKeySet(record);
  const required = ['clubId','wins','losses','ties','gamesPlayed','goals','goalsAgainst'];
  return hasAll(keys, required) && (keys.has('clubinfo') || keys.has('clubname') || keys.has('currentdivision') || keys.has('points'));
}

function isTrackerOverallStats(raw) {
  const record = firstObjectRecord(raw);
  if (!record) return false;
  const keys = objectKeySet(record);
  return hasAll(keys, ['clubId','gamesPlayed','gamesPlayedPlayoff','goals','goalsAgainst','wins','losses','ties']) &&
    hasAny(keys, ['lastMatch0','lastOpponent0','skillRating']);
}

function isTrackerClubInfo(raw) {
  if (!isObj(raw)) return false;
  const records = Object.entries(raw).filter(([, value]) => isObj(value)).map(([, value]) => value);
  return records.some(record => {
    const keys = objectKeySet(record);
    return hasAll(keys, ['name','clubId','regionId','teamId','customKit']) && !hasAny(keys, ['wins','losses','ties','gamesPlayed','goals','goalsAgainst']);
  });
}

function isDetailedPlayerStats(raw) {
  const members = memberList(raw);
  if (!members.length) return false;
  const keys = objectKeySet(members[0]);
  return hasAll(keys, ['name','gamesPlayed','goals','assists','ratingAve','favoritePosition']) &&
    hasAny(keys, ['cleanSheetsDef','passSuccessRate','passesMade','proOverall','proName','winRate','tackleSuccessRate']);
}

function isCareerPlayerStats(raw) {
  const members = memberList(raw);
  if (!members.length) return false;
  const allowed = new Set(['name','propos','gamesplayed','goals','assists','manofthematch','ratingave','prevgoals','favoriteposition']);
  const keys = new Set(members.flatMap(member => Object.keys(member).map(key => compact(key))));
  const meaningful = [...keys].filter(key => key);
  const base = ['name','gamesPlayed','goals','assists','manOfTheMatch','ratingAve','prevGoals','favoritePosition'];
  return hasAll(keys, base) && meaningful.every(key => allowed.has(key) || key === 'propos');
}

function isTrackerMatches(raw) {
  if (!Array.isArray(raw) || !raw.length) return false;
  const records = raw.filter(isObj).slice(0, 5);
  return records.length > 0 && records.every(item => {
    const keys = objectKeySet(item);
    return hasAny(keys, ['matchId','matchID']) && hasAny(keys, ['clubs','club']) && hasAny(keys, ['players','aggregate']);
  });
}

function categoryFromKnownFileName(fileName) {
  const name = clean(fileName).toLocaleLowerCase('it-IT');
  if (/playoff.*achievement|achievement.*playoff|premi.*playoff|obiettivi.*playoff/.test(name)) return 'playoffAchievements';
  if (/overall\s*stats|overallstats/.test(name)) return 'overallStats';
  if (/info(?:rmazioni)?(?:\s*club)?\.json$|info.*club/.test(name)) return 'clubInfo';
  if (/carriera|career/.test(name)) return 'career';
  if (/giocator|players?/.test(name)) return 'players';
  if (/playoff/.test(name)) return 'playoffs';
  if (/friendly|amichevol/.test(name)) return 'friendlies';
  if (/league|campionat|division/.test(name)) return 'league';
  return null;
}

function detectKnownProClubsFile(raw, fileName = '') {
  const name = clean(fileName);
  const lower = name.toLocaleLowerCase('it-IT');

  // The two uploaded search*.json files have the exact same Pro Clubs Tracker club-summary shape.
  // Their payload is factual and identical, so the same normalized record is safe for both totals and season.
  if (isTrackerClubSummary(raw)) {
    const preferred = /\(\d+\)\s*\.json$/i.test(lower) ? 'season' : 'totals';
    return {
      category: preferred,
      confidence: 'exact',
      reason: 'Firma Pro Clubs Tracker: record club con clubId, gamesPlayed, wins, losses, ties, goals e goalsAgainst.',
      signature: 'tracker-club-summary',
      mirrorCategories: ['totals','season']
    };
  }
  if (isTrackerOverallStats(raw)) {
    return {
      category: 'overallStats', confidence: 'exact', signature: 'tracker-overall-stats',
      reason: 'Firma Pro Clubs Tracker: Overall Stats con lastMatch/lastOpponent e skillRating.'
    };
  }
  if (isTrackerClubInfo(raw)) {
    return {
      category: 'clubInfo', confidence: 'exact', signature: 'tracker-club-info',
      reason: 'Firma Pro Clubs Tracker: scheda club con customKit, regionId e teamId.'
    };
  }
  if (isDetailedPlayerStats(raw)) {
    return {
      category: 'players', confidence: 'exact', signature: 'tracker-player-stats',
      reason: 'Firma Pro Clubs Tracker: membri con statistiche dettagliate, percentuali, OVR e profilo Pro.'
    };
  }
  if (isCareerPlayerStats(raw)) {
    return {
      category: 'career', confidence: 'exact', signature: 'tracker-career-player-stats',
      reason: 'Firma Pro Clubs Tracker: membri con schema ridotto di carriera (PG, gol, assist, MOTM, voto e posizione).'
    };
  }
  if (isTrackerMatches(raw)) {
    return {
      category: /playoff/.test(lower) ? 'playoffs' : /friendly|amichevol/.test(lower) ? 'friendlies' : 'league',
      confidence: 'exact', signature: 'tracker-match-archive',
      reason: 'Firma Pro Clubs Tracker: archivio di match con matchId, clubs, players e aggregate.'
    };
  }

  const named = categoryFromKnownFileName(name);
  if (named) return { category: named, confidence: 'name', signature: 'filename-hint', reason: `Nome file: ${name}` };
  return null;
}

export { detectKnownProClubsFile, isTrackerClubSummary, isTrackerOverallStats, isTrackerClubInfo, isDetailedPlayerStats, isCareerPlayerStats, isTrackerMatches, CATEGORY_KEYS };
