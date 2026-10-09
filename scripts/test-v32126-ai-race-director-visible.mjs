import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const root=process.cwd();
const js=await fs.readFile(`${root}/index-inline.js`,'utf8');
const html=await fs.readFile(`${root}/index.html`,'utf8');
const sw=await fs.readFile(`${root}/sw.js`,'utf8');
const pkg=JSON.parse(await fs.readFile(`${root}/package.json`,'utf8'));
assert.equal(pkg.version,'32.1.26');
assert.match(js,/APP_VERSION='v32\.1\.26'/);
assert.match(html,/index-inline\.js\?v=32\.1\.26-ai-race-director-visible/);
assert.match(sw,/sisal-fc27-shell-v32\.1\.26-ai-race-director-visible/);
assert.match(js,/TOP3_RACE_DIRECTOR_KEY='fc27_top3_race_director_v4'/);
assert.match(js,/function raceDirectorHud\(/);
assert.match(js,/function raceSceneDecor\(/);
assert.match(js,/race-rain-layer/);
assert.match(js,/race-director-console/);
assert.match(html,/AI Race Director VISIBILE/);
assert.match(html,/race-sun-disc/);
assert.match(html,/race-moon-disc/);
assert.match(html,/race-floodlight/);
assert.match(html,/race-wet-sheen/);
assert.match(html,/race-director-hype/);
assert.match(html,/race-countdown span\.director-card/);
// Una sola richiesta Gemini nel normale callAI.
const callStart=js.indexOf('async function callAI(');
const callEnd=js.indexOf('async function loadSharedData',callStart);
const callBlock=js.slice(callStart,callEnd);
assert.equal((callBlock.match(/fetch\('\/api\/assistente'/g)||[]).length,1);
// Nessuna rete/Blob durante la gara.
const raceStart=js.indexOf('async function startTop3Race');
const raceEnd=js.indexOf('function setHeader',raceStart);
const raceBlock=js.slice(raceStart,raceEnd);
assert.ok(raceStart>=0&&raceEnd>raceStart);
assert.doesNotMatch(raceBlock,/fetch\s*\(|\/api\/|@vercel\/blob|readAllFiles|readRoleBundle/i);
// Differenze realmente marcate.
assert.match(js,/aggressive:\{strideMs:248,gaitPower:1\.23/);
assert.match(js,/controlled:\{strideMs:332,gaitPower:\.80/);
assert.match(js,/const paceBase=\{aggressive:9900,progressive:10450,controlled:11600,balanced:10800\}/);
assert.match(js,/cameraMode==='finish'\?\.215/);
assert.match(js,/cameraMode==='tracking'\?235/);
assert.match(js,/motionElapsed=\(raceVisual\.slowMotion&&f>\.90\)\?elapsed\*\.58:elapsed/);
assert.match(js,/race-director-drama/);
// La vecchia configurazione v3 viene riutilizzata localmente: non serve consumare IA di nuovo.
assert.match(js,/TOP3_RACE_DIRECTOR_V3_KEY/);
assert.match(js,/legacy-ai-profile-v3/);
console.log('test-v32126-ai-race-director-visible: OK · visual differences obvious · 0 Blob race · 1 existing Gemini request');
