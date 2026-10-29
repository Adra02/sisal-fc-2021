/* Local SVG perimeter light. Does not read, animate or request any football data. */
(() => {
 'use strict';
 const ns='http://www.w3.org/2000/svg',tracked=new Map();let scheduled=false,serial=0;
 const resize='ResizeObserver' in window?new ResizeObserver(items=>{for(const item of items)geometry(item.target);}):null;
 const visible='IntersectionObserver' in window?new IntersectionObserver(items=>{for(const item of items)item.target.classList.toggle('sisal-edge-visible',item.isIntersecting);},{rootMargin:'12px'}):null;
 function geometry(frame){
  const info=tracked.get(frame);if(!info)return;
  const {width,height}=frame.getBoundingClientRect();if(width<4||height<4)return;
  const radius=Math.max(2,parseFloat(getComputedStyle(frame).borderTopLeftRadius)||12);
  info.svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  for(const r of info.svg.children){r.setAttribute('x','1');r.setAttribute('y','1');r.setAttribute('width',String(width-2));r.setAttribute('height',String(height-2));r.setAttribute('rx',String(Math.min(radius,width/2,height/2)));}
 }
 function attach(target,table=false){
  if(target.classList.contains('sisal-edge-host')||target.closest('.sisal-edge-frame'))return;
  let frame=target;
  if(table){frame=document.createElement('div');frame.className='sisal-edge-frame';target.before(frame);frame.append(target);}
  frame.classList.add('sisal-edge-host');
  const svg=document.createElementNS(ns,'svg');svg.classList.add('sisal-edge-light');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('preserveAspectRatio','none');
  // Each short segment ends at the bright point. Increasing opacity forms a fading trail.
  for(const [name,length,start] of [['trace',100,0],['tail',11,0],['trail',6,-5],['crest',2,-9],['point',.1,-10.9]]){
   const r=document.createElementNS(ns,'rect');r.classList.add('sisal-edge-'+name);r.setAttribute('pathLength','100');r.setAttribute('fill','none');r.setAttribute('stroke-dasharray',`${length} ${100-length}`);r.style.setProperty('--edge-start',start+'px');svg.append(r);
  }
  frame.style.setProperty('--edge-duration',(16+(serial%4)*2)+'s');frame.style.setProperty('--edge-phase',(-serial++*3.7)+'s');frame.append(svg);tracked.set(frame,{svg});resize?.observe(frame);visible?.observe(frame);if(!visible)frame.classList.add('sisal-edge-visible');geometry(frame);
 }
 function refresh(){
  scheduled=false;
  for(const [frame] of tracked)if(!frame.isConnected){resize?.unobserve(frame);visible?.unobserve(frame);tracked.delete(frame);}
  for(const wrap of document.querySelectorAll('#content .table-wrap,#content .scroll-x,#content .trend-wrap'))attach(wrap,true);
  for(const block of document.querySelectorAll('#content .cc-team-cover,#content .cc-race-cover,#content>.hero,#content .cc-assistant-workbench>.card,#content .card:not(.rich-card),.news-main,#ac-panel .ac-preview')){
   if(block.closest('.sr-host,.studio-canvas')||block.querySelector('.sisal-edge-frame,.cc-team-cover,.cc-race-cover')||block.classList.contains('top3-racing'))continue;attach(block);
  }
  // Dialogs can become visible without resizing in older browsers.
  for(const [frame] of tracked)geometry(frame);
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(refresh);}}
 function boot(){
  refresh();window.addEventListener('sisal-content-rendered',schedule);window.addEventListener('sisal-appearance-saved',schedule);window.addEventListener('resize',schedule,{passive:true});
  new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.sisal-edge-light,.sr-host')&&(r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!n.classList.contains('sisal-edge-light')))))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  window.SisalFuture={refresh:schedule};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
