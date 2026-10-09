/* Sisal Race / local WebGL scene. No network/API/photo downloads. */
import * as T from './vendor/three.module.min.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>x*x*(3-2*x);
export async function runRace(host,entries,{profile={},audio=null,onFinish=()=>{}}={}){
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const canvas=renderer.domElement;canvas.setAttribute('aria-label','Corsa 3D dei tre giocatori: animazione della classifica ultime 5');host.appendChild(canvas);
  const scene=new T.Scene(),night=['night','stadium'].includes(profile.lighting);
  scene.background=new T.Color(night?'#142438':'#b6cbd3');scene.fog=new T.Fog(scene.background,48,145);
  const camera=new T.PerspectiveCamera(36,1,.1,230);
  const resources=new Set(),textures=new Set();let disposed=false;
  const geo=g=>(resources.add(g),g);
  const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.7,...extra});resources.add(m);return m};
  const sphere=geo(new T.SphereGeometry(1,24,16)),box=geo(new T.BoxGeometry(1,1,1));
  const mats={dirt:mat('#947254'),grass:mat('#526443'),white:mat('#e9e4d4'),dark:mat('#182b2a'),metal:mat('#556468',{metalness:.6,roughness:.35}),leather:mat('#211916'),skin:mat('#cfa17d'),black:mat('#181819'),gold:mat('#cfac65',{metalness:.55,roughness:.3})};
  function mesh(parent,g,m,pos,scale=[1,1,1]){const o=new T.Mesh(g,m);o.position.set(...pos);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
  const ball=(p,m,pos,scale)=>mesh(p,sphere,m,pos,scale);
  const cube=(p,m,pos,scale)=>mesh(p,box,m,pos,scale);
  function link(p,m,a,b,r1,r2=r1){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const o=mesh(p,geo(new T.CylinderGeometry(r2,r1,d.length(),10)),m,av.clone().add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o}
  function texture(draw,w=512,h=128){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.add(t);return t}
  function sign(text,w,h,p,size,background='#122e2b',color='#e6ddbe'){
    const map=texture((c,x,y)=>{c.fillStyle=background;c.fillRect(0,0,x,y);c.fillStyle=color;c.font='600 42px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(text,x/2,y/2,x-35)},w,h);
    return mesh(p,geo(new T.PlaneGeometry(...size)),mat('#ffffff',{map,roughness:1}),[0,0,0]);
  }
  scene.add(new T.HemisphereLight(night?'#9ec4ff':'#edf5ff','#544431',night?1.7:2.3));
  const sun=new T.DirectionalLight(night?'#bbd6ff':'#ffe0a4',night?3:3.5);sun.position.set(-15,24,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:18,bottom:-18,near:1,far:90});sun.shadow.normalBias=.035;scene.add(sun,sun.target);
  cube(scene,mats.grass,[35,-.25,0],[220,.4,130]);
  const dirtMap=texture((c,w,h)=>{c.fillStyle='#b19676';c.fillRect(0,0,w,h);let seed=24;for(let i=0;i<18000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%w;seed=(seed*1664525+1013904223)>>>0;const y=seed%h;c.fillStyle=i%2?'#8e765b':'#c0a480';c.fillRect(x,y,1+(i%3),1)}},512,512);dirtMap.wrapS=dirtMap.wrapT=T.RepeatWrapping;dirtMap.repeat.set(35,4);mats.dirt.map=dirtMap;
  cube(scene,mats.dirt,[35,-.02,0],[160,.12,13]);
  // Running rails and tapered posts extend through the whole tracking shot.
  for(const z of [-7,7]){cube(scene,mats.white,[35,1.15,z],[160,.13,.13]);cube(scene,mats.white,[35,.68,z],[160,.08,.08]);for(let x=-42;x<118;x+=4)cube(scene,mats.white,[x,.56,z],[.13,1.15,.14])}
  for(let x=-10;x<106;x+=18){const b=sign('SISAL FC 2021',512,128,scene,[7,1.4]);b.position.set(x,.85,-7.3)}
  // Grandstand: real stepped volumes, seats and architectural canopy.
  const seatMats=['#345e58','#688d80','#bdad89'].map(x=>mat(x));
  for(let row=0;row<5;row++){cube(scene,mats.dark,[36,row*.65, -13-row*1.35],[105,.65,1.8]);for(let i=0;i<68;i++)cube(scene,seatMats[(i+row)%3],[-15+i*1.5,.6+row*.65,-13-row*1.35],[.8,.45,.65])}
  cube(scene,mats.dark,[36,6.4,-16],[110,.28,10]);for(let x=-14;x<90;x+=12)link(scene,mats.metal,[x,0,-20],[x,6.4,-20],.15);
  const banner=sign('S I S A L   /   R A C I N G   C L U B',1024,128,scene,[40,1.9]);banner.position.set(30,4.9,-11.8);
  for(let i=0;i<22;i++){const x=-35+i*8,z=-33-(i%3)*7;link(scene,mats.leather,[x,0,z],[x,4,z],.22);ball(scene,mats.grass,[x,6,z],[2.4,3.6,2.4])}
  // Seated spectators, instanced by body part: detailed silhouettes at low draw-call cost.
  const people=[];let seed=328794;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const shirts=['#ddd5c1','#3b645a','#9e5346','#45617e','#d7a251','#353b49','#9e8aaf'];
  const skins=['#e3b993','#b67e56','#805338','#eac9ac'];
  for(let row=0;row<5;row++)for(let col=0;col<68;col++){
    if(random()<.14)continue;
    people.push({x:-15+col*1.5+(random()-.5)*.2,y:.72+row*.65,z:-12.95-row*1.35,phase:random()*Math.PI*2,height:.88+random()*.23,shirt:shirts[Math.floor(random()*shirts.length)],skin:skins[Math.floor(random()*skins.length)],hair:random()>.4?'#302721':'#a18b61'});
  }
  const humanGeo=geo(new T.SphereGeometry(1,10,8)),humanMat=mat('#ffffff');
  const crowdParts={};
  for(const part of ['torso','head','hair','thighs','calves','arms']){const count=people.length*(['thighs','calves','arms'].includes(part)?2:1),m=new T.InstancedMesh(humanGeo,humanMat,count);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;m.receiveShadow=true;scene.add(m);crowdParts[part]=m;}
  const dummy=new T.Object3D(),crowdColor=new T.Color();
  function personPart(kind,index,x,y,z,sx,sy,sz,angle,color,initial){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,0,angle);dummy.updateMatrix();crowdParts[kind].setMatrixAt(index,dummy.matrix);if(initial)crowdParts[kind].setColorAt(index,crowdColor.set(color))}
  function updateCrowd(time,cheer,initial=false){
    people.forEach((p,i)=>{
      const sway=Math.sin(time*1.6+p.phase)*.025,up=cheer*(.12+.045*Math.sin(time*7+p.phase)),y=p.y+up;
      personPart('torso',i,p.x+sway,y+.36,p.z,.21,.36*p.height,.15,sway,p.shirt,initial);
      personPart('head',i,p.x+sway,y+.83*p.height,p.z,.14,.18,.14,sway,p.skin,initial);
      personPart('hair',i,p.x+sway,y+.94*p.height,p.z-.015,.145,.09,.145,sway,p.hair,initial);
      for(const sign of [-1,1]){const j=i*2+(sign===1?1:0),x=p.x+sign*.14;
        personPart('thighs',j,x,p.y-.025,p.z+.17,.10,.11,.28,0,'#303641',initial);
        personPart('calves',j,x,p.y-.27,p.z+.39,.075,.27,.085,0,'#303641',initial);
        const angle=sign*(.25+cheer*(2.15+.3*Math.sin(time*6+p.phase)));
        personPart('arms',j,p.x+sign*.25+Math.sin(angle)*.21,y+.53-Math.cos(angle)*.21,p.z+.03,.069,.28,.075,angle,p.shirt,initial);
      }
    });
    Object.values(crowdParts).forEach(m=>{m.instanceMatrix.needsUpdate=true;if(initial)m.instanceColor.needsUpdate=true});
  }
  updateCrowd(0,0,true);host.dataset.spectators=String(people.length);
  // Finish stripe and gantry.
  for(let z=-6;z<7;z++)for(let a=0;a<2;a++)cube(scene,(z+a)%2?mats.white:mats.black,[48+a*.45,.055,z],[.45,.025,1]);
  for(const z of [-7.5,7.5])cube(scene,mats.dark,[49,3.7,z],[.45,7.4,.45]);
  cube(scene,mats.dark,[49,7.3,0],[.55,.65,15.5]);
  const finish=sign('FINISH',512,128,scene,[5,1.2]);finish.rotation.y=-Math.PI/2;finish.position.set(48.65,7.15,0);
  function horse(entry,index){
    const root=new T.Group();scene.add(root);root.position.z=(index-(entries.length-1)/2)*3.3;
    const body=new T.Group();root.add(body);
    const coats=['#74472d','#3a3532','#bdafa0'];const coat=mat(coats[index%3],{roughness:.47}),mane=mat(index===2?'#686057':'#1c1716');const silk=mat(entry.color,{roughness:.38});
    ball(body,coat,[0,1.72,0],[1.12,.5,.4]);ball(body,coat,[-.78,1.68,0],[.52,.54,.43]);ball(body,coat,[.66,1.77,0],[.48,.57,.41]);
    const neck=ball(body,coat,[.94,2.13,0],[.34,.73,.3]);neck.rotation.z=-.48;
    ball(body,coat,[1.39,2.64,0],[.4,.28,.24]);const muzzle=ball(body,coat,[1.72,2.47,0],[.4,.2,.2]);muzzle.rotation.z=-.35;
    ball(body,mane,[1.98,2.37,0],[.15,.14,.18]);
    for(const z of [-.19,.19]){const ear=ball(body,coat,[1.32,2.98,z*.65],[.085,.23,.065]);ear.rotation.z=.25;ball(body,mats.black,[1.49,2.72,z*1.16],[.035,.035,.018]);ball(body,mats.white,[1.50,2.73,z*1.2],[.011,.013,.008]);}
    for(let i=0;i<10;i++)ball(body,mane,[.60+i*.062,2.07+i*.074,0],[.12,.17,.31-i*.012]);
    const tail=new T.Group();tail.position.set(-1.03,1.94,0);body.add(tail);for(let i=0;i<7;i++){const tuft=ball(tail,mane,[-.15-i*.14,-.06-i*.06,0],[.21,.14,.12]);tuft.rotation.z=.28}
    // Saddle cloth, saddle, girth and bridle.
    ball(body,silk,[-.1,1.99,0],[.57,.28,.46]);ball(body,mats.leather,[-.1,2.19,0],[.47,.13,.32]);
    for(const z of [-.43,.43]){link(body,mats.leather,[-.05,2.12,z],[-.05,1.36,z],.035);link(body,mats.leather,[1.9,2.55,z*.44],[1.24,2.8,z*.48],.025);link(body,mats.leather,[1.84,2.47,z*.43],[.71,2.39,z*.5],.014)}
    const legs=[];
    for(const x of [-.78,.72])for(const z of [-.29,.29]){
      const hip=new T.Group();hip.position.set(x,1.56,z);body.add(hip);link(hip,coat,[0,0,0],[.07,-.62,0],.13,.075);ball(hip,coat,[.07,-.62,0],[.085,.09,.085]);const shin=new T.Group();shin.position.set(.07,-.62,0);hip.add(shin);link(shin,coat,[0,0,0],[0,-.62,0],.063,.042);ball(shin,mats.black,[.065,-.66,0],[.14,.095,.09]);legs.push({hip,shin,phase:(x<0?0:Math.PI)+(z<0?.6:0),hind:x<0});
    }
    const rider=new T.Group();rider.position.set(-.15,2.17,0);body.add(rider);
    const torso=ball(rider,silk,[.23,.48,0],[.23,.43,.22]);torso.rotation.z=-.8;
    ball(rider,mats.white,[-.1,.15,0],[.25,.17,.23]);
    for(const z of [-.28,.28]){link(rider,mats.white,[-.1,.15,z],[.24,-.12,z*1.2],.095);link(rider,mats.black,[.24,-.12,z*1.2],[-.12,-.49,z*1.15],.07);ball(rider,mats.black,[-.04,-.5,z*1.15],[.16,.065,.08]);link(rider,silk,[.4,.66,z*.62],[.54,.33,z],.085);link(rider,silk,[.54,.33,z],[.82,.27,z*.66],.055);ball(rider,mats.skin,[.84,.27,z*.66],[.065,.06,.07])}
    const head=new T.Group();head.position.set(.6,.89,0);rider.add(head);
    const standardFace=new T.Group();head.add(standardFace);
    ball(standardFace,mats.skin,[0,0,0],[.2,.235,.19]);ball(standardFace,mats.skin,[.17,-.025,0],[.095,.09,.09]);
    for(const z of [-.17,.17]){ball(standardFace,mats.dark,[.09,.03,z],[.1,.05,.025]);ball(standardFace,mats.black,[.11,.025,z*1.04],[.025,.022,.012])}
    ball(head,silk,[0,.19,0],[.26,.15,.23]);ball(head,mats.dark,[0,.13,.13],[.26,.03,.17]);
    for(const z of [-.47,.47]){const n=sign(String(index+1),128,128,body,[.36,.36],entry.color,'#ffffff');n.position.set(-.22,1.92,z);if(z<0)n.rotation.y=Math.PI;}
    return {root,body,legs,tail,rider,head,entry,index,crossed:false,lastHoof:-1};
  }
  // Batch repeated stadium/rail geometry to keep mobile draw calls low.
  const batches=new Map();
  for(const o of [...scene.children])if(o.isMesh&&o.geometry===box){let list=batches.get(o.material);if(!list)batches.set(o.material,list=[]);list.push(o)}
  for(const [material,list] of batches){const batch=new T.InstancedMesh(box,material,list.length);list.forEach((o,i)=>{o.updateMatrix();batch.setMatrixAt(i,o.matrix);scene.remove(o)});batch.castShadow=true;batch.receiveShadow=true;scene.add(batch)}
  const horses=entries.map(horse);
  const dustGeo=geo(new T.BufferGeometry()),dustPos=new Float32Array(entries.length*42*3);dustGeo.setAttribute('position',new T.BufferAttribute(dustPos,3));
  const dustTex=texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(226,205,170,.6)');g.addColorStop(1,'rgba(226,205,170,0)');c.fillStyle=g;c.fillRect(0,0,w,h)},64,64);
  const dustMat=new T.PointsMaterial({color:'#d7b996',size:.65,map:dustTex,transparent:true,opacity:.34,depthWrite:false});resources.add(dustMat);const dust=new T.Points(dustGeo,dustMat);scene.add(dust);
  const confettiCount=180,confettiData=Array.from({length:confettiCount},(_,i)=>({side:i%2?1:-1,vx:(random()-.5)*5,vz:2+random()*4,vy:4+random()*5,spin:random()*8,delay:random()*.3}));
  const confetti=new T.InstancedMesh(geo(new T.PlaneGeometry(.12,.23)),mat('#ffffff',{side:T.DoubleSide,metalness:.35,roughness:.4}),confettiCount);
  confetti.instanceMatrix.setUsage(T.DynamicDrawUsage);confetti.frustumCulled=false;confetti.visible=false;scene.add(confetti);
  for(let i=0;i<confettiCount;i++)confetti.setColorAt(i,new T.Color(['#edc76b','#f6efd2','#35ad84'][i%3]));
  let celebrationAt=null,lastCrowdUpdate=-1;
  const ui=document.createElement('div');ui.className='sr-overlay';ui.innerHTML='<div class="sr-broadcast"><span>● SISAL RACING</span><b>ULTIME 5 · REVEAL</b></div><div class="sr-count" aria-live="polite">3</div><div class="sr-bottom"><span class="sr-caption">AI CANCELLI</span><div class="sr-positions"></div><div class="sr-meter"><i></i></div></div><div class="sr-controls"><button type="button" data-camera>Cambia visuale</button><button type="button" data-audio aria-pressed="false">Attiva audio</button><button type="button" data-skip>Mostra classifica</button></div>';host.appendChild(ui);
  const winnerBanner=document.createElement('div');winnerBanner.className='sr-winner-banner';winnerBanner.setAttribute('role','status');winnerBanner.hidden=true;ui.appendChild(winnerBanner);
  const count=ui.querySelector('.sr-count'),caption=ui.querySelector('.sr-caption'),positions=ui.querySelector('.sr-positions'),meter=ui.querySelector('.sr-meter i');
  const labels=entries.map((e,i)=>{const row=document.createElement('span');const dot=document.createElement('i');dot.style.background=e.color;row.append(dot,document.createTextNode(e.name));positions.appendChild(row);return row});
  const namesLayer=document.createElement('div');namesLayer.className='sr-name-layer';ui.appendChild(namesLayer);
  const nameTags=entries.map(e=>{const n=document.createElement('div');n.className='sr-name-tag';n.textContent=e.name;n.style.borderColor=e.color;namesLayer.appendChild(n);const line=document.createElement('i');line.className='sr-name-line';line.style.background=e.color;namesLayer.appendChild(line);return {n,line}});
  const world=new T.Vector3();
  const audioButton=ui.querySelector('[data-audio]');
  function audioState(){audioButton.textContent=audio?.enabled?'Audio: ON':'Attiva audio';audioButton.setAttribute('aria-pressed',String(Boolean(audio?.enabled)))}
  audioButton.onclick=()=>{if(!audio)audio=window.SisalRaceAudio?.create();else if(!audio.enabled){audio.unlock();if(audioMuted)audio.toggle();audioMuted=false}else{audio.toggle();audioMuted=true}setTimeout(audioState,80)};
  let audioMuted=false,lastCount=-1,started=false,lastAmbience=-1;
  audioState();
  let mode=profile.camera==='low'?1:0,raf=0,lastTime=0,clock=0,lastHUD=-1,finished=false,resolveRun;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const result=new Promise(resolve=>resolveRun=resolve);
  function dispose(completed=false){if(disposed)return;disposed=true;audio?.dispose();cancelAnimationFrame(raf);observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.material?.map)textures.add(o.material.map)});textures.forEach(t=>t.dispose());resources.forEach(r=>r.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();ui.remove();resolveRun(completed)}
  function lost(e){e.preventDefault();dispose(false)}canvas.addEventListener('webglcontextlost',lost);
  function visibility(){lastTime=0;if(document.hidden){audio?.pause();cancelAnimationFrame(raf)}else if(!disposed){audio?.resume();raf=requestAnimationFrame(frame)}}document.addEventListener('visibilitychange',visibility);
  const observer=new MutationObserver(()=>{if(!host.isConnected)dispose(false)});observer.observe(document.body,{childList:true,subtree:true});
  const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}});resize.observe(host);
  ui.querySelector('[data-camera]').onclick=()=>{mode=(mode+1)%3};ui.querySelector('[data-skip]').onclick=()=>dispose(true);
  const duration=profile.pace==='aggressive'?10:12;
  const start=2.5;
  function frame(now){
    if(disposed)return;if(!host.isConnected){dispose(false);return}if(lastTime)clock+=Math.min((now-lastTime)/1000,.06);lastTime=now;
    const elapsed=Math.max(0,clock-start),p=clamp(elapsed/duration,0,1),racing=clock>=start&&p<1;
    if(clock<start){count.textContent=String(Math.max(1,3-Math.floor(clock/ .84)))}else if(elapsed<.6){count.textContent='VIA'}else{count.textContent='';}
    const c=clock<start?Math.max(1,3-Math.floor(clock/.84)):0;
    if(c!==lastCount){lastCount=c;audio?.countdown(c)}
    if(clock>=start&&!started){started=true;audio?.start()}
    if(Math.floor(clock*2)!==lastAmbience){lastAmbience=Math.floor(clock*2);audio?.ambience();audioState()}
    const ordered=[];
    horses.forEach((h,i)=>{
      const rank=h.entry.place,finishAt=duration+(rank-1)*.48;
      const f=clamp(elapsed/finishAt,0,1),wave=Math.sin(f*13+i*2.3)*.032*Math.sin(Math.PI*f);
      const progress=clamp(f+wave,0,1),coast=clamp((elapsed-finishAt)/2,0,1),x=progress*46.02+5*(1-(1-coast)**2);
      h.root.position.x=x;
      if(f>=1&&!h.crossed){h.crossed=true;audio?.finish(rank);if(rank===1){celebrationAt=elapsed;audio?.cheer?.();winnerBanner.textContent='🏆 '+h.entry.name+' · VINCE';winnerBanner.hidden=false;host.dataset.celebrations='1';nameTags[i].n.classList.add('sr-name-winner')} host.dataset.arrivals=(host.dataset.arrivals||'')+rank+','}
      const hoof=Math.floor(elapsed*9.55+i*.7);
      if(clock>=start&&coast<.85&&hoof!==h.lastHoof){h.lastHoof=hoof;audio?.hoof(i)}
      const phase=elapsed*15+i*1.7,amp=clock<start?0:1-smooth(coast);
      h.body.position.y=Math.sin(phase*2)*.045*amp+.035*amp;h.body.rotation.z=Math.sin(phase)*.028*amp;
      h.legs.forEach(l=>{l.hip.rotation.z=Math.sin(phase+l.phase)*.65*amp;l.shin.rotation.z=(l.hind?-1:1)*Math.max(0,Math.cos(phase+l.phase))*.95*amp});
      h.tail.rotation.y=Math.sin(phase*.5)*.17;h.tail.rotation.z=.25*amp;h.rider.rotation.z=-Math.sin(phase*2)*.04*amp;
      ordered.push({i,progress});
      for(let j=0;j<42;j++){const age=((elapsed*1.25+j/42)%1),idx=(i*42+j)*3;dustPos[idx]=x-1.2-age*4;dustPos[idx+1]=.1+age*.8;dustPos[idx+2]=h.root.position.z+Math.sin(j*34)*age*.7}
    });
    const celebrationAge=celebrationAt===null?-1:elapsed-celebrationAt;
    if(Math.floor(clock*12)!==lastCrowdUpdate){lastCrowdUpdate=Math.floor(clock*12);updateCrowd(reduced?0:clock,reduced?0:celebrationAge>=0?Math.min(1,celebrationAge*4):p>.85?.25:0)}
    confetti.visible=celebrationAge>=0&&celebrationAge<4&&!reduced;
    if(confetti.visible){confettiData.forEach((d,i)=>{const t=Math.max(0,celebrationAge-d.delay),y=.7+d.vy*t-2.4*t*t;dummy.position.set(48+d.vx*t,Math.max(.08,y),d.side*(6.7-d.vz*t));dummy.rotation.set(t*d.spin,t*2,t*d.spin*.7);dummy.scale.setScalar(celebrationAge<d.delay?0:1);dummy.updateMatrix();confetti.setMatrixAt(i,dummy.matrix)});confetti.instanceMatrix.needsUpdate=true;}
    dust.visible=racing&&!reduced;dustGeo.attributes.position.needsUpdate=true;
    ordered.sort((a,b)=>b.progress-a.progress||entries[a.i].place-entries[b.i].place);
    const xs=horses.map(h=>h.root.position.x),center=(Math.max(...xs)+Math.min(...xs))/2,spread=Math.max(...xs)-Math.min(...xs);
    const portrait=camera.aspect<1,dist=(portrait?25:19)+spread*.4;
    const camModes=[[center+5,6.6,dist],[center+7,3.6,dist*.91],[center+10,10.8,dist*.8]];
    const cp=camModes[reduced?0:mode];if(clock<.1||reduced)camera.position.set(...cp);else camera.position.lerp(new T.Vector3(...cp),.14);camera.lookAt(center+.5,1.45,0);
    sun.position.set(center-10,24,18);sun.target.position.set(center,0,0);
    // Project labels from each head, then separate overlapping names with leader lines.
    camera.updateMatrixWorld();scene.updateMatrixWorld(true);
    const boxes=[];
    horses.forEach((h,i)=>{
      h.head.getWorldPosition(world);world.y+=.45;world.project(camera);
      const w=host.clientWidth,hh=host.clientHeight,ax=(world.x*.5+.5)*w,ay=(-world.y*.5+.5)*hh;
      const {n,line}=nameTags[i],nw=n.offsetWidth,nh=n.offsetHeight;
      let x=clamp(ax-nw/2,8,Math.max(8,w-nw-8)),y=Math.max(42,ay-nh-14);
      for(let attempt=0;attempt<entries.length+1;attempt++){
        if(!boxes.some(b=>x<b.x+b.w+6&&x+nw+6>b.x&&y<b.y+b.h+5&&y+nh+5>b.y))break;
        y-=nh+7;
      }
      y=Math.max(38,y);boxes.push({x,y,w:nw,h:nh});n.style.transform=`translate(${x}px,${y}px)`;
      const dx=ax-(x+nw/2),dy=ay-(y+nh);line.style.left=`${x+nw/2}px`;line.style.top=`${y+nh}px`;line.style.width=`${Math.hypot(dx,dy)}px`;line.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
    });
    if(lastHUD!==Math.floor(clock*8)){
      lastHUD=Math.floor(clock*8);ordered.forEach(({i},position)=>{labels[i].style.order=position;labels[i].dataset.position=String(position+1)});meter.style.width=`${p*100}%`;
      caption.textContent=clock<start?'AI CANCELLI':p<.82?'RETTILINEO · CORSA DELLA TOP 3':p<1?'ULTIMI METRI':'ARRIVO';
    }
    if(elapsed>=duration+1.0&&!finished){finished=true;onFinish();}
    if(finished){count.textContent='';caption.textContent=`1° ${entries.find(e=>e.place===1)?.name||''}`;}
    renderer.render(scene,camera);
    if(elapsed>duration+3.5){dispose(true);return}raf=requestAnimationFrame(frame);
  }
  if(!document.hidden)raf=requestAnimationFrame(frame);return result;
}
