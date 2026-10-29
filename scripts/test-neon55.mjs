import {JSDOM} from 'jsdom';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const code=await fs.readFile('sisal-future.js','utf8'),sleep=()=>new Promise(r=>setTimeout(r,35));
async function environment({reduced=false,stored=null,support=true}={}){
 const dom=new JSDOM('<!doctype html><header class="topbar"></header><main id="content"><div class="card">Statistiche reali <b>132</b></div></main><div id="modalRoot"></div>',{url:'https://sisal.test',pretendToBeVisual:true,runScripts:'outside-only'}),w=dom.window,animations=[],io=[];let hidden=false,offscreen=false,reduction=reduced,callback;
 w.localStorage.setItem('sisal_visual_motion_v1','off');w.document.body.classList.add('sisal-ambient-paused');if(stored)w.localStorage.setItem('sisal_neon_motion_v2',stored);
 Object.defineProperty(w.document,'hidden',{get:()=>hidden});w.matchMedia=()=>({get matches(){return reduction},addEventListener(t,cb){callback=cb}});
 const box=()=>({width:300,height:200,top:offscreen?2000:30,bottom:offscreen?2200:230,left:20,right:320,x:20,y:30});w.HTMLElement.prototype.getBoundingClientRect=box;
 w.ResizeObserver=class{observe(){}unobserve(){}};w.IntersectionObserver=class{constructor(fn){io.push(fn);}observe(){}unobserve(){}};
 if(support)w.SVGElement.prototype.animate=function(frames,options){const a={playState:'running',currentTime:0,play(){this.playState='running'},pause(){this.playState='paused'},cancel(){this.playState='idle'}};animations.push({a,frames,options,node:this});return a;};
 let reads=0;w.fetch=()=>{reads++;throw Error('Neon must be local')};w.eval(code);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await sleep();
 const frame=w.document.querySelector('.sisal-edge-host'),button=w.document.querySelector('.sisal-motion-switch');return {dom,w,frame,button,animations,io,reads:()=>reads,visibility:async v=>{hidden=v;w.document.dispatchEvent(new w.Event('visibilitychange'));await sleep()},outside:async v=>{offscreen=v;w.SisalFuture.refresh();await sleep()},reduce:v=>{reduction=v;callback?.();}};
}
const normal=await environment();assert.equal(normal.frame.dataset.neonState,'running','old background OFF cannot freeze neon');assert.equal(normal.animations.length,4);assert(normal.animations.every(x=>x.a.playState==='running'));assert(normal.animations.every(x=>Number.parseFloat(x.frames[0].strokeDashoffset)-Number.parseFloat(x.frames[1].strokeDashoffset)===100),'one exact perimeter per cycle');
normal.button.click();assert.equal(normal.frame.dataset.neonState,'off');assert(normal.animations.every(x=>x.a.playState==='paused'));assert.equal(normal.w.localStorage.getItem('sisal_neon_motion_v2'),'off');normal.button.click();assert.equal(normal.frame.dataset.neonState,'running');
await normal.visibility(true);assert.equal(normal.frame.dataset.neonState,'hidden');assert(normal.animations.every(x=>x.a.playState==='paused'));await normal.visibility(false);assert.equal(normal.frame.dataset.neonState,'running');
await normal.outside(true);assert.equal(normal.frame.dataset.neonState,'outside');await normal.outside(false);assert.equal(normal.frame.dataset.neonState,'running');
const dialog=normal.w.document.createElement('dialog');dialog.setAttribute('open','');normal.w.document.body.append(dialog);await sleep();assert.equal(normal.frame.dataset.neonState,'covered');dialog.remove();await sleep();assert.equal(normal.frame.dataset.neonState,'running','closed dialog cannot leave permanent pause');
normal.w.SisalFuture.refresh();await sleep();assert.equal(normal.w.document.querySelectorAll('.sisal-motion-switch').length,1);assert.equal(normal.animations.length,4,'no duplicate timelines');assert.equal(normal.frame.textContent,'Statistiche reali 132');assert.equal(normal.reads(),0);
const a=await environment({reduced:true});assert.equal(a.frame.dataset.neonState,'reduced');assert(a.button.textContent.includes('ridotti'));a.button.click();assert.equal(a.frame.dataset.neonState,'running','explicit user choice is supported');
const off=await environment({stored:'off'});assert.equal(off.frame.dataset.neonState,'off','saved preference restored');
const unsupported=await environment({support:false});assert.equal(unsupported.frame.dataset.neonState,'unsupported');assert(unsupported.button.disabled);assert(unsupported.button.textContent.includes('statici'));
normal.w.document.querySelector('#content').replaceChildren();await sleep();assert(normal.animations.every(x=>x.a.playState==='idle'),'removed frames cancel their timelines');
for(const e of [normal,a,off,unsupported]){assert.equal(e.reads(),0);e.dom.window.close();}
console.log('PASS neon 55 (DOM + simulated browser animation API): old background preference isolated; exact loop distance; play/pause/persistence; hidden page/offscreen/modal resume; reduced motion; unsupported browser state; idempotence; disposal; data unchanged; zero API reads. Real movement checked separately in Chrome.');
