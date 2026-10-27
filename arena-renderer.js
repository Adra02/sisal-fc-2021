import * as T from './vendor/three.module.min.js';
import {environmentTexture} from './studio-materials.js?v=studio-9';
import {makeAvatar} from './arena-avatar.js?v=arena-12';
import {sampleContinuous as sampleArena} from './arena-live-cache.js?v=arena-12';
import {arenaAudio} from './arena-audio.js?v=arena-12';
import {buildGround} from './arena-environment.js?v=arena-12';
import {FIELD} from './arena-layout.js?v=arena-12';
import {contactEffects} from './arena-effects.js?v=arena-12';
import {createArenaTimeline} from './arena-timeline.js?v=arena-12';
import {actionFraming,smoothRadius,fullAvatarDetail} from './arena-camera.js?v=arena-12';
import {paintSky} from './arena-surface.js?v=arena-12';
const clamp=T.MathUtils.clamp;
export const appearanceSignature=value=>JSON.stringify(Object.entries(value||{}).filter(([k])=>!['nickname','introduction','entrance','celebration'].includes(k)).sort(([a],[b])=>a<b?-1:1));
export function createArenaRenderer(host,initialSnapshot,{clock,onFrame,onFailure,onQuality,onCameraChange,selfKey='',volume=.65,cameraPreference=null}={}){
 const coarse=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 let renderer;try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'default'});}catch(cause){throw Object.assign(Error('La grafica 3D non è disponibile in questo browser. Prova ad attivare l’accelerazione grafica o ad aprire l’app nel browser aggiornato del telefono.'),{code:'ARENA_WEBGL',cause});}
 const resources=new Set(),own=x=>(resources.add(x),x),scene=new T.Scene(),camera=new T.PerspectiveCamera(43,1,.12,165);
 const maxRatio=Math.min(devicePixelRatio||1,coarse?1.65:1.8);
 renderer.setPixelRatio(maxRatio);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const canvas=renderer.domElement;canvas.setAttribute('aria-label','SISAL ARENA. Trascina per ruotare; usa due dita per avvicinare.');host.append(canvas);
 scene.environment=own(environmentTexture({studio:false}));scene.environmentIntensity=.32;scene.fog=new T.Fog('#c8d8d3',72,160);
 const ground=buildGround(scene,{own,renderer,coarse,reduced}),effects=contactEffects(scene,own),sphere=own(new T.SphereGeometry(FIELD.ballRadius,coarse?24:32,coarse?16:24));
 const sky=ground.texture(paintSky,64,512);sky.mapping=T.EquirectangularReflectionMapping;scene.background=sky;
 const ballTexture=ground.texture((c,w,h)=>{c.fillStyle='#eeeede';c.fillRect(0,0,w,h);for(let row=0;row<4;row++)for(let j=0;j<8;j++){const x=(j+(row%2)*.5)*w/8,y=row*h/3;c.fillStyle='#123c2e';c.strokeStyle='#8e9d8e';c.lineWidth=1;c.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5-.7;c.lineTo(x+Math.cos(a)*9,y+Math.sin(a)*9);}c.closePath();c.fill();c.stroke();}},384,192);
 const ballMat=own(new T.MeshStandardMaterial({color:'#fff',map:ballTexture,roughness:.56})),balls=new Map(),avatars=new Map();
 const shadowMap=ground.texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(9,28,16,.36)');g.addColorStop(.35,'rgba(9,28,16,.20)');g.addColorStop(1,'rgba(9,28,16,0)');c.fillStyle=g;c.fillRect(0,0,w,h);},64,64);
 const contacts=new T.InstancedMesh(own(new T.PlaneGeometry(.9,.9)),own(new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false})),390);contacts.count=0;contacts.frustumCulled=false;scene.add(contacts);
 const dummy=new T.Object3D(),point=new T.Vector3(),ring=new T.Mesh(own(new T.RingGeometry(.38,.42,48)),own(new T.MeshBasicMaterial({color:'#f4d47c',transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false})));
 ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
 let snapshot=initialSnapshot,disposed=false,raf=0,last=0,selected='',view='director',azimuth=.55,polar=1.04,radius=16,manual=false,paused=true,contextLost=false,width=800,height=600,lastRender=0,first=true,lastFit=16,quality='auto',level=1,drawInterval=1000/60,measured=0,wallSamples=0,frameSamples=0,lastBudget=0,fastWindows=0,wasReplay=false;
 const timeline=createArenaTimeline(),audio=arenaAudio({volume}),center=new T.Vector3(),desiredCenter=new T.Vector3(),desiredCamera=new T.Vector3(),headPoint=new T.Vector3(),screenPoint=new T.Vector3(),cameraRight=new T.Vector3(),raycaster=new T.Raycaster(),pointers=new Map();let pinch=null;
 function populate(frame){
  const keys=new Set(frame.actors.map(p=>p.key));
  for(const [key,a]of avatars)if(!keys.has(key)){a.root.removeFromParent();a.dispose();avatars.delete(key);}
  for(const p of frame.actors){let a=avatars.get(p.key);const signature=appearanceSignature(p.appearance);
   if(a&&a.signature!==signature){a.root.removeFromParent();a.dispose();avatars.delete(p.key);a=null;}
   if(!a){a=makeAvatar(p,coarse?0:1);a.signature=signature;avatars.set(p.key,a);scene.add(a.root);}
  }
  const ids=new Set(frame.balls.map(b=>b.id));for(const [id,b]of balls)if(!ids.has(id)){b.removeFromParent();balls.delete(id);}
  for(const b of frame.balls)if(!balls.has(b.id)){const m=new T.Mesh(sphere,ballMat);m.name='arena-ball-'+b.id;m.castShadow=true;balls.set(b.id,m);scene.add(m);}
 }
 populate(sampleArena(snapshot,clock()));
 function resize(){width=host.clientWidth||800;height=host.clientHeight||600;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function cameraState(){return {version:1,selected,view,azimuth,polar,radius,manual,center:[center.x,center.y,center.z]};}
 function saveCamera(){onCameraChange?.(cameraState());}
 function restoreCamera(value){
  if(!value||value.version!==1)return;
  selected=typeof value.selected==='string'&&(snapshot.players.some(p=>p.key===value.selected)||['__keeper_bot','__keeper_away_bot'].includes(value.selected))?value.selected:'';
  view=selected?'follow':value.view==='field'?'field':'director';
  if(Number.isFinite(value.azimuth))azimuth=value.azimuth;if(Number.isFinite(value.polar))polar=clamp(value.polar,.35,1.44);if(Number.isFinite(value.radius))radius=clamp(value.radius,3.5,76);
  manual=!!value.manual;if(manual&&Array.isArray(value.center)&&value.center.length===3&&value.center.every(Number.isFinite)){center.fromArray(value.center);center.x=clamp(center.x,-32,32);center.y=clamp(center.y,.2,3);center.z=clamp(center.z,-32,32);desiredCenter.copy(center);}
 }
 restoreCamera(cameraPreference);
 function setQuality(mode){quality=['auto','high','low'].includes(mode)?mode:'auto';level=quality==='low'?0:1;drawInterval=quality==='low'||reduced?1000/30:1000/60;renderer.setPixelRatio(quality==='low'?Math.min(1,maxRatio):maxRatio);renderer.shadowMap.enabled=quality!=='low';ground.sun.shadow.mapSize.set(quality==='low'?512:coarse?1024:2048,quality==='low'?512:coarse?1024:2048);ground.sun.shadow.map?.dispose();ground.sun.shadow.map=null;measured=wallSamples=frameSamples=fastWindows=0;resize();onQuality?.({mode:quality,level});}
 function draw(ms){
  raf=0;if(disposed||document.hidden||paused||contextLost)return;if(ms-lastRender<drawInterval-1){raf=requestAnimationFrame(draw);return;}
  const elapsed=last?Math.min(.2,(ms-last)/1000):0;last=ms;lastRender=ms;const begin=performance.now(),live=sampleArena(snapshot,clock());timeline.record(live);
  const replay=timeline.tick(elapsed),f=replay?.frame||live,time=f.t;
  if(!!replay!==wasReplay){populate(f);if(replay)audio.stop();else audio.resume();wasReplay=!!replay;}
  const dialogue=f.dialogue,recent=f.recentDialogue,chosen=f.actors.find(p=>p.key===selected);let fit=16;
  if(chosen){desiredCenter.set(chosen.pos[0],.9,chosen.pos[1]);fit=radius;}
  else if(!manual){
   if(view==='field'){desiredCenter.set(0,.7,0);fit=49*Math.max(1,.88/camera.aspect);}
   else{const framing=actionFraming(f,camera.aspect);desiredCenter.fromArray(framing.center);fit=framing.radius;}
  }
  if(manual&&!chosen)desiredCenter.copy(center);
  if(first)center.copy(desiredCenter);else center.lerp(desiredCenter,1-Math.exp(-elapsed*(reduced?1.4:2.6)));
  if(manual)fit=radius;lastFit=first||manual||chosen||view==='field'?clamp(fit,3.5,76):smoothRadius(lastFit,clamp(fit,3.5,76),elapsed);const pavilion=center.x>18.5,az=!manual&&pavilion?-1.24:azimuth,po=!manual&&pavilion?1.30:polar;
  desiredCamera.set(center.x+lastFit*Math.sin(po)*Math.sin(az),center.y+lastFit*Math.cos(po),center.z+lastFit*Math.sin(po)*Math.cos(az));
  if(first)camera.position.copy(desiredCamera);else camera.position.lerp(desiredCamera,1-Math.exp(-Math.max(elapsed,.008)*(reduced?1.5:3)));camera.lookAt(center);
  const self=f.actors.find(p=>p.key===selfKey);ring.visible=!!self;if(self)ring.position.set(self.pos[0],.02,self.pos[1]);
  let contactCount=0;
  for(const p of f.actors){const a=avatars.get(p.key);if(!a)continue;
   point.set(p.pos[0],.8,p.pos[1]);const distance=camera.position.distanceTo(point),detail={low:level===0,selected:selected===p.key||selfKey===p.key};a.setDetail(fullAvatarDetail(distance,height,detail),fullAvatarDetail(distance,height,{...detail,minPixels:165}));
   a.update({...p,speaking:dialogue?.speaker===p.key},time,elapsed,p.velocity);a.root.updateMatrixWorld(true);
   dummy.position.set(p.pos[0],.016,p.pos[1]);dummy.rotation.set(-Math.PI/2,0,0);const fade=1/(1+(p.elevation||0));dummy.scale.set(.72*fade,.80*fade,1);dummy.updateMatrix();contacts.setMatrixAt(contactCount++,dummy.matrix);
   if(level>0&&camera.position.distanceTo(a.root.position)<14&&!p.seated){for(const name of ['lAnkle','rAnkle']){const ankle=a.limbs.find(b=>b.name===name);if(!ankle)continue;point.setFromMatrixPosition(ankle.matrixWorld);const size=.38/(1+Math.max(0,point.y-.04)*7);dummy.position.set(point.x,.018,point.z);dummy.scale.set(size*.65,size,1);dummy.updateMatrix();contacts.setMatrixAt(contactCount++,dummy.matrix);}}
  }
  contacts.count=contactCount;contacts.instanceMatrix.needsUpdate=true;
  for(const info of f.balls){const b=balls.get(info.id);if(b){b.visible=info.visible!==false;b.position.set(...info.pos);b.rotation.set(...(info.spin||[0,0,0]));}}
  ground.update(f,camera,level);camera.updateMatrixWorld();effects.update(f,camera,reduced?0:level);cameraRight.setFromMatrixColumn(camera.matrixWorld,0);
  if(!replay)audio.update(f,{x:camera.position.x,y:camera.position.y,z:camera.position.z,rightX:cameraRight.x,rightZ:cameraRight.z},elapsed);
  renderer.render(scene,camera);
  const anchors=f.actors.map(p=>{const a=avatars.get(p.key);headPoint.setFromMatrixPosition(a.head.matrixWorld);headPoint.y+=.34;screenPoint.copy(headPoint).project(camera);let visible=screenPoint.z>-1&&screenPoint.z<1&&Math.abs(screenPoint.x)<1.08&&Math.abs(screenPoint.y)<1.08;
   if(visible&&p.pos[0]>20){const distance=camera.position.distanceTo(headPoint);raycaster.set(camera.position,headPoint.clone().sub(camera.position).normalize());raycaster.far=distance-.05;visible=!raycaster.intersectObjects(ground.solids,false).length;}
   const x=(screenPoint.x*.5+.5)*width,y=(-.5*screenPoint.y+.5)*height;screenPoint.set(p.pos[0],.025,p.pos[1]).project(camera);const footY=(-.5*screenPoint.y+.5)*height,bodyHeight=Math.max(8,Math.abs(footY-y)-5),bodyWidth=Math.max(8,bodyHeight*.30);return {key:p.key,name:p.name,x,y,bodyBox:{x:x-bodyWidth/2,y:y+2,w:bodyWidth,h:bodyHeight},visible,active:p.active,team:p.team,self:p.key===selfKey,selected:p.key===selected};
  });
  const ballAnchors=f.balls.filter(b=>b.visible&&b.mode!=='rack').map(b=>{screenPoint.set(...b.pos).project(camera);return {x:(screenPoint.x*.5+.5)*width,y:(-.5*screenPoint.y+.5)*height,visible:screenPoint.z>-1&&screenPoint.z<1};});
  const names=new Map(f.actors.map(p=>[p.key,p.appearance?.nickname||p.name])),decorate=d=>d?{...d,name:names.get(d.speaker)||'Sisal'}:null;
  onFrame?.({title:f.scene.title,scene:f.scene.id,serial:0,time:f.elapsed,duration:null,dialogue:decorate(dialogue),recentDialogue:decorate(recent),people:f.actors.length,activePeople:f.actors.filter(p=>p.active&&!p.bot).length,match:f.match,technique:f.technique,anchors,ballAnchors,width,height,live:!replay,replay:replay?{progress:replay.progress,label:replay.event.label}:null,replayAvailable:timeline.available,history:timeline.events,audioEnabled:audio.enabled,camera:cameraState()});
  measured+=performance.now()-begin;wallSamples+=elapsed*1000;frameSamples++;
  if(quality==='auto'&&frameSamples>=120){const average=measured/frameSamples,wallAverage=wallSamples/frameSamples,slow=average>22||wallAverage>drawInterval*1.45;
   if(slow&&ms-lastBudget>8000){renderer.setPixelRatio(Math.max(.85,renderer.getPixelRatio()-.20));level=renderer.getPixelRatio()>=Math.min(1.1,maxRatio)?1:0;if(average>32||wallAverage>45)drawInterval=1000/30;renderer.shadowMap.enabled=level>0;lastBudget=ms;fastWindows=0;resize();onQuality?.({mode:'auto',level});}
   else if(average<10&&wallAverage<drawInterval*1.18){fastWindows++;if(fastWindows>=4&&ms-lastBudget>25000&&(renderer.getPixelRatio()<maxRatio||level===0||!reduced&&drawInterval>1000/60)){renderer.setPixelRatio(Math.min(maxRatio,renderer.getPixelRatio()+.15));level=renderer.getPixelRatio()>=Math.min(1.1,maxRatio)?1:0;if(!reduced)drawInterval=1000/60;renderer.shadowMap.enabled=level>0;lastBudget=ms;fastWindows=0;resize();onQuality?.({mode:'auto',level});}}
   else fastWindows=0;measured=wallSamples=frameSamples=0;
  }
  first=false;raf=requestAnimationFrame(draw);
 }
 function pause(){paused=true;cancelAnimationFrame(raf);raf=0;last=0;audio.stop();}
 function resume(){if(!disposed&&!document.hidden&&!contextLost){paused=false;if(!timeline.active)audio.resume();cancelAnimationFrame(raf);last=lastRender=0;raf=requestAnimationFrame(draw);}}
 function down(e){if(!manual)radius=lastFit;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);manual=true;}
 function move(e){const p=pointers.get(e.pointerId);if(!p)return;if(pointers.size===2){pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=[...pointers.values()],distance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch)radius=clamp(radius+(pinch-distance)*.025,3.5,76);pinch=distance;}else{azimuth-=(e.clientX-p.x)*.006;polar=clamp(polar+(e.clientY-p.y)*.004,.35,1.44);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});}}
 function up(e){pointers.delete(e.pointerId);pinch=null;saveCamera();}
 function wheel(e){e.preventDefault();if(!manual)radius=lastFit;manual=true;radius=clamp(radius+e.deltaY*.025,3.5,76);saveCamera();}
 const lost=e=>{e.preventDefault();contextLost=true;pause();onFailure?.({code:'ARENA_CONTEXT_LOST',message:'Il dispositivo ha sospeso il 3D. Premi Riprova per ricreare il campo; puoi scegliere Risparmio nelle opzioni.'});};
 const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,wheel,webglcontextlost:lost};for(const [name,fn]of Object.entries(handlers))canvas.addEventListener(name,fn,name==='wheel'?{passive:false}:undefined);
 resume();return {
  follow(key){selected=key||'';view=key?'follow':'director';radius=key?5.8:16;manual=false;saveCamera();},
  view(mode){view=mode==='field'?'field':'director';if(view==='director')lastFit=clamp(lastFit,12.5,25);selected='';manual=false;saveCamera();},
  zoom(d){if(!manual)radius=lastFit;manual=true;radius=clamp(radius+d,3.5,76);saveCamera();},setQuality,
  replaceSnapshot(next){snapshot=next;timeline.stop();populate(sampleArena(snapshot,clock()));},
  replay(id){const ok=timeline.start(id);if(ok)audio.stop();return ok;},
  live(){timeline.stop();audio.resume();},cameraState,
  toggleAudio:()=>timeline.active?Promise.resolve(false):audio.toggle(),setVolume:v=>audio.setVolume(v),pause,resume,
  dispose(){if(disposed)return;disposed=true;pause();timeline.reset();audio.dispose();observer.disconnect();for(const [name,fn]of Object.entries(handlers))canvas.removeEventListener(name,fn);for(const a of avatars.values())a.dispose();contacts.dispose();effects.dispose();ground.dispose();resources.forEach(r=>r.dispose?.());renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 };
}
