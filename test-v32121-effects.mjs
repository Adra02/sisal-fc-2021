import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root=process.cwd();
const js=await fs.readFile(`${root}/index-inline.js`,'utf8');
const html=await fs.readFile(`${root}/index.html`,'utf8');

assert.match(js,/const STADIUM_INTRO_KEY='fc27_stadium_intro_day_v1'/);
assert.match(js,/function showDailyStadiumIntro\(\)/);
assert.match(js,/jget\(STADIUM_INTRO_KEY,''\)===today/);
assert.match(js,/jset\(STADIUM_INTRO_KEY,today\)/);
assert.match(js,/const GOAL_EXPLOSION_THRESHOLD=6/);
assert.match(js,/function launchGoalExplosion\(target\)/);
assert.match(js,/data-goal-explosion/);
assert.match(html,/stadium-intro/);
assert.match(html,/goal-explosion-layer/);

const introStart=js.indexOf("const STADIUM_INTRO_KEY='fc27_stadium_intro_day_v1'");
const effectsEnd=js.indexOf('const pullRefreshState=',introStart);
assert.ok(introStart>=0&&effectsEnd>introStart);
const localEffects=js.slice(introStart,effectsEnd);

// Garanzia statica: nessuna API, nessun Blob e nessun fetch nei due effetti.
assert.doesNotMatch(localEffects,/fetch\s*\(|\/api\/|@vercel\/blob|readAllFiles|readRoleBundle|player-photo/i);

// Garanzia runtime: eseguiamo davvero intro + explosion SENZA definire fetch.
// Se in futuro una delle due provasse a contattare il server, questo test fallirebbe.
const storage=new Map();
const appended=[];
function classList(){const s=new Set();return{add(...x){x.forEach(v=>s.add(v))},remove(...x){x.forEach(v=>s.delete(v))},contains(v){return s.has(v)}}}
function element(){return{
  className:'',innerHTML:'',dataset:{},style:{setProperty(){}},classList:classList(),offsetWidth:10,
  setAttribute(){},remove(){this.removed=true},getBoundingClientRect(){return{left:10,top:20,width:80,height:30}}
}}
const document={
  body:{appendChild(node){appended.push(node)}},
  querySelector(){return null},
  querySelectorAll(){return[]},
  createElement(){return element()}
};
const ctx={
  console,document,
  window:{matchMedia(){return{matches:false}}},
  navigator:{vibrate(){}},
  requestAnimationFrame(fn){fn()},
  setTimeout(fn){fn();return 1},clearTimeout(){},
  Date,Math,Number,String,Boolean,Object,Array,Set,Map,JSON,
  num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d},
  jget(k,d){if(!storage.has(k))return d;return storage.get(k)},
  jset(k,v){storage.set(k,v);return true}
};
vm.createContext(ctx);
vm.runInContext(`${localEffects}\nthis.__fx={showDailyStadiumIntro,isGoalExplosionMatch,launchGoalExplosion};`,ctx);

assert.equal(ctx.__fx.isGoalExplosionMatch(4,2),true,'4-2 deve attivare Gol Explosion');
assert.equal(ctx.__fx.isGoalExplosionMatch(3,3),true,'3-3 deve attivare Gol Explosion');
assert.equal(ctx.__fx.isGoalExplosionMatch(2,1),false,'2-1 non deve attivare Gol Explosion');

const beforeIntro=appended.length;
assert.equal(ctx.__fx.showDailyStadiumIntro(),true,'prima apertura del giorno: intro attiva');
assert.equal(appended.length,beforeIntro+1,'intro deve creare un solo overlay');
assert.equal(ctx.__fx.showDailyStadiumIntro(),false,'seconda apertura dello stesso giorno: intro non riparte');
assert.equal(appended.length,beforeIntro+1,'nessun secondo overlay nello stesso giorno');

const target=element();
const beforeBoom=appended.length;
ctx.__fx.launchGoalExplosion(target);
assert.equal(appended.length,beforeBoom+1,'Gol Explosion deve creare il layer grafico locale');

console.log('test-v32121-effects: OK · intro 1/giorno · soglia 6 gol · 0 chiamate API/Blob');
