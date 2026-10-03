import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sync = fs.readFileSync(new URL('../api/club-ai-sync.js', import.meta.url), 'utf8');
const ai = fs.readFileSync(new URL('../api/assistente.js', import.meta.url), 'utf8');

assert.match(html, /function\s+hasClubData\s*\(/);
assert.match(html, /dataStatus:\{available,/);
assert.match(html, /await syncClub\('own'\)/);
assert.match(html, /function cacheDelete\(/);
assert.match(html, /cacheDelete\(kind,oldName\)/);
assert.match(html, /body:JSON\.stringify\(\{question,mode,notes:state\.notes,team:compact\(own\),opponent:opp\?compact\(opp\):null/);
assert.match(html, /Gemini 3\.5 Flash-Lite/);
assert.match(html, /Connessioni live con EA/);
assert.match(html, /Dati live dai server EA/);
assert.doesNotMatch(html, /Analisi con Groq|Non usa Gemini per rispondere/);
assert.doesNotMatch(sync, /GEMINI_MODEL|google_search|generativelanguage\.googleapis\.com|gemini-2\.5|GROQ/);
assert.match(sync, /proclubs\.ea\.com\/api\/fc/);
assert.match(ai, /const GEMINI_MODEL = 'gemini-3\.5-flash-lite'/);
assert.match(ai, /generateContent/);
assert.doesNotMatch(ai, /google_search|url_context|gemini-2\.5|GROQ/);

const getOwnMatch = html.match(/function getOwn\(\)\{([^{}]+)\}/);
assert.ok(getOwnMatch, 'getOwn helper not found');
const getOwnFactory = new Function('state','DEFAULT_OWN_ID','parseCachedBundle','num', `${getOwnMatch[0]}; return getOwn;`);
const emptyGetter = getOwnFactory({players:[],matches:[],ownMeta:null,ownClubId:'328794'}, '328794', (_p,_m,_meta,preferredId)=>({team:{id:preferredId},players:[],matches:[]}), (v)=>Number(v)||0);
assert.equal(emptyGetter().team.id, '');
console.log('ai connection regression: OK — direct EA data + Gemini 3.5 assistant contract present.');
