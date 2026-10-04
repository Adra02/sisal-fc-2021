const TRACKER_HOSTS = new Set(['proclubstracker.com', 'www.proclubstracker.com']);
const MAX_HTML = 6 * 1024 * 1024;

function cleanText(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function num(value) {
  const n = Number(String(value ?? '').replace(',', '.').replace(/%/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeLabel(value) {
  return cleanText(value).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const ALIASES = {
  matches: [/^matches$/, /^games$/, /^games played$/, /^gamesplayed$/, /^partite$/, /^partite giocate$/, /^played$/, /^gp$/],
  wins: [/^wins?$/, /^won$/, /^vittorie$/],
  draws: [/^draws?$/, /^ties?$/, /^pareggi?$/, /^ties? games$/],
  losses: [/^losses?$/, /^lost$/, /^sconfitte$/],
  goals: [/^goals?$/, /^goals for$/, /^goalsfor$/, /^goals scored$/, /^scored$/, /^gol$/, /^gol fatti$/, /^goals made$/, /^gf$/],
  against: [/^goals against$/, /^goalsagainst$/, /^goals conceded$/, /^goalsconceded$/, /^goals allowed$/, /^conceded$/, /^against$/, /^gol subiti$/, /^subiti$/, /^ga$/]
};

function classify(label) {
  const n = normalizeLabel(label);
  for (const [key, patterns] of Object.entries(ALIASES)) {
    if (patterns.some(rx => rx.test(n))) return key;
  }
  return null;
}

function parseCells(htmlRow) {
  return [...String(htmlRow).matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
    .map(m => cleanText(m[1]))
    .filter(Boolean);
}

function extractTableCandidates(html) {
  const out = [];
  for (const table of String(html).matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const stats = {};
    for (const row of String(table[1]).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = parseCells(row[1]);
      if (cells.length < 2) continue;
      const key = classify(cells[0]);
      const value = num(cells[1]);
      if (key && value != null) stats[key] = value;
      // Some trackers render label/value/value tables in a single row.
      for (let i = 0; i < cells.length - 1; i += 1) {
        const k = classify(cells[i]);
        const v = num(cells[i + 1]);
        if (k && v != null) stats[k] = v;
      }
    }
    if (Object.keys(stats).length >= 3) out.push(stats);
  }
  return out;
}

function extractLabelValueText(text) {
  const source = String(text);
  const result = {};
  const labels = Object.entries(ALIASES);
  const labelPattern = labels.map(([key, patterns]) => [key, patterns[0].source]).length;
  // Deliberately use small local windows around labels to avoid confusing player cards with team totals.
  const loose = [
    ['matches', /(?:matches|games(?: played)?|partite(?: giocate)?|played)\s*[:\-]?\s*(\d{1,5})/gi],
    ['wins', /(?:wins?|won|vittorie)\s*[:\-]?\s*(\d{1,5})/gi],
    ['draws', /(?:draws?|ties?|pareggi?)\s*[:\-]?\s*(\d{1,5})/gi],
    ['losses', /(?:losses?|lost|sconfitte)\s*[:\-]?\s*(\d{1,5})/gi],
    ['goals', /(?:goals?\s*(?:for|scored|made)?|gol(?: fatti)?)\s*[:\-]?\s*(\d{1,5})/gi],
    ['against', /(?:goals?\s*(?:against|conceded|allowed)|against|gol subiti|subiti)\s*[:\-]?\s*(\d{1,5})/gi]
  ];
  for (const [key, rx] of loose) {
    const matches = [...source.matchAll(rx)].map(m => num(m[1])).filter(v => v != null);
    if (matches.length === 1) result[key] = matches[0];
  }
  return result;
}

function candidateScore(stats) {
  const required = ['matches', 'wins', 'draws', 'losses', 'goals', 'against'];
  const found = required.filter(k => stats[k] != null).length;
  let score = found * 10;
  if (stats.matches != null && stats.wins != null && stats.draws != null && stats.losses != null &&
      stats.wins + stats.draws + stats.losses === stats.matches) score += 25;
  if (stats.goals != null && stats.against != null) score += 5;
  return score;
}

function validateTotals(stats) {
  const required = ['matches', 'wins', 'draws', 'losses', 'goals', 'against'];
  const missing = required.filter(k => stats[k] == null);
  if (missing.length) return { ok: false, reason: `Dati mancanti: ${missing.join(', ')}` };
  if (Object.values(stats).some(v => !Number.isFinite(v) || v < 0)) return { ok: false, reason: 'Valori negativi/non numerici.' };
  if (stats.matches !== stats.wins + stats.draws + stats.losses) return { ok: false, reason: 'Vittorie + pareggi + sconfitte non coincidono con le partite.' };
  return { ok: true };
}

function extractEmbeddedObjects(html) {
  const objects = [];
  for (const m of String(html).matchAll(/<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { objects.push(JSON.parse(m[1])); } catch {}
  }
  const next = String(html).match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (next) { try { objects.push(JSON.parse(next[1])); } catch {} }
  return objects;
}

function collectObjectStats(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) collectObjectStats(item, out);
    return out;
  }
  const stats = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = classify(rawKey);
    const n = num(rawValue);
    if (key && n != null) stats[key] = n;
  }
  if (Object.keys(stats).length >= 3) out.push(stats);
  for (const child of Object.values(value)) collectObjectStats(child, out);
  return out;
}

function normalizeTrackerUrl(url) {
  let parsed;
  try { parsed = new URL(String(url || '').trim()); } catch {
    throw Object.assign(new Error('Link ProClubTracker non valido.'), { code: 'TRACKER_URL_INVALID' });
  }
  if (!['https:', 'http:'].includes(parsed.protocol) || !TRACKER_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw Object.assign(new Error('Usa un link della pagina club di proclubstracker.com.'), { code: 'TRACKER_HOST_NOT_ALLOWED' });
  }
  const match = parsed.pathname.match(/^\/club\/(\d+)\/?$/i);
  if (!match) {
    throw Object.assign(new Error('Il link deve essere quello di un club, ad esempio https://proclubstracker.com/club/328794?...'), { code: 'TRACKER_CLUB_URL_REQUIRED' });
  }
  return { parsed, clubId: match[1] };
}

async function fetchTrackerHtml(url) {
  const { parsed } = normalizeTrackerUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(parsed.href, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 (compatible; SisalFCCommandCenter/26.6)'
      }
    });
  } catch (error) {
    clearTimeout(timer);
    const message = error?.name === 'AbortError' ? 'ProClubTracker non ha risposto entro 15 secondi.' : (error?.message || 'Impossibile leggere ProClubTracker.');
    throw Object.assign(new Error(message), { code: 'TRACKER_FETCH_FAILED' });
  }
  clearTimeout(timer);
  try {
    const finalUrl = new URL(response.url || parsed.href);
    if (!TRACKER_HOSTS.has(finalUrl.hostname.toLowerCase())) {
      throw Object.assign(new Error('Il link ProClubTracker ha effettuato un redirect verso un dominio non consentito.'), { code: 'TRACKER_REDIRECT_NOT_ALLOWED' });
    }
  } catch (error) {
    if (error?.code) throw error;
  }
  if (!response.ok) throw Object.assign(new Error(`ProClubTracker ha restituito HTTP ${response.status}.`), { code: 'TRACKER_HTTP_ERROR' });
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('text/html') && !contentType.includes('application/json')) {
    throw Object.assign(new Error('La pagina ProClubTracker non è una pagina HTML/JSON leggibile.'), { code: 'TRACKER_CONTENT_TYPE_UNSUPPORTED' });
  }
  const text = await response.text();
  if (text.length > MAX_HTML) throw Object.assign(new Error('La pagina ProClubTracker è troppo grande per l’importazione automatica.'), { code: 'TRACKER_PAGE_TOO_LARGE' });
  return { html: text, finalUrl: response.url || parsed.href };
}

async function importTrackerTotals(url) {
  const { html, finalUrl } = await fetchTrackerHtml(url);
  const candidates = extractTableCandidates(html);
  candidates.push(extractLabelValueText(cleanText(html)));
  for (const object of extractEmbeddedObjects(html)) collectObjectStats(object, candidates);
  const valid = candidates.map(stats => ({ stats, check: validateTotals(stats), score: candidateScore(stats) }))
    .filter(x => x.check.ok)
    .sort((a, b) => b.score - a.score);
  if (!valid.length) {
    throw Object.assign(new Error('Ho letto la pagina ma non ho trovato una tabella totale con partite, vittorie, pareggi, sconfitte, gol fatti e gol subiti in un formato verificabile.'), { code: 'TRACKER_TOTALS_NOT_FOUND' });
  }
  const best = valid[0];
  if (valid.length > 1 && valid[1].score === best.score && JSON.stringify(valid[1].stats) !== JSON.stringify(best.stats)) {
    throw Object.assign(new Error('ProClubTracker contiene più blocchi statistici compatibili e non posso scegliere in modo sicuro quale sia il totale della squadra.'), { code: 'TRACKER_TOTALS_AMBIGUOUS', candidates: valid.slice(0, 3).map(x => x.stats) });
  }
  return {
    source: 'proclubtracker',
    url: finalUrl,
    importedAt: new Date().toISOString(),
    totals: best.stats,
    derived: {
      goalDifference: best.stats.goals - best.stats.against,
      winRate: best.stats.matches ? 100 * best.stats.wins / best.stats.matches : 0
    }
  };
}

export { importTrackerTotals, validateTotals, normalizeTrackerUrl };
