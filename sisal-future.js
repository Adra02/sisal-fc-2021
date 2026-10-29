/* Independent local neon controller. No football data or network requests. */
(() => {
 'use strict';
 const ns='http://www.w3.org/2000/svg',tracked=new Map(),preferenceKey='sisal_neon_motion_v2',reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let mode='auto',scheduled=false,serial=0,control=null;
 const supportsMotion=typeof document.createElement('i').animate==='function';
 const allowsMotion=()=>!reduced.matches;
 const resize='ResizeObserver'in window?new ResizeObserver(items=>{for(const item of items)geometry(item.target);}):null;
 const visible='IntersectionObserver'in window?new IntersectionObserver(items=>{for(const item of items){const info=tracked.get(item.target);if(info){info.visible=item.isIntersecting;apply(item.target,info);}}},{rootMargin:'24px'}):null;
 function blocker(frame){
  const top=[...document.querySelectorAll('dialog[open]')].at(-1);if(top&&!top.contains(frame))return true;
  const modal=document.querySelector('#modalRoot .modal');if(modal&&!modal.contains(frame))return true;
  const race=document.querySelector('.sr-host');return !!(race&&race.getBoundingClientRect().width);
 }
 function apply(frame,info){
  const running=supportsMotion&&allowsMotion()&&!document.hidden&&info.visible&&!blocker(frame);
  frame.dataset.neonState=running?'running':!supportsMotion?'unsupported':!allowsMotion()?(reduced.matches&&mode==='auto'?'reduced':'off'):document.hidden?'hidden':!info.visible?'outside':'covered';
  for(const a of info.animations){if(running){if(a.playState!=='running')a.play();}else if(a.playState!=='paused')a.pause();}
  frame.classList.toggle('sisal-edge-visible',running);
 }
 function geometry(frame){
  const info=tracked.get(frame);if(!info)return;const r=frame.getBoundingClientRect();if(r.width<4||r.height<4)return;
  const size=Math.ceil(Math.hypot(r.width,r.height))+8;const energy=info.svg.querySelector('.sisal-edge-energy');if(energy){energy.style.width=energy.style.height=size+'px';energy.style.marginLeft=energy.style.marginTop=-size/2+'px';}
  const radius=Math.max(2,parseFloat(getComputedStyle(frame).borderTopLeftRadius)||12);info.svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
  for(const rect of []){rect.setAttribute('x','1.5');rect.setAttribute('y','1.5');rect.setAttribute('width',String(r.width-3));rect.setAttribute('height',String(r.height-3));rect.setAttribute('rx',String(Math.min(radius,r.width/2,r.height/2)));}
  // Initial visibility is calculated directly too: no permanently paused border
  // while waiting for an observer callback or after a hidden tab is revealed.
  info.visible=r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;apply(frame,info);
 }
 function attach(target,table=false){
  if(target.classList.contains('sisal-edge-host')||target.closest('.sisal-edge-frame'))return;
  let frame=target;if(table){frame=document.createElement('div');frame.className='sisal-edge-frame';target.before(frame);frame.append(target);}frame.classList.add('sisal-edge-host');
  const svg=document.createElement('div'),animations=[];svg.classList.add('sisal-edge-light');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('preserveAspectRatio','none');
  const duration=10500+(serial%3)*1400,phase=(serial++*2300)%duration;
  const energy=document.createElement('i');energy.className='sisal-edge-energy';svg.append(energy);
  if(supportsMotion){const a=energy.animate([{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{duration,iterations:Infinity,easing:'linear'});a.pause();a.currentTime=phase;animations.push(a);}
  frame.append(svg);tracked.set(frame,{svg,animations,visible:false});resize?.observe(frame);visible?.observe(frame);geometry(frame);
 }
 function refresh(){
  scheduled=false;for(const [frame,info]of tracked)if(!frame.isConnected){resize?.unobserve(frame);visible?.unobserve(frame);info.animations.forEach(a=>a.cancel());tracked.delete(frame);}
  for(const wrap of document.querySelectorAll('#content .table-wrap,#content .scroll-x,#content .trend-wrap'))attach(wrap,true);
  for(const table of document.querySelectorAll('#content table,#modalRoot table,#ac-panel table')){if(!table.closest('.sisal-edge-host'))attach(table,true);}
  for(const block of document.querySelectorAll('#content .cc-team-cover,#content .cc-race-cover,#content>.hero,#content .card,#content .rich-card,.news-main,#ac-panel .ac-preview')){if(block.querySelector('.sisal-edge-frame,.cc-team-cover,.cc-race-cover')||block.classList.contains('top3-racing'))continue;attach(block);}
  for(const [frame]of tracked)geometry(frame);
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(refresh);}}
 function boot(){
  document.addEventListener('toggle',schedule,true);document.addEventListener('click',schedule,true);refresh();for(const e of ['sisal-content-rendered','sisal-workspace-layout','sisal-appearance-saved'])window.addEventListener(e,schedule);window.addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);reduced.addEventListener?.('change',()=>{schedule();});
  new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.sisal-edge-light,.sr-host')&&(r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!n.classList.contains('sisal-edge-light')))))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden']});
  window.SisalFuture={refresh:schedule};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
