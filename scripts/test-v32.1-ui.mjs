import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root = process.cwd();
const html = await fs.readFile(`${root}/index.html`,'utf8');
const js = await fs.readFile(`${root}/index-inline.js`,'utf8');
const api = await fs.readFile(`${root}/api/club-data.js`,'utf8');
const sw = await fs.readFile(`${root}/sw.js`,'utf8');

assert.match(html,/assets\/sisal-branding\.png/);
assert.match(html,/index-inline\.js\?v=32\.1\.5-panels/);
assert.match(js,/APP_VERSION='v32.1.5'/);
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
assert.match(sw,/sisal-fc27-shell-v32.1.5-panels/);
assert.match(sw,/index-inline\.js\?v=32\.1\.5-panels/);

const elements = new Map();
function element(id=''){return {id,innerHTML:'',textContent:'',value:'',disabled:false,files:[],className:'',style:{},dataset:{},addEventListener(){},click(){},focus(){}}}
const document={getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},querySelectorAll(){return[]},createElement(){return element()}};
const ctx={document,localStorage:{getItem(){return null},setItem(){}},sessionStorage:{getItem(){return null}},navigator:{serviceWorker:{register:async()=>({})}},window:{addEventListener(){}},location:{protocol:'http:',href:'http://localhost/'},fetch:async()=>new Response(JSON.stringify({ok:false}),{status:503}),console,Intl,Date,Number,String,Boolean,Object,Array,Map,Set,Math,JSON,Error,Promise,encodeURIComponent,decodeURIComponent,URL,setTimeout,clearTimeout,confirm:()=>false,alert:()=>{}};
ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(js,ctx,{filename:'index-inline.js'});
console.log('test-v32.1-ui: OK');
