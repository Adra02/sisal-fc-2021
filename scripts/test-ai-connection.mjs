import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sync = fs.readFileSync(new URL('../api/club-ai-sync.js', import.meta.url), 'utf8');
const ai = fs.readFileSync(new URL('../api/assistente.js', import.meta.url), 'utf8');
const links = fs.readFileSync(new URL('../lib/pct-links.js', import.meta.url), 'utf8');

assert.match(html, /function\s+hasClubData\s*\(/);
assert.match(html, /dataStatus:\{available,/);
assert.match(html, /await syncClub\('own'\)/);
for (const id of ['ownStats','ownFun','ownPlayers','ownMatches','opStats','opPlayers','opMatches']) assert.ok(html.includes(`linkField('${id}'`), `manca ${id}`);
assert.doesNotMatch(html, /id="ownName"|id="opName"/);
assert.match(html, /function cacheDelete\(/);
assert.match(html, /cacheDelete\(kind,links\)/);
assert.match(html, /body:JSON\.stringify\(\{question,mode,notes:state\.notes,team:compact\(own\),opponent:opp\?compact\(opp\):null/);
assert.match(html, /Gemini 3\.5 Flash-Lite/);
assert.doesNotMatch(html, /Connessioni live con EA/);
assert.doesNotMatch(html, /Dati live dai server EA/);
assert.match(html, /Collegamento diretto con Pro Clubs Tracker/);
assert.match(html, /Nessuna API EA nel codice/);
assert.doesNotMatch(html, /Analisi con Groq|Non usa Gemini per rispondere/);
assert.doesNotMatch(sync, /GEMINI_MODEL|google_search|generativelanguage\.googleapis\.com|gemini-2\.5|GROQ|proclubs\.ea\.com/);
assert.match(ai, /const GEMINI_MODEL = 'gemini-3\.5-flash-lite'/);
assert.match(ai, /generateContent/);
assert.doesNotMatch(ai, /google_search|url_context|gemini-2\.5|GROQ/);

const getOwnMatch = html.match(/function getOwn\(\)\{([^{}]+)\}/);
assert.ok(getOwnMatch, 'getOwn helper not found');
const getOwnFactory = new Function('state','DEFAULT_OWN_ID','parseCachedBundle','num', `${getOwnMatch[0]}; return getOwn;`);
const emptyGetter = getOwnFactory({players:[],matches:[],ownMeta:null,ownClubId:'328794'}, '328794', (_p,_m,_meta,preferredId)=>({team:{id:preferredId},players:[],matches:[]}), (v)=>Number(v)||0);
assert.equal(emptyGetter().team.id, '');
assert.match(sync, /normalizePCTLinks/); assert.match(links, /proclubstracker\.com/); assert.match(links, /REQUIRED_OWN/); assert.match(links, /REQUIRED_OPP/);

console.log('ai connection regression: OK — PCT links only + Gemini 3.5 assistant contract present.');
