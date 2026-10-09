import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root=process.cwd();
const js=await fs.readFile(`${root}/index-inline.js`,'utf8');
const html=await fs.readFile(`${root}/index.html`,'utf8');
const sw=await fs.readFile(`${root}/sw.js`,'utf8');

assert.match(js,/APP_VERSION='v32\.1\.22'/);
assert.match(html,/index-inline\.js\?v=32\.1\.22-race-ai-polish/);
assert.match(sw,/sisal-fc27-shell-v32\.1\.22-race-ai-polish/);
assert.match(js,/const TOP3_RACE_VISUAL_KEY='fc27_top3_race_visual_v1'/);
assert.match(js,/source:'ai-existing-analysis'/);
assert.match(js,/rememberRaceVisualFromAI\(answer\)/);
assert.match(js,/currentRaceVisualProfile\(\)/);
assert.match(js,/raceVisualVars\(visual\)/);
assert.match(js,/horseSvg\(colors\[laneIndex\],visual\.variant\)/);
assert.match(js,/viewBox="0 0 240 126"/);
assert.match(html,/hoof-dust/);
assert.match(html,/race-track-lights/);
assert.match(html,/horseGallopV322/);

// La gara dura di più, ma l'ordine finale resta legato al vero ranking.
assert.match(js,/const base=9600\+Math\.floor\(Math\.random\(\)\*700\)/);
assert.match(js,/2:base\+650\+Math\.floor\(Math\.random\(\)\*300\)/);
assert.match(js,/3:base\+1300\+Math\.floor\(Math\.random\(\)\*420\)/);
assert.match(js,/data-race-place="\$\{entry\.place\}"/);

// Nessuna IA aggiuntiva per la corsa: il profilo nasce dalla risposta della stessa
// chiamata /api/assistente già richiesta dall'utente per tattiche/analisi.
assert.doesNotMatch(js,/\/api\/race-ai|\/api\/horse|generateRace/i);
const callStart=js.indexOf('async function callAI(');
const bindStart=js.indexOf('function bind()',callStart);
assert.ok(callStart>=0&&bindStart>callStart);
const callBlock=js.slice(callStart,bindStart);
assert.equal((callBlock.match(/fetch\('\/api\/assistente'/g)||[]).length,1,'callAI deve avere una sola richiesta IA');

// La corsa in sé deve essere totalmente locale: 0 API / 0 Blob.
const raceStart=js.indexOf('async function startTop3Race');
const raceEnd=js.indexOf('function setHeader',raceStart);
assert.ok(raceStart>=0&&raceEnd>raceStart);
const raceBlock=js.slice(raceStart,raceEnd);
assert.doesNotMatch(raceBlock,/fetch\s*\(|\/api\/|@vercel\/blob|readAllFiles|readRoleBundle/i);


// Test runtime del profilo grafico: nessuna rete, solo memoria locale.
const visualStart=js.indexOf("const TOP3_RACE_VISUAL_KEY='fc27_top3_race_visual_v1'");
const visualEnd=js.indexOf('function top3Rankings(t){',visualStart);
assert.ok(visualStart>=0&&visualEnd>visualStart);
const visualBlock=js.slice(visualStart,visualEnd);
const mem=new Map();
const hashText=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const jget=(k,d)=>mem.has(k)?mem.get(k):d;
const jset=(k,v)=>{mem.set(k,v);return true};
const esc=v=>String(v??'');
const visualFactory=new Function('hashText','num','jget','jset','esc',`${visualBlock};return {raceVisualProfileFromAI,rememberRaceVisualFromAI,currentRaceVisualProfile,raceVisualVars,horseSvg};`);
const vf=visualFactory(hashText,num,jget,jset,esc);
assert.equal(vf.currentRaceVisualProfile().source,'local');
assert.equal(vf.rememberRaceVisualFromAI('Analisi tattica completa della squadra con pressione alta e transizioni rapide.'),true);
const aiProfile=vf.currentRaceVisualProfile();
assert.equal(aiProfile.source,'ai-existing-analysis');
assert.ok(aiProfile.strideMs>=280&&aiProfile.strideMs<=330);
assert.match(vf.raceVisualVars(aiProfile),/--race-stride:\d+ms/);
const horse=vf.horseSvg('#20f26f',aiProfile.variant);
assert.match(horse,/horse-neck-head/);
assert.match(horse,/horse-back-leg/);
assert.match(horse,/horse-front-leg/);
assert.match(horse,/horse-jockey/);
assert.match(horse,/viewBox="0 0 240 126"/);

console.log('test-v32122-race: OK · cavalli premium · gara più lunga · AI riusata · 0 Blob extra');
