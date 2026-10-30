import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';
// Actual document instead of the obsolete hand-written DOM stub.
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
const dom=new JSDOM(await fs.readFile('index.html','utf8'),{url:'https://sisal.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
w.matchMedia=()=>({matches:true,addEventListener(){}});w.scrollTo=()=>{};
w.sisalAccountReady=Promise.resolve();w.SisalAccount={user:{id:'fixture',player_key:'alpha',is_admin:true},isEligible:()=>true};
let requests=0,registered='';w.fetch=async url=>{if(String(url).includes('/api/club-data')){requests++;return Response.json({ok:false,error:'Fixture: archivio non disponibile'},{status:503});}return Response.json({});};
Object.defineProperty(w.navigator,'serviceWorker',{value:{register:async url=>{registered=url;return {};}}});
const ready=new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(Error('Dataset error view did not finish rendering')),2000);
 w.addEventListener('sisal-content-rendered',()=>{if(w.document.querySelector('#liveStatus').textContent.includes('Archivio centrale non disponibile')){clearTimeout(timeout);resolve();}});
});
await w.eval(await fs.readFile('index-inline.js','utf8'));await ready;
assert.equal(requests,1);assert(registered.includes('sw.js?v=club-57'));
assert(w.document.querySelector('#content').textContent.trim().length>0);
assert(w.document.querySelector('#liveStatus').textContent.includes('Archivio centrale non disponibile'));
for(const b of w.document.querySelectorAll('.bottomnav [data-tab]')){b.click();assert(w.document.querySelector('#content').textContent.trim().length>0,b.dataset.tab+' opens even without data');}
const install=new w.Event('beforeinstallprompt',{cancelable:true});w.dispatchEvent(install);assert(install.defaultPrevented,'install handler remains registered');
assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));dom.window.close();
console.log('PASS frontend runtime: actual HTML + JS in JSDOM, authenticated startup, one dataset read, unavailable-data state, nine sections, versioned SW and install handler. Not a visual/GPU test.');
