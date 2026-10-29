/* Independent local neon controller. No football data or network requests. */
(() => {
 'use strict';
 const ns='http://www.w3.org/2000/svg',tracked=new Map(),preferenceKey='sisal_neon_motion_v2',reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let mode='auto',scheduled=false,serial=0,control=null;
 try{const stored=localStorage.getItem(preferenceKey);if(['auto','on','off'].includes(stored))mode=stored;}catch{}
 const supportsMotion=typeof document.createElementNS(ns,'rect').animate==='function';
 const allowsMotion=()=>mode==='on'||(mode==='auto'&&!reduced.matches);
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
  const radius=Math.max(2,parseFloat(getComputedStyle(frame).borderTopLeftRadius)||12);info.svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
  for(const rect of info.svg.children){rect.setAttribute('x','1.5');rect.setAttribute('y','1.5');rect.setAttribute('width',String(r.width-3));rect.setAttribute('height',String(r.height-3));rect.setAttribute('rx',String(Math.min(radius,r.width/2,r.height/2)));}
  // Initial visibility is calculated directly too: no permanently paused border
  // while waiting for an observer callback or after a hidden tab is revealed.
  info.visible=r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;apply(frame,info);
 }
 function attach(target,table=false){
  if(target.classList.contains('sisal-edge-host')||target.closest('.sisal-edge-frame'))return;
  let frame=target;if(table){frame=document.createElement('div');frame.className='sisal-edge-frame';target.before(frame);frame.append(target);}frame.classList.add('sisal-edge-host');
  const svg=document.createElementNS(ns,'svg'),animations=[];svg.classList.add('sisal-edge-light');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('preserveAspectRatio','none');
  const duration=10500+(serial%3)*1400,phase=(serial++*2300)%duration;
  for(const [name,length,start]of [['trace',100,0],['tail',12,0],['trail',7,-5],['crest',2.5,-9.5],['point',.12,-11.88]]){
   const r=document.createElementNS(ns,'rect');r.classList.add('sisal-edge-'+name);r.setAttribute('pathLength','100');r.setAttribute('fill','none');r.setAttribute('stroke-dasharray',`${length} ${100-length}`);r.setAttribute('stroke-dashoffset',String(start));svg.append(r);
   if(name!=='trace'&&typeof r.animate==='function'){
    const a=r.animate([{strokeDashoffset:start+'px'},{strokeDashoffset:(start-100)+'px'}],{duration,iterations:Infinity,easing:'linear'});a.pause();a.currentTime=phase;animations.push(a);
   }
  }
  frame.append(svg);tracked.set(frame,{svg,animations,visible:false});resize?.observe(frame);visible?.observe(frame);geometry(frame);
 }
 function updateControl(){if(!control)return;if(!supportsMotion){control.disabled=true;control.querySelector('span').textContent='Neon statici';control.title='Animazione dei bordi non supportata da questo browser.';control.setAttribute('aria-pressed','false');return;}const on=allowsMotion();control.setAttribute('aria-pressed',String(on));control.dataset.motionState=on?'on':mode==='auto'?'reduced':'off';control.querySelector('span').textContent=on?'Neon attivi':mode==='auto'?'Neon ridotti':'Neon in pausa';control.title=on?'Metti in pausa i bordi animati':mode==='auto'?'Il dispositivo richiede movimenti ridotti. Tocca per attivare esplicitamente i neon.':'Attiva i bordi animati';}
 function setMode(value){if(!['auto','on','off'].includes(value))return;mode=value;try{localStorage.setItem(preferenceKey,mode);}catch{}updateControl();for(const [frame,info]of tracked)apply(frame,info);}
 function refresh(){
  scheduled=false;for(const [frame,info]of tracked)if(!frame.isConnected){resize?.unobserve(frame);visible?.unobserve(frame);info.animations.forEach(a=>a.cancel());tracked.delete(frame);}
  for(const wrap of document.querySelectorAll('#content .table-wrap,#content .scroll-x,#content .trend-wrap'))attach(wrap,true);
  for(const block of document.querySelectorAll('#content .cc-team-cover,#content .cc-race-cover,#content>.hero,#content .card:not(.rich-card),.news-main,#ac-panel .ac-preview')){if(block.querySelector('.sisal-edge-frame,.cc-team-cover,.cc-race-cover')||block.classList.contains('top3-racing'))continue;attach(block);}
  for(const [frame]of tracked)geometry(frame);updateControl();
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(refresh);}}
 function boot(){
  const top=document.querySelector('.topbar');if(top){control=document.createElement('button');control.type='button';control.className='sisal-motion-switch';control.innerHTML='<i aria-hidden="true"></i><span>Neon attivi</span>';control.onclick=()=>setMode(allowsMotion()?'off':'on');top.append(control);updateControl();}
  refresh();for(const e of ['sisal-content-rendered','sisal-workspace-layout','sisal-appearance-saved'])window.addEventListener(e,schedule);window.addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);reduced.addEventListener?.('change',()=>{updateControl();schedule();});
  new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.sisal-edge-light,.sr-host')&&(r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!n.classList.contains('sisal-edge-light')))))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden']});
  window.SisalFuture={refresh:schedule,setMode};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
