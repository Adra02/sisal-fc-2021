import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createCanvas,Path2D} from '@napi-rs/canvas';
import {JSDOM} from 'jsdom';
const source=await fs.readFile('sisal-future.js','utf8');
const functions=source.slice(source.indexOf(' const modulo='),source.indexOf(' function hiddenByParent(')).replace(/\n\n \/\/ Clockwise/, '\n\n // Clockwise');
const {perimeter,drawBorder}=Function('Path2D',functions+';return {perimeter,drawBorder};')(Path2D);
const curve=perimeter(480,280,[16,16,16,16]);
assert(Math.hypot(...curve.point(0).map((n,i)=>n-curve.point(curve.length)[i]))<1e-6,'closed path has no seam');
for(let d=0;d<curve.length;d+=1){const a=curve.point(d),b=curve.point(d+1);assert(Math.hypot(a[0]-b[0],a[1]-b[1])<1.01,'constant physical distance through every corner');}
const canvas=createCanvas(480,280),ctx=canvas.getContext('2d'),seen=[];
for(const phase of [0,.25,.5,.75]){
 drawBorder(ctx,480,280,16,phase,true,curve);const p=curve.point(phase*curve.length),pixel=ctx.getImageData(Math.floor(p[0]),Math.floor(p[1]),2,2).data;
 assert([...pixel].some((n,i)=>i%4===3&&n>160),'bright point traverses each side');
 assert.equal(ctx.getImageData(240,140,1,1).data[3],0,'never paints over data');seen.push(canvas.toBuffer('image/png'));
}
assert(seen.every((b,i)=>!seen[(i+1)%seen.length].equals(b)));
drawBorder(ctx,480,280,16,1,true,curve);assert(seen[0].equals(canvas.toBuffer('image/png')),'phase 0 and 1 identical: seamless loop');
drawBorder(ctx,480,280,16,0,false,curve);assert(ctx.getImageData(240,1,1,1).data[3]>0,'reduced motion retains a fine rim');

const dom=new JSDOM('<main id="content"><div class="card" id="total"><h3>Totale storico</h3><div class="scroll-x"><table><tr><td>150</td></tr></table></div></div><details><summary>Apri</summary><div class="rich-card" id="later">66</div></details><div class="card" id="tab" hidden><table><tr><td>69</td></tr></table></div></main>',{url:'https://sisal.test',pretendToBeVisual:true,runScripts:'outside-only'});
const w=dom.window;let reduced=false,hidden=false,requests=0;
w.Path2D=Path2D;w.matchMedia=()=>({get matches(){return reduced},addEventListener(){}});Object.defineProperty(w.document,'hidden',{get:()=>hidden});w.fetch=()=>requests++;
w.HTMLCanvasElement.prototype.getContext=function(){return this._ctx||(this._ctx=createCanvas(480,280).getContext('2d'));};
w.HTMLElement.prototype.getBoundingClientRect=function(){return {width:480,height:280,top:20,left:20,right:500,bottom:300};};
w.ResizeObserver=class{observe(){}unobserve(){}};w.IntersectionObserver=class{observe(){}unobserve(){}};
w.localStorage.setItem('sisal_visual_motion_v1','off');w.localStorage.setItem('sisal_neon_motion_v2','off');w.eval(source);
w.document.dispatchEvent(new w.Event('DOMContentLoaded'));const wait=()=>new Promise(r=>setTimeout(r,70));await wait();
const root=w.document.querySelector('#content'),total=w.document.querySelector('#total'),later=w.document.querySelector('#later'),tab=w.document.querySelector('#tab');
assert.equal(total.dataset.neonState,'running');assert.equal(total.querySelectorAll('.sisal-border-canvas').length,1);assert.equal(total.querySelector('.scroll-x .sisal-border-canvas'),null,'rim belongs to whole panel, outside horizontal scroller');
assert.equal(later.dataset.neonState,'outside');assert.equal(tab.dataset.neonState,'outside');
w.document.querySelector('details').open=true;tab.hidden=false;await wait();assert.equal(later.dataset.neonState,'running','closed drawer starts automatically');assert.equal(tab.dataset.neonState,'running','hidden tab starts automatically');
const old=total.querySelector('canvas');total.innerHTML='<h3>Totale storico</h3><table><tr><td>151</td></tr></table>';await wait();assert(!old.isConnected);assert.equal(total.querySelectorAll('canvas').length,1,'restores canvas removed by innerHTML');assert.equal(total.dataset.neonState,'running');assert.equal(total.querySelector('td').textContent,'151');
const standalone=w.document.createElement('div');standalone.className='scroll-x';standalone.innerHTML='<table><tr><td>42</td></tr></table>';root.append(standalone);await wait();assert(standalone.parentElement.classList.contains('sisal-edge-host'),'standalone table gets a non-scrolling perimeter');
const n=root.querySelectorAll('canvas').length;w.SisalFuture.refresh();await wait();assert.equal(root.querySelectorAll('canvas').length,n,'no duplicate rims');
const dialog=w.document.createElement('dialog');dialog.open=true;w.document.body.append(dialog);await wait();assert.equal(total.dataset.neonState,'covered');dialog.remove();await wait();assert.equal(total.dataset.neonState,'running');
hidden=true;w.document.dispatchEvent(new w.Event('visibilitychange'));await wait();assert.equal(total.dataset.neonState,'hidden');hidden=false;w.document.dispatchEvent(new w.Event('visibilitychange'));await wait();assert.equal(total.dataset.neonState,'running');
reduced=true;w.SisalFuture.refresh();await wait();assert.equal(total.dataset.neonState,'reduced');reduced=false;w.SisalFuture.refresh();await wait();
const before=root.querySelectorAll('canvas').length;tab.remove();await wait();assert.equal(root.querySelectorAll('canvas').length,before-1,'removed content releases renderer');
assert(!w.document.querySelector('.sisal-motion-switch'));assert.equal(requests,0);dom.window.close();
console.log('PASS neon58: closed constant-distance path, four-sided raster movement, transparent content, seamless loop, automatic start, whole-panel perimeter, lazy drawers/tabs, innerHTML repair, standalone scroll area, no duplicates, modal pause/resume, hidden/reduced motion, detached cleanup and zero requests. Geometry simulated; real browser QA separate.');
