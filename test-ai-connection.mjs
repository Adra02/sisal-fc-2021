import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scraper = fs.readFileSync(new URL('../api/scrape-stats.js', import.meta.url), 'utf8');
const ai = fs.readFileSync(new URL('../api/assistente.js', import.meta.url), 'utf8');

assert.match(html, /function\s+hasClubData\s*\(/);
assert.match(html, /await syncClub\('own'\)/);
assert.equal((html.match(/id="ownName"/g)||[]).length, 1);
assert.equal((html.match(/id="opName"/g)||[]).length, 1);
assert.equal((html.match(/id="ownPlatform"/g)||[]).length, 1);
assert.equal((html.match(/id="opPlatform"/g)||[]).length, 1);
assert.doesNotMatch(html, /linkField\(|id="ownStats"|id="ownFun"|id="ownPlayers"|id="ownMatches"|id="opStats"|id="opPlayers"|id="opMatches"/);
assert.match(html, /\/api\/scrape-stats/);
assert.doesNotMatch(html, /\/api\/club-ai-sync/);
assert.match(html, /Gemini 3\.5 Flash-Lite/);
assert.doesNotMatch(html, /Pro Clubs Tracker|PCT ONLY/);

for (const token of ['currentSeasonLeaderboard/search','clubs/info','clubs/overallStats','members/stats','members/career/stats','clubs/matches','friendlyMatch']) {
  assert.match(scraper, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(scraper, /puppeteer-core/);
assert.match(scraper, /@sparticuz\/chromium/);
assert.match(scraper, /page\.evaluate/);
assert.match(scraper, /page\.goto\(url/);
assert.doesNotMatch(scraper, /seasonId/);

assert.match(ai, /const GEMINI_MODEL = 'gemini-3\.5-flash-lite'/);
assert.doesNotMatch(ai, /gemini-2\.5|google_search|url_context|GROQ|Pro Clubs Tracker/);

console.log('AI/EA connection regression: OK');
