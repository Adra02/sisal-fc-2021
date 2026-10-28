import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {JSDOM,VirtualConsole} from 'jsdom';
import {buildTeam,resolveStoredTotals} from '../lib/data-pipeline.js';
const vc=new VirtualConsole(),errors=[];vc.on('jsdomError',e=>errors.push(e));
const html=await fs.readFile('index.html','utf8');
const dom=new JSDOM(html,{url:'https://sisal.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.sisalAccountReady=Promise.resolve();
w.SisalAccount={user:{id:'fixture',player_key:'alpha',display_name:'Alpha',is_admin:true},isEligible:()=>true};
const model={schemaVersion:3,own:'Sisal FC 2021',opponent:'Club Esempio',goals:3,against:1,date:'28/10/2026',competition:'league',title:'Tre punti e dignità recuperata',teamLine:'Tre reti contro Club Esempio. Per una sera il tabellone sorride alla Sisal.',stories:[{title:'IL REPARTO CHE SEGNA',text:'Alpha segna due reti. Il mirino, per una volta, ha fatto il suo mestiere.'},{title:'DIETRO SI RESPIRA',text:'Un solo gol subito: un bilancio dignitoso, senza bisogno di inventare miracoli.'}]};
w.SisalEditorial={edition:{id:'edition-fixture',model},bind(){},refreshPaper(){}};
let calls=0;w.fetch=()=>{calls++;throw Error('No live services in DOM test');};
const rec=raw=>({raw,parsed:raw}),clubId='328794',files={clubInfo:rec({clubId,name:'Sisal FC 2021'}),overallStats:rec([{clubId,gamesPlayed:132,wins:59,ties:12,losses:61,goals:301,goalsAgainst:325}]),players:rec({members:[{name:'Alpha',position:'ST',gamesPlayed:132,goals:122,assists:50},{name:'Beta',position:'CB',gamesPlayed:80,goals:4,assists:20}]}),league:rec([{matchId:'95476907420210',timestamp:1793180000,clubs:{[clubId]:{clubId,details:{name:'Sisal FC 2021'},goals:3},b:{clubId:'b',details:{name:'Club Esempio'},goals:1}},players:{[clubId]:{a:{playername:'Alpha',goals:2,rating:8},b:{playername:'Beta',goals:1,rating:7}}}}])};
const rawTeam=buildTeam({fileRecords:files,role:'own'}),team={...rawTeam,manualTotals:resolveStoredTotals(rawTeam,null)};
let source=await fs.readFile('index-inline.js','utf8');source=source.replace('\nboot();','\nwindow.__release53={set(t,tab){state.own=t;state.opponent=t;state.tab=tab;},html:pageHtmlForTab,render};');await w.eval(source);
const api=w.__release53,root=w.document.querySelector('#content');api.set(team,'team');root.innerHTML=api.html('team');
await w.eval('(async()=>{'+await fs.readFile('club-workspace.js','utf8')+'})()');
for(const isAdmin of [true,false]){
 w.SisalAccount.user.is_admin=isAdmin;api.set(team,'team');root.innerHTML=api.html('team');
 assert.equal(root.querySelectorAll('[data-generate-paper]').length,isAdmin?1:0);
 assert.equal(root.querySelectorAll('[data-refresh-paper]').length,isAdmin?1:0);
 assert(root.querySelector('.paper-front'));assert.equal(root.querySelector('.compact-total-table td').textContent,'132','real table values displayed immediately');assert.equal(root.querySelector('.sisal-paper-score strong').textContent,'3 – 1');
 assert.equal(root.querySelectorAll('.sisal-paper-stories section').length,2);assert(!root.querySelector('.paper-pagination,.studio-paper-gallery,[data-paper-page]'));
 assert(!root.querySelector('.paper-front').textContent.includes('95476907420210'));
 assert(!root.querySelector('.paper-front script'));assert(root.querySelector('[data-share-paper]'));
 api.set(team,'fun');root.innerHTML=api.html('fun');assert(!root.textContent.includes('GAZZETTA'));
}
// Legacy shared five-match editions are displayed as the latest match, without deleting records.
w.SisalEditorial.edition.model={schemaVersion:2,title:'Vecchia edizione',stories:[{title:'Prima partita',text:'Prima partita: il commento conservato e leggibile.',opponent:'Primo club',goals:2,against:0},{title:'Seconda partita',text:'Non deve apparire nella prima pagina.',opponent:'Secondo club',goals:0,against:4}]};
api.set(team,'team');root.innerHTML=api.html('team');assert(root.querySelector('.paper-front').textContent.includes('Primo club'));assert(!root.querySelector('.paper-front').textContent.includes('Secondo club'));
w.SisalEditorial.edition.model={...model,title:'<script>test</script>'};root.innerHTML=api.html('team');assert(!root.querySelector('.paper-front script'),'AI text escaped');
const logo=w.document.querySelector('.club-brand'),rail=w.document.querySelector('.cc-rail-brand');
for(const element of [logo,rail]){assert(element);assert.notEqual(element.tagName,'BUTTON');assert(!element.hasAttribute('tabindex'));assert(!element.hasAttribute('aria-haspopup'));element.click();element.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}
assert(!w.document.querySelector('.arena-dialog,.studio-dialog,.sisal-ritual'));assert.equal(calls,0);
for(const f of ['club-modern.css','account.css','comunicati.css']){const style=w.document.createElement('style');style.textContent=await fs.readFile(f,'utf8');w.document.head.append(style);assert(style.sheet?.cssRules.length>5,f+' parses');}
for(const f of ['api/account.js','api/club-data.js','api/editorial.js','lib/paper-job.js','lib/paper-auto.js','lib/editorial.js','editorial-ui.js','paper-interactions.js','jockey-model.js','studio-ui.js'])execFileSync(process.execPath,['--check',f]);
assert(!html.includes('club-experience'));assert.doesNotMatch(await fs.readFile('api/account.js','utf8'),/rpc\(['"]sisal_arena/);assert(!(await fs.readFile('sw.js','utf8')).includes('arena-'));
assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));dom.window.close();
console.log('PASS Club 53 DOM/source: passive logos, admin/member controls, original front-page format, legacy editions, escaped text, newspaper absent from Fun, CSS and module syntax. No browser geometry or live AI asserted.');
