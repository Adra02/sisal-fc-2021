import { parsePCTSnapshot } from '../lib/pct-parser.js';

const PCT_ORIGIN = 'https://proclubstracker.com';
const SEARCH_PATH = '/search';
const DEFAULT_TIMEOUT_MS = 26_000;
const MAX_BODY_TEXT = 120_000;
const MAX_TABLES = 40;
const MAX_ROWS_PER_TABLE = 160;
const MAX_LINKS = 600;
const MAX_HEADINGS = 120;

export const maxDuration = 60;

function clean(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .toLocaleLowerCase('it-IT')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isBlockedPage(bodyText) {
  return /access denied|access\s+forbidden|http\s*403|captcha|verify you are human|unusual traffic|robot check|temporarily blocked/i.test(clean(bodyText));
}

function tokenSet(value) {
  return new Set(normalize(value).split(/[^a-z0-9]+/).filter(t => t.length >= 2));
}

function tokenOverlap(a, b) {
  const aa = tokenSet(a);
  const bb = tokenSet(b);
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  for (const t of aa) if (bb.has(t)) common++;
  return common / Math.max(aa.size, bb.size);
}

export function buildSearchUrl(clubName) {
  return `${PCT_ORIGIN}${SEARCH_PATH}?q=${encodeURIComponent(clubName)}`;
}

function isProbablyClubHref(href) {
  try {
    const url = new URL(href, PCT_ORIGIN);
    if (url.origin !== PCT_ORIGIN) return false;
    const path = url.pathname.toLowerCase();
    if (/^\/(search|compare|guides|about|privacy|terms|contact|pct-plus|login|signup)(\/|$)/.test(path)) return false;
    if (path === '/' || path === '') return false;
    if (/(^|\/)(club|clubs|team|teams)(\/|$)/.test(path)) return true;
    if (url.searchParams.has('clubId') || url.searchParams.has('clubid') || url.searchParams.has('teamId') || url.searchParams.has('teamid')) return true;
    return false;
  } catch {
    return false;
  }
}

export function scoreClubCandidate(candidate, clubName) {
  const requested = normalize(clubName);
  const text = normalize(candidate?.text || candidate?.label || '');
  const href = clean(candidate?.href || '');
  if (!text || !href) return -Infinity;

  let score = 0;
  if (text === requested) score += 1000;
  else if (text.includes(requested)) score += 700;
  else if (requested.includes(text) && text.length >= 4) score += 380;
  score += Math.round(tokenOverlap(text, requested) * 300);

  if (isProbablyClubHref(href)) score += 220;
  if (href.includes('/search')) score -= 300;
  if (text.length > 140) score -= 100;
  if (/^(search|home|compare|head to head|settings|privacy|terms)$/i.test(text)) score -= 500;
  return score;
}

export function chooseBestClubCandidate(candidates, clubName) {
  const ranked = (Array.isArray(candidates) ? candidates : [])
    .filter(x => x?.href && x?.text)
    .map(x => ({ ...x, score: scoreClubCandidate(x, clubName) }))
    .filter(x => Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0] || null;
  if (!best || best.score < 250) return null;
  return best;
}

function platformMatchers(platform) {
  const p = normalize(platform);
  if (p === 'common-gen5') return [/ps5\s*\/?.*xbox.*(?:series|x|x\s*\/\s*s).*pc/i, /current[-\s]*gen/i, /common[-\s]*gen5/i, /^pc$/i, /^ps5$/i];
  if (p === 'old-gen' || p === 'common-gen4') return [/ps4/i, /xbox\s*one/i, /old\s*gen/i];
  if (p === 'switch') return [/switch/i, /nintendo/i];
  return [];
}

async function selectPlatform(page, platform) {
  const patterns = platformMatchers(platform);
  if (!patterns.length) return { attempted: false, changed: false };
  try {
    const result = await page.evaluate((sourcePatterns) => {
      const patterns = sourcePatterns.map(x => new RegExp(x.source, x.flags));
      const normalizeText = v => String(v || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      const matches = value => {
        const t = normalizeText(value);
        return t && patterns.some(re => re.test(t));
      };

      for (const select of Array.from(document.querySelectorAll('select'))) {
        const option = Array.from(select.options).find(o => matches(`${o.text} ${o.value}`));
        if (option) {
          select.value = option.value;
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return { changed: true, type: 'select', value: option.value, label: normalizeText(option.text) };
        }
      }

      const candidates = Array.from(document.querySelectorAll('button,[role="button"],label,a'));
      for (const node of candidates) {
        const text = normalizeText(node.innerText || node.getAttribute('aria-label') || node.getAttribute('title') || '');
        if (matches(text)) {
          node.click();
          return { changed: true, type: node.tagName.toLowerCase(), label: text };
        }
      }
      return { changed: false };
    }, patterns.map(re => ({ source: re.source, flags: re.flags })));

    if (result?.changed) {
      await page.waitForNetworkIdle({ idleTime: 400, timeout: 3500 }).catch(() => {});
      await new Promise(r => setTimeout(r, 350));
    }
    return { attempted: true, ...result };
  } catch (error) {
    return { attempted: true, changed: false, error: clean(error?.message) };
  }
}

async function clickSearch(page) {
  try {
    return await page.evaluate(() => {
      const text = el => String(el?.innerText || el?.getAttribute?.('aria-label') || el?.getAttribute?.('title') || '').trim().toLowerCase();
      const buttons = Array.from(document.querySelectorAll('button,input[type="submit"],[role="button"]'));
      const target = buttons.find(el => /^(search|cerca)$/.test(text(el)) || /search|cerca/.test(text(el)));
      if (!target) return false;
      target.click();
      return true;
    });
  } catch {
    return false;
  }
}

async function collectCandidates(page) {
  return page.evaluate(() => {
    const out = [];
    const seen = new Set();
    const cleanText = value => String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    const add = (node, href = '') => {
      const text = cleanText(node?.innerText || node?.textContent || node?.getAttribute?.('aria-label') || node?.getAttribute?.('title') || '');
      const absolute = href ? new URL(href, location.origin).href : '';
      if (!text || !absolute || seen.has(`${absolute}|${text}`)) return;
      seen.add(`${absolute}|${text}`);
      out.push({ text, href: absolute });
    };

    for (const a of Array.from(document.querySelectorAll('a[href]'))) {
      add(a, a.getAttribute('href'));
      const parent = a.closest('article,li,div');
      const parentText = cleanText(parent?.innerText || '');
      if (parent && parentText && parentText.length <= 240) add(parent, a.getAttribute('href'));
    }

    for (const node of Array.from(document.querySelectorAll('[data-href],[data-url]'))) {
      add(node, node.getAttribute('data-href') || node.getAttribute('data-url'));
    }

    return out.slice(0, 900);
  });
}

async function waitForSearchCandidates(page, clubName, timeoutMs) {
  const start = Date.now();
  let last = [];
  while (Date.now() - start < timeoutMs) {
    last = await collectCandidates(page).catch(() => []);
    const best = chooseBestClubCandidate(last, clubName);
    if (best) return { best, candidates: last };
    const body = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (/no clubs found|no results|club not found|nessun risultato|nessun club/i.test(body)) return { best: null, candidates: last };
    await new Promise(r => setTimeout(r, 500));
  }
  return { best: chooseBestClubCandidate(last, clubName), candidates: last };
}


async function clickBestSearchResult(page, clubName) {
  try {
    return await page.evaluate((requested) => {
      const norm = value => String(value || '').replace(/\u00a0/g, ' ').replace(/\\s+/g, ' ').trim().toLocaleLowerCase('en-US');
      const target = norm(requested);
      const elements = Array.from(document.querySelectorAll('a,button,[role="link"],[role="button"],[role="option"]'));
      const scored = elements.map((el) => {
        const text = norm(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '');
        const href = el.getAttribute('href') || el.getAttribute('data-href') || el.getAttribute('data-url') || '';
        let score = -Infinity;
        if (text === target) score = 1000;
        else if (text.includes(target)) score = 750;
        else if (target.includes(text) && text.length >= 4) score = 450;
        if (href && !/^javascript:/i.test(href)) score += 100;
        if (/^(search|cerca)$/i.test(text)) score -= 500;
        return { el, text, score };
      }).filter(x => Number.isFinite(x.score)).sort((a,b) => b.score-a.score);
      const best = scored[0];
      if (!best || best.score < 700) return null;
      best.el.click();
      return { text: best.text, score: best.score };
    }, clubName);
  } catch {
    return null;
  }
}

async function waitForUrlChange(page, originalUrl, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = page.url();
    if (current !== originalUrl) {
      try {
        const u = new URL(current);
        if (u.origin === PCT_ORIGIN && !/^\/search(?:\/|$)/i.test(u.pathname)) return current;
      } catch {}
    }
    await new Promise(r => setTimeout(r, 250));
  }
  return null;
}

async function collectSectionSnapshots(page, clubUrl) {
  const snapshots = {};
  const main = await extractSnapshot(page);
  snapshots.stats = main;

  const discovered = await page.evaluate(() => {
    const cleanText = value => String(value || '').replace(/\u00a0/g, ' ').replace(/\\s+/g, ' ').trim();
    const out = [];
    const seen = new Set();
    const classify = text => {
      const t = text.toLowerCase();
      if (/players?|squad|roster/.test(t)) return 'players';
      if (/matches?|match history|games/.test(t)) return 'matches';
      if (/fun|awards?|records?|red flag|banter|roast/.test(t)) return 'fun';
      if (/stats|statistics|overview|club overview|summary/.test(t)) return 'stats';
      return null;
    };
    for (const el of Array.from(document.querySelectorAll('a[href],button,[role="tab"],[role="link"],[role="button"]'))) {
      const text = cleanText(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '');
      const section = classify(text);
      if (!section || seen.has(section)) continue;
      const rawHref = el.getAttribute('href');
      let href = '';
      if (rawHref) {
        try {
          const u = new URL(rawHref, location.href);
          const generic = /^\/(search|compare|guides|about|privacy|terms|pct-plus|login|signup|players|matches|stats|fun|awards)(\/|$)/i.test(u.pathname);
          href = u.origin === location.origin && !generic && u.href !== location.href ? u.href : '';
        } catch {}
      }
      out.push({ section, text, href });
      seen.add(section);
    }
    return out;
  }).catch(() => []);

  for (const item of discovered) {
    if (item.section === 'stats') continue;
    if (item.href && item.href.startsWith(PCT_ORIGIN + '/') && item.href !== page.url()) {
      try {
        await page.goto(item.href, { waitUntil: 'domcontentloaded', timeout: 14_000 });
        await waitForClubContent(page, 7_000);
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 2500 }).catch(() => {});
        snapshots[item.section] = await extractSnapshot(page);
      } catch {}
      continue;
    }

    try {
      await page.goto(clubUrl, { waitUntil: 'domcontentloaded', timeout: 14_000 });
      await waitForClubContent(page, 7_000);
      const clicked = await page.evaluate((wanted) => {
        const cleanText = value => String(value || '').replace(/\u00a0/g, ' ').replace(/\\s+/g, ' ').trim().toLowerCase();
        const wantedText = wanted.toLowerCase();
        const nodes = Array.from(document.querySelectorAll('button,[role="tab"],[role="button"],a'));
        const node = nodes.find(el => {
          const text = cleanText(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '');
          return wantedText === 'players' ? /players?|squad|roster/.test(text) : wantedText === 'matches' ? /matches?|match history|games/.test(text) : /fun|awards?|records?|red flag|banter|roast/.test(text);
        });
        if (!node) return false;
        node.click();
        return true;
      }, item.section);
      if (clicked) {
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 600));
        snapshots[item.section] = await extractSnapshot(page);
      }
    } catch {}
  }

  await page.goto(clubUrl, { waitUntil: 'domcontentloaded', timeout: 14_000 }).catch(() => {});
  await waitForClubContent(page, 5_000).catch(() => {});
  return snapshots;
}

async function waitForClubContent(page, timeoutMs) {
  const start = Date.now();
  let lastState = { textLength: 0, headings: 0, tables: 0, keywordHits: 0 };
  while (Date.now() - start < timeoutMs) {
    lastState = await page.evaluate(() => {
      const text = String(document.body?.innerText || '');
      const lower = text.toLowerCase();
      const keywords = ['stats', 'players', 'player', 'matches', 'match history', 'awards', 'records', 'skill rating', 'wins', 'losses'];
      const keywordHits = keywords.reduce((n, k) => n + (lower.includes(k) ? 1 : 0), 0);
      return {
        textLength: text.length,
        headings: document.querySelectorAll('h1,h2,h3,h4').length,
        tables: document.querySelectorAll('table,[role="table"]').length,
        keywordHits
      };
    }).catch(() => lastState);

    if (lastState.textLength >= 900 && lastState.keywordHits >= 3 && (lastState.tables >= 1 || lastState.headings >= 3)) return lastState;
    await new Promise(r => setTimeout(r, 500));
  }
  return lastState;
}

async function extractSnapshot(page) {
  return page.evaluate(({ maxBody, maxTables, maxRows, maxLinks, maxHeadings }) => {
    const cleanText = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
    const bodyText = cleanText(document.body?.innerText || '').slice(0, maxBody);
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).slice(0, maxHeadings).map((el, index) => ({
      level: Number(el.tagName.slice(1)), text: cleanText(el.innerText || el.textContent || ''), index
    })).filter(x => x.text);

    const tables = Array.from(document.querySelectorAll('table,[role="table"]')).slice(0, maxTables).map((table, index) => {
      const rows = Array.from(table.querySelectorAll('tr')).slice(0, maxRows).map(row => Array.from(row.querySelectorAll('th,td,[role="cell"],[role="columnheader"]')).map(cell => cleanText(cell.innerText || cell.textContent || ''))).filter(row => row.some(Boolean));
      const headers = rows.length ? rows[0] : [];
      return { index, headers, rows: rows.length > 1 ? rows.slice(1) : rows };
    }).filter(t => t.headers.length || t.rows.length);

    const links = Array.from(document.querySelectorAll('a[href]')).slice(0, maxLinks).map(a => ({
      text: cleanText(a.innerText || a.textContent || ''),
      href: new URL(a.getAttribute('href'), location.href).href
    })).filter(x => x.text || x.href);

    const keyValues = [];
    for (const dl of Array.from(document.querySelectorAll('dl'))) {
      const terms = Array.from(dl.querySelectorAll('dt'));
      for (const dt of terms) {
        const dd = dt.nextElementSibling?.matches?.('dd') ? dt.nextElementSibling : null;
        if (dd) keyValues.push({ key: cleanText(dt.innerText), value: cleanText(dd.innerText) });
      }
    }

    for (const node of Array.from(document.querySelectorAll('[data-stat],[data-label]'))) {
      const key = cleanText(node.getAttribute('data-label') || node.getAttribute('data-stat'));
      const value = cleanText(node.innerText || node.textContent || '');
      if (key && value) keyValues.push({ key, value });
    }

    const sections = Array.from(document.querySelectorAll('section,article')).slice(0, 80).map((el, index) => {
      const heading = cleanText(el.querySelector('h1,h2,h3,h4,h5,h6')?.innerText || '');
      const text = cleanText(el.innerText || '').slice(0, 5000);
      return { index, heading, text };
    }).filter(x => x.text && (x.heading || x.text.length > 80));

    const clubLinks = links.filter(x => /(\/club\/|\/clubs\/|\/team\/|\/teams\/|clubId=|teamId=)/i.test(x.href));

    return {
      url: location.href,
      title: cleanText(document.title),
      headings,
      tables,
      keyValues: keyValues.slice(0, 400),
      sections,
      links,
      clubLinks,
      bodyText,
      bodyTextLength: bodyText.length,
      extractedAt: new Date().toISOString()
    };
  }, { maxBody: MAX_BODY_TEXT, maxTables: MAX_TABLES, maxRows: MAX_ROWS_PER_TABLE, maxLinks: MAX_LINKS, maxHeadings: MAX_HEADINGS });
}

async function launchBrowser() {
  const { default: puppeteer } = await import('puppeteer-core');
  const { default: chromium } = await import('@sparticuz/chromium');

  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true
    });
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
  return puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 },
    executablePath,
    headless: true,
    ignoreHTTPSErrors: true
  });
}

function getQuery(req) {
  const query = req?.query || {};
  if (query.clubName || query.platform) return {
    clubName: clean(Array.isArray(query.clubName) ? query.clubName[0] : query.clubName),
    platform: clean(Array.isArray(query.platform) ? query.platform[0] : query.platform) || 'common-gen5'
  };

  const raw = req?.url || '';
  const url = new URL(raw, PCT_ORIGIN);
  return {
    clubName: clean(url.searchParams.get('clubName')),
    platform: clean(url.searchParams.get('platform')) || 'common-gen5'
  };
}

export async function scrapeClubByName({ clubName, platform = 'common-gen5', page, browserFactory = launchBrowser }) {
  const name = clean(clubName);
  const plat = clean(platform) || 'common-gen5';
  if (!name) throw Object.assign(new Error('Parametro clubName obbligatorio.'), { statusCode: 400, code: 'MISSING_CLUB_NAME' });
  if (name.length > 120) throw Object.assign(new Error('clubName troppo lungo.'), { statusCode: 400, code: 'INVALID_CLUB_NAME' });

  let browser = null;
  let ownsPage = false;
  try {
    if (!page) {
      browser = await browserFactory();
      page = await browser.newPage();
      ownsPage = true;
    }

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9,it-IT;q=0.8,it;q=0.7' });

    const searchUrl = buildSearchUrl(name);
    const response = await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT_MS });
    const searchStatus = response?.status?.() ?? null;
    if (searchStatus === 404) throw Object.assign(new Error('Pagina di ricerca Pro Clubs Tracker non trovata.'), { statusCode: 502, code: 'PCT_SEARCH_404' });
    const initialSearchBody = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (isBlockedPage(initialSearchBody)) throw Object.assign(new Error("Pro Clubs Tracker ha bloccato l'accesso automatizzato alla pagina di ricerca."), { statusCode: 502, code: 'PCT_BLOCKED' });

    await page.waitForNetworkIdle({ idleTime: 500, timeout: 4500 }).catch(() => {});
    const platformResult = await selectPlatform(page, plat);
    if (platformResult.changed) await clickSearch(page);
    if (platformResult.changed) await page.waitForNetworkIdle({ idleTime: 500, timeout: 4500 }).catch(() => {});

    let search = await waitForSearchCandidates(page, name, 10_000);
    const searchBodyAfterWait = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (isBlockedPage(searchBodyAfterWait)) throw Object.assign(new Error("Pro Clubs Tracker ha bloccato l'accesso automatizzato alla ricerca."), { statusCode: 502, code: 'PCT_BLOCKED' });
    if (!search.best && !platformResult.changed) {
      const retryPlatform = await selectPlatform(page, plat);
      if (retryPlatform.changed) {
        await clickSearch(page);
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 4500 }).catch(() => {});
        search = await waitForSearchCandidates(page, name, 8_000);
      }
    }

    if (!search.best) {
      const clicked = await clickBestSearchResult(page, name);
      if (clicked) {
        const changedUrl = await waitForUrlChange(page, searchUrl, 8_000);
        if (changedUrl) {
          await page.waitForNetworkIdle({ idleTime: 500, timeout: 3500 }).catch(() => {});
          search = { best: { text: clicked.text, href: changedUrl, score: clicked.score }, candidates: search.candidates };
        }
      }
    }

    if (!search.best) {
      throw Object.assign(new Error(`Il club "${name}" non è stato trovato su Pro Clubs Tracker per la piattaforma ${plat}.`), {
        statusCode: 404,
        code: 'CLUB_NOT_FOUND',
        meta: { searchUrl, platform: plat, candidatesChecked: search.candidates?.length || 0 }
      });
    }

    const clubUrl = new URL(search.best.href, PCT_ORIGIN).href;
    const clubResponse = await page.goto(clubUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT_MS });
    const clubStatus = clubResponse?.status?.() ?? null;
    if (clubStatus >= 400) throw Object.assign(new Error(`Pro Clubs Tracker ha restituito HTTP ${clubStatus} sulla pagina del club.`), { statusCode: 502, code: 'PCT_CLUB_HTTP' });
    const initialClubBody = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (isBlockedPage(initialClubBody)) throw Object.assign(new Error("Pro Clubs Tracker ha bloccato l'accesso automatizzato alla pagina del club."), { statusCode: 502, code: 'PCT_BLOCKED' });

    await waitForClubContent(page, 18_000);
    await page.waitForNetworkIdle({ idleTime: 700, timeout: 5_000 }).catch(() => {});
    const snapshots = await collectSectionSnapshots(page, clubUrl);
    const normalized = parsePCTSnapshot(snapshots, name);
    const primarySnapshot = snapshots.stats || Object.values(snapshots)[0] || { bodyTextLength: 0, tables: [], title: '' };

    const hasUsefulData = primarySnapshot.bodyTextLength >= 300 && (
      Object.values(snapshots).some(s => (s?.tables?.length || 0) > 0) || normalized.players.length > 0 || normalized.club.gamesPlayed != null || normalized.club.wins != null
    );
    if (!hasUsefulData) {
      throw Object.assign(new Error('La pagina del club è stata aperta ma i dati dinamici non risultano caricati nel DOM.'), {
        statusCode: 502,
        code: 'PCT_DATA_NOT_READY',
        meta: { clubUrl, snapshot: { title: primarySnapshot.title, bodyTextLength: primarySnapshot.bodyTextLength, tables: primarySnapshot.tables.length } }
      });
    }

    return {
      ok: true,
      source: 'Pro Clubs Tracker',
      requested: { clubName: name, platform: plat },
      found: { name: normalized.club.name || search.best.text || name, url: clubUrl, platform: plat },
      search: { url: searchUrl, httpStatus: searchStatus, matchedText: search.best.text, matchScore: search.best.score, platformSelection: platformResult },
      data: normalized,
      snapshots,
      snapshot: primarySnapshot
    };
  } finally {
    if (ownsPage) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Source', 'Pro Clubs Tracker');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED', message: 'Usa una richiesta GET.' });
  }

  const { clubName, platform } = getQuery(req);
  if (!clubName) return res.status(400).json({ ok: false, error: 'MISSING_CLUB_NAME', message: 'Usa /api/scrape-stats?clubName=Sisal%20FC%202021&platform=common-gen5' });

  const started = Date.now();
  try {
    const result = await scrapeClubByName({ clubName, platform });
    return res.status(200).json({ ...result, meta: { durationMs: Date.now() - started } });
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    const code = error?.code || 'SCRAPE_FAILED';
    const payload = {
      ok: false,
      error: code,
      message: clean(error?.message || 'Errore durante il recupero da Pro Clubs Tracker.'),
      source: 'Pro Clubs Tracker',
      requested: { clubName, platform },
      meta: error?.meta || {},
      durationMs: Date.now() - started
    };
    console.error('[scrape-stats]', JSON.stringify({ ...payload, stack: error?.stack || null }));
    return res.status(status).json(payload);
  }
}
