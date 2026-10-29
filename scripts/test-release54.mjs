import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {JSDOM,VirtualConsole} from 'jsdom';
import {buildTeam,resolveStoredTotals} from '../lib/data-pipeline.js';
import {selectPortrait} from '../lib/paper-portrait.js';
import {validateEdition} from '../lib/editorial.js';
import {validateStyle} from '../horse-style.js';
const vc=new VirtualConsole(),errors=[];vc.on('jsdomError',e=>errors.push(e));
const html=await fs.readFile('index.html','utf8'),dom=new JSDOM(html,{url:'https://sisal.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
w.sisalAccountReady=Promise.resolve();w.SisalAccount={user:{id:'viewer',player_key:'viewer',display_name:'Viewer',is_admin:true},isEligible:()=>true};
const rec=raw=>({raw,parsed:raw}),clubId='328794',files={clubInfo:rec({clubId,name:'Sisal FC 2021'}),overallStats:rec([{clubId,gamesPlayed:132,wins:59,ties:12,losses:61,goals:301,goalsAgainst:325}]),players:rec({members:[{name:'Alpha',position:'ST',gamesPlayed:132,goals:122,assists:50},{name:'Beta',position:'CB',gamesPlayed:80,goals:4,assists:20}]}),league:rec([{matchId:'95476907420210',timestamp:1793180000,clubs:{[clubId]:{clubId,details:{name:'Sisal FC 2021'},goals:3},b:{clubId:'b',details:{name:'Club Esempio'},goals:1}},players:{[clubId]:{a:{playername:'Alpha',goals:2,rating:8},b:{playername:'Beta',goals:1,rating:7}}}}])};
const rawTeam=buildTeam({fileRecords:files,role:'own'}),team={...rawTeam,manualTotals:resolveStoredTotals(rawTeam,null)};
const facts=Array.from({length:5},(_,i)=>({id:'9547690742021'+i,timestamp:1793180000-i*3600,own:'Sisal FC 2021',opponent:'Club '+(i+1),goals:i,against:1,competition:'league',players:[{name:i%2?'Beta':'Alpha',rating:8.5,goals:1}]}));
const raw={title:'Cinque pagine di conti da regolare',teamLine:'Cinque partite e cinque avversari: la redazione registra soltanto fatti disponibili.',stories:facts.map((_,i)=>({ref:i+1,title:'La partita numero '+(i+1),text:'Una cronaca distinta per questo incontro. La redazione legge i dati della partita, senza inventare fatti o azioni.'}))};
const model=validateEdition(raw,facts);model.stories.forEach((s,i)=>s.portrait=selectPortrait(s,facts[i].players,{}));
const edition={id:'11111111-1111-4111-8111-111111111111',model};let editionForFetch=edition,reads=0,generations=0;
let notices={items:[{id:5,kind:'paper',target:edition.id,title:model.title,created_at:'2026-10-28T12:00:00Z',read:false}],unread:1,through:5};
w.AbortSignal=AbortSignal;w.fetch=async(input,opts={})=>{reads++;const url=new URL(input,'https://sisal.test'),p=opts.body?JSON.parse(opts.body):{},action=p.action||url.searchParams.get('action');
 if(action==='generate')generations++;
 if(['latest','edition','generate'].includes(action))return Response.json({ok:true,edition:editionForFetch,generation:{pending:false},existing:action==='generate'});
 if(action==='read'||action==='read_all')notices={...notices,unread:0,items:notices.items.map(n=>({...n,read:true}))};
 return Response.json(notices);
};
let source=await fs.readFile('index-inline.js','utf8');source=source.replace('\nboot();','\nwindow.__release54={set(t,tab){state.own=t;state.opponent=t;state.tab=tab;},html:pageHtmlForTab,render};');w.eval(source);
await w.eval('(async()=>{'+await fs.readFile('editorial-ui.js','utf8')+'})()');await new Promise(r=>setTimeout(r,30));
let interactions=await fs.readFile('paper-interactions.js','utf8');interactions=interactions.replace('export function bindInteractions','function bindInteractions')+'\nwindow.__bindPaper=bindInteractions;';w.eval(interactions);
const api=w.__release54,root=w.document.querySelector('#content');api.set(team,'team');root.innerHTML=api.html('team');
await w.eval('(async()=>{'+await fs.readFile('club-workspace.js','utf8')+'})()');
for(const tab of ['team','fun','players','opponent','ai','data','top','pitch','matches']){api.set(team,tab);root.innerHTML=api.html(tab);assert(!root.querySelector('.sisal-paper'),'newspaper has a single dedicated reader, not embedded in '+tab);}
api.set(team,'team');root.innerHTML=api.html('team');assert.equal(root.querySelector('.compact-total-table td').textContent,'132');
const launch=w.document.querySelector('.topbar .paper-launch');assert(launch);assert.equal(launch.getAttribute('aria-haspopup'),'dialog');launch.click();
const dialog=w.document.querySelector('.paper-dialog');assert(dialog.open);assert.equal(w.document.activeElement,dialog.querySelector('[data-close-paper]'));
w.__bindPaper(dialog);assert.equal(dialog.querySelectorAll('[data-paper-page]').length,5);assert.equal(dialog.querySelectorAll('[data-paper-page]:not([hidden])').length,1);assert.equal(dialog.querySelectorAll('[data-paper-portrait]').length,5);
assert.equal(dialog.querySelector('[data-paper-page="0"] .sisal-paper-score strong').textContent,'0 – 1');assert(!dialog.textContent.includes('95476907420210'),'IDs not exposed');
for(let i=0;i<5;i++){dialog.querySelector('[data-paper-to="'+i+'"]').click();assert.equal(dialog.querySelector('[data-paper-page]:not([hidden])').dataset.paperPage,String(i));assert.equal(dialog.querySelector('[data-paper-position]').textContent,`Partita ${i+1} di 5`);assert.equal(JSON.parse(dialog.querySelector('[data-paper-page]:not([hidden]) [data-paper-portrait]').dataset.paperPortrait).name,i%2?'Beta':'Alpha');}
assert(dialog.querySelector('[data-paper-next]').disabled);dialog.querySelector('[data-paper-prev]').click();assert.equal(dialog.querySelector('[data-paper-page]:not([hidden])').dataset.paperPage,'3');
dialog.querySelector('[data-close-paper]').click();assert(!dialog.open);launch.click();w.__bindPaper(dialog);assert.equal(dialog.querySelector('[data-paper-page]:not([hidden])').dataset.paperPage,'3','last page remembered for this account/edition');
for(const isAdmin of [false,true]){w.SisalAccount.user.is_admin=isAdmin;w.SisalEdition.open({refresh:false});assert.equal(dialog.querySelectorAll('[data-generate-paper]').length,isAdmin?1:0);assert.equal(dialog.querySelectorAll('[data-refresh-paper]').length,isAdmin?1:0);}
assert.equal(generations,0,'opening pages does not generate articles');
const before=w.SisalEditorial.edition.id;editionForFetch={id:'22222222-2222-4222-8222-222222222222',model:{...model,title:'Una notifica apre questa precisa edizione'}};
w.document.querySelector('.club-bell').click();await new Promise(r=>setTimeout(r,10));await w.document.querySelector('[data-event="5"]').onclick();assert(dialog.open);assert.equal(w.SisalEditorial.edition.id,editionForFetch.id);assert(dialog.textContent.includes(editionForFetch.model.title));
assert.equal(generations,0);assert.notEqual(before,w.SisalEditorial.edition.id);
const legacy2={...model,schemaVersion:2};assert.equal((w.SisalEdition.paperMarkup(legacy2).match(/data-paper-page=/g)||[]).length,5,'older five-page edition preserved');
assert(!w.SisalEdition.paperMarkup({...model,title:'<script>alert(1)</script>'}).includes('<script>'),'text escaped');
const fake={...facts[0],players:[{name:'Viewer',rating:5},{name:'Beta',rating:9},{name:'Alpha',rating:9,goals:2}]};const mvp=selectPortrait({},fake.players,{alpha:validateStyle({eyes:'blue',helmetVisible:'off'})});assert.equal(mvp.name,'Alpha');assert.equal(mvp.appearance.eyes,'blue');assert.deepEqual(mvp.tied,['Alpha','Beta']);
assert.equal(selectPortrait({},[{name:'No rating',rating:null}]),null);assert.equal(selectPortrait({},[{name:'Alpha',rating:9},{name:'Beta',rating:null}]).votesComplete,false);assert(selectPortrait({},[{name:'No account',rating:9}]).defaultAppearance);
assert.throws(()=>validateEdition({...raw,stories:raw.stories.slice(0,4)},facts),/INVALID/);assert.throws(()=>validateEdition({...raw,stories:raw.stories.map(s=>({...s,ref:1}))},facts),/INVALID/);assert.throws(()=>validateEdition({...raw,title:'Il mister è in copertina'},facts),/INVALID/);
for(const element of [w.document.querySelector('.club-brand'),w.document.querySelector('.cc-rail-brand')]){assert(element);assert.notEqual(element.tagName,'BUTTON');element.click();}
assert(!w.document.querySelector('.arena-dialog,.sisal-ritual'));
// Functional controller check with observer geometry simulated; visual geometry is checked in browser separately.
let observers=[];w.ResizeObserver=class{constructor(fn){observers.push(this);this.fn=fn;}observe(){}unobserve(){}};w.IntersectionObserver=class{constructor(fn){this.fn=fn;}observe(el){this.fn([{target:el,isIntersecting:true}]);}unobserve(){}};
api.set(team,'team');root.innerHTML=api.html('team');const textBefore=root.textContent,callsBefore=reads;w.eval(await fs.readFile('sisal-future.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,50));
assert(root.querySelector('.sisal-edge-light'));assert.equal(root.textContent,textBefore,'border effect cannot alter data labels or values');assert.equal(reads,callsBefore,'visual effect has no API reads');const count=root.querySelectorAll('.sisal-edge-light').length;w.SisalFuture.refresh();await new Promise(r=>setTimeout(r,40));assert.equal(root.querySelectorAll('.sisal-edge-light').length,count,'decorator idempotent');
assert.equal(root.querySelectorAll('td .sisal-edge-light,th .sisal-edge-light').length,0);for(const svg of root.querySelectorAll('.sisal-edge-light')){assert.equal(svg.getAttribute('aria-hidden'),'true');assert(svg.querySelector('.sisal-edge-energy'));}
for(const f of ['sisal-future.css','club-modern.css']){const style=w.document.createElement('style');style.textContent=await fs.readFile(f,'utf8');w.document.head.append(style);assert(style.sheet?.cssRules.length>5,f+' parses');}
for(const f of ['api/editorial.js','lib/paper-job.js','lib/paper-auto.js','lib/editorial.js','lib/paper-portrait.js','editorial-ui.js','paper-interactions.js','jockey-portrait.js','sisal-future.js','sisal-pro.js','index-inline.js'])execFileSync(process.execPath,['--check',f]);
assert(!(await fs.readFile('sw.js','utf8')).includes('arena-'));assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));await new Promise(r=>setTimeout(r,30));dom.window.close();
console.log('PASS Club 54 DOM: header reader; 5 pages, per-match scores/subjects, pagination and restore; admin/member controls; notification destination; no generation on read; legacy 5-page support; escaped text; MVP ties/default/missing ratings; local idempotent borders preserve data; CSS/module syntax. Observer geometry simulated.');
