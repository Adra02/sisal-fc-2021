/* Club 59: native SVG perimeter lights. No Canvas, WebGL, CSS masks or frame loop. */
(() => {
 'use strict';
 const NS='http://www.w3.org/2000/svg',tracked=new Map();
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false};
 const panelsSelector=['#content .card','#content .rich-card','#content .match-card','#content .cc-team-cover','#content .cc-race-cover','#modalRoot .card','#modalRoot .rich-card','#ac-panel .ac-card','#ac-panel .ac-preview','.news-main','.club-notifications'].join(',');
 let queued=0,serial=0;
 const criticalStyle='position:absolute!important;right:auto!important;bottom:auto!important;pointer-events:none!important;z-index:8!important;display:block!important;overflow:visible!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;opacity:1!important;visibility:visible!important;';
 function svgNode(name,attributes={}){const e=document.createElementNS(NS,name);for(const [key,value]of Object.entries(attributes))e.setAttribute(key,String(value));return e;}
 function roundedPath(w,h,radii,inset){
  const max=Math.max(0,Math.min(w,h)/2-inset),[a,b,c,d]=radii.map(r=>Math.max(0,Math.min(max,r-inset)));
  const x=inset,y=inset,X=w-inset,Y=h-inset,arc=(r,x,y)=>r?'A'+r+' '+r+' 0 0 1 '+x+' '+y:'L'+x+' '+y;
  return 'M'+(x+a)+' '+y+'H'+(X-b)+arc(b,X,y+b)+'V'+(Y-c)+arc(c,X-c,Y)+'H'+(x+d)+arc(d,x,Y-d)+'V'+(y+a)+arc(a,x+a,y)+'Z';
 }
 function perimeterLength(w,h,radii,inset){const limit=Math.max(0,Math.min(w,h)/2-inset),sum=radii.reduce((n,r)=>n+Math.max(0,Math.min(limit,r-inset)),0);return 2*(w+h-4*inset)+(Math.PI/2-2)*sum;}
 function hiddenByParent(frame){if(frame.closest('[hidden]'))return true;for(let p=frame.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)return true;return false;}
 function activeLayer(){const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(dialog)return dialog;for(const selector of ['.sr-host','#modalRoot .modal']){const e=document.querySelector(selector);if(e?.getBoundingClientRect().width)return e;}return null;}
 function createLight(frame,info){
  const svg=svgNode('svg',{'class':'sisal-border-svg','aria-hidden':'true',focusable:'false',role:'presentation',preserveAspectRatio:'none'});
  svg.style.cssText=criticalStyle;frame.append(svg);info.svg=svg;info.key='';info.css='';info.motion=false;
 }
 function draw(svg,w,h,radii,info){
  const inset=1.8,path=roundedPath(w,h,radii,inset),length=perimeterLength(w,h,radii,inset);
  const duration=Math.max(8,Math.min(16,length/140)),uid='sisal-neon59-'+info.serial;
  let previous=0;try{previous=svg.getCurrentTime?.()||0;}catch{}
  const defs=svgNode('defs'),gradient=svgNode('radialGradient',{id:uid+'-light'});
  for(const [offset,color,opacity]of [[0,'#d4ffe5',1],[.035,'#bcffdb',1],[.14,'#7dffb7',.92],[.35,'#58ffa3',.5],[.62,'#51ff9c',.14],[.84,'#51ff9c',.025],[1,'#51ff9c',0]])gradient.append(svgNode('stop',{offset,'stop-color':color,'stop-opacity':opacity}));
  defs.append(gradient);
  // Ring clips are real SVG geometry. The inner hole protects all table data.
  // Both rings live inside the panel padding box, clear of clipped outer borders.
  for(const [name,width]of [['core',1.4],['halo',4.6]]){
   const clip=svgNode('clipPath',{id:uid+'-'+name,clipPathUnits:'userSpaceOnUse'});
   clip.append(svgNode('path',{d:roundedPath(w,h,radii,inset-width/2)+roundedPath(w,h,radii,inset+width/2),'clip-rule':'evenodd','fill-rule':'evenodd'}));defs.append(clip);
  }
  svg.replaceChildren(defs);svg.setAttribute('viewBox','0 0 '+w+' '+h);
  svg.append(svgNode('path',{'class':'sisal-neon-base',d:path,fill:'none',stroke:'#69eaa1','stroke-opacity':.4,'stroke-width':.85}));
  const spots=h>innerHeight*.8?2:1;
  for(const [layer,opacity]of [['halo',.17],['core',1]]){
   const group=svgNode('g',{'clip-path':'url(#'+uid+'-'+layer+')',opacity});
   for(let i=0;i<spots;i++){
    const spot=svgNode('circle',{cx:0,cy:0,r:135,fill:'url(#'+uid+'-light)'});
    spot.append(svgNode('animateMotion',{path,dur:duration+'s',begin:-((info.serial*.381966+i/spots)%1)*duration+'s',repeatCount:'indefinite',calcMode:'paced'}));group.append(spot);
   }
   svg.append(group);
  }
  info.motion=typeof svg.pauseAnimations==='function'&&typeof svg.unpauseAnimations==='function';
  // Preserve native timeline on resize. There is no JS requestAnimationFrame loop.
  try{if(previous)svg.setCurrentTime(previous);}catch{}
 }
 function update(frame,info,front){
  const rect=frame.getBoundingClientRect(),style=getComputedStyle(frame);
  const borders=['Top','Right','Bottom','Left'].map(s=>parseFloat(style['border'+s+'Width'])||0);
  // client dimensions exclude borders and scrollbars, unlike offsetWidth.
  const w=frame.clientWidth||rect.width-borders[1]-borders[3],h=frame.clientHeight||rect.height-borders[0]-borders[2];
  if(w>8&&h>8){
   const radii=['TopLeft','TopRight','BottomRight','BottomLeft'].map((c,i)=>Math.max(0,(parseFloat(style['border'+c+'Radius'])||0)-Math.max(borders[Math.floor(i/2)*2],borders[i===0||i===3?3:1])));
   const key=[w,h,...radii].join(':');if(info.key!==key){draw(info.svg,w,h,radii,info);info.key=key;}
   // Scrollable dialogs retain the rim around their visible viewport.
   const css=criticalStyle+'width:'+w+'px!important;height:'+h+'px!important;left:'+(frame.scrollLeft||0)+'px!important;top:'+(frame.scrollTop||0)+'px!important;';
   if(info.css!==css){info.svg.style.cssText=css;info.css=css;}
  }
  const visible=w>8&&h>8&&!hiddenByParent(frame)&&style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0&&rect.bottom>0&&rect.right>0&&rect.top<innerHeight&&rect.left<innerWidth;
  const active=visible&&!document.hidden&&(!front||front.contains(frame));
  const state=!active?document.hidden?'hidden':!visible?'outside':'covered':reduced.matches?'reduced':info.motion?'running':'static';
  if(info.state!==state){
   info.state=state;frame.dataset.neonState=state;frame.dataset.neonEngine='svg';
   try{if(state==='running')info.svg.unpauseAnimations();else info.svg.pauseAnimations?.();}catch{frame.dataset.neonState='static';}
  }
 }
 const resize='ResizeObserver'in window?new ResizeObserver(()=>schedule()):null;
 const intersection='IntersectionObserver'in window?new IntersectionObserver(()=>schedule()):null;
 function attach(frame){
  if(tracked.has(frame))return;
  const positioned=getComputedStyle(frame).position==='static'||!getComputedStyle(frame).position;
  frame.classList.add('sisal-edge-host');if(positioned)frame.classList.add('sisal-edge-relative');
  const info={serial:serial++,positioned,oldPosition:frame.style.getPropertyValue('position'),oldPriority:frame.style.getPropertyPriority('position')};if(positioned)frame.style.setProperty('position','relative');createLight(frame,info);tracked.set(frame,info);resize?.observe(frame);intersection?.observe(frame);
 }
 function detach(frame,info){if(info.positioned&&frame.style.getPropertyValue('position')==='relative'){if(info.oldPosition)frame.style.setProperty('position',info.oldPosition,info.oldPriority);else frame.style.removeProperty('position');}resize?.unobserve(frame);intersection?.unobserve(frame);info.svg.remove();frame.classList.remove('sisal-edge-host','sisal-edge-relative');delete frame.dataset.neonState;delete frame.dataset.neonEngine;tracked.delete(frame);}
 function wrap(target){if(target.parentElement?.classList.contains('sisal-edge-frame'))return target.parentElement;const frame=document.createElement('div');frame.className='sisal-edge-frame';target.before(frame);frame.append(target);return frame;}
 function refresh(){
  queued=0;const panels=[...document.querySelectorAll(panelsSelector)].filter(p=>!p.closest('.sr-host'));
  const desired=new Set(panels.filter(p=>!panels.some(other=>other!==p&&p.contains(other))));
  for(const target of document.querySelectorAll('#content table,#modalRoot table,#ac-panel table,#content .trend-wrap'))if(!target.closest('.sr-host')&&![...desired].some(p=>p.contains(target)))desired.add(wrap(target.closest('.table-wrap,.scroll-x,.trend-wrap')||target));
  for(const [frame,info]of tracked)if(!frame.isConnected||!desired.has(frame))detach(frame,info);
  for(const frame of desired)attach(frame);
  const front=activeLayer();for(const [frame,info]of tracked){if(info.svg.parentElement!==frame){createLight(frame,info);info.state='';}update(frame,info,front);}
 }
 function schedule(){if(!queued)queued=requestAnimationFrame(refresh);}
 function boot(){
  refresh();
  for(const event of ['sisal-content-rendered','sisal-workspace-layout','sisal-appearance-saved','resize','pageshow'])window.addEventListener(event,schedule);
  for(const event of ['toggle','close','click','visibilitychange','transitionend'])document.addEventListener(event,schedule,true);
  document.addEventListener('scroll',schedule,{passive:true,capture:true});
  if(reduced.addEventListener)reduced.addEventListener('change',schedule);else reduced.addListener?.(schedule);
  new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.sisal-border-svg,.sr-host')&&(r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(!n.classList.contains('sisal-border-svg')||!n.isConnected)))))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','class','style']});
  window.SisalFuture={refresh:schedule};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
