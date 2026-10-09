import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const must=[
  'index.html','index-inline.js','sw.js','manifest.webmanifest','package.json','env.example',
  'api/assistente.js','api/club-data.js','api/health.js','api/player-photo.js',
  'lib/data-pipeline.js','lib/shared-store.js','lib/file-ai-recognizer.js','lib/proclubs-schema.js','lib/tracker-import.js',
  'scripts/test-formation.mjs','scripts/test-v321-metrics.mjs','scripts/test-v3212-profiles.mjs','scripts/test-v3213-profile-ai.mjs','scripts/test-v3215-recent-tech.mjs','scripts/test-v32121-effects.mjs','scripts/test-v32122-race.mjs'
];
for(const f of must)await fs.access(path.join(root,f));

const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
assert.equal(pkg.version,'32.1.22');
assert.equal(pkg.engines.node,'24.x');
assert.ok(pkg.dependencies['@vercel/blob']);
assert.equal(Boolean(pkg.dependencies.puppeteer),false);
assert.equal(Boolean(pkg.dependencies['puppeteer-core']),false);

const html=await fs.readFile(path.join(root,'index.html'),'utf8');
const js=await fs.readFile(path.join(root,'index-inline.js'),'utf8');
const sw=await fs.readFile(path.join(root,'sw.js'),'utf8');
const api=await fs.readFile(path.join(root,'api/club-data.js'),'utf8');
const assistant=await fs.readFile(path.join(root,'api/assistente.js'),'utf8');
const shared=await fs.readFile(path.join(root,'lib/shared-store.js'),'utf8');
const photo=await fs.readFile(path.join(root,'api/player-photo.js'),'utf8');

assert.match(html,/index-inline\.js\?v=32\.1\.22-race-ai-polish/);
assert.match(js,/APP_VERSION='v32\.1\.22'/);
assert.match(sw,/sisal-fc27-shell-v32\.1\.22-race-ai-polish/);
assert.match(sw,/index-inline\.js\?v=32\.1\.22-race-ai-polish/);

for(const text of ['Dati totali','Stagione corrente','Overall Stats','Giocatori','Carriera giocatori','Campionato','Playoff','Amichevoli','Playoff Achievements','OVR','Profilo Pro','Informazioni club','/api/club-data','DATA_FILES']) {
  assert.match(js,new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
}
assert.match(js,/function profileScopeRows\(scope,mode/);
assert.match(js,/Clean sheet/);
assert.match(js,/Partite playoff/);
assert.match(js,/Tecnica e difesa · ultime 5 partite/);
assert.match(js,/p\.recent5/);
assert.match(js,/Gol\/Tiri %/);
assert.match(js,/Quando un giocatore non compare nelle U5 viene mostrato “—”, non “0”/);
assert.match(js,/data-pitch-slot/);
assert.match(js,/function showDailyStadiumIntro\(\)/);
assert.match(js,/GOAL_EXPLOSION_THRESHOLD=6/);
assert.match(js,/function launchGoalExplosion\(target\)/);
assert.match(js,/function initPullRefresh\(\)/);
assert.match(js,/launchWinnerConfetti/);

assert.doesNotMatch(js,/proclubs\.ea\.com|GROQ|puppeteer|DATA_ADMIN_PIN|x-admin-pin|sessionStorage\.getItem\('fc27_data_admin_pin'\)/i);
assert.doesNotMatch(js,/Ultime 10|U10|Formazione \+ ruoli consigliati dall’IA|data-edit-totals|data-save-and-import-tracker|trackerUrl_/i);
assert.doesNotMatch(js,/Storico codici recenti dell'export|lastMatch code|lastOpponent ID|snapshotTrend|Evoluzione club nella memoria|Kit casa|Kit trasferta|Terzo kit|Kit portiere|kitPreview|customKitId|customAwayKitId|customThirdKitId|customKeeperKitId|kitColor1|kitAColor1|kitThrdColor1/i);
const sharedLoadStart=js.indexOf('async function loadSharedData()');
const sharedLoadEnd=js.indexOf('async function loadKnowledge',sharedLoadStart);
assert.ok(sharedLoadStart>=0&&sharedLoadEnd>sharedLoadStart);
assert.doesNotMatch(js.slice(sharedLoadStart,sharedLoadEnd),/setInterval\s*\(|setTimeout\s*\([^;]*loadSharedData|loadSharedData\s*\)/s);
assert.doesNotMatch(js,/setInterval\s*\([^;]*loadSharedData|setTimeout\s*\([^;]*loadSharedData/s);

assert.match(api,/recentCodes/);
assert.match(api,/readAllFiles/);
assert.match(api,/recognizeDataFile/);
assert.match(api,/extractHistoricalTotals/);
assert.match(api,/repairMissingClubProfiles|profileFields/);
assert.match(assistant,/teamProfile/);
assert.match(assistant,/sourceFields/);
assert.match(assistant,/career: p\.career/);
assert.match(assistant,/proHeight/);
assert.match(await fs.readFile(path.join(root,'lib/file-ai-recognizer.js'),'utf8'),/parseProfileFields|profileFields/);

// Blob Saver: cache normale attiva, fresh solo quando esplicitamente richiesto.
assert.match(shared,/BUNDLE_PATH/);
assert.match(shared,/team-bundle-v1\.json/);
assert.match(shared,/useCache: !fresh/);
assert.doesNotMatch(shared,/useCache: false/);
assert.match(photo,/useCache: true/);

// I due effetti V32.1.21 devono restare puramente locali.
const introStart=js.indexOf('function showDailyStadiumIntro()');
const introEnd=js.indexOf('function isGoalExplosionMatch',introStart);
const boomStart=js.indexOf('function launchGoalExplosion(target)');
const boomEnd=js.indexOf('function bindGoalExplosions',boomStart);
assert.ok(introStart>=0&&introEnd>introStart&&boomStart>=0&&boomEnd>boomStart);
assert.doesNotMatch(js.slice(introStart,introEnd)+js.slice(boomStart,boomEnd),/fetch\s*\(|\/api\/|Blob|readAllFiles|readRoleBundle/i);

// V32.1.22: l'AI race polish riusa solo risposte IA già richieste dall'utente.
assert.match(js,/TOP3_RACE_VISUAL_KEY/);
assert.match(js,/rememberRaceVisualFromAI/);
assert.match(js,/\['normal','opponent','formation'\]\.includes\(normalizedMode\)\)rememberRaceVisualFromAI\(answer\)/);
assert.match(js,/const base=9600\+Math\.floor\(Math\.random\(\)\*700\)/);
assert.match(js,/viewBox="0 0 240 126"/);
const raceStart=js.indexOf('async function startTop3Race');
const raceEnd=js.indexOf('function setHeader',raceStart);
assert.ok(raceStart>=0&&raceEnd>raceStart);
assert.doesNotMatch(js.slice(raceStart,raceEnd),/fetch\s*\(|\/api\/|Blob|readAllFiles|readRoleBundle/i);
console.log('verify-project: OK · V32.1.22');
