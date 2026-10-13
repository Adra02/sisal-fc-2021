import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root = process.cwd();
const html = await fs.readFile(`${root}/index.html`,'utf8');
const js = await fs.readFile(`${root}/index-inline.js`,'utf8');
const api = await fs.readFile(`${root}/api/club-data.js`,'utf8');
const sw = await fs.readFile(`${root}/sw.js`,'utf8');

assert.match(html,/assets\/sisal-branding\.png/);
assert.match(html,/index-inline\.js\?v=32\.1\.25-ai-race-director/);
assert.match(js,/APP_VERSION='v32\.1\.25'/);
assert.match(js,/Tecnica e difesa · ultime 5 partite/);
assert.match(js,/p\.recent5/);
assert.match(js,/Gol\/Tiri %/);
const techStart2=js.indexOf('const techRows=');
const techEnd2=js.indexOf('const profileRowsData=',techStart2);
assert.ok(techStart2>=0&&techEnd2>techStart2);
assert.doesNotMatch(js.slice(techStart2,techEnd2),/shotPct:p\.shotAccuracy/);
assert.match(js,/function profileScopeRows\(scope,mode/);
assert.match(js,/Presenze in lega/);
assert.doesNotMatch(js,/snapshotTrend|Evoluzione club nella memoria/);
assert.match(js,/Clean sheet/);
assert.match(js,/Partite playoff/);
assert.doesNotMatch(js,/Percentuale vittorie|Percentuale pareggi|Percentuale sconfitte|Percentuale imbattibilità|Percentuale clean sheet|Gol \/ partita|Gol subiti \/ partita|Punti \/ partita|Partite playoff %/);
assert.match(js,/data-pitch-slot/);
assert.match(js,/function openPitchSlotEditor/);
assert.doesNotMatch(js,/Storico codici recenti dell'export|lastMatch code|lastOpponent ID/);
assert.doesNotMatch(js,/Kit casa|Kit trasferta|Terzo kit|Kit portiere/);
assert.doesNotMatch(js,/kitPreview|kitId|customKitId|customAwayKitId|customThirdKitId|customKeeperKitId|kitColor1|kitAColor1|kitThrdColor1/i);
assert.match(api,/recentCodes/);
assert.match(sw,/sisal-fc27-shell-v32\.1\.25-ai-race-director/);
assert.match(sw,/index-inline\.js\?v=32\.1\.25-ai-race-director/);
assert.match(js,/showDailyStadiumIntro/);
assert.match(js,/GOAL_EXPLOSION_THRESHOLD=6/);
assert.match(js,/bindGoalExplosions/);
assert.match(js,/TOP3_RACE_DIRECTOR_KEY/);
assert.match(js,/viewBox=\"0 0 248 132\"/);
assert.match(js,/const base=10600\+Math\.floor\(Math\.random\(\)\*900\)/);
assert.match(js,/function animateHorseMotion\(/);
assert.match(js,/const closeFinish=Math\.random\(\)<\.27/);

// Manteniamo anche il controllo runtime storico: l'intero frontend deve potersi
// inizializzare in un DOM minimo senza lanciare eccezioni sincrone.
const elements = new Map();
function classList(){return{add(){},remove(){},toggle(){},contains(){return false}}}
function element(id=''){
  return {
    id,innerHTML:'',textContent:'',value:'',disabled:false,files:[],className:'',style:{setProperty(){}},dataset:{},
    classList:classList(),offsetWidth:1,appendChild(){},remove(){},setAttribute(){},addEventListener(){},click(){},focus(){},
    querySelector(){return null},querySelectorAll(){return[]},getBoundingClientRect(){return{left:0,top:0,width:10,height:10}}
  };
}
const document={
  body:element('body'),
  getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},
  querySelector(){return null},querySelectorAll(){return[]},createElement(){return element()}
};
const localStore=new Map();
const localStorage={getItem(k){return localStore.has(k)?localStore.get(k):null},setItem(k,v){localStore.set(k,String(v))},removeItem(k){localStore.delete(k)}};
const sessionStorage={getItem(){return null},setItem(){}};
const windowObj={addEventListener(){},scrollY:0,matchMedia(){return{matches:false}},location:{protocol:'http:',href:'http://localhost/'}};
const ctx={
  document,localStorage,sessionStorage,
  navigator:{serviceWorker:{register:async()=>({})},vibrate(){}},window:windowObj,
  location:windowObj.location,
  fetch:async()=>new Response(JSON.stringify({ok:false}),{status:503}),
  console,Intl,Date,Number,String,Boolean,Object,Array,Map,Set,Math,JSON,Error,Promise,Response,URL,
  encodeURIComponent,decodeURIComponent,setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(fn){fn()},
  confirm:()=>false,alert:()=>{}
};
windowObj.window=windowObj;
ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(js,ctx,{filename:'index-inline.js'});
console.log('test-v32.1-ui: OK · static + runtime bootstrap');
