import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const code=await fs.readFile('sisal-future.js','utf8');
const {perimeter}=Function(code.slice(code.indexOf(' function perimeter('),code.indexOf(' function hiddenByParent('))+';return {perimeter};')();
const track=perimeter(394,244,[15,15,15,15],1.8);
assert.deepEqual(track.point(0),track.point(1),'closed loop has no endpoint jump');
for(let d=0;d<track.length;d++){const p=track.point(d/track.length),q=track.point((d+1)/track.length);assert(Math.hypot(p[0]-q[0],p[1]-q[1])<=1.001,'uniform distance through corners');}
function harness(initialReduced){
 const dom=new JSDOM('<main id="content"><div class="card" id="total" style="border:3px solid green;border-radius:18px;overflow:hidden"><h3>Totale storico</h3><div class="scroll-x"><table><tr><td>150</td></tr></table></div></div><details><summary>Apri</summary><div class="rich-card" id="later">66</div></details><div class="card" id="tab" hidden><table><tr><td>69</td></tr></table></div></main><div id="modalRoot"></div>',{url:'https://sisal.test',pretendToBeVisual:true,runScripts:'outside-only'}),w=dom.window;
 let now=0,id=0,reduced=initialReduced,hidden=false,requests=0,canvasCalls=0,nativeCalls=0;const queue=new Map();
 w.matchMedia=()=>({get matches(){return reduced},addEventListener(){}});Object.defineProperty(w.document,'hidden',{get:()=>hidden});w.fetch=()=>requests++;
 w.HTMLCanvasElement.prototype.getContext=()=>{canvasCalls++;throw Error('Canvas disabled');};
 for(const method of ['pauseAnimations','unpauseAnimations','getCurrentTime','setCurrentTime'])w.SVGElement.prototype[method]=()=>{nativeCalls++;throw Error('Native SVG clock disabled');};
 w.requestAnimationFrame=f=>{queue.set(++id,f);return id;};w.cancelAnimationFrame=i=>queue.delete(i);
 w.HTMLElement.prototype.getBoundingClientRect=function(){const top=this._top??20,width=this._width??400,height=this._height??250;return {width,height,top,left:20,right:20+width,bottom:top+height};};
 w.ResizeObserver=class{observe(){}unobserve(){}};w.IntersectionObserver=class{observe(){}unobserve(){}};
 w.localStorage.setItem('sisal_visual_motion_v1','off');w.localStorage.setItem('sisal_neon_motion_v2','off');w.eval(code);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const frame=async(ms=16)=>{now+=ms;const tasks=[...queue.values()];queue.clear();for(const task of tasks)task(now);await Promise.resolve();await Promise.resolve();};
 const settle=async()=>{await frame(0);await frame(0);};
 return {w,dom,queue,frame,settle,setReduced:v=>{reduced=v;w.SisalFuture.refresh();},setHidden:v=>{hidden=v;w.document.dispatchEvent(new w.Event('visibilitychange'));},counts:()=>({requests,canvasCalls,nativeCalls})};
}
const position=host=>host.querySelector('.sisal-neon-dot').getAttribute('transform').match(/-?\d+(?:\.\d+)?/g).map(Number);
async function raster(svg){const copy=svg.cloneNode(true),[,,width,height]=copy.getAttribute('viewBox').split(' ').map(Number);copy.removeAttribute('style');copy.setAttribute('width',width);copy.setAttribute('height',height);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');const bitmap=await loadImage(Buffer.from(copy.outerHTML)),c=createCanvas(width,height),ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);return {png:c.toBuffer('image/png'),center:ctx.getImageData(Math.floor(width/2),Math.floor(height/2),1,1).data[3]};}
const normal=harness(false),soft=harness(true);await normal.settle();await soft.settle();
let normalStart,softStart,softBefore;
for(const h of [normal,soft]){
 const total=h.w.document.querySelector('#total'),svg=total.querySelector(':scope>.sisal-border-svg');
 assert.equal(total.dataset.neonState,'running');assert.equal(total.dataset.neonEngine,'svg-clock');assert.equal(svg.style.position,'absolute');assert.equal(total.style.position,'relative');assert.equal(svg.style.pointerEvents,'none');assert.equal(svg.getAttribute('viewBox'),'0 0 394 244');assert.equal(total.querySelector('.scroll-x .sisal-border-svg'),null);
 assert(!svg.querySelector('animateMotion'),'no native SVG timeline can leave the light frozen');assert.equal(h.queue.size,1,'one shared frame request for the entire page');
 if(h===normal)normalStart=position(total);else {softStart=position(total);softBefore=await raster(svg);}
}
for(let i=0;i<90;i++){await normal.frame();await soft.frame();}
const normalHost=normal.w.document.querySelector('#total'),softHost=soft.w.document.querySelector('#total'),normalEnd=position(normalHost),softEnd=position(softHost);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
assert(distance(softStart,softEnd)>20,'reduced-motion preference must not freeze the requested perimeter light');assert(distance(normalStart,normalEnd)>distance(softStart,softEnd)*1.5,'reduced mode is slower');
const softAfter=await raster(softHost.querySelector('svg'));assert(!softBefore.png.equals(softAfter.png),'rendered pixels actually change, not just a running status');assert.equal(softBefore.center,0);assert.equal(softAfter.center,0,'table values stay unobscured');
assert.equal(softHost.dataset.neonMode,'soft');assert.equal(softHost.querySelector('g').getAttribute('opacity'),'0','reduced mode omits halo');
const {w}=soft,root=w.document.querySelector('#content'),later=w.document.querySelector('#later'),tab=w.document.querySelector('#tab');
assert.equal(later.dataset.neonState,'outside');assert.equal(tab.dataset.neonState,'outside');w.document.querySelector('details').open=true;tab.hidden=false;await soft.settle();assert.equal(later.dataset.neonState,'running');assert.equal(tab.dataset.neonState,'running');
const beforeDrawer=position(later);await soft.frame(50);assert(distance(beforeDrawer,position(later))>0,'newly opened panel moves');
const embedded=w.document.createElement('div');embedded.className='sr-host';root.append(embedded);await soft.settle();assert.equal(softHost.dataset.neonState,'running','embedded race does not cover all other panels');embedded.remove();await soft.settle();
const dialog=w.document.createElement('dialog');dialog.open=true;dialog.hidden=true;w.document.body.append(dialog);await soft.settle();assert.equal(softHost.dataset.neonState,'running','hidden dialog does not freeze visible page');dialog.hidden=false;await soft.settle();assert.equal(softHost.dataset.neonState,'covered');assert.equal(soft.queue.size,0,'no animation work behind a covering dialog');const paused=position(softHost);for(let i=0;i<10;i++)await soft.frame(1000);assert.deepEqual(position(softHost),paused);
dialog.remove();await soft.settle();assert.equal(softHost.dataset.neonState,'running');assert.deepEqual(position(softHost),paused,'resume keeps current location');await soft.frame(50);assert(distance(paused,position(softHost))>0);
soft.setHidden(true);await soft.settle();assert.equal(softHost.dataset.neonState,'hidden');assert.equal(soft.queue.size,0);soft.setHidden(false);await soft.settle();assert.equal(softHost.dataset.neonState,'running');
const previous=softHost.querySelector('svg');softHost.innerHTML='<h3>Totale storico</h3><table><tr><td>151</td></tr></table>';await soft.settle();assert(!previous.isConnected);assert.equal(softHost.querySelectorAll(':scope>.sisal-border-svg').length,1);assert.equal(softHost.querySelector('td').textContent,'151');const repaired=position(softHost);await soft.frame(50);assert(distance(repaired,position(softHost))>0,'recreated innerHTML resumes motion');
const count=root.querySelectorAll('.sisal-border-svg').length;w.SisalFuture.refresh();await soft.settle();assert.equal(root.querySelectorAll('.sisal-border-svg').length,count);assert.equal(soft.queue.size,1);
soft.setReduced(false);await soft.settle();assert.equal(softHost.dataset.neonMode,'normal');const afterPreference=position(softHost);await soft.frame(50);assert(distance(afterPreference,position(softHost))>0);
softHost.scrollTop=80;softHost.dispatchEvent(new w.Event('scroll'));await soft.settle();assert.equal(softHost.querySelector('svg').style.top,'80px');
softHost._width=320;w.SisalFuture.refresh();await soft.settle();assert(softHost.querySelector('svg').getAttribute('viewBox').startsWith('0 0 314 '));softHost._height=1200;soft.setReduced(true);await soft.settle();assert.equal(softHost.querySelectorAll('.sisal-neon-dot').length,4,'tall panels retain two lights even in soft mode');
const ids=[...root.querySelectorAll('.sisal-border-svg [id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
for(const h of [normal,soft]){assert.deepEqual(h.counts(),{requests:0,canvasCalls:0,nativeCalls:0});h.dom.window.close();h.queue.clear();}
console.log('PASS neon60: actual SVG transforms and raster pixels advance with reduced motion enabled, no Canvas/native SVG clock; one shared RAF; slower soft mode without halo; closed smooth path; dynamic panels, hidden dialogs, embedded races, pause/resume, background sleep, repair, resize, scroll anchoring and zero requests. Frame timing/geometry simulated; not a physical-device browser test.');
