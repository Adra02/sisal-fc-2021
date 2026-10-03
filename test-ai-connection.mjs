import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../api/assistente.js', import.meta.url), 'utf8');

assert.match(html, /function\s+hasClubData\s*\(/);
assert.match(html, /dataStatus:\{available,/);
assert.match(html, /function\s+getOwn\s*\(\).*preferredId=hasStateData\?/);

// Execute the critical browser-side helper in isolation: empty state must not leak the default club ID.
const getOwnMatch = html.match(/function getOwn\(\)\{([^{}]+)\}/);
assert.ok(getOwnMatch, 'getOwn helper not found');
const getOwnFactory = new Function('state','DEFAULT_OWN_ID','parseCachedBundle','num', `${getOwnMatch[0]}; return getOwn;`);
const emptyGetter = getOwnFactory({players:[],matches:[],ownMeta:null,ownClubId:'328794'}, '328794', (_p,_m,_meta,preferredId)=>({team:{id:preferredId},players:[],matches:[]}), (v)=>Number(v)||0);
const emptyOwn = emptyGetter();
assert.equal(emptyOwn.team.id, '', 'Empty state must not send the default Club ID to the IA');
const loadedGetter = getOwnFactory({players:[{clubId:'328794'}],matches:[],ownMeta:null,ownClubId:'328794'}, '328794', (_p,_m,_meta,preferredId)=>({team:{id:preferredId},players:[{name:'x'}],matches:[]}), (v)=>Number(v)||0);
const loadedOwn = loadedGetter();
assert.equal(loadedOwn.team.id, '328794');

assert.match(html, /if\(!hasClubData\(own\)\)\{await syncClub\('own'\)/);
assert.match(html, /body:JSON\.stringify\(\{question,mode,notes:state\.notes,team:compact\(own\),opponent:opp\?compact\(opp\):null/);
assert.match(api, /dataStatus/);
assert.match(api, /TEAM_DATA_UNAVAILABLE/);
assert.match(api, /if \(context\.team\?\.dataStatus\?\.available === false\)/);
const parseMatch = html.match(/function parseCachedBundle\(players,matches,meta,preferredId\)\{([\s\S]*?)\nfunction inferId/);
assert.ok(parseMatch, 'parseCachedBundle helper not found');
const parseCachedBundle = new Function('inferId','enrichPlayers','num', `${parseMatch[0].split('\nfunction inferId')[0]}; return parseCachedBundle;`)(()=>'ignored', (players)=>players, (v)=>Number(v)||0);
assert.equal(parseCachedBundle([],[],null,'328794').team.id, '');
assert.equal(fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8').includes("sisal-fc27-shell-v5"), true);
console.log('ai connection regression: OK — no-data safeguard, auto-sync and frontend/backend context contract present.');
