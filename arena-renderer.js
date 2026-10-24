import * as T from './vendor/three.module.min.js';
import {environmentTexture} from './studio-materials.js?v=studio-7';
import {makeAvatar} from './arena-avatar.js?v=arena-4';
import {sampleArena} from './arena-simulation.js?v=arena-4';
import {dialogueFor} from './arena-dialogue.js?v=arena-4';
import {arenaAudio} from './arena-audio.js?v=arena-4';
import {FIELD,PAVILION} from './arena-layout.js?v=arena-4';
export function createArenaRenderer(host,snapshot,{clock,onFrame,onFailure,selfKey=''}={}){
 const coarse=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const renderer=new T.WebGLRenderer({antialias:!coarse,powerPreference:'default'}),resources=new Set(),own=x=>(resources.add(x),x);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.4:1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 renderer.domElement.setAttribute('aria-label','Campo di allenamento SISAL ARENA. Trascina per ruotare; scegli Regia, Campo o un giocatore da seguire.');host.appendChild(renderer.domElement);
 const scene=new T.Scene();scene.environment=own(environmentTexture({studio:false}));scene.environmentIntensity=.42;scene.background=new T.Color('#a6cbd9');scene.fog=new T.Fog('#b4cdd0',55,125);
 const camera=new T.PerspectiveCamera(40,1,.1,155),mat=(color,extra={})=>own(new T.MeshStandardMaterial({color,roughness:.84,...extra})),box=own(new T.BoxGeometry(1,1,1)),sphere=own(new T.SphereGeometry(1,20,14)),dummy=new T.Object3D();
 function mesh(g,m,pos,scale=[1,1,1],name=''){const o=new T.Mesh(g,m);o.name=name;o.position.set(...pos);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}
 const cube=(m,p,s,name)=>mesh(box,m,p,s,name),ball=(m,p,s)=>mesh(sphere,m,p,s);
 function texture(draw,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tx=own(new T.CanvasTexture(c));tx.colorSpace=T.SRGBColorSpace;return tx;}
 const turfTex=texture((c,w,h)=>{c.fillStyle='#407b45';c.fillRect(0,0,w,h);let s=28;for(let i=0;i<32000;i++){s=(s*1664525+1013904223)>>>0;const x=s%w;s=(s*1664525+1013904223)>>>0;const y=s%h;c.fillStyle=['#4b8650','#316c40','#67945c','#3e7844'][i%4];c.fillRect(x,y,.7+(i%3)*.35,1.5+(i%5)*.35);}});turfTex.wrapS=turfTex.wrapT=T.RepeatWrapping;turfTex.repeat.set(15,18);
 turfTex.anisotropy=Math.min(8,renderer.capabilities?.getMaxAnisotropy?.()||1);
 const turf=mat('#fff',{map:turfTex,bumpMap:turfTex,bumpScale:.018,roughness:1}),dark=mat('#153c30'),white=mat('#eeeede'),metal=mat('#6f807b',{metalness:.65,roughness:.4}),wood=mat('#9d7e54'),concrete=mat('#b2b4a0',{roughness:1});
 cube(turf,[0,-.16,0],[72,.3,66],'training-ground');cube(mat('#9a9e8d'),[23,-.07,8],[11,.12,19],'pavilion-hardstanding');
 // Local wear under frequent drills and in the goalmouths; the underlying
 // pitch and markings stay readable. Generated once, no texture downloads.
 const wearMap=texture((c,w,h)=>{let seed=721;for(let i=0;i<8500;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%w;seed=(seed*1664525+1013904223)>>>0;const y=seed%h,fall=Math.max(0,1-Math.hypot((x-w/2)/(w/2),(y-h/2)/(h/2)));c.fillStyle='rgba(151,145,83,'+(fall*.10)+')';c.fillRect(x,y,1+i%5,2+i%3);}});
 const wear=mat('#d8ca93',{map:wearMap,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-1});
 for(const [x,z,w,h]of [[0,-23,7,5],[0,23,6,4],[-5,-8,9,7]]){const patch=mesh(own(new T.PlaneGeometry(w,h)),wear,[x,.006,z],[1,1,1],'natural-pitch-wear');patch.rotation.x=-Math.PI/2;patch.castShadow=false;}
 const stripe=mat('#b6ce96',{transparent:true,opacity:.065,depthWrite:false});for(let z=-FIELD.halfLength;z<FIELD.halfLength;z+=8)cube(stripe,[0,.002,z+2],[FIELD.halfWidth*2,.004,4]);
 const lineMat=own(new T.LineBasicMaterial({color:'#f0f1dd'}));
 function line(points,name=''){const g=own(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))));const l=new T.Line(g,lineMat);l.name=name;scene.add(l);return l;}
 function paint(points){for(let i=1;i<points.length;i++){const a=new T.Vector3(...points[i-1]),b=new T.Vector3(...points[i]),d=b.clone().sub(a),o=mesh(box,white,a.add(b).multiplyScalar(.5).toArray(),[.065,.006,d.length()]);o.rotation.y=Math.atan2(d.x,d.z);o.castShadow=false;}}
 paint([[-17,.012,-26],[17,.012,-26],[17,.012,26],[-17,.012,26],[-17,.012,-26]]);paint([[-17,.012,0],[17,.012,0]]);
 line(Array.from({length:97},(_,i)=>[Math.sin(i/96*Math.PI*2)*4.6,.016,Math.cos(i/96*Math.PI*2)*4.6]));
 for(const sign of [-1,1]){paint([[-7,.014,sign*26],[-7,.014,sign*18],[7,.014,sign*18],[7,.014,sign*26]]);paint([[-3.6,.014,sign*26],[-3.6,.014,sign*22.6],[3.6,.014,sign*22.6],[3.6,.014,sign*26]]);}
 // Both goals sit on the end lines. One dynamic net follows the actual shot.
 const netMaterial=own(new T.LineBasicMaterial({color:'#edf1dd',transparent:true,opacity:.62})),netPoints=[];
 for(let x=-3;x<=3.001;x+=.22)netPoints.push(x,0,FIELD.netZ,x,2.4,FIELD.netZ);
 for(let y=0;y<=2.401;y+=.18)netPoints.push(-3,y,FIELD.netZ,3,y,FIELD.netZ);
 const netGeometry=own(new T.BufferGeometry());netGeometry.setAttribute('position',new T.Float32BufferAttribute(netPoints,3));const netBase=Float32Array.from(netPoints),net=new T.LineSegments(netGeometry,netMaterial);net.name='flexible-goal-net';scene.add(net);
 for(const sign of [-1,1]){
  const gz=sign*26,bz=sign*27.25;
  for(const x of [-3,3]){cube(white,[x,1.2,gz],[.10,2.4,.10]);line([[x,0,gz],[x,0,bz],[x,2.4,bz],[x,2.4,gz]]);for(let y=.2;y<2.4;y+=.25)line([[x,y,gz],[x,y,bz]]);}
  cube(white,[0,2.4,gz],[6.1,.1,.1]);
  if(sign>0)for(let x=-3;x<=3;x+=.3)line([[x,0,bz],[x,2.4,bz]]);
 }
 // All pavilion fixtures are beyond x=17, completely outside the playing field.
 const roofMat=mat('#234e40',{metalness:.35,roughness:.45}),wallTex=texture((c,w,h)=>{c.fillStyle='#e4e1cd';c.fillRect(0,0,w,h);c.fillStyle='#858e7c';for(let y=0;y<h;y+=18)c.fillRect(0,y,w,1);});wallTex.wrapS=wallTex.wrapT=T.RepeatWrapping;wallTex.repeat.set(3,2);
 cube(mat('#fff',{map:wallTex}),[27.1,1.48,8],[.25,2.96,12],'pavilion-back-wall');cube(roofMat,[24,PAVILION.roofY,8],[7.6,.16,12.5],'pavilion-roof');
 for(const z of [2.1,13.9]){cube(metal,[20.4,1.62,z],[.09,3.24,.09]);cube(metal,[27.1,1.62,z],[.09,3.24,.09]);cube(metal,[23.8,3.13,z],[6.8,.08,.08]);}
 const benchSeat=mat('#1c6747',{roughness:.53});for(let i=0;i<6;i++){const z=3.9+i*1.65;cube(benchSeat,[22,.48,z],[.65,.12,1.4],'bench-seat-'+i);cube(benchSeat,[22.34,.86,z],[.10,.66,1.4]);cube(metal,[22.0,.21,z],[.08,.42,.12]);}
 const equipment=mat('#315549');cube(equipment,[25,.38,12.8],[1.4,.76,1.2],'equipment-box');cube(wood,[22.2,.18,12.5],[.55,.08,.5]);
 const bottle=mesh(own(new T.CylinderGeometry(.06,.075,.36,12)),mat('#7fb59a',{roughness:.32}),[...PAVILION.bottle]);
 const signMap=texture((c,w,h)=>{c.fillStyle='#0b3327';c.fillRect(0,0,w,h);c.fillStyle='#d8eecf';c.font='800 77px Arial';c.textAlign='center';c.fillText('SISAL ARENA',w/2,100);c.fillStyle='#d3bd80';c.font='24px Arial';c.fillText('IL CAMPO DEL CLUB / FC 2021',w/2,150)},1024,192);
 const sign=mesh(own(new T.PlaneGeometry(8,1.45)),mat('#fff',{map:signMap}),[26.94,2.17,8]);sign.rotation.y=-Math.PI/2;
 // Perimeter rail, ball-stop net and planted trees form a credible enclosed training ground.
 const fencePosts=new T.InstancedMesh(box,metal,68);for(let i=0;i<68;i++){const side=i<34?-1:1,j=i%34;dummy.position.set(side*32,2,-31+j*1.9);dummy.scale.set(.055,4,.055);dummy.updateMatrix();fencePosts.setMatrixAt(i,dummy.matrix);}scene.add(fencePosts);
 const gridPoints=[];for(const sign of [-1,1]){for(let z=-31;z<=31;z+=.5)gridPoints.push(sign*32,.3,z,sign*32,4,z);for(let y=.3;y<=4;y+=.5)gridPoints.push(sign*32,y,-31,sign*32,y,31);}
 const fenceGeometry=own(new T.BufferGeometry());fenceGeometry.setAttribute('position',new T.Float32BufferAttribute(gridPoints,3));scene.add(new T.LineSegments(fenceGeometry,own(new T.LineBasicMaterial({color:'#466756',transparent:true,opacity:.36}))));
 const treeGeo=own(new T.SphereGeometry(1,9,7)),leaves=mat('#3e6545',{roughness:1}),trunks=new T.InstancedMesh(box,wood,22),trees=new T.InstancedMesh(treeGeo,leaves,44);
 for(let i=0;i<22;i++){const x=i<11?-34:34,z=-29+(i%11)*5.5;dummy.position.set(x,1.5,z);dummy.scale.set(.22,3,.22);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);for(let j=0;j<2;j++){dummy.position.set(x+(j-.5)*.6,3.3+j*.8,z);dummy.scale.set(1.4,1.5,1.3);dummy.updateMatrix();trees.setMatrixAt(i*2+j,dummy.matrix);}}trunks.castShadow=trees.castShadow=true;scene.add(trunks,trees);
 const adMap=texture((c,w,h)=>{c.fillStyle='#0b3b2a';c.fillRect(0,0,w,h);c.fillStyle='#c8e8c5';c.font='800 50px Arial';c.fillText('SISAL FC 2021',30,77);c.font='21px Arial';c.fillStyle='#cbbd90';c.fillText('IL NOSTRO CAMPO. LA NOSTRA SQUADRA.',30,116)},768,160);
 for(let i=0;i<4;i++){const ad=mesh(own(new T.PlaneGeometry(7,1.4)),mat('#fff',{map:adMap}),[-23,.85,-19+i*11]);ad.rotation.y=Math.PI/2;}
 const tennis=new T.Group();scene.add(tennis);for(const x of [6,12]){const pole=new T.Mesh(box,white);pole.position.set(x,.6,5);pole.scale.set(.04,1.2,.04);tennis.add(pole);}const tn=new T.Mesh(own(new T.PlaneGeometry(6,.8)),mat('#1c3023',{side:T.DoubleSide,transparent:true,opacity:.36}));tn.position.set(9,.7,5);tennis.add(tn);
 const coneGeo=own(new T.ConeGeometry(.14,.34,12)),coneMat=mat('#edb853');for(const p of [[-8,-5.3],[-2,-5.3],[-2,-10.7],[-8,-10.7]])mesh(coneGeo,coneMat,[p[0],.17,p[1]]);
 scene.add(new T.HemisphereLight('#dfedf4','#405b38',1.8));const sun=new T.DirectionalLight('#fff0d8',2.55);sun.position.set(-13,24,14);sun.castShadow=true;sun.shadow.mapSize.set(coarse?1024:2048,coarse?1024:2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:34,bottom:-34,near:1,far:85});sun.shadow.normalBias=.018;scene.add(sun);const fill=new T.DirectionalLight('#c3d9ec',.5);fill.position.set(15,9,-18);scene.add(fill);
 const ballTexture=texture((c,w,h)=>{c.fillStyle='#f4f0df';c.fillRect(0,0,w,h);c.strokeStyle='#bec8ba';c.lineWidth=1;c.fillStyle='#153d31';for(let y=0;y<h;y+=h/3)for(let x=0;x<w;x+=w/5){c.beginPath();for(let j=0;j<5;j++){const a=j*Math.PI*2/5-.4;c.lineTo(x+Math.cos(a)*17,y+Math.sin(a)*17);}c.closePath();c.fill();c.stroke();}},256,128),ballMat=mat('#fff',{map:ballTexture,roughness:.46}),balls=[];
 for(let i=0;i<Math.ceil(snapshot.players.length/2)+5;i++)balls.push(ball(ballMat,[0,.14,0],[.14,.14,.14]));
 const spares=[];for(let i=0;i<3;i++)spares.push(ball(ballMat,[PAVILION.spare[0]+i*.30,.14,PAVILION.spare[2]],[.14,.14,.14]));
 const avatars=new Map(),first=sampleArena(snapshot,clock());for(const p of first.actors){const a=makeAvatar(p,coarse?0:1);scene.add(a.root);avatars.set(p.key,a);}
 const contacts=new T.InstancedMesh(own(new T.CircleGeometry(.26,18)),own(new T.MeshBasicMaterial({color:'#17281c',transparent:true,opacity:.18,depthWrite:false})),first.actors.length);scene.add(contacts);
 const selfRing=new T.Mesh(own(new T.RingGeometry(.37,.43,48)),own(new T.MeshBasicMaterial({color:'#f1d57a',transparent:true,opacity:.95,side:T.DoubleSide,depthWrite:false})));selfRing.rotation.x=-Math.PI/2;selfRing.position.y=.018;selfRing.visible=false;scene.add(selfRing);
 const selfArrow=new T.Mesh(own(new T.ConeGeometry(.075,.14,3)),own(new T.MeshBasicMaterial({color:'#ffe696'})));scene.add(selfArrow);selfArrow.visible=false;
 const audio=arenaAudio();let disposed=false,raf=0,last=0,selected='',view='director',azimuth=.62,polar=1.09,radius=17,manual=false,paused=true,contextLost=false,lastRender=0,lastScene=-1,cachedDialogue=[],lastDialogue=null,width=800,height=600;
 const center=new T.Vector3(-5,.8,-8),desiredCenter=new T.Vector3(),desiredCamera=new T.Vector3(),headPoint=new T.Vector3(),screenPoint=new T.Vector3(),pointers=new Map();let pinch=null,frameCount=0,totalFrame=0,lastFit=17;
 const names=new Map(first.actors.map(p=>[p.key,p.name]));
 const resize=()=>{width=host.clientWidth||800;height=host.clientHeight||600;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function draw(ms){
  raf=0;if(disposed||document.hidden||paused||contextLost)return;
  if(ms-lastRender<(coarse?1000/30:1000/60)-1){raf=requestAnimationFrame(draw);return;}lastRender=ms;
  const delta=last?Math.min(.1,(ms-last)/1000):0;last=ms;const time=clock(),f=sampleArena(snapshot,time);
  if(lastScene!==f.serial){const cast=['save','saveApplause','read'].includes(f.scene.event)?[f.cast[0],f.actors.at(-1).key]:f.cast;cachedDialogue=dialogueFor(f.scene,f.serial,cast,{eventAt:f.eventAt,beats:f.beats,botKeeper:f.actors.at(-1).key==='__keeper_bot'});}
  const dialogue=cachedDialogue.find(d=>f.t>=d.at&&f.t<d.until),recentDialogue=[...cachedDialogue].reverse().find(d=>f.t>=d.at)||lastDialogue,chosen=f.actors.find(p=>p.key===selected);
  if(recentDialogue)lastDialogue=recentDialogue;
  let fit=17;
  if(chosen){desiredCenter.set(chosen.pos[0],.84,chosen.pos[1]);fit=radius;}
  else if(view==='field'){desiredCenter.set(0,.7,-1);fit=49*Math.max(1,.9/camera.aspect);}
  else{let points=f.focus;if(dialogue&&!reduced){const speaker=f.actors.find(p=>p.key===dialogue.speaker),listener=f.actors.filter(p=>p.key!==dialogue.speaker&&f.cast.includes(p.key)).sort((a,b)=>Math.hypot(a.pos[0]-(speaker?.pos[0]||0),a.pos[1]-(speaker?.pos[1]||0))-Math.hypot(b.pos[0]-(speaker?.pos[0]||0),b.pos[1]-(speaker?.pos[1]||0)))[0];if(speaker)points=[speaker.pos,...(listener&&Math.hypot(listener.pos[0]-speaker.pos[0],listener.pos[1]-speaker.pos[1])<7?[listener.pos]:[])];}const loX=Math.min(...points.map(p=>p[0])),hiX=Math.max(...points.map(p=>p[0])),loZ=Math.min(...points.map(p=>p[1])),hiZ=Math.max(...points.map(p=>p[1]));desiredCenter.set((loX+hiX)/2,.8,(loZ+hiZ)/2);const spread=Math.max(hiX-loX+4,(hiZ-loZ+4)*.72);fit=Math.max(7,spread/(2*Math.tan(T.MathUtils.degToRad(20))*Math.min(1.3,camera.aspect)))*1.08;if(manual)fit=radius;}
  if(lastScene<0)center.copy(desiredCenter);else center.lerp(desiredCenter,reduced?1:1-Math.exp(-delta*2.8));if(manual&&!chosen)fit=radius;
  // The pavilion is open to the west: view its occupants from the field,
  // never through the back wall or the roof. Manual orbit remains available.
  const viewAzimuth=!manual&&(chosen?chosen.pos[0]>19:view==='director'&&(f.scene.kind==='rest'||f.scene.event==='roof'))?-1.05:azimuth+(!manual&&!chosen&&view==='director'?(f.variation?.yaw||0)*.35:0);
  const r=Math.min(67,Math.max(3.6,fit));lastFit=r;desiredCamera.set(center.x+r*Math.sin(polar)*Math.sin(viewAzimuth),center.y+r*Math.cos(polar),center.z+r*Math.sin(polar)*Math.cos(viewAzimuth));if(lastScene<0)camera.position.copy(desiredCamera);else camera.position.lerp(desiredCamera,reduced?1:1-Math.exp(-Math.max(delta,.016)*3.8));camera.lookAt(center);
  const self=f.actors.find(p=>p.key===selfKey);selfRing.visible=selfArrow.visible=!!self;if(self){selfRing.position.set(self.pos[0],.018,self.pos[1]);selfArrow.position.set(self.pos[0],1.69,self.pos[1]);selfArrow.rotation.z=Math.PI;}
  f.actors.forEach((p,i)=>{const avatar=avatars.get(p.key);avatar.setDetail(selected===p.key||selfKey===p.key||camera.position.distanceTo(avatar.root.position)<17);avatar.update({...p,speaking:dialogue?.speaker===p.key},time,delta,p.velocity);dummy.position.set(p.pos[0],.016,p.pos[1]);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();contacts.setMatrixAt(i,dummy.matrix);});contacts.instanceMatrix.needsUpdate=true;
  balls.forEach((b,i)=>{const info=f.balls[i];b.visible=!!info&&info.visible!==false;if(info){b.position.set(...info.pos);b.rotation.x=info.pos[2]/.14;b.rotation.z=-info.pos[0]/.14;}});spares[0].visible=!f.props.spare;bottle.rotation.z=f.props.bottle*Math.PI*.48;tennis.visible=f.props.tennis;
  const positions=netGeometry.attributes.position;for(let i=0;i<positions.count;i++){const x=netBase[i*3],y=netBase[i*3+1];positions.setZ(i,netBase[i*3+2]-Math.abs(f.props.net)*Math.exp(-Math.pow(x-f.props.netX,2))*(1-y/3));}positions.needsUpdate=true;
  audio.update(f,camera.position,delta);renderer.render(scene,camera);
  camera.updateMatrixWorld();const anchors=f.actors.map(p=>{const a=avatars.get(p.key);a.head.getWorldPosition(headPoint);headPoint.y+=.23;screenPoint.copy(headPoint).project(camera);return {key:p.key,name:p.name,x:(screenPoint.x*.5+.5)*width,y:(-.5*screenPoint.y+.5)*height,visible:screenPoint.z>-1&&screenPoint.z<1&&Math.abs(screenPoint.x)<1.12&&Math.abs(screenPoint.y)<1.12,active:p.active,self:p.key===selfKey,selected:p.key===selected};});
  onFrame?.({title:f.scene.title,scene:f.scene.id,serial:f.serial,time:f.elapsed,duration:f.duration,dialogue:dialogue?{...dialogue,name:names.get(dialogue.speaker)||'Sisal'}:null,recentDialogue:recentDialogue?{...recentDialogue,name:names.get(recentDialogue.speaker)||'Sisal'}:null,people:f.actors.length,anchors,width,height});
  frameCount++;totalFrame+=delta;if(frameCount>=180){if(totalFrame>7.8&&renderer.getPixelRatio()>.85){renderer.setPixelRatio(Math.max(.85,renderer.getPixelRatio()-.15));resize();}frameCount=0;totalFrame=0;}lastScene=f.serial;raf=requestAnimationFrame(draw);
 }
 function pause(){paused=true;cancelAnimationFrame(raf);raf=0;last=0;audio.stop();}
 function resume(){if(!disposed&&!document.hidden&&!contextLost){paused=false;audio.resume();cancelAnimationFrame(raf);last=0;lastRender=0;raf=requestAnimationFrame(draw);}}
 const canvas=renderer.domElement;
 function down(e){if(!manual)radius=lastFit;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);manual=true;}
 function move(e){const p=pointers.get(e.pointerId);if(!p)return;if(pointers.size===2){pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch)radius=Math.max(3.6,Math.min(65,radius+(pinch-d)*.025));pinch=d;}else{azimuth-=(e.clientX-p.x)*.006;polar=Math.max(.35,Math.min(1.40,polar+(e.clientY-p.y)*.004));pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});}}
 function up(e){pointers.delete(e.pointerId);pinch=null;}
 function wheel(e){e.preventDefault();if(!manual)radius=lastFit;manual=true;radius=Math.max(3.6,Math.min(65,radius+e.deltaY*.025));}
 const lost=e=>{e.preventDefault();contextLost=true;pause();onFailure?.('Il dispositivo ha sospeso la grafica 3D. Chiudi e riapri l’Arena.');};
 const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,wheel,webglcontextlost:lost};for(const [name,fn]of Object.entries(handlers))canvas.addEventListener(name,fn,name==='wheel'?{passive:false}:undefined);
 resume();return {follow:key=>{selected=key||'';view=key?'follow':'director';radius=key?4.2:17;manual=false;},view:mode=>{view=mode;selected='';manual=false;radius=mode==='field'?49:17;},zoom:d=>{if(!manual)radius=lastFit;manual=true;radius=Math.max(3.6,Math.min(65,radius+d));},toggleAudio:()=>audio.toggle(),pause,resume,
 dispose(){if(disposed)return;disposed=true;pause();audio.dispose();observer.disconnect();for(const [name,fn]of Object.entries(handlers))canvas.removeEventListener(name,fn);avatars.forEach(a=>a.dispose());contacts.dispose();fencePosts.dispose();trees.dispose();trunks.dispose();resources.forEach(r=>r.dispose?.());renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 };
}
