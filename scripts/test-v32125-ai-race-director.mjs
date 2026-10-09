import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root=process.cwd();
const js=await fs.readFile(`${root}/index-inline.js`,'utf8');
const html=await fs.readFile(`${root}/index.html`,'utf8');
const sw=await fs.readFile(`${root}/sw.js`,'utf8');
const shared=await fs.readFile(`${root}/lib/shared-store.js`,'utf8');
const pkg=JSON.parse(await fs.readFile(`${root}/package.json`,'utf8'));

assert.equal(pkg.version,'32.1.26');
assert.match(js,/APP_VERSION='v32\.1\.26'/);
assert.match(html,/index-inline\.js\?v=32\.1\.26-ai-race-director-visible/);
assert.match(sw,/sisal-fc27-shell-v32\.1\.26-ai-race-director-visible/);

// Una sola richiesta IA già esistente: il profilo RD viaggia nella stessa question.
assert.match(js,/function raceDirectorQuestion\(/);
assert.match(js,/\[\[RD:/);
assert.match(js,/function splitRaceDirectorAnswer\(/);
assert.match(js,/source:'ai-race-director'/);
assert.match(js,/rememberRaceVisualFromAI\(answer,parsed\.director\)/);
assert.match(js,/const outboundQuestion=raceDirectorQuestion\(q,normalizedMode\)/);

const callStart=js.indexOf('async function callAI(');
const callEnd=js.indexOf('async function loadSharedData',callStart);
const callBlock=js.slice(callStart,callEnd);
const assistantCalls=(callBlock.match(/fetch\('\/api\/assistente'/g)||[]).length;
assert.equal(assistantCalls,1,'callAI deve fare una sola richiesta /api/assistente');

// Race Director locale: nessun Blob/API durante gara e profilo in localStorage.
assert.match(js,/TOP3_RACE_DIRECTOR_KEY='fc27_top3_race_director_v4'/);
assert.match(js,/jset\(TOP3_RACE_DIRECTOR_KEY,profile\)/);
assert.match(js,/race-light-/);
assert.match(js,/race-camera-/);
assert.match(js,/race-pace-/);
assert.match(js,/race-crowd-/);
assert.match(js,/race-director-badge/);
assert.match(html,/V32\.1\.26 · AI Race Director VISIBILE/);
assert.match(html,/race-light-sunset/);
assert.match(html,/race-light-stadium/);
assert.match(html,/race-camera-low/);
assert.match(html,/race-camera-tracking/);

const raceStart=js.indexOf('async function startTop3Race');
const raceEnd=js.indexOf('function setHeader',raceStart);
const raceBlock=js.slice(raceStart,raceEnd);
assert.ok(raceStart>=0&&raceEnd>raceStart);
assert.doesNotMatch(raceBlock,/fetch\s*\(|\/api\/|@vercel\/blob|readAllFiles|readRoleBundle/i);

// L'IA controlla davvero parametri visivi/articolazioni.
assert.match(js,/jockeyLean/);
assert.match(js,/legReach/);
assert.match(js,/bodyLift/);
assert.match(js,/cameraEnergy/);
assert.match(js,/race-camera-y/);
assert.match(js,/race-director-slowmo/);

// Replay prima del WINNER: niente revealWinner al primo arrivo.
assert.doesNotMatch(raceBlock,/item\.place===1[^\n]*revealWinner\(\)/);
const replayAt=raceBlock.indexOf('await playRaceReplay');
const winnerAt=raceBlock.indexOf('await revealWinner()',replayAt);
assert.ok(replayAt>=0&&winnerAt>replayAt,'il replay deve avvenire prima del WINNER');

// Photo finish ancora realmente raggiungibile.
assert.match(js,/const closeChance=\{photo:\.62,slow:\.38,cinematic:\.30,clean:\.16\}/);
assert.match(js,/const secondGap=closeFinish\?\(105\+Math\.floor\(Math\.random\(\)\*95\)\)/);
assert.match(js,/const photoFinish=secondGap<=220/);

// Blob Saver V2 resta invariato e non viene usato dal Race Director.
assert.match(shared,/team-bundle-v1\.json/);
assert.match(shared,/useCache: !fresh/);
assert.doesNotMatch(shared,/useCache: false/);

// Runtime del parser RD e mapping profilo (estratto dal file, con dipendenze minime).
const blockStart=js.indexOf("const TOP3_RACE_DIRECTOR_KEY=");
const blockEnd=js.indexOf('function horseSvg',blockStart);
const block=js.slice(blockStart,blockEnd);
const localStore=new Map();
const factory=new Function('hashText','num','jset','jget',`${block}; return {splitRaceDirectorAnswer,raceDirectorProfileFromSpec,rememberRaceVisualFromAI,currentRaceVisualProfile,raceDirectorQuestion};`);
const hashText=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const jset=(k,v)=>{localStore.set(k,JSON.parse(JSON.stringify(v)));return true};
const jget=(k,d=null)=>localStore.has(k)?JSON.parse(JSON.stringify(localStore.get(k))):d;
const rd=factory(hashText,num,jset,jget);
const raw='Analisi normale.\n[[RD:{"m":"dramatic","c":"tracking","l":"sunset","w":"wet","p":"progressive","f":"slow","cr":"high"}]]';
const parsed=rd.splitRaceDirectorAnswer(raw);
assert.equal(parsed.answer,'Analisi normale.');
assert.equal(parsed.director.camera,'tracking');
assert.equal(parsed.director.lighting,'sunset');
const profile=rd.raceDirectorProfileFromSpec(parsed.director,parsed.answer);
assert.equal(profile.source,'ai-race-director');
assert.equal(profile.weather,'wet');
assert.equal(profile.slowMotion,true);
assert.ok(profile.legReach>1);
rd.rememberRaceVisualFromAI(parsed.answer,parsed.director);
const stored=rd.currentRaceVisualProfile();
assert.equal(stored.camera,'tracking');
assert.equal(stored.crowd,'high');
const outbound=rd.raceDirectorQuestion('Analizza la squadra','normal');
assert.match(outbound,/\[\[RD:/);
assert.equal(rd.raceDirectorQuestion('Audit','audit'),'Audit');

console.log('test-v32125-ai-race-director: OK · same Gemini request · local profile · 0 Blob race');
