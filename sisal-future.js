/* Club 58: one thin comet follows the real rounded perimeter of each panel.
 * No conic gradients, CSS masks, network calls or saved animation switches. */
(() => {
 'use strict';
 const tracked=new Map(),reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false};
 const panelSelector=[
  '#content .card','#content .rich-card','#content .match-card',
  '#content .cc-team-cover','#content .cc-race-cover',
  '#modalRoot .card','#modalRoot .rich-card',
  '#ac-panel .ac-card','#ac-panel .ac-preview','.news-main','.club-notifications'
 ].join(',');
 let pending=0,animation=0,serial=0;
 const modulo=(n,d)=>((n%d)+d)%d;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

 // Clockwise, in CSS pixels. Different corner radii (e.g. tab panels) are kept.
 function perimeter(w,h,radii){
  const inset=1.4,x=inset,y=inset,right=w-inset,bottom=h-inset;
  const limit=Math.max(0,Math.min((w-2*inset)/2,(h-2*inset)/2));
  const [tl,tr,br,bl]=(Array.isArray(radii)?radii:[radii,radii,radii,radii]).map(r=>Math.max(0,Math.min(limit,r-inset)));
  const parts=[];let length=0;
  function line(ax,ay,bx,by){const size=Math.hypot(bx-ax,by-ay);if(size>0){parts.push({start:length,size,point:q=>[ax+(bx-ax)*q,ay+(by-ay)*q],project:(px,py)=>Math.max(0,Math.min(1,((px-ax)*(bx-ax)+(py-ay)*(by-ay))/(size*size)))});length+=size;}}
  function arc(cx,cy,r,a){if(r>0){const size=Math.PI*r/2;parts.push({start:length,size,point:q=>[cx+r*Math.cos(a+q*Math.PI/2),cy+r*Math.sin(a+q*Math.PI/2)],project:(px,py)=>{const angle=modulo(Math.atan2(py-cy,px-cx)-a,Math.PI*2);if(angle<=Math.PI/2)return angle/(Math.PI/2);return angle<Math.PI*1.25?1:0;}});length+=size;}}
  line(x+tl,y,right-tr,y);arc(right-tr,y+tr,tr,-Math.PI/2);
  line(right,y+tr,right,bottom-br);arc(right-br,bottom-br,br,0);
  line(right-br,bottom,x+bl,bottom);arc(x+bl,bottom-bl,bl,Math.PI/2);
  line(x,bottom-bl,x,y+tl);arc(x+tl,y+tl,tl,Math.PI);
  return {length,radius:Math.max(tl,tr,br,bl),nearest(px,py){let best=Infinity,along=0;for(const p of parts){const q=p.project(px,py),[x,y]=p.point(q),distance=Math.hypot(px-x,py-y);if(distance<best){best=distance;along=p.start+q*p.size;}}return [along,best];},point(distance){const d=modulo(distance,length);const p=parts.find(v=>d<v.start+v.size)||parts.at(-1);return p.point((d-p.start)/p.size);}};
 }
 // Rasterize the narrow rim once into distance/coverage samples. Each pixel
 // is blended exactly once: no segment caps, overlapping strokes or color seams.
 function borderStrips(ctx,w,h,dpr,path){
  const W=Math.ceil(w*dpr),H=Math.ceil(h*dpr),cap=Math.min(Math.floor(H/2),Math.ceil((path.radius+5)*dpr)),side=Math.min(Math.floor(W/2),Math.ceil(5*dpr));
  const rects=[[0,0,W,cap],[0,H-cap,W,cap],[0,cap,side,H-2*cap],[W-side,cap,side,H-2*cap]],aa=1/dpr;
  return rects.filter(([, ,rw,rh])=>rw>0&&rh>0).map(([x,y,rw,rh])=>{
   const image=ctx.createImageData(rw,rh),samples=[];
   for(let py=0;py<rh;py++)for(let px=0;px<rw;px++){
    const [along,distance]=path.nearest((x+px+.5)/dpr,(y+py+.5)/dpr);
    if(distance>3.6)continue;
    const coverage=half=>Math.max(0,Math.min(1,(half+aa/2-distance)/aa));
    samples.push((py*rw+px)*4,along,coverage(.4)*.19,coverage(.675),Math.exp(-distance*distance/2)*.13);
   }
   return {x,y,image,samples:new Float32Array(samples)};
  });
 }
 function drawBorder(ctx,w,h,radii,phase,moving,path=perimeter(w,h,radii),dpr=1){
  if(w<6||h<6)return;
  if(!path.strips||path.dpr!==dpr){path.strips=borderStrips(ctx,w,h,dpr,path);path.dpr=dpr;}
  const tail=Math.min(260,Math.max(125,path.length*.17)),nose=18,head=modulo(phase,1)*path.length;
  for(const strip of path.strips){
   const data=strip.image.data,s=strip.samples;
   for(let i=0;i<s.length;i+=5){
    const at=s[i],behind=modulo(head-s[i+1],path.length),ahead=path.length-behind;
    const light=!moving?0:behind<=tail?smooth(1-behind/tail):ahead<=nose?1-smooth(ahead/nose):0;
    const base=s[i+2],core=s[i+3],glow=s[i+4],alpha=(core*.98+(1-core)*glow)*light,total=alpha+base*(1-alpha),white=light*light*light;
    data[at]=total?((87+140*white)*alpha+91*base*(1-alpha))/total:0;
    data[at+1]=total?(255*alpha+237*base*(1-alpha))/total:0;
    data[at+2]=total?((165+77*white)*alpha+167*base*(1-alpha))/total:0;
    data[at+3]=total*255;
   }
   ctx.putImageData(strip.image,strip.x,strip.y);
  }
 }
 function hiddenByParent(frame){
  if(frame.closest('[hidden]'))return true;
  for(let p=frame.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)return true;
  return false;
 }
 function geometry(frame,info){
  const rect=frame.getBoundingClientRect(),style=getComputedStyle(frame);
  info.visible=!hiddenByParent(frame)&&style.display!=='none'&&style.visibility!=='hidden'&&rect.width>4&&rect.height>4&&rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth;
  if(!rect.width||!rect.height)return;
  const w=frame.offsetWidth||rect.width,h=frame.offsetHeight||rect.height;
  const radii=['TopLeft','TopRight','BottomRight','BottomLeft'].map(c=>parseFloat(style['border'+c+'Radius'])||0);
  const key=[w,h,...radii].join(':');
  // A budget for high-DPI / very tall tables. The animation draws only the rim.
  const dpr=Math.min(devicePixelRatio||1,2,Math.sqrt(2200000/(w*h)));
  const bw=Math.ceil(w*dpr),bh=Math.ceil(h*dpr);
  if(info.canvas.width!==bw||info.canvas.height!==bh){info.canvas.width=bw;info.canvas.height=bh;info.dirty=true;}
  info.dpr=dpr;
  if(info.key!==key){info.ctx?.clearRect(0,0,bw,bh);info.width=w;info.height=h;info.radii=radii;info.path=perimeter(w,h,radii);info.key=key;info.dirty=true;}
  // Include the panel border itself, instead of painting an inset table frame.
  const css='width:'+w+'px;height:'+h+'px;left:'+(-(parseFloat(style.borderLeftWidth)||0))+'px;top:'+(-(parseFloat(style.borderTopWidth)||0))+'px;';
  if(info.css!==css){info.canvas.style.cssText=css;info.css=css;}
 }
 function frontLayer(){
  const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(dialog)return dialog;
  for(const selector of ['.sr-host','#modalRoot .modal']){const el=document.querySelector(selector);if(el?.getBoundingClientRect().width)return el;}
  return null;
 }
 function render(now){
  animation=0;let running=false;const front=frontLayer();
  for(const [frame,info]of tracked){
   if(!frame.isConnected)continue;
   const active=info.visible&&!document.hidden&&(!front||front.contains(frame));
   const moving=active&&!reduced.matches&&!!info.ctx;
   const state=!info.ctx?'unsupported':moving?'running':reduced.matches?'reduced':document.hidden?'hidden':!info.visible?'outside':'covered';
   if(frame.dataset.neonState!==state){frame.dataset.neonState=state;info.dirty=true;}
   if(active&&info.ctx&&(moving||info.dirty)){
    const duration=Math.max(8000,Math.min(18000,info.path.length/105*1000));
    drawBorder(info.ctx,info.width,info.height,info.radii,now/duration+info.phase,moving,info.path,info.dpr);info.dirty=false;
   }
   running ||= moving;
  }
  if(running)wake();
 }
 function wake(){if(!animation&&!document.hidden)animation=requestAnimationFrame(render);}
 const resize='ResizeObserver'in window?new ResizeObserver(items=>{for(const {target}of items){const info=tracked.get(target);if(info)geometry(target,info);}wake();}):null;
 const intersection='IntersectionObserver'in window?new IntersectionObserver(items=>{for(const {target}of items){const info=tracked.get(target);if(info)geometry(target,info);}wake();}):null;
 function newCanvas(frame,info){
  const canvas=document.createElement('canvas');canvas.className='sisal-border-canvas';canvas.setAttribute('aria-hidden','true');canvas.setAttribute('role','presentation');frame.append(canvas);
  info.canvas=canvas;info.css='';info.key='';info.ctx=null;try{info.ctx=canvas.getContext('2d');}catch{}info.dirty=true;
 }
 function attach(frame){
  if(tracked.has(frame))return;
  const positioned=getComputedStyle(frame).position==='static'||!getComputedStyle(frame).position;
  frame.classList.add('sisal-edge-host');if(positioned)frame.classList.add('sisal-edge-relative');
  const info={phase:modulo(serial++*.381966,1),visible:false,width:0,height:0,positioned};newCanvas(frame,info);tracked.set(frame,info);resize?.observe(frame);intersection?.observe(frame);
 }
 function detach(frame,info){resize?.unobserve(frame);intersection?.unobserve(frame);info.canvas.remove();info.canvas.width=info.canvas.height=1;frame.classList.remove('sisal-edge-host','sisal-edge-relative');delete frame.dataset.neonState;tracked.delete(frame);}
 function wrap(target){
  if(target.parentElement?.classList.contains('sisal-edge-frame'))return target.parentElement;
  const frame=document.createElement('div');frame.className='sisal-edge-frame';target.before(frame);frame.append(target);return frame;
 }
 function refresh(){
  pending=0;
  const panels=[...document.querySelectorAll(panelSelector)].filter(p=>!p.closest('.sr-host'));
  // Animate each complete leaf panel. Nested panels get their own rim, never
  // a second inset rim on the same table and never on its scrolling contents.
  const desired=new Set(panels.filter(p=>!panels.some(other=>other!==p&&p.contains(other))));
  for(const target of document.querySelectorAll('#content table,#modalRoot table,#ac-panel table,#content .trend-wrap')){
   if(target.closest('.sr-host')||[...desired].some(p=>p.contains(target)))continue;
   desired.add(wrap(target.closest('.table-wrap,.scroll-x,.trend-wrap')||target));
  }
  for(const [frame,info]of tracked)if(!frame.isConnected||!desired.has(frame))detach(frame,info);
  for(const frame of desired)attach(frame);
  for(const [frame,info]of tracked){
   // Other app modules can replace innerHTML without replacing the panel.
   if(info.canvas.parentElement!==frame)newCanvas(frame,info);
   geometry(frame,info);
  }
  // Render once even when reduced motion/hidden mode stops the loop.
  if(animation)cancelAnimationFrame(animation);animation=0;render(performance.now());
 }
 function schedule(){if(!pending)pending=requestAnimationFrame(refresh);}
 function boot(){
  refresh();
  for(const event of ['sisal-content-rendered','sisal-workspace-layout','sisal-appearance-saved','resize','pageshow'])window.addEventListener(event,schedule);
  for(const event of ['toggle','close','click','visibilitychange','transitionend'])document.addEventListener(event,schedule,true);
  document.addEventListener('scroll',schedule,{passive:true,capture:true});
  if(reduced.addEventListener)reduced.addEventListener('change',schedule);else reduced.addListener?.(schedule);
  new MutationObserver(records=>{
   if(records.some(r=>!r.target.closest?.('.sisal-border-canvas,.sr-host')&&(r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(!n.classList.contains('sisal-border-canvas')||!n.isConnected)))))schedule();
  }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','class','style']});
  window.SisalFuture={refresh:schedule};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
