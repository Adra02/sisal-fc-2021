import * as T from './vendor/three.module.min.js';
import {environmentTexture} from './studio-materials.js?v=studio-9';
import {makeAvatar} from './arena-avatar.js?v=arena-7';
import {sampleContinuous as sampleArena} from './arena-live-cache.js?v=arena-7';
import {arenaAudio} from './arena-audio.js?v=arena-7';
import {buildGround} from './arena-environment.js?v=arena-7';
export function createArenaRenderer(host,initialSnapshot,{clock,onFrame,onFailure,onQuality,selfKey=''}={}){
 const coarse=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 let renderer;try{renderer=new T.WebGLRenderer({antialias:!coarse,powerPreference:'default'});}catch(cause){throw Object.assign(Error('La grafica 3D non è disponibile in questo browser. Prova ad attivare l’accelerazione grafica o ad aprire l’app nel browser aggiornato del telefono.'),{code:'ARENA_WEBGL',cause});}
 const resources=new Set(),own=x=>(resources.add(x),x),scene=new T.Scene(),camera=new T.PerspectiveCamera(43,1,.12,165);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.45:1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
 renderer.domElement.setAttribute('aria-label','SISAL ARENA in diretta. Trascina per ruotare; usa due dita per avvicinare.');host.append(renderer.domElement);
 scene.environment=own(environmentTexture({studio:false}));scene.environmentIntensity=.50;scene.background=new T.Color('#9fc9df');scene.fog=new T.Fog('#b7d3d6',62,140);
 const ground=buildGround(scene,{own,renderer,coarse}),sphere=own(new T.SphereGeometry(.14,24,16));
 const ballTexture=ground.texture((c,w,h)=>{c.fillStyle='#eeeede';c.fillRect(0,0,w,h);for(let row=0;row<4;row++)for(let j=0;j<8;j++){const x=(j+(row%2)*.5)*w/8,y=row*h/3;c.fillStyle='#123c2e';c.strokeStyle='#8e9d8e';c.lineWidth=1;c.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5-.7;c.lineTo(x+Math.cos(a)*9,y+Math.sin(a)*9);}c.closePath();c.fill();c.stroke();}},384,192),ballMat=own(new T.MeshStandardMaterial({color:'#fff',map:ballTexture,roughness:.47})),balls=new Map(),avatars=new Map();
 const contacts=new T.InstancedMesh(own(new T.CircleGeometry(.27,20)),own(new T.MeshBasicMaterial({color:'#152b1c',transparent:true,opacity:.20,depthWrite:false})),130);contacts.count=0;contacts.frustumCulled=false;scene.add(contacts);const dummy=new T.Object3D();
 const ring=new T.Mesh(own(new T.RingGeometry(.38,.42,48)),own(new T.MeshBasicMaterial({color:'#f4d47c',transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false})));ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
 let snapshot=initialSnapshot,disposed=false,raf=0,last=0,selected='',view='director',azimuth=.55,polar=1.04,radius=16,manual=false,paused=true,contextLost=false,width=800,height=600,lastRender=0,first=true,lastFit=16,quality='auto',level=1,drawInterval=1000/60,measured=0,wallSamples=0,frameSamples=0,lastDowngrade=0;
 const audio=arenaAudio(),center=new T.Vector3(),desiredCenter=new T.Vector3(),desiredCamera=new T.Vector3(),headPoint=new T.Vector3(),screenPoint=new T.Vector3(),raycaster=new T.Raycaster(),pointers=new Map();let pinch=null;
 function populate(frame){
  const keys=new Set(frame.actors.map(p=>p.key));for(const [key,a]of avatars)if(!keys.has(key)){a.root.removeFromParent();a.dispose();avatars.delete(key);}for(const p of frame.actors)if(!avatars.has(p.key)){const a=makeAvatar(p,coarse?0:1);avatars.set(p.key,a);scene.add(a.root);}
  const ids=new Set(frame.balls.map(b=>b.id));for(const [id,b]of balls)if(!ids.has(id)){b.removeFromParent();balls.delete(id);}for(const b of frame.balls)if(!balls.has(b.id)){const m=new T.Mesh(sphere,ballMat);m.name='arena-ball-'+b.id;m.castShadow=true;balls.set(b.id,m);scene.add(m);}
 }
 populate(sampleArena(snapshot,clock()));
 function resize(){width=host.clientWidth||800;height=host.clientHeight||600;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function setQuality(mode){quality=['auto','high','low'].includes(mode)?mode:'auto';level=quality==='low'?0:1;drawInterval=quality==='low'||reduced?1000/30:1000/60;renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality==='low'?1:coarse?1.45:1.8));renderer.shadowMap.enabled=quality!=='low';ground.sun.shadow.mapSize.set(quality==='low'?512:coarse?1024:2048,quality==='low'?512:coarse?1024:2048);ground.sun.shadow.map?.dispose();ground.sun.shadow.map=null;resize();onQuality?.({mode:quality,level});}
 function draw(ms){
  raf=0;if(disposed||document.hidden||paused||contextLost)return;if(ms-lastRender<drawInterval-1){raf=requestAnimationFrame(draw);return;}
  const elapsed=last?Math.min(.2,(ms-last)/1000):0;last=ms;lastRender=ms;const begin=performance.now(),time=clock(),f=sampleArena(snapshot,time),dialogue=f.dialogue,recent=f.recentDialogue,chosen=f.actors.find(p=>p.key===selected);let fit=16;
  if(chosen){desiredCenter.set(chosen.pos[0],.85,chosen.pos[1]);fit=radius;}
  else if(view==='field'){desiredCenter.set(0,.7,0);fit=49*Math.max(1,.88/camera.aspect);}
  else{let points=f.focus||[[0,0]];if(dialogue&&!f.playing){const speaker=f.actors.find(p=>p.key===dialogue.speaker);if(speaker&&Math.hypot(speaker.pos[0]-points[0][0],speaker.pos[1]-points[0][1])<9)points=[speaker.pos,...points.slice(0,2)];}const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);desiredCenter.set((x0+x1)/2,Math.max(.8,Math.min(1.4,f.ballHeight*.3)),(z0+z1)/2);fit=Math.max(8,Math.max(x1-x0+5,(z1-z0+5)*.8)/(2*Math.tan(T.MathUtils.degToRad(21.5))*Math.min(1.2,camera.aspect)));}
  if(first)center.copy(desiredCenter);else center.lerp(desiredCenter,1-Math.exp(-elapsed*(reduced?1.4:2.1)));
  if(manual)fit=radius;lastFit=T.MathUtils.clamp(fit,3.5,76);const pavilion=center.x>18.5,az=!manual&&pavilion?-1.24:azimuth,po=!manual&&pavilion?1.30:polar;
  desiredCamera.set(center.x+lastFit*Math.sin(po)*Math.sin(az),center.y+lastFit*Math.cos(po),center.z+lastFit*Math.sin(po)*Math.cos(az));
  if(first)camera.position.copy(desiredCamera);else camera.position.lerp(desiredCamera,1-Math.exp(-Math.max(elapsed,.008)*3.0));camera.lookAt(center);
  const self=f.actors.find(p=>p.key===selfKey);ring.visible=!!self;if(self)ring.position.set(self.pos[0],.02,self.pos[1]);
  f.actors.forEach((p,i)=>{const a=avatars.get(p.key);if(!a)return;a.setDetail((level>0&&camera.position.distanceTo(a.root.position)<13)||selected===p.key||selfKey===p.key);a.update({...p,speaking:dialogue?.speaker===p.key},time,elapsed,p.velocity);dummy.position.set(p.pos[0],.016,p.pos[1]);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();contacts.setMatrixAt(i,dummy.matrix);});contacts.count=f.actors.length;contacts.instanceMatrix.needsUpdate=true;
  for(const info of f.balls){const b=balls.get(info.id);if(b){b.visible=info.visible!==false;b.position.set(...info.pos);b.rotation.set(...(info.spin||[0,0,0]));}}
  ground.update(f,camera,level);audio.update(f,camera.position,elapsed);renderer.render(scene,camera);camera.updateMatrixWorld();scene.updateMatrixWorld();
  const anchors=f.actors.map(p=>{const a=avatars.get(p.key);a.head.getWorldPosition(headPoint);headPoint.y+=.36;screenPoint.copy(headPoint).project(camera);let visible=screenPoint.z>-1&&screenPoint.z<1&&Math.abs(screenPoint.x)<1.08&&Math.abs(screenPoint.y)<1.08;if(visible&&p.pos[0]>20){const distance=camera.position.distanceTo(headPoint);raycaster.set(camera.position,headPoint.clone().sub(camera.position).normalize());raycaster.far=distance-.05;visible=!raycaster.intersectObjects(ground.solids,false).length;}return {key:p.key,name:p.name,x:(screenPoint.x*.5+.5)*width,y:(-.5*screenPoint.y+.5)*height,visible,active:p.active,team:p.team,self:p.key===selfKey,selected:p.key===selected};});
  const names=new Map(f.actors.map(p=>[p.key,p.appearance?.nickname||p.name])),decorate=d=>d?{...d,name:names.get(d.speaker)||'Sisal'}:null;
  onFrame?.({title:f.scene.title,scene:f.scene.id,serial:0,time:f.elapsed,duration:null,dialogue:decorate(dialogue),recentDialogue:decorate(recent),people:f.actors.length,activePeople:f.actors.filter(p=>p.active&&!p.bot).length,match:f.match,anchors,width,height,live:true});
  measured+=performance.now()-begin;wallSamples+=elapsed*1000;frameSamples++;
  if(quality==='auto'&&frameSamples>=120){const average=measured/frameSamples,wallAverage=wallSamples/frameSamples;if((average>23||wallAverage>drawInterval*1.4)&&ms-lastDowngrade>8000){const ratio=Math.max(.85,renderer.getPixelRatio()-.20);renderer.setPixelRatio(ratio);resize();level=ratio>1?1:0;if(average>33||wallAverage>45)drawInterval=1000/30;lastDowngrade=ms;onQuality?.({mode:'auto',level});}measured=0;wallSamples=0;frameSamples=0;}first=false;raf=requestAnimationFrame(draw);
 }
 function pause(){paused=true;cancelAnimationFrame(raf);raf=0;last=0;audio.stop();}
 function resume(){if(!disposed&&!document.hidden&&!contextLost){paused=false;audio.resume();cancelAnimationFrame(raf);last=lastRender=0;raf=requestAnimationFrame(draw);}}
 const canvas=renderer.domElement;
 function down(e){if(!manual)radius=lastFit;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);manual=true;}
 function move(e){const p=pointers.get(e.pointerId);if(!p)return;if(pointers.size===2){pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=[...pointers.values()],distance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch)radius=T.MathUtils.clamp(radius+(pinch-distance)*.025,3.5,76);pinch=distance;}else{azimuth-=(e.clientX-p.x)*.006;polar=T.MathUtils.clamp(polar+(e.clientY-p.y)*.004,.35,1.44);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});}}
 function up(e){pointers.delete(e.pointerId);pinch=null;}
 function wheel(e){e.preventDefault();if(!manual)radius=lastFit;manual=true;radius=T.MathUtils.clamp(radius+e.deltaY*.025,3.5,76);}
 const lost=e=>{e.preventDefault();contextLost=true;pause();onFailure?.({code:'ARENA_CONTEXT_LOST',message:'Il dispositivo ha sospeso il 3D. Chiudi e riapri l’Arena. Puoi scegliere Risparmio nelle opzioni.'});};
 const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,wheel,webglcontextlost:lost};for(const [name,fn]of Object.entries(handlers))canvas.addEventListener(name,fn,name==='wheel'?{passive:false}:undefined);
 resume();return {follow(key){selected=key||'';view=key?'follow':'director';radius=key?4.6:16;manual=false;},view(mode){view=mode;selected='';manual=false;},zoom(d){if(!manual)radius=lastFit;manual=true;radius=T.MathUtils.clamp(radius+d,3.5,76);},setQuality,
 replaceSnapshot(next){snapshot=next;populate(sampleArena(snapshot,clock()));},toggleAudio:()=>audio.toggle(),pause,resume,
 dispose(){if(disposed)return;disposed=true;pause();audio.dispose();observer.disconnect();for(const [name,fn]of Object.entries(handlers))canvas.removeEventListener(name,fn);for(const a of avatars.values())a.dispose();contacts.dispose();ground.dispose();resources.forEach(r=>r.dispose?.());renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 };
}
