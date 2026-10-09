/* Sisal Race / local WebGL scene. No network/API/photo downloads. */
import * as T from './vendor/three.module.min.js';
import {randomSource,raceSeed,motionProfile,raceProgress,spectatorProfile} from './race-motion.js?v=32.1.34';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>x*x*(3-2*x);
export async function runRace(host,entries,{profile={},audio=null,title='TOP 3 · ULTIME 5',onFinish=()=>{}}={}){
  if(!entries.length){audio?.dispose();return false}
  const trackHalf=Math.max(6.5,entries.length*1.65+.5);
  const seed=raceSeed(),random=randomSource(seed);host.dataset.raceSeed=String(seed);
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,entries.length>6?1.25:1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
  const canvas=renderer.domElement;canvas.setAttribute('aria-label','Corsa 3D: animazione della classifica ultime 5, con pari merito');host.appendChild(canvas);
  const scene=new T.Scene(),night=['night','stadium'].includes(profile.lighting);
  const sunset=profile.lighting==='sunset';
  scene.background=new T.Color(night?'#122033':sunset?'#d6b6a0':'#b5c9d1');scene.fog=new T.Fog(scene.background,62,165);
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
  scene.add(new T.HemisphereLight(night?'#9ec4ff':'#edf5ff','#554934',night?1.5:1.9));
  const sun=new T.DirectionalLight(night?'#bbd6ff':sunset?'#ffc286':'#ffe4ba',night?2.5:3);sun.position.set(-15,24,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:20,bottom:-20,near:1,far:90});sun.shadow.normalBias=.018;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
  const rim=new T.DirectionalLight('#d3e7ef',.75);rim.position.set(10,9,-18);scene.add(rim);
  cube(scene,mats.grass,[35,-.25,0],[220,.4,130]);
  const dirtMap=texture((c,w,h)=>{c.fillStyle='#b19676';c.fillRect(0,0,w,h);let seed=24;for(let i=0;i<18000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%w;seed=(seed*1664525+1013904223)>>>0;const y=seed%h;c.fillStyle=i%2?'#8e765b':'#c0a480';c.fillRect(x,y,1+(i%3),1)}},512,512);dirtMap.wrapS=dirtMap.wrapT=T.RepeatWrapping;dirtMap.repeat.set(35,4);mats.dirt.map=dirtMap;
  cube(scene,mats.dirt,[35,-.02,0],[160,.12,trackHalf*2]);
  // Running rails and tapered posts extend through the whole tracking shot.
  for(const z of [-trackHalf-.5,trackHalf+.5]){cube(scene,mats.white,[35,1.15,z],[160,.13,.13]);cube(scene,mats.white,[35,.68,z],[160,.08,.08]);for(let x=-42;x<118;x+=4)cube(scene,mats.white,[x,.56,z],[.13,1.15,.14])}
  for(let x=-10;x<106;x+=18){const b=sign('SISAL FC 2021',512,128,scene,[7,1.4]);b.position.set(x,.85,-7.3)}
  // Grandstand: real stepped volumes, seats and architectural canopy.
  const seatMats=['#345e58','#688d80','#bdad89'].map(x=>mat(x));
  for(let row=0;row<5;row++){cube(scene,mats.dark,[36,row*.65, -13-row*1.35],[105,.65,1.8]);for(let i=0;i<68;i++)cube(scene,seatMats[(i+row)%3],[-15+i*1.5,.6+row*.65,-13-row*1.35],[.8,.45,.65])}
  cube(scene,mats.dark,[36,6.4,-16],[110,.28,10]);for(let x=-14;x<90;x+=12)link(scene,mats.metal,[x,0,-20],[x,6.4,-20],.15);
  const banner=sign('S I S A L   /   R A C I N G   C L U B',1024,128,scene,[40,1.9]);banner.position.set(30,4.9,-11.8);
  for(let i=0;i<22;i++){const x=-35+i*8,z=-33-(i%3)*7;link(scene,mats.leather,[x,0,z],[x,4,z],.22);ball(scene,mats.grass,[x,6,z],[2.4,3.6,2.4])}
  // Seated spectators, instanced by body part: detailed silhouettes at low draw-call cost.
  const people=[];
  const shirts=['#ddd5c1','#3b645a','#9e5346','#45617e','#d7a251','#353b49','#9e8aaf'];
  const skins=['#e3b993','#b67e56','#805338','#eac9ac'];
  for(let row=0;row<5;row++)for(let col=0;col<68;col++){
    if(random()<.14)continue;
    const p=spectatorProfile(random,row*68+col);
    const fabric=new T.Color(shirts[Math.floor(p.shirt*shirts.length)]);fabric.offsetHSL((random()-.5)*.07,(random()-.5)*.15,(random()-.5)*.1);
    const skin=new T.Color(skins[Math.floor(p.skin*skins.length)]);skin.offsetHSL(0,0,(random()-.5)*.05);
    people.push({...p,x:-15+col*1.5+(random()-.5)*.2,y:.72+row*.65,z:-12.95-row*1.35,shirtColor:fabric.getHex(),skinColor:skin.getHex(),hairColor:['#302721','#806544','#bfac83','#1c1a1a'][p.hair],trouserColor:new T.Color().setHSL(.55+p.trousers*.12,.12,.15+p.trousers*.17).getHex()});
  }
  const humanGeo=geo(new T.SphereGeometry(1,8,6)),faceGeo=geo(new T.SphereGeometry(1,12,10)),humanMat=mat('#ffffff',{roughness:.86});
  const crowdParts={};
  const paired=new Set(['eyes','thighs','calves','shoes','upperArms','forearms','hands']);
  for(const part of ['torso','head','hair','nose','eyes','mouth','thighs','calves','shoes','upperArms','forearms','hands','hat','scarf']){const count=people.length*(paired.has(part)?2:1),m=new T.InstancedMesh(part==='head'?faceGeo:humanGeo,humanMat,count);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;m.receiveShadow=true;scene.add(m);crowdParts[part]=m;}
  const dummy=new T.Object3D(),crowdColor=new T.Color();
  const upVector=new T.Vector3(0,1,0),limbDirection=new T.Vector3();
  function personPart(kind,index,x,y,z,sx,sy,sz,angle,color,initial){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,0,angle);dummy.updateMatrix();crowdParts[kind].setMatrixAt(index,dummy.matrix);if(initial)crowdParts[kind].setColorAt(index,crowdColor.set(color))}
  function crowdLimb(kind,index,a,b,r,color,initial){limbDirection.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=limbDirection.length();dummy.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);dummy.scale.set(r,length/2+r*.3,r);dummy.quaternion.setFromUnitVectors(upVector,limbDirection.normalize());dummy.updateMatrix();crowdParts[kind].setMatrixAt(index,dummy.matrix);if(initial)crowdParts[kind].setColorAt(index,crowdColor.set(color))}
  function updateCrowd(time,cheer,initial=false){
    people.forEach((p,i)=>{
      const clock=time*p.speed+p.phase,beat=Math.sin(clock*4.5),sway=Math.sin(clock)*.025*p.energy;
      const cycle=Math.floor((time+p.delay)/p.cycle),action=(p.action+cycle*(i%5+1))%6;
      const localCheer=Math.max(.14,cheer)*p.energy;
      const rise=(action===1||action===2)?.12+.14*localCheer:0;
      const y=p.y+rise+(action===2?Math.max(0,beat)*.08*localCheer:0),x=p.x+sway,z=p.z;
      const faceY=y+.84*p.height,look=Math.sin(clock*.63)*.035;
      personPart('torso',i,x,y+.36,z,.215*p.width,.35*p.height,.145,sway,p.shirtColor,initial);
      personPart('head',i,x+look,faceY,z,.135*p.width,.175*p.height,.135,look,p.skinColor,initial);
      personPart('hair',i,x+look,faceY+.11,z-.03,.14*p.width,p.hair===2?.15:.09,.132,look,p.hairColor,initial);
      personPart('nose',i,x+look,faceY-.015,z+.13,.028,.046,.042,0,p.skinColor,initial);
      personPart('mouth',i,x+look,faceY-.084,z+.12,.039,.007+(action===2?.022:0),.012,0,'#704839',initial);
      personPart('hat',i,x+look,faceY+.18,z+.015,p.hat?.16:0,.057,p.hat?.18:0,look,p.shirtColor,initial);
      personPart('scarf',i,x,y+.49,z+.139,.046,.19,.022,sway,i%3===0?'#e3d5b4':p.shirtColor,initial);
      for(const sign of [-1,1]){const j=i*2+(sign===1?1:0),legX=x+sign*.125*p.width;
        personPart('eyes',j,x+look+sign*.05,faceY+.025,z+.123,.016,.012,.014,look,'#292b29',initial);
        const hip=[legX,y+.04,z],knee=[legX,p.y-.01+rise*.5,z+.3],ankle=[legX,p.y-.49,z+.38];
        crowdLimb('thighs',j,hip,knee,.09*p.width,p.trouserColor,initial);
        crowdLimb('calves',j,knee,ankle,.068,p.trouserColor,initial);
        personPart('shoes',j,legX,p.y-.52,z+.44,.087,.063,.17,0,i%4===0?'#dbd5c7':'#202524',initial);
        const shoulder=[x+sign*.18*p.width,y+.59*p.height,z];
        let elbow=[x+sign*.27,y+.31,z+.07],hand=[x+sign*.12,y+.18,z+.27];
        if(action===0){elbow=[x+sign*.29,y+.42,z+.17];hand=[x+sign*(.055+.065*(beat+1)/2),y+.5+.015*beat,z+.32];}
        if(action===1){elbow=[x+sign*.3,y+.81,z];hand=[x+sign*(.25+.1*Math.sin(clock*3+sign)),y+1.09+.06*beat,z+.025];}
        if(action===2){elbow=[x+sign*.3,y+.66+.1*beat,z+.06];hand=[x+sign*.31,y+.94+.14*beat,z+.04];}
        if(action===3){elbow=[x+sign*.27,y+.54,z+.18];hand=[x+sign*.27,y+.62+sign*.07*beat,z+.38];}
        if(action===5&&sign===1){elbow=[x+.3,y+.77,z+.12];hand=[x+.19,y+.97,z+.12];}
        crowdLimb('upperArms',j,shoulder,elbow,.064*p.width,p.shirtColor,initial);
        crowdLimb('forearms',j,elbow,hand,.052,p.skinColor,initial);
        personPart('hands',j,...hand,.055,.065,.035,beat*.1,p.skinColor,initial);
      }
    });
    Object.values(crowdParts).forEach(m=>{m.instanceMatrix.needsUpdate=true;if(initial)m.instanceColor.needsUpdate=true});
  }
  updateCrowd(0,0,true);host.dataset.spectators=String(people.length);host.dataset.crowdVariants=String(new Set(people.map(p=>[p.phase,p.speed,p.cycle,p.shirtColor,p.skinColor].join(':'))).size);
  const standOffset=trackHalf-6.5;
  if(standOffset>0){for(const o of scene.children){if(o.position.z<-7)o.position.z-=standOffset}for(const part of Object.values(crowdParts))part.position.z=-standOffset;}
  // Finish stripe and gantry.
  for(let z=-Math.floor(trackHalf);z<=Math.floor(trackHalf);z++)for(let a=0;a<2;a++)cube(scene,(z+a)%2?mats.white:mats.black,[48+a*.45,.055,z],[.45,.025,1]);
  for(const z of [-trackHalf-1,trackHalf+1])cube(scene,z>0?mat('#182b2a',{transparent:true,opacity:.25,depthWrite:false}):mats.dark,[49,3.7,z],[.45,7.4,.45]);
  cube(scene,mats.dark,[49,7.3,0],[.55,.65,trackHalf*2+2.5]);
  const finish=sign('FINISH',512,128,scene,[5,1.2]);finish.rotation.y=-Math.PI/2;finish.position.set(48.65,7.15,0);
  function horse(entry,index){
    const root=new T.Group();scene.add(root);root.position.z=(index-(entries.length-1)/2)*3.3;
    const body=new T.Group();root.add(body);
    const motion=motionProfile(random,index);
    const coats=['#744c36','#39332f','#b2aaa0','#573b29','#946546'];
    const fur=texture((c,w,h)=>{c.fillStyle=coats[index%coats.length];c.fillRect(0,0,w,h);for(let k=0;k<6500;k++){c.strokeStyle=k%2?'rgba(255,240,214,.06)':'rgba(18,12,9,.08)';const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+2+random()*4,y+1);c.stroke()}},256,256);
    const coat=mat('#ffffff',{map:fur,roughness:.56}),mane=mat(index===2?'#686057':'#1c1716');const silk=mat(entry.color,{roughness:.5});
    ball(body,coat,[0,1.72,0],[1.08,.43,.35]);ball(body,coat,[-.78,1.68,0],[.47,.5,.39]);ball(body,coat,[.66,1.77,0],[.43,.52,.36]);
    for(const z of [-.23,.23]){const muscle=ball(body,coat,[-.67,1.63,z],[.36,.43,.17]);muscle.rotation.z=-.24;const shoulder=ball(body,coat,[.61,1.65,z],[.27,.39,.16]);shoulder.rotation.z=.18;}
    const neck=ball(body,coat,[.94,2.13,0],[.34,.73,.3]);neck.rotation.z=-.48;
    ball(body,coat,[1.39,2.64,0],[.4,.28,.24]);const muzzle=ball(body,coat,[1.72,2.47,0],[.4,.2,.2]);muzzle.rotation.z=-.35;
    ball(body,mane,[1.98,2.37,0],[.15,.14,.18]);
    for(const z of [-.165,.165]){ball(body,mats.black,[1.97,2.42,z],[.053,.026,.014]);link(body,mats.leather,[1.69,2.38,z],[1.96,2.31,z],.008);}
    if(index%3!==1){const blaze=ball(body,mats.white,[1.48,2.76,.003],[.28,.016,.054]);blaze.rotation.z=-.35;}
    for(const z of [-.19,.19]){const ear=ball(body,coat,[1.32,2.98,z*.65],[.085,.23,.065]);ear.rotation.z=.25;ball(body,mats.black,[1.49,2.72,z*1.16],[.035,.035,.018]);ball(body,mats.white,[1.50,2.73,z*1.2],[.011,.013,.008]);}
    for(let i=0;i<14;i++){const lock=ball(body,mane,[.58+i*.046,2.04+i*.056,0],[.075,.145,.12]);lock.rotation.z=-.28;}
    const tail=new T.Group();tail.position.set(-1.03,1.94,0);body.add(tail);for(let i=0;i<9;i++){const tuft=ball(tail,mane,[-.11-i*.1,-.045-i*.065,Math.sin(i)*.014],[.16,.085,.065]);tuft.rotation.z=.39}
    // Saddle cloth, saddle, girth and bridle.
    ball(body,silk,[-.1,1.99,0],[.57,.28,.46]);ball(body,mats.leather,[-.1,2.19,0],[.47,.13,.32]);
    for(const z of [-.43,.43]){link(body,mats.leather,[-.05,2.12,z],[-.05,1.36,z],.035);link(body,mats.leather,[1.9,2.55,z*.44],[1.24,2.8,z*.48],.025);link(body,mats.leather,[1.84,2.47,z*.43],[.71,2.39,z*.5],.014)}
    for(const z of [-.33,.33]){const stirrup=mesh(body,geo(new T.TorusGeometry(.11,.012,6,20)),mats.metal,[-.14,1.65,z]);stirrup.scale.set(.7,1,1);}
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
    return {root,body,legs,tail,rider,head,entry,index,motion,crossed:false,lastHoof:-1};
  }
  // Batch repeated stadium/rail geometry to keep mobile draw calls low.
  const batches=new Map();
  for(const o of [...scene.children])if(o.isMesh&&o.geometry===box){let list=batches.get(o.material);if(!list)batches.set(o.material,list=[]);list.push(o)}
  for(const [material,list] of batches){const batch=new T.InstancedMesh(box,material,list.length);list.forEach((o,i)=>{o.updateMatrix();batch.setMatrixAt(i,o.matrix);scene.remove(o)});batch.castShadow=true;batch.receiveShadow=true;scene.add(batch)}
  const horses=entries.map(horse);
  const winners=entries.filter(e=>e.place===1),winningTie=winners.length>1;
  const placeGroups=[...new Set(entries.map(e=>e.place))].sort((a,b)=>b-a).map(place=>({place,entries:entries.filter(e=>e.place===place)}));
  const soundedFinishes=new Set();
  const tieRings=[];
  if(winningTie){const ringMat=new T.MeshBasicMaterial({color:'#f2d47c',transparent:true,opacity:.85,side:T.DoubleSide});resources.add(ringMat);for(const h of horses.filter(h=>h.entry.place===1)){const ring=mesh(h.root,geo(new T.RingGeometry(1.3,1.39,48)),ringMat,[0,.09,0]);ring.rotation.x=-Math.PI/2;ring.visible=false;ring.castShadow=false;tieRings.push(ring)}}
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
  const tiePanel=document.createElement('div');tiePanel.className='sr-tie-finish';tiePanel.hidden=true;tiePanel.setAttribute('role','status');ui.appendChild(tiePanel);
  const ceremony=document.createElement('section');ceremony.className='sr-ceremony';ceremony.hidden=true;ceremony.setAttribute('aria-label','Premiazione Top 3');ui.appendChild(ceremony);
  const ceremonyTitle=document.createElement('small');ceremonyTitle.textContent=title;ceremony.appendChild(ceremonyTitle);
  const ceremonyHeading=document.createElement('h3');ceremonyHeading.textContent='LA PREMIAZIONE';ceremony.appendChild(ceremonyHeading);
  const winnerSpotlight=document.createElement('div');winnerSpotlight.className='sr-winner-spotlight';winnerSpotlight.hidden=true;
  winnerSpotlight.innerHTML='<div class="sr-cup" aria-hidden="true">🏆</div><div><small>ALBO D’ORO</small><strong data-winner-names></strong><em data-winner-status></em></div>';ceremony.appendChild(winnerSpotlight);
  const winnerNames=winnerSpotlight.querySelector('[data-winner-names]'),winnerStatus=winnerSpotlight.querySelector('[data-winner-status]');
  const ceremonyStatus=document.createElement('p');ceremonyStatus.setAttribute('aria-live','polite');ceremony.appendChild(ceremonyStatus);
  const podium=document.createElement('div');podium.className='sr-medal-grid';ceremony.appendChild(podium);
  const awardCards=placeGroups.map(group=>{const card=document.createElement('article');card.className='sr-medal-card';card.dataset.medal=String(group.place);card.hidden=true;
    const medal=document.createElement('div');medal.className='sr-medallion';medal.textContent=String(group.place);medal.setAttribute('aria-label',group.place===1?'Medaglia d’oro':group.place===2?'Medaglia d’argento':'Medaglia di bronzo');card.appendChild(medal);
    const place=document.createElement('h4');place.textContent=group.place+'° POSTO'+(group.entries.length>1?' · PARI MERITO':'');card.appendChild(place);
    const names=document.createElement('div');names.className='sr-award-names';for(const entry of group.entries){const name=document.createElement('strong');name.textContent=entry.name;name.dataset.place=String(group.place);name.setAttribute('aria-label',entry.name+', '+group.place+'° posto');names.appendChild(name)}card.appendChild(names);
    const score=document.createElement('p');score.textContent=group.entries[0].score||'';card.appendChild(score);podium.appendChild(card);return card;
  });
  const sparks=document.createElement('div');sparks.className='sr-award-sparks';sparks.setAttribute('aria-hidden','true');ceremony.appendChild(sparks);
  let awardIndex=-1;
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
  ui.querySelector('[data-skip]').textContent='Vai alla classifica';
  const duration=profile.pace==='aggressive'?10:12;
  const start=2.5;
  const ceremonyStart=duration+(Math.max(...entries.map(e=>e.place))-1)*.48+1.5;
  const awardStep=2.15,ceremonyEnd=ceremonyStart+placeGroups.length*awardStep+2.2;
  function frame(now){
    if(disposed)return;if(!host.isConnected){dispose(false);return}if(lastTime)clock+=Math.min((now-lastTime)/1000,.25);lastTime=now;
    const elapsed=Math.max(0,clock-start),p=clamp(elapsed/duration,0,1),racing=clock>=start&&p<1;
    if(clock<start){count.textContent=String(Math.max(1,3-Math.floor(clock/ .84)))}else if(elapsed<.6){count.textContent='VIA'}else{count.textContent='';}
    const c=clock<start?Math.max(1,3-Math.floor(clock/.84)):0;
    if(c!==lastCount){lastCount=c;audio?.countdown(c)}
    if(clock>=start&&!started){started=true;audio?.start()}
    if(Math.floor(clock*2)!==lastAmbience){lastAmbience=Math.floor(clock*2);audio?.ambience(started?(p>.82?.9:.45):.22);audioState()}
    const ordered=[];
    horses.forEach((h,i)=>{
      const rank=h.entry.place,finishAt=duration+(rank-1)*.48;
      const f=clamp(elapsed/finishAt,0,1),progress=raceProgress(f,h.motion),coast=clamp((elapsed-finishAt)/2,0,1);
      const phase=elapsed*h.motion.speed+h.motion.phase,amp=clock<start?0:1-smooth(coast);
      h.body.position.y=(Math.sin(phase*2)*h.motion.bounce+.028)*amp;
      h.body.rotation.z=Math.sin(phase)*.022*amp;
      // Progress tracks the foremost point of the muzzle, not the saddle.
      // Compensate independent body pitch: all tied noses reach the same finish plane.
      const noseOffset=2.13*Math.cos(h.body.rotation.z)-2.37*Math.sin(h.body.rotation.z);
      const noseX=2.13+progress*(48-2.13)+5*(1-(1-coast)**2),x=noseX-noseOffset;
      h.root.position.x=x;
      if(f>=1&&!h.crossed){
        h.crossed=true;
        if(!soundedFinishes.has(rank)){soundedFinishes.add(rank);audio?.finish(rank);}
        if(rank===1){
          nameTags[i].n.classList.add('sr-name-winner');
          if(celebrationAt===null){
            celebrationAt=elapsed;audio?.cheer?.();winnerBanner.textContent='🏆 '+winners.map(e=>e.name).join(' + ')+(winningTie?' · VINCITORI EX AEQUO':' · VINCE');winnerBanner.hidden=false;host.dataset.celebrations='1';
            if(winningTie){audio?.tie?.();tiePanel.replaceChildren();const heading=document.createElement('b');heading.textContent='ARRIVO EX AEQUO';tiePanel.appendChild(heading);for(const winner of winners){const row=document.createElement('span');row.textContent=winner.name+' · 1° · '+(winner.score||'stesso punteggio');tiePanel.appendChild(row)}tiePanel.hidden=false;host.dataset.tieFinish=String(winners.length);}
          }
        }
        host.dataset.arrivals=(host.dataset.arrivals||'')+rank+',';
        host.dispatchEvent(new CustomEvent('sisal-race-arrival',{detail:{name:h.entry.name,place:rank,time:finishAt,x:48,noseX,phase}}));
      }
      const hoof=Math.floor(phase/Math.PI*2);
      if(clock>=start&&coast<.85&&hoof!==h.lastHoof){h.lastHoof=hoof;audio?.hoof(i)}
      h.legs.forEach(l=>{l.hip.rotation.z=Math.sin(phase+l.phase)*h.motion.stride*amp;l.shin.rotation.z=(l.hind?-1:1)*Math.max(0,Math.cos(phase+l.phase))*.92*amp});
      h.tail.rotation.y=Math.sin(phase*.47+h.motion.tailPhase)*.2;h.tail.rotation.z=.16*amp;
      h.rider.rotation.z=-Math.sin(phase*2+h.motion.riderPhase)*.035*amp;h.head.rotation.z=Math.sin(phase+h.motion.riderPhase)*.035*amp;
      ordered.push({i,progress});
      for(let j=0;j<42;j++){const age=((elapsed*1.25+j/42)%1),idx=(i*42+j)*3;dustPos[idx]=x-1.2-age*4;dustPos[idx+1]=.1+age*.8;dustPos[idx+2]=h.root.position.z+Math.sin(j*34)*age*.7}
    });
    const ceremonyAge=elapsed-ceremonyStart;
    if(ceremonyAge>=0){
      ceremony.hidden=false;ui.classList.add('sr-awards-active');winnerBanner.hidden=true;tiePanel.hidden=true;
      const next=Math.min(placeGroups.length-1,Math.floor(ceremonyAge/awardStep));
      if(next>awardIndex){awardIndex=next;const group=placeGroups[next];awardCards[next].hidden=false;sparks.replaceChildren();if(!reduced)for(let k=0;k<24;k++){const spark=document.createElement('i');spark.style.left=(random()*100)+'%';spark.style.top=(random()*80+10)+'%';spark.style.animationDelay=(random()*.6)+'s';sparks.appendChild(spark);}awardCards.forEach((c,j)=>c.classList.toggle('sr-award-current',j===next));ceremonyStatus.textContent=group.place+'° posto'+(group.entries.length>1?' a pari merito':'')+' · '+group.entries.map(e=>e.name).join(' e ');audio?.medal?.(group.place,group.entries.length);host.dataset.awards=(host.dataset.awards||'')+group.place+',';if(group.place===1){winnerSpotlight.hidden=false;winnerSpotlight.classList.add('sr-winner-reveal');winnerNames.textContent=group.entries.map(e=>e.name).join(' + ');winnerStatus.textContent=group.entries.length>1?'VINCITORI EX AEQUO · COPPA CONDIVISA':'CAMPIONE · COPPA D’ORO';celebrationAt=elapsed;audio?.cheer?.();}}
      if(ceremonyAge>=placeGroups.length*awardStep){ceremonyStatus.textContent='ONORE A TUTTI I PREMIATI';ceremonyHeading.textContent='PODIO COMPLETO';}
    }
    const celebrationAge=celebrationAt===null?-1:elapsed-celebrationAt;
    if(Math.floor(clock*12)!==lastCrowdUpdate){lastCrowdUpdate=Math.floor(clock*12);updateCrowd(reduced?0:clock,reduced?0:celebrationAge>=0?Math.min(1,celebrationAge*4):p>.85?.25:0)}
    tieRings.forEach(r=>{r.visible=celebrationAt!==null&&ceremonyAge<0;r.scale.setScalar(reduced?1:1+.08*Math.sin(clock*5))});
    confetti.visible=celebrationAge>=0&&celebrationAge<4&&!reduced;
    if(confetti.visible){confettiData.forEach((d,i)=>{const t=Math.max(0,celebrationAge-d.delay),y=.7+d.vy*t-2.4*t*t;dummy.position.set(48+d.vx*t,Math.max(.08,y),d.side*(trackHalf+.2-d.vz*t));dummy.rotation.set(t*d.spin,t*2,t*d.spin*.7);dummy.scale.setScalar(celebrationAge<d.delay?0:1);dummy.updateMatrix();confetti.setMatrixAt(i,dummy.matrix)});confetti.instanceMatrix.needsUpdate=true;}
    dust.visible=racing&&!reduced;dustGeo.attributes.position.needsUpdate=true;
    ordered.sort((a,b)=>b.progress-a.progress||entries[a.i].place-entries[b.i].place);
    const xs=horses.map(h=>h.root.position.x),center=(Math.max(...xs)+Math.min(...xs))/2,spread=Math.max(...xs)-Math.min(...xs);
    const portrait=camera.aspect<1,dist=(portrait?25:19)+spread*.4+Math.max(0,trackHalf-6.5)*2.5;
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
      lastHUD=Math.floor(clock*8);
      const finishedPlaces=new Set(horses.filter(h=>h.crossed).map(h=>h.entry.place)).size;
      ordered.forEach(({i,progress},position)=>{
        const crossed=horses[i].crossed;
        const livePlace=crossed?entries[i].place:1+finishedPlaces+ordered.filter(other=>!horses[other.i].crossed&&other.progress>progress+1e-8).length;
        const liveTied=crossed?entries.filter(e=>e.place===entries[i].place).length>1:ordered.filter(other=>!horses[other.i].crossed&&Math.abs(other.progress-progress)<1e-8).length>1;
        labels[i].style.order=position;labels[i].dataset.position=String(livePlace)+(liveTied?' =':'');
      });meter.style.width=`${p*100}%`;
      caption.textContent=clock<start?'AI CANCELLI':p<.82?'RETTILINEO · CORSA DELLA TOP 3':p<1?'ULTIMI METRI':'ARRIVO';
    }
    if(elapsed>=duration+1.0&&!finished){finished=true;onFinish();}
    if(finished){count.textContent='';caption.textContent=`1° ${winners.map(e=>e.name).join(' + ')}${winningTie?' · EX AEQUO':''}`;}
    renderer.render(scene,camera);
    if(elapsed>ceremonyEnd){dispose(true);return}raf=requestAnimationFrame(frame);
  }
  if(!document.hidden)raf=requestAnimationFrame(frame);return result;
}
