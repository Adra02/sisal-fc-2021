import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import {
  clean,
  normalize,
  first,
  collectSearchCandidates,
  chooseClub,
  extractObjectByClubId,
  extractMembers,
  normalizeMatches,
  normalizeOverall
} from '../lib/ea-client-core.js';

const EA_ORIGIN = 'https://proclubs.ea.com';
const EA_API = `${EA_ORIGIN}/api/fc`;
const DEFAULT_PLATFORM = 'common-gen5';
const NAV_TIMEOUT_MS = 18000;
const REQUEST_TIMEOUT_MS = 12000;
const SEARCH_LIMIT = 50;
const MATCH_LIMIT = 100;
const CACHE_TTL_MS = 5 * 60 * 1000;
const ALLOWED_PLATFORMS = new Set(['common-gen5', 'common-gen4', 'nx']);

export const maxDuration = 55;

const memoryCache = globalThis.__SISAL_FC27_EA_CACHE || new Map();
globalThis.__SISAL_FC27_EA_CACHE = memoryCache;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate'
    }
  });
}

function makeError(message, statusCode = 502, code = 'EA_SYNC_FAILED', extra = {}) {
  return Object.assign(new Error(message), { statusCode, code, ...extra });
}

async function launchBrowser() {
  chromium.setGraphicsMode = false;
  return puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    executablePath: await chromium.executablePath(),
    headless: true,
    ignoreHTTPSErrors: true
  });
}

async function fetchFromEA(page, url) {
  const result = await page.evaluate(async ({ url, timeout }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'en-US,en;q=0.9,it-IT;q=0.8,it;q=0.7',
          pragma: 'no-cache',
          'cache-control': 'no-cache'
        },
        signal: controller.signal
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text: text.slice(0, 4_000_000) };
    } catch (cause) {
      return { ok: false, status: 0, text: '', error: String(cause?.message || cause) };
    } finally {
      clearTimeout(timer);
    }
  }, { url, timeout: REQUEST_TIMEOUT_MS });

  let data = null;
  if (result.text) {
    try { data = JSON.parse(result.text); } catch {}
  }
  return { ...result, data, transport: 'page.fetch' };
}

async function navigateToJson(page, url) {
  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: REQUEST_TIMEOUT_MS
    });
    const status = response?.status?.() ?? 200;
    const text = await page.evaluate(() => document.body?.innerText || document.documentElement?.textContent || '');
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { ok: status >= 200 && status < 300 && Boolean(data), status, text: text.slice(0, 4_000_000), data, transport: 'page.goto' };
  } catch (cause) {
    return { ok: false, status: 0, text: '', data: null, transport: 'page.goto', error: String(cause?.message || cause) };
  }
}

async function fetchEndpoint(page, endpoint, params) {
  const url = `${EA_API}/${endpoint}?${new URLSearchParams(params)}`;
  let result = await fetchFromEA(page, url);

  if (!result.ok && [403, 429, 500, 502, 503, 504].includes(result.status)) {
    await sleep(350);
    result = await fetchFromEA(page, url);
  }

  // When EA rejects fetch() inside the page context, try a real Chromium navigation.
  if (!result.ok || !result.data) {
    const navigated = await navigateToJson(page, url);
    if (navigated.ok) return navigated.data;
    if (result.status === 403 || navigated.status === 403) {
      throw makeError(`EA HTTP 403 su ${endpoint}: Access Denied anche dal browser Chromium.`, 502, 'EA_ACCESS_DENIED', {
        endpoint, url, response: String(result.text || navigated.text || '').slice(0, 500)
      });
    }
    const status = result.status || navigated.status || 502;
    throw makeError(`EA HTTP ${status} su ${endpoint}.`, status === 404 ? 404 : 502, 'EA_ENDPOINT_FAILED', {
      endpoint, url, response: String(result.text || navigated.text || '').slice(0, 500)
    });
  }

  return result.data;
}

async function bootstrapEA(page) {
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9,it-IT;q=0.8,it;q=0.7',
    Referer: `${EA_ORIGIN}/`,
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  });
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
  page.setDefaultTimeout(REQUEST_TIMEOUT_MS);

  // Establish a genuine Chromium browsing context on the same EA origin.
  const response = await page.goto(`${EA_ORIGIN}/`, {
    waitUntil: 'domcontentloaded',
    timeout: NAV_TIMEOUT_MS
  }).catch(() => null);

  // A 403 on the homepage is not immediately fatal: some EA edge nodes block the
  // HTML root while still permitting the browser to request the API endpoints.
  if (response && response.status() >= 500) {
    console.warn('EA homepage returned', response.status());
  }
}

async function getMembers(page, platform, clubId) {
  let currentRaw;
  try {
    currentRaw = await fetchEndpoint(page, 'members/stats', { platform, clubId });
  } catch (error) {
    if (!['EA_ENDPOINT_FAILED', 'EA_INVALID_JSON'].includes(error?.code)) throw error;
    currentRaw = null;
  }
  let players = extractMembers(currentRaw, clubId);

  // The official endpoint is season-scoped implicitly. If it returns no usable
  // members, fall back to the club career endpoint used by FC27 clients.
  if (!players.length) {
    const careerRaw = await fetchEndpoint(page, 'members/career/stats', { platform, clubId });
    players = extractMembers(careerRaw, clubId);
    return { raw: careerRaw, players, source: 'members/career/stats' };
  }
  return { raw: currentRaw, players, source: 'members/stats' };
}

async function loadClub({ clubName, platform }) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await bootstrapEA(page);

    const searchRaw = await fetchEndpoint(page, 'currentSeasonLeaderboard/search', {
      platform,
      clubName,
      maxResultCount: String(SEARCH_LIMIT)
    });

    const candidates = collectSearchCandidates(searchRaw);
    const selected = chooseClub(candidates, clubName);
    if (!selected) {
      throw makeError(
        `Club "${clubName}" non trovato su EA per la piattaforma ${platform}.`,
        404,
        'CLUB_NOT_FOUND',
        { candidates: candidates.slice(0, 12).map(c => ({ id: c.id, name: c.name })) }
      );
    }

    const clubId = selected.id;
    const membersPromise = getMembers(page, platform, clubId);
    const [infoRaw, overallRaw, membersResult, leagueRaw, friendlyRaw, playoffRaw, achievementsRaw] = await Promise.all([
      fetchEndpoint(page, 'clubs/info', { platform, clubIds: clubId }),
      fetchEndpoint(page, 'clubs/overallStats', { platform, clubIds: clubId }),
      membersPromise,
      fetchEndpoint(page, 'clubs/matches', { platform, clubIds: clubId, matchType: 'leagueMatch', maxResultCount: String(MATCH_LIMIT) }),
      fetchEndpoint(page, 'clubs/matches', { platform, clubIds: clubId, matchType: 'friendlyMatch', maxResultCount: String(MATCH_LIMIT) }).catch(() => []),
      fetchEndpoint(page, 'clubs/matches', { platform, clubIds: clubId, matchType: 'playoffMatch', maxResultCount: String(MATCH_LIMIT) }).catch(() => []),
      fetchEndpoint(page, 'clubs/playoffAchievements', { platform, clubIds: clubId }).catch(() => [])
    ]);

    const info = extractObjectByClubId(infoRaw, clubId) || selected.raw || {};
    const overall = normalizeOverall(overallRaw, clubId);
    const players = membersResult.players;
    const matches = [
      ...normalizeMatches(leagueRaw, clubId).map(m => ({ ...m, matchType: 'leagueMatch' })),
      ...normalizeMatches(friendlyRaw, clubId).map(m => ({ ...m, matchType: 'friendlyMatch' })),
      ...normalizeMatches(playoffRaw, clubId).map(m => ({ ...m, matchType: 'playoffMatch' }))
    ].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

    if (!players.length && !matches.length && overall.gamesPlayed == null) {
      throw makeError('EA ha trovato il club ma non ha restituito dati utilizzabili.', 502, 'EA_NO_USABLE_DATA');
    }

    const finalName = clean(first(info, ['name', 'clubName'], selected.name || clubName));
    const achievementItems = Array.isArray(achievementsRaw)
      ? achievementsRaw
      : (achievementsRaw?.achievements || achievementsRaw?.items || []);

    return {
      ok: true,
      club: {
        id: clubId,
        name: finalName,
        platform,
        gamesPlayed: overall.gamesPlayed,
        wins: overall.wins,
        draws: overall.draws,
        losses: overall.losses,
        goals: overall.goals,
        goalsAgainst: overall.goalsAgainst,
        points: overall.points,
        division: overall.division,
        skillRating: overall.skillRating,
        info,
        overall
      },
      players,
      matches,
      fun: {
        available: achievementItems.length > 0,
        items: achievementItems,
        note: achievementItems.length ? 'Achievement playoff restituiti dall’endpoint EA.' : 'EA non restituisce una sezione Fun separata per questo club.'
      },
      sections: {
        stats: { available: overall.gamesPlayed != null || overall.wins != null, source: 'EA FC27 Clubs API' },
        players: { available: players.length > 0, count: players.length, source: membersResult.source },
        matches: { available: matches.length > 0, count: matches.length, source: 'clubs/matches' },
        friendly: { available: normalizeMatches(friendlyRaw, clubId).length > 0, source: 'clubs/matches?matchType=friendlyMatch' },
        playoff: { available: normalizeMatches(playoffRaw, clubId).length > 0, source: 'clubs/matches?matchType=playoffMatch' },
        achievements: { available: achievementItems.length > 0, source: 'clubs/playoffAchievements' }
      },
      search: {
        requestedName: clubName,
        selectedName: selected.name,
        candidates: candidates.slice(0, 12).map(c => ({ id: c.id, name: c.name, score: c.score }))
      },
      source: 'EA FC27 Clubs API via browser-compatible Chromium client',
      fetchedAt: new Date().toISOString(),
      raw: {
        search: searchRaw,
        info: infoRaw,
        overall: overallRaw,
        members: membersResult.raw,
        leagueMatches: leagueRaw,
        friendlyMatches: friendlyRaw,
        playoffMatches: playoffRaw,
        achievements: achievementsRaw
      }
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function scrapeClubByName({ clubName, platform = DEFAULT_PLATFORM }) {
  const name = clean(clubName);
  const plat = clean(platform) || DEFAULT_PLATFORM;
  if (!name) throw makeError('Parametro clubName obbligatorio.', 400, 'MISSING_CLUB_NAME');
  if (name.length > 100) throw makeError('clubName troppo lungo.', 400, 'INVALID_CLUB_NAME');
  if (!ALLOWED_PLATFORMS.has(plat)) throw makeError('Piattaforma non valida.', 400, 'INVALID_PLATFORM');

  const cacheKey = `${plat}:${normalize(name)}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.data, cached: true };

  const data = await loadClub({ clubName: name, platform: plat });
  memoryCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data });
  for (const [key, value] of memoryCache) if (value.expiresAt <= Date.now()) memoryCache.delete(key);
  return data;
}

export async function GET(request) {
  const url = new URL(request.url);
  const clubName = url.searchParams.get('clubName') || url.searchParams.get('name') || '';
  const platform = url.searchParams.get('platform') || DEFAULT_PLATFORM;
  const startedAt = Date.now();
  try {
    const data = await scrapeClubByName({ clubName, platform });
    return reply({ ...data, elapsedMs: Date.now() - startedAt }, 200);
  } catch (err) {
    console.error('scrape-stats error', err);
    return reply({
      ok: false,
      error: err?.message || 'Errore durante il recupero dei dati del club.',
      code: err?.code || 'EA_SYNC_FAILED',
      requestedClubName: clean(clubName),
      platform: clean(platform) || DEFAULT_PLATFORM,
      elapsedMs: Date.now() - startedAt,
      ...(err?.candidates ? { candidates: err.candidates } : {})
    }, Math.min(Math.max(Number(err?.statusCode || 502), 400), 504));
  }
}

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { return reply({ ok: false, error: 'JSON non valido.' }, 400); }
  const startedAt = Date.now();
  try {
    const data = await scrapeClubByName({ clubName: body?.clubName || body?.name, platform: body?.platform || DEFAULT_PLATFORM });
    return reply({ ...data, elapsedMs: Date.now() - startedAt }, 200);
  } catch (err) {
    console.error('scrape-stats POST error', err);
    return reply({ ok: false, error: err?.message || 'Errore durante il recupero del club.', code: err?.code || 'EA_SYNC_FAILED', elapsedMs: Date.now() - startedAt }, Math.min(Math.max(Number(err?.statusCode || 502), 400), 504));
  }
}
