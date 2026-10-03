const EA_BASE = 'https://proclubs.ea.com/api/fc';
const DEFAULT_PLATFORM = 'common-gen5';
const CALL_TIMEOUT_MS = 20000;
const MAX_SEARCH_RESULTS = 20;
const MAX_MATCHES_PER_TYPE = 10;
export const maxDuration = 60;

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate'
    }
  });
}

function str(v) {
  return v == null ? '' : String(v).trim();
}
function num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function firstNum(obj, keys) {
  for (const key of keys) {
    const v = num(obj?.[key]);
    if (v != null) return v;
  }
  return null;
}
function timestamp(v) {
  if (v == null || v === '') return 0;
  const n = num(v);
  if (n != null) return n < 1e12 ? n : Math.floor(n / 1000);
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? Math.floor(t / 1000) : 0;
}
function firstString(obj, keys) {
  for (const key of keys) {
    const v = str(obj?.[key]);
    if (v) return v;
  }
  return '';
}
function normalizeName(value) {
  return str(value).replace(/\s+/g, ' ').slice(0, 100);
}
function sameName(a, b) {
  return normalizeName(a).toLocaleLowerCase('it-IT') === normalizeName(b).toLocaleLowerCase('it-IT');
}
function objectValues(value) {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value;
  return Object.values(value);
}
function walkObjects(value, out = [], depth = 0) {
  if (depth > 7 || out.length > 2000 || value == null) return out;
  if (Array.isArray(value)) {
    for (const item of value) walkObjects(item, out, depth + 1);
    return out;
  }
  if (typeof value !== 'object') return out;
  out.push(value);
  for (const item of Object.values(value)) {
    if (item && typeof item === 'object') walkObjects(item, out, depth + 1);
  }
  return out;
}

async function fetchJson(url, options = {}, timeoutMs = CALL_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'accept': 'application/json, text/plain, */*',
        'user-agent': 'Sisal-FC-2021-FC27-Command-Center/11.0',
        ...(options.headers || {})
      }
    });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = raw; }
    if (!response.ok) {
      const err = new Error(`EA API HTTP ${response.status}`);
      err.status = response.status;
      err.url = url;
      err.body = typeof data === 'string' ? data.slice(0, 500) : data;
      throw err;
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const err = new Error('Timeout nel collegamento ai server EA.');
      err.status = 504;
      err.url = url;
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function candidateFromObject(obj, fallbackId = '') {
  const id = firstString(obj, ['clubId', 'clubID', 'id', 'club_id']) || str(fallbackId);
  const name = firstString(obj, ['clubName', 'name', 'club_name', 'teamName', 'team', 'clubname']) || '';
  if (!/^\d+$/.test(id) || !name) return null;
  return {
    id,
    name,
    platform: firstString(obj, ['platform']) || DEFAULT_PLATFORM,
    division: firstNum(obj, ['division', 'seasonDivision', 'currentDivision']),
    skillRating: firstNum(obj, ['skillRating', 'skillrating', 'skill_rating']),
    wins: firstNum(obj, ['wins', 'win']),
    draws: firstNum(obj, ['draws', 'ties', 'tie']),
    losses: firstNum(obj, ['losses', 'loss']),
    goals: firstNum(obj, ['goals', 'goalsFor', 'goalsScored']),
    goalsAgainst: firstNum(obj, ['goalsAgainst', 'goalsConceded']),
    gamesPlayed: firstNum(obj, ['gamesPlayed', 'games', 'played'])
  };
}

function searchCandidates(data) {
  const out = [];
  const seen = new Set();
  for (const obj of walkObjects(data)) {
    const c = candidateFromObject(obj);
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

function findClubObject(data, clubId) {
  for (const obj of walkObjects(data)) {
    const id = firstString(obj, ['clubId', 'clubID', 'id', 'club_id']);
    if (id === String(clubId)) return obj;
  }
  if (data && typeof data === 'object' && data[String(clubId)] && typeof data[String(clubId)] === 'object') {
    return data[String(clubId)];
  }
  return null;
}

function parseSearch(data, requestedName) {
  const candidates = searchCandidates(data);
  const exact = candidates.find(c => sameName(c.name, requestedName));
  if (exact) return exact;
  const lower = normalizeName(requestedName).toLocaleLowerCase('it-IT');
  const partial = candidates.find(c => normalizeName(c.name).toLocaleLowerCase('it-IT').includes(lower));
  if (partial) return partial;
  const reverse = candidates.find(c => lower.includes(normalizeName(c.name).toLocaleLowerCase('it-IT')));
  return reverse || null;
}

function extractPlayerObjects(data) {
  const raw = walkObjects(data);
  const out = [];
  const seen = new Set();
  for (const obj of raw) {
    const id = firstString(obj, ['playerId', 'playerID', 'memberId', 'personaId', 'userId', 'blazeId', 'id']);
    const name = firstString(obj, ['name', 'playerName', 'playername', 'gamertag', 'gamertagName', 'personaName', 'displayName']);
    const games = firstNum(obj, ['games', 'gamesPlayed', 'appearances', 'matchesPlayed', 'gamePlayed']);
    const goals = firstNum(obj, ['goals', 'goalsScored']);
    const assists = firstNum(obj, ['assists']);
    const rating = firstNum(obj, ['rating', 'averageRating', 'avgRating']);
    if (!name || (games == null && goals == null && assists == null && rating == null)) continue;
    const key = `${id || name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      playerId: id || null,
      name,
      position: firstString(obj, ['position', 'pos', 'preferredPosition']) || null,
      ovr: firstNum(obj, ['ovr', 'overall', 'ratingOverall']),
      games,
      goals,
      assists,
      rating,
      passMade: firstNum(obj, ['passMade', 'passesMade', 'successfulPasses', 'passesCompleted']),
      passAttempts: firstNum(obj, ['passAttempts', 'passesAttempted', 'totalPasses']),
      passAccuracy: firstNum(obj, ['passAccuracy', 'passingAccuracy']),
      tackleMade: firstNum(obj, ['tackleMade', 'tacklesMade', 'successfulTackles']),
      tackleAttempts: firstNum(obj, ['tackleAttempts', 'tacklesAttempted', 'totalTackles']),
      tackleSuccess: firstNum(obj, ['tackleSuccess', 'tackleSuccessRate']),
      shots: firstNum(obj, ['shots', 'shotsTotal']),
      saves: firstNum(obj, ['saves']),
      cleanSheets: firstNum(obj, ['cleanSheets', 'clean_sheet']),
      mom: firstNum(obj, ['mom', 'manOfTheMatch', 'manOfMatch']),
      redcards: firstNum(obj, ['redcards', 'redCards']),
      minutes: firstNum(obj, ['minutes', 'minutesPlayed'])
    });
  }
  return out.sort((a, b) => (b.games || 0) - (a.games || 0));
}

function extractMatches(data, clubId, clubName) {
  const raw = walkObjects(data);
  const out = [];
  const seen = new Set();
  for (const obj of raw) {
    const id = firstString(obj, ['matchId', 'matchID', 'gameId', 'gameID', 'id']);
    if (!id) continue;

    const home = obj.homeTeam || obj.home || obj.homeClub || obj.homeclub || obj.team1 || obj.homeClubInfo;
    const away = obj.awayTeam || obj.away || obj.awayClub || obj.awayclub || obj.team2 || obj.awayClubInfo;
    let homeName = typeof home === 'object' ? firstString(home, ['name', 'clubName', 'teamName']) : str(home);
    let awayName = typeof away === 'object' ? firstString(away, ['name', 'clubName', 'teamName']) : str(away);
    let homeId = typeof home === 'object' ? firstString(home, ['clubId', 'id', 'clubID']) : '';
    let awayId = typeof away === 'object' ? firstString(away, ['clubId', 'id', 'clubID']) : '';

    let homeScore = firstNum(obj, ['homeScore', 'homeGoals', 'home_score']);
    let awayScore = firstNum(obj, ['awayScore', 'awayGoals', 'away_score']);
    if ((homeScore == null || awayScore == null) && obj.score && typeof obj.score === 'object') {
      homeScore = homeScore ?? firstNum(obj.score, ['home', 'homeScore', 'team1', 'homeGoals']);
      awayScore = awayScore ?? firstNum(obj.score, ['away', 'awayScore', 'team2', 'awayGoals']);
    }

    const clubs = Array.isArray(obj.clubs) ? obj.clubs : Array.isArray(obj.teams) ? obj.teams : null;
    if ((!homeName || !awayName) && clubs?.length >= 2) {
      const a = clubs[0] || {}, b = clubs[1] || {};
      homeName ||= firstString(a, ['name', 'clubName', 'teamName']);
      awayName ||= firstString(b, ['name', 'clubName', 'teamName']);
      homeId ||= firstString(a, ['clubId', 'id', 'clubID']);
      awayId ||= firstString(b, ['clubId', 'id', 'clubID']);
      homeScore = homeScore ?? firstNum(a, ['score', 'goals', 'goalsFor']);
      awayScore = awayScore ?? firstNum(b, ['score', 'goals', 'goalsFor']);
    }

    if ((!homeName || !awayName) && obj.details && typeof obj.details === 'object') {
      homeName ||= firstString(obj.details, ['homeTeam', 'homeClub', 'homeName']);
      awayName ||= firstString(obj.details, ['awayTeam', 'awayClub', 'awayName']);
    }

    if (!homeName || !awayName || homeScore == null || awayScore == null) continue;
    if (homeId && awayId && ![String(homeId), String(awayId)].includes(String(clubId))) continue;
    if (!homeId && !awayId && ![homeName, awayName].some(n => sameName(n, clubName))) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const rawTs = ['timestamp', 'date', 'playedAt', 'matchTime', 'createdAt'].map(k => obj?.[k]).find(v => v != null && v !== '');
    const ts = timestamp(rawTs);
    const isHome = String(homeId) === String(clubId) || sameName(homeName, clubName);
    const gf = isHome ? homeScore : awayScore;
    const ga = isHome ? awayScore : homeScore;
    const result = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
    out.push({ id, timestamp: ts, homeTeam: homeName, awayTeam: awayName, homeScore, awayScore, result });
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}

function normalizeClub(club, info, overall, requestedName, platform) {
  const i = info && typeof info === 'object' ? info : {};
  const o = overall && typeof overall === 'object' ? overall : {};
  const base = { ...club, ...candidateFromObject(i, club?.id || ''), ...candidateFromObject(o, club?.id || '') };
  const gamesPlayed = firstNum(base, ['gamesPlayed']) ?? (base.wins != null || base.draws != null || base.losses != null ? (base.wins || 0) + (base.draws || 0) + (base.losses || 0) : null);
  const goals = firstNum(base, ['goals']);
  const goalsAgainst = firstNum(base, ['goalsAgainst']);
  return {
    id: str(base.id) || null,
    name: firstString(base, ['name']) || requestedName,
    platform: firstString(base, ['platform']) || platform,
    division: firstNum(base, ['division']),
    skillRating: firstNum(base, ['skillRating']),
    gamesPlayed,
    wins: firstNum(base, ['wins']),
    draws: firstNum(base, ['draws']),
    losses: firstNum(base, ['losses']),
    goals,
    goalsAgainst,
    goalDifference: goals != null && goalsAgainst != null ? goals - goalsAgainst : null,
    clubUrl: base.id ? `https://proclubstracker.com/club/${encodeURIComponent(base.id)}?platform=${encodeURIComponent(platform)}` : null
  };
}

function uniqueSources(urls) {
  return [...new Set(urls.filter(Boolean))];
}

export async function POST(request) {
  if (request.method !== 'POST') return reply({ error: 'Metodo non consentito.' }, 405);
  let body = {};
  try { body = await request.json(); } catch { return reply({ error: 'Richiesta JSON non valida.', code: 'BAD_JSON' }, 400); }
  const name = normalizeName(body?.name);
  const platform = str(body?.platform) || DEFAULT_PLATFORM;
  if (!name) return reply({ error: 'Inserisci il nome della squadra.', code: 'MISSING_CLUB_NAME' }, 400);

  const startedAt = Date.now();
  const calls = [];
  let eaRequestCount = 0;
  try {
    const searchUrl = `${EA_BASE}/currentSeasonLeaderboard/search?platform=${encodeURIComponent(platform)}&clubName=${encodeURIComponent(name)}&maxResultCount=${MAX_SEARCH_RESULTS}`;
    const searchData = await fetchJson(searchUrl);
    calls.push(searchUrl);
    eaRequestCount += 1;
    const found = parseSearch(searchData, name);
    if (!found?.id) {
      return reply({ ok: false, error: `EA non ha trovato un club con il nome "${name}" sulla piattaforma ${platform}. Controlla nome e piattaforma.`, code: 'CLUB_NOT_FOUND', source: 'EA Public Clubs API', eaRequests: calls.length, tried: calls, elapsedMs: Date.now() - startedAt }, 404);
    }

    const id = found.id;
    const overallUrl = `${EA_BASE}/clubs/overallStats?platform=${encodeURIComponent(platform)}&clubIds=${encodeURIComponent(id)}`;
    const membersUrl = `${EA_BASE}/members/stats?platform=${encodeURIComponent(platform)}&clubId=${encodeURIComponent(id)}`;
    const matchTypes = ['leagueMatch', 'playoffMatch'];

    const [overallResult, membersResult, ...matchResults] = await Promise.allSettled([
      fetchJson(overallUrl), fetchJson(membersUrl),
      ...matchTypes.map(type => fetchJson(`${EA_BASE}/clubs/matches?platform=${encodeURIComponent(platform)}&clubIds=${encodeURIComponent(id)}&matchType=${type}&maxResultCount=${MAX_MATCHES_PER_TYPE}`))
    ]);

    for (const result of [overallResult, membersResult, ...matchResults]) { eaRequestCount += 1; if (result.status === 'fulfilled') calls.push('ok'); }

    const overall = overallResult.status === 'fulfilled' ? findClubObject(overallResult.value, id) || overallResult.value : {};
    const members = membersResult.status === 'fulfilled' ? membersResult.value : {};
    const matches = [...new Map(matchResults
      .flatMap((r) => r.status === 'fulfilled' ? extractMatches(r.value, id, found.name) : [])
      .map(m => [m.id, m])).values()]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const players = extractPlayerObjects(members);
    const club = normalizeClub(found, {}, overall, name, platform);

    const notes = [];
    if (overallResult.status !== 'fulfilled') notes.push(`Overall Stats EA non disponibile: ${overallResult.reason?.message || 'errore sconosciuto'}`);
    if (membersResult.status !== 'fulfilled') notes.push(`Stats giocatori EA non disponibili: ${membersResult.reason?.message || 'errore sconosciuto'}`);
    if (!players.length) notes.push('EA non ha restituito statistiche giocatori leggibili con questa struttura di risposta.');
    if (!matches.length) notes.push('EA non ha restituito partite di campionato/playoff leggibili.');

    if (!club.id) return reply({ ok: false, error: 'EA ha risposto ma non è stato possibile identificare il Club ID.', code: 'INVALID_CLUB_RESPONSE', source: 'EA Public Clubs API', eaRequests: eaRequestCount, tried: calls, elapsedMs: Date.now() - startedAt }, 502);

    return reply({
      ok: true,
      club,
      sections: {
        stats: { available: Boolean(club.gamesPlayed != null || club.wins != null || club.skillRating != null), notes: [] },
        fun: { available: false, items: [], notes: ['La sezione Fun non è restituita dagli endpoint EA usati da questa sincronizzazione.'] },
        players: { available: players.length > 0, items: players.slice(0, 100), notes: [] },
        matches: { available: matches.length > 0, items: matches.slice(0, 5), notes: [] }
      },
      players: players.slice(0, 100),
      matches: matches.slice(0, 5),
      fun: { available: false, items: [] },
      sourceUrls: uniqueSources([
        `https://proclubs.ea.com/`,
        club.clubUrl
      ]),
      sourceNotes: notes,
      source: 'EA Public Clubs API',
      fetchedAt: new Date().toISOString(),
      model: null,
      searchGrounding: false,
      geminiRequests: 0,
      eaRequests: eaRequestCount,
      elapsedMs: Date.now() - startedAt
    });
  } catch (error) {
    const status = Number(error?.status || 502);
    return reply({
      ok: false,
      error: error?.message || 'Errore durante il recupero dei dati EA.',
      code: status === 429 ? 'EA_RATE_LIMIT' : 'EA_API_FAILED',
      status,
      source: 'EA Public Clubs API',
      geminiRequests: 0,
      eaRequests: Math.max(eaRequestCount, calls.length + 1),
      elapsedMs: Date.now() - startedAt,
      detail: error?.body || null
    }, Math.min(Math.max(status, 400), 504));
  }
}
