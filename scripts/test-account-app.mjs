import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';
import {FACE_GROUPS,FACE_LABELS,FACE_DEFAULT} from '../jockey-options.js';
import {OPTIONS,DEFAULT,styleColors,validateStyle,nameKey} from '../horse-style.js';
const html=(await fs.readFile(new URL('../index.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Not implemented/.test(e.message))errors.push(e);});
const dom=new JSDOM(html,{url:'https://sisal.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window;
for(const file of ['sisal-pro.css','studio.css']){
 const css=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');assert.equal((css.match(/\/\*/g)||[]).length,(css.match(/\*\//g)||[]).length,file+': complete comments');
 const style=w.document.createElement('style');style.textContent=css;w.document.head.appendChild(style);assert(style.sheet?.cssRules.length>10,file+': stylesheet parses');
 const rules=[...style.sheet.cssRules];assert(rules.some(r=>r.media?.mediaText.includes('max-width')),file+': mobile rules parse');assert(rules.some(r=>r.media?.mediaText.includes('prefers-reduced-motion')),file+': reduced-motion rules parse');
}
Object.assign(w,{FACE_GROUPS,FACE_LABELS,FACE_DEFAULT,OPTIONS,DEFAULT,styleColors,validateStyle,nameKey,AbortSignal,Response,TextEncoder,TextDecoder});w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.HTMLElement.prototype.scrollIntoView=()=>{};
const user={id:'001',display_name:'AdraTheTrue02',player_key:'adrathetrue02',is_admin:true,is_owner:true,appearance:DEFAULT,appearance_revision:1};
let authenticated=false,teamCalls=0;
w.fetch=async url=>{if(url.includes('/api/account')){if(url.includes('directory'))return Response.json({hasOwner:true,login:[{key:user.player_key,name:user.display_name}],register:[]});if(url.includes('appearances'))return Response.json({styles:{}});return authenticated?Response.json({user}):Response.json({code:'UNAUTHORIZED',error:'Accedi'},{status:401});}if(url.includes('/api/club-data'))teamCalls++;return Response.json({ok:false,error:'Fixture: archivio temporaneamente non disponibile'},{status:503});};
w.eval(await fs.readFile(new URL('../account-boot.js',import.meta.url),'utf8'));
w.eval(await fs.readFile(new URL('../index-inline.js',import.meta.url),'utf8'));
const account=(await fs.readFile(new URL('../account.js',import.meta.url),'utf8')).replace(/^import .*\n/gm,'');
await w.eval('(async()=>{'+account+'})()');
assert.equal(teamCalls,0,'legacy app must not request data before authentication');
authenticated=true;w.document.querySelector('#ac-player').value=user.player_key;w.document.querySelector('#ac-password').value='Una password lunga';w.document.querySelector('#ac-access').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await new Promise(r=>setTimeout(r,200));assert(teamCalls>0,'legacy app starts after authentication');assert(w.document.querySelector('.ac-account-button'));assert(!w.document.querySelector('#ac-gate'));
for(const b of w.document.querySelectorAll('.bottomnav button')){b.click();await new Promise(r=>setTimeout(r,5));}
const news=(await fs.readFile(new URL('../comunicati.js',import.meta.url),'utf8')).replace(/^import .*\n/gm,'');w.exportNewspaper=async()=>{};await w.eval('(async()=>{'+news+'})()');assert(w.document.querySelector('#sisal-news'),'news module starts after login');
w.HTMLElement.prototype.scrollTo=()=>{};
w.eval(await fs.readFile(new URL('../sisal-pro.js',import.meta.url),'utf8'));
await w.eval('(async()=>{'+(await fs.readFile(new URL('../studio-ui.js',import.meta.url),'utf8')).replace('export async function openStudio','async function openStudio')+'})()');
const logo=w.document.querySelector('.club-brand');assert(logo?.querySelector('img'));logo.click();logo.querySelector('img').click();logo.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await new Promise(r=>setTimeout(r,40));
assert(!w.document.querySelector('.studio-crest,.sisal-ritual,.sisal-easter,.studio-dialog,.studio-door'),'logo has no popup or doorway');assert.equal(logo.getAttribute('role'),null);assert.equal(w.SisalPresentation,undefined);assert(w.SisalStudio?.open,'non-logo profile viewer stays available');
assert.equal(errors.length,0,errors.map(e=>e.stack).join('\n'));dom.window.close();
console.log('PASS: actual index.html, mobile/reduced-motion CSS, login gate, navigation, news and account panel; no logo viewer/ritual/door (JSDOM, unavailable-data fixture).');
