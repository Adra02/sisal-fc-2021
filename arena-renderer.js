import {environmentTexture} from './studio-materials.js?v=studio-5';
import * as T from './vendor/three.module.min.js';
import {makeAvatar} from './arena-avatar.js?v=arena-2';
import {sampleArena} from './arena-simulation.js?v=arena-2';
import {dialogueFor} from './arena-dialogue.js?v=arena-2';
import {arenaAudio} from './arena-audio.js?v=arena-2';
export function createArenaRenderer(host,snapshot,{clock,onFrame,onFailure}={}){
 const coarse=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const renderer=new T.WebGLRenderer({antialias:!coarse,powerPreference:'default'}),resources=new Set(),own=x=>(resources.add(x),x);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.2:1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;
 renderer.domElement.setAttribute('aria-label','SISAL ARENA, campo di allenamento condiviso. Trascina per ruotare, usa i pulsanti per lo zoom.');host.appendChild(renderer.domElement);
 const scene=new T.Scene();scene.environment=own(environmentTexture({studio:false}));scene.environmentIntensity=.25;scene.background=new T.Color('#a5c9d3');scene.fog=new T.Fog('#b5d0d2',58,135);
 const camera=new T.PerspectiveCamera(43,1,.1,150),mat=(color,extra={})=>own(new T.MeshStandardMaterial({color,roughness:.85,...extra})),box=own(new T.BoxGeometry(1,1,1)),sphere=own(new T.SphereGeometry(1,18,12));
 function mesh(g,m,pos,scale=[1,1,1]){const o=new T.Mesh(g,m);o.position.set(...pos);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o}
 const cube=(m,p,s)=>mesh(box,m,p,s),ball=(m,p,s)=>mesh(sphere,m,p,s);
 function texture(draw,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tx=own(new T.CanvasTexture(c));tx.colorSpace=T.SRGBColorSpace;return tx}
 const turfTex=texture((c,w,h)=>{c.fillStyle='#367447';c.fillRect(0,0,w,h);let s=28;for(let i=0;i<24000;i++){s=(s*1664525+1013904223)>>>0;const x=s%w;s=(s*1664525+1013904223)>>>0;const y=s%h;c.fillStyle=['#4b8750','#28633a','#649254'][i%3];c.fillRect(x,y,1,3)}});turfTex.wrapS=turfTex.wrapT=T.RepeatWrapping;turfTex.repeat.set(8,13);
 const turf=mat('#ffffff',{map:turfTex,bumpMap:turfTex,bumpScale:.018,roughness:1}),dark=mat('#15382c'),white=mat('#e0e5cf'),metal=mat('#61766c',{metalness:.55,roughness:.42}),wood=mat('#a68c60'),rubber=mat('#263e33');
 cube(turf,[0,-.16,0],[38,.3,54]);
 const stripe=mat('#b4c58d',{transparent:true,opacity:.075,depthWrite:false});for(let z=-20;z<20;z+=8)cube(stripe,[0,.003,z+2],[26,.005,4]);
 const lines=[];function line(points){const g=own(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))));const l=new T.Line(g,own(new T.LineBasicMaterial({color:'#e6e8d2'})));scene.add(l);lines.push(l)}
 line([[-13,.012,-20],[13,.012,-20],[13,.012,20],[-13,.012,20],[-13,.012,-20]]);line([[-13,.012,0],[13,.012,0]]);
 line(Array.from({length:65},(_,i)=>[Math.sin(i/64*Math.PI*2)*3,.012,Math.cos(i/64*Math.PI*2)*3]));
 for(const s of [-1,1]){line([[-6,.015,s*20],[-6,.015,s*14],[6,.015,s*14],[6,.015,s*20]]);line([[-3.5,.015,s*20],[-3.5,.015,s*17.5],[3.5,.015,s*17.5],[3.5,.015,s*20]])}
 // Working goal and flexible back net.
 const netMaterial=own(new T.LineBasicMaterial({color:'#d4dfcd',transparent:true,opacity:.65})),netPoints=[];
 for(let x=-3;x<=3.001;x+=.25){netPoints.push(x,0,-19.3,x,2.4,-19.3)}
 for(let y=0;y<=2.401;y+=.2){netPoints.push(-3,y,-19.3,3,y,-19.3)}
 const netGeometry=own(new T.BufferGeometry());netGeometry.setAttribute('position',new T.Float32BufferAttribute(netPoints,3));const netBase=Float32Array.from(netPoints);const net=new T.LineSegments(netGeometry,netMaterial);scene.add(net);
 for(const x of [-3,3])cube(white,[x,1.2,-18.2],[.095,2.4,.095]);cube(white,[0,2.4,-18.2],[6.1,.095,.095]);
 for(const x of [-3,3]){line([[x,0,-18.2],[x,0,-19.3],[x,2.4,-19.3],[x,2.4,-18.2]]);for(let y=.2;y<2.4;y+=.25)line([[x,y,-18.2],[x,y,-19.3]])}
 // Pavilion, roof, bench and bottle zone; balls can reach these objects.
 cube(dark,[9,1.5,4.3],[8,3,.25]);cube(dark,[9,3.2,2.5],[8.5,.16,4]);for(const x of [5.2,12.8])cube(metal,[x,1.6,1],[.12,3.2,.12]);
 cube(wood,[9,.46,1.25],[6,.13,.45]);cube(wood,[9,.82,1.55],[6,.5,.10]);for(const x of [6.4,11.6])cube(metal,[x,.22,1.25],[.12,.44,.4]);
 const bottle=mesh(own(new T.CylinderGeometry(.07,.075,.35,10)),mat('#a1cb6e'),[9,.18,1]);bottle.rotation.z=0;
 // Tennis net and modest training props.
 const tennis=new T.Group();scene.add(tennis);for(const x of [6,12]){const pole=new T.Mesh(box,white);pole.position.set(x,.5,0);pole.scale.set(.04,1,.04);tennis.add(pole)}
 const tnet=new T.Mesh(own(new T.PlaneGeometry(6,.75)),mat('#1c2f25',{side:T.DoubleSide,transparent:true,opacity:.3}));tnet.position.set(9,.55,0);tennis.add(tnet);
 const coneGeo=own(new T.ConeGeometry(.14,.35,12)),coneMat=mat('#d1a653');for(const p of [[-3,-7],[3,-7],[3,-12],[-3,-12]])mesh(coneGeo,coneMat,[p[0],.175,p[1]]);
 // Fence: instanced posts, restrained perimeter, no thousands of independent meshes.
 const fence=new T.InstancedMesh(box,metal,36);const dummy=new T.Object3D();for(let i=0;i<36;i++){const side=i<18?-1:1,j=i%18;dummy.position.set(side*17,1.8,-25+j*3);dummy.scale.set(.055,3.6,.055);dummy.updateMatrix();fence.setMatrixAt(i,dummy.matrix)}scene.add(fence);
 for(const side of [-1,1])for(let y=.4;y<3.6;y+=.5)line([[side*17,y,-25],[side*17,y,26]]);
 const signMap=texture((c,w,h)=>{c.fillStyle='#10392b';c.fillRect(0,0,w,h);c.fillStyle='#d6c594';c.font='700 68px Arial';c.textAlign='center';c.fillText('SISAL ARENA',w/2,98);c.font='22px Arial';c.fillText('FC 2021  /  IL NOSTRO CAMPO',w/2,145)},1024,192);
 mesh(own(new T.PlaneGeometry(8,1.5)),mat('#ffffff',{map:signMap}),[9,2.2,4.12]).rotation.y=0;
 // Soft sun and field illumination.
 scene.add(new T.HemisphereLight('#e3f5fa','#334d35',1.7));const sun=new T.DirectionalLight('#ffefd1',3);sun.position.set(-10,22,10);sun.castShadow=true;sun.shadow.mapSize.set(coarse?1024:2048,coarse?1024:2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:26,bottom:-26,near:1,far:70});sun.shadow.normalBias=.025;scene.add(sun);
 const fill=new T.DirectionalLight('#bdcfdf',.6);fill.position.set(14,7,-15);scene.add(fill);
 const ballTexture=texture((c,w,h)=>{c.fillStyle='#f0eddd';c.fillRect(0,0,w,h);c.fillStyle='#153426';for(let y=0;y<h;y+=h/3)for(let x=0;x<w;x+=w/5){c.beginPath();for(let j=0;j<5;j++){const a=j*Math.PI*2/5-.4;c.lineTo(x+Math.cos(a)*20,y+Math.sin(a)*20)}c.closePath();c.fill()}},256,128);
 const ballMat=mat('#ffffff',{map:ballTexture,roughness:.5}),balls=[];
 for(let i=0;i<Math.ceil(snapshot.players.length/2)+3;i++)balls.push(ball(ballMat,[0,.14,0],[.14,.14,.14]));
 const spare=ball(ballMat,[8,.14,1],[.14,.14,.14]);
 const avatars=new Map(),first=sampleArena(snapshot,clock());
 for(const p of first.actors){const avatar=makeAvatar(p,coarse?0:1);scene.add(avatar.root);avatars.set(p.key,avatar)}
 const contacts=new T.InstancedMesh(own(new T.CircleGeometry(.28,16)),own(new T.MeshBasicMaterial({color:'#15251b',transparent:true,opacity:.2,depthWrite:false})),first.actors.length);scene.add(contacts);
 const audio=arenaAudio();let disposed=false,raf=0,last=0,frameCount=0,totalFrame=0,selected='',azimuth=.65,polar=.82,radius=34,drag=null;
 const center=new T.Vector3(0,.5,-5);let lastScene=-1,cachedDialogue=[],paused=true,contextLost=false,lastRender=0;
 const names=new Map(first.actors.map(p=>[p.key,p.name]));
 const resize=()=>{const w=host.clientWidth||800,h=host.clientHeight||600;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function draw(ms){
  raf=0;if(disposed||document.hidden||paused||contextLost)return;if(ms-lastRender<(coarse?1000/30:1000/60)-1){raf=requestAnimationFrame(draw);return;}lastRender=ms;const delta=last?Math.min(.1,(ms-last)/1000):0;last=ms;const time=clock(),f=sampleArena(snapshot,time),next=sampleArena(snapshot,time+.025);const sameScene=next.serial===f.serial;
  if(lastScene!==f.serial){const cast=['save','saveApplause','read'].includes(f.scene.event)?[f.cast[0],f.actors.at(-1).key]:f.cast;cachedDialogue=dialogueFor(f.scene,f.serial,cast)}const dialogue=cachedDialogue.find(d=>f.t>=d.at&&f.t<d.until);
  const chosen=f.actors.find(p=>p.key===selected);if(chosen)center.lerp(new T.Vector3(chosen.pos[0],1,chosen.pos[1]),reduced?1:Math.min(1,delta*3));
  const viewRadius=selected?radius:radius*Math.max(1,.90/camera.aspect);camera.position.set(center.x+viewRadius*Math.sin(polar)*Math.sin(azimuth),center.y+viewRadius*Math.cos(polar),center.z+viewRadius*Math.sin(polar)*Math.cos(azimuth));camera.lookAt(center);
  f.actors.forEach((p,i)=>{const avatar=avatars.get(p.key);avatar?.setDetail(selected===p.key||camera.position.distanceTo(avatar.root.position)<18);const n=next.actors[i];avatar?.update(p,time,delta,sameScene&&n?[(n.pos[0]-p.pos[0])/.025,(n.pos[1]-p.pos[1])/.025]:[0,0]);dummy.position.set(p.pos[0],.016,p.pos[1]);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();contacts.setMatrixAt(i,dummy.matrix)});contacts.instanceMatrix.needsUpdate=true;
  balls.forEach((b,i)=>{const info=f.balls[i];b.visible=!!info&&info.visible!==false;if(info){b.position.set(...info.pos);b.rotation.x=time*3;b.rotation.z=time*1.7}});
  spare.visible=f.props.spare;bottle.rotation.z=f.props.bottle*Math.PI*.48;bottle.position.y=f.props.bottle>.1?.08:.18;tennis.visible=f.props.tennis;
  const positions=netGeometry.attributes.position;for(let i=0;i<positions.count;i++){const x=netBase[i*3],y=netBase[i*3+1];positions.setZ(i,netBase[i*3+2]-Math.abs(f.props.net)*Math.exp(-Math.pow(x-f.props.netX,2))*(1-y/3))}positions.needsUpdate=true;
  audio.update(f,camera.position,delta);
  renderer.render(scene,camera);frameCount++;totalFrame+=delta;
  if(frameCount===180){if(totalFrame>7&&renderer.getPixelRatio()>.8){renderer.setPixelRatio(Math.max(.8,renderer.getPixelRatio()-.2));resize()}frameCount=0;totalFrame=0}
  onFrame?.({title:f.scene.title,serial:f.serial,time:f.t,dialogue:dialogue?{...dialogue,name:names.get(dialogue.speaker)||'Sisal'}:null,people:f.actors.length});
  lastScene=f.serial;raf=requestAnimationFrame(draw);
 }
 function pause(){paused=true;cancelAnimationFrame(raf);raf=0;last=0;audio.stop()}
 function resume(){if(!disposed&&!document.hidden&&!contextLost){paused=false;audio.resume();cancelAnimationFrame(raf);last=0;lastRender=0;raf=requestAnimationFrame(draw)}}
 // Visibility and local pause are owned by the dialog; never resume a deliberately paused scene.

 const canvas=renderer.domElement;
 function down(e){drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)}
 function move(e){if(!drag||drag.id!==e.pointerId)return;azimuth-=(e.clientX-drag.x)*.007;polar=Math.max(.3,Math.min(1.32,polar+(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY}
 function up(){drag=null}
 function wheel(e){e.preventDefault();radius=Math.max(4,Math.min(58,radius+e.deltaY*.025))}
 const lost=e=>{e.preventDefault();contextLost=true;pause();onFailure?.('Il telefono ha sospeso la grafica 3D. Chiudi e riapri l’Arena.')};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('webglcontextlost',lost);
 resume();
 return {follow:key=>{selected=key;if(key)radius=6;else{radius=34;center.set(0,.5,-5)}},zoom:d=>radius=Math.max(4,Math.min(58,radius+d)),toggleAudio:()=>audio.toggle(),pause,resume,
 dispose(){if(disposed)return;disposed=true;pause();audio.dispose();observer.disconnect();canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);avatars.forEach(a=>a.dispose());contacts.dispose();fence.dispose();resources.forEach(r=>r.dispose?.());renderer.dispose();renderer.forceContextLoss();canvas.remove()}
 };
}
