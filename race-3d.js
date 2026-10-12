/* Sisal Race / local WebGL scene. No network/API/photo downloads. */
import * as T from './vendor/three.module.min.js';
import {sculptGeometry,enhanceTrack,mergeRigidParts} from './race-visuals.js?v=32.1.40';
import {randomSource,motionProfile,spectatorProfile,spectatorPose} from './race-motion.js?v=32.1.39';
import {sampleRace} from './race-engine.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>x*x*(3-2*x);
export async function runRace(host,entries,{race,profile={},audio=null,onFinish=()=>{},onExit=()=>{},replay=false}={}){
  if(!entries.length){audio?.dispose();return false}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const trackHalf=Math.max(6.5,entries.length*1.65+.5);
  const seed=race.seed,random=randomSource(seed ^ 0xa731);host.dataset.raceSeed=String(seed);
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
  const mobile=matchMedia('(pointer: coarse)').matches;
  let renderScale=Math.min(devicePixelRatio||1,mobile?1.25:1.75);
  renderer.setPixelRatio(renderScale);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
  const canvas=renderer.domElement;canvas.setAttribute('aria-label','Sisal Racing: corsa dei cavalli con classifica live');host.appendChild(canvas);
  const scene=new T.Scene(),night=['night','stadium'].includes(profile.lighting);
  const sunset=profile.lighting==='sunset';
  scene.background=new T.Color(night?'#122033':sunset?'#d6b6a0':'#b5c9d1');scene.fog=new T.Fog(scene.background,62,165);
  const camera=new T.PerspectiveCamera(36,1,.1,230);
  const resources=new Set(),textures=new Set();let disposed=false;
  const geo=g=>(resources.add(g),g);
  const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.7,...extra});resources.add(m);return m};
  const sphere=geo(new T.SphereGeometry(1,mobile?18:24,mobile?12:16)),box=geo(new T.BoxGeometry(1,1,1));
  const sculpt=(parent,material,sections,steps=32,sides=20)=>mesh(parent,geo(sculptGeometry(sections,mobile?Math.ceil(steps*.7):steps,mobile?Math.ceil(sides*.65):sides)),material,[0,0,0]);
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
  const sun=new T.DirectionalLight(night?'#bbd6ff':sunset?'#ffc286':'#ffe4ba',night?2.5:3);sun.position.set(-15,24,18);sun.castShadow=true;sun.shadow.mapSize.set(matchMedia('(pointer: coarse)').matches?1024:2048,matchMedia('(pointer: coarse)').matches?1024:2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:20,bottom:-20,near:1,far:90});sun.shadow.normalBias=.018;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
  const rim=new T.DirectionalLight('#d3e7ef',.75);rim.position.set(10,9,-18);scene.add(rim);
  cube(scene,mats.grass,[85,-.25,0],[340,.4,180]);
  const dirtMap=texture((c,w,h)=>{c.fillStyle='#b19676';c.fillRect(0,0,w,h);let seed=24;for(let i=0;i<18000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%w;seed=(seed*1664525+1013904223)>>>0;const y=seed%h;c.fillStyle=i%2?'#8e765b':'#c0a480';c.fillRect(x,y,1+(i%3),1)}},512,512);dirtMap.wrapS=dirtMap.wrapT=T.RepeatWrapping;dirtMap.repeat.set(35,4);mats.dirt.map=dirtMap;
  cube(scene,mats.dirt,[85,-.02,0],[300,.12,trackHalf*2]);
  // Running rails and tapered posts extend through the whole tracking shot.
  for(const z of [-trackHalf-.5,trackHalf+.5]){cube(scene,mats.white,[85,1.15,z],[300,.13,.13]);cube(scene,mats.white,[85,.68,z],[300,.08,.08]);for(let x=-42;x<228;x+=4)cube(scene,mats.white,[x,.56,z],[.13,1.15,.14])}
  for(let x=-10;x<211;x+=24){const b=sign('SISAL FC 2021',512,128,scene,[7,1.4]);b.position.set(x,.85,-7.3)}
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
    if(random()<(mobile?.68:.3))continue;
    const p=spectatorProfile(random,row*68+col);
    const fabric=new T.Color(shirts[Math.floor(p.shirt*shirts.length)]);fabric.offsetHSL((random()-.5)*.07,(random()-.5)*.15,(random()-.5)*.1);
    const skin=new T.Color(skins[Math.floor(p.skin*skins.length)]);skin.offsetHSL(0,0,(random()-.5)*.05);
    people.push({...p,x:-15+col*1.5+(random()-.5)*.2,y:.72+row*.65,z:-12.95-row*1.35,shirtColor:fabric.getHex(),skinColor:skin.getHex(),hairColor:['#302721','#806544','#bfac83','#1c1a1a'][p.hair],trouserColor:new T.Color().setHSL(.55+p.trousers*.12,.12,.15+p.trousers*.17).getHex()});
  }
  const humanGeo=geo(new T.SphereGeometry(1,mobile?6:8,mobile?4:6)),faceGeo=geo(new T.SphereGeometry(1,mobile?10:12,mobile?8:10)),humanMat=mat('#ffffff',{roughness:.86});
  const crowdParts={};
  const paired=new Set(['eyes','thighs','calves','shoes','upperArms','forearms','hands']);
  for(const part of ['torso','head','hair','nose','eyes','mouth','thighs','calves','shoes','upperArms','forearms','hands','hat','scarf']){const count=people.length*(paired.has(part)?2:1),m=new T.InstancedMesh(part==='head'?faceGeo:humanGeo,humanMat,count);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;m.receiveShadow=true;scene.add(m);crowdParts[part]=m;}
  const dummy=new T.Object3D(),crowdColor=new T.Color();
  const upVector=new T.Vector3(0,1,0),limbDirection=new T.Vector3();
  function personPart(kind,index,x,y,z,sx,sy,sz,angle,color,initial){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,0,angle);dummy.updateMatrix();crowdParts[kind].setMatrixAt(index,dummy.matrix);if(initial)crowdParts[kind].setColorAt(index,crowdColor.set(color))}
  function crowdLimb(kind,index,a,b,r,color,initial){limbDirection.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=limbDirection.length();dummy.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);dummy.scale.set(r,length/2+r*.3,r);dummy.quaternion.setFromUnitVectors(upVector,limbDirection.normalize());dummy.updateMatrix();crowdParts[kind].setMatrixAt(index,dummy.matrix);if(initial)crowdParts[kind].setColorAt(index,crowdColor.set(color))}
  function updateCrowd(time,cheer,initial=false){
    people.forEach((p,i)=>{
      const pose=spectatorPose(p,time,cheer,reduced);
      const {clock,beat,sway,action,rise}=pose;
      const y=p.y+rise,x=p.x+sway,z=p.z;
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
        const gesture=pose.hands[sign===1?1:0];
        const elbow=gesture.elbow.map((v,k)=>v+[x,y,z][k]),hand=gesture.hand.map((v,k)=>v+[x,y,z][k]);
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
  const scenery=enhanceTrack({scene,renderer,geo,mat,texture,mesh,cube,box,trackHalf,night,sunset,profile,seed});
  mats.dirt.bumpMap=dirtMap;mats.dirt.bumpScale=.065;mats.dirt.roughness=scenery.wet?.38:.95;
  dirtMap.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  if(scenery.wet)mats.dirt.color.set('#756958');
  // Finish stripe and gantry.
  for(let z=-Math.floor(trackHalf);z<=Math.floor(trackHalf);z++)for(let a=0;a<2;a++)cube(scene,(z+a)%2?mats.white:mats.black,[162+a*.45,.055,z],[.45,.025,1]);
  for(const z of [-trackHalf-1,trackHalf+1])cube(scene,z>0?mat('#182b2a',{transparent:true,opacity:.25,depthWrite:false}):mats.dark,[163,3.7,z],[.45,7.4,.45]);
  cube(scene,mats.dark,[163,7.3,0],[.55,.65,trackHalf*2+2.5]);
  const finish=sign('FINISH',512,128,scene,[5,1.2]);finish.rotation.y=-Math.PI/2;finish.position.set(162.65,7.15,0);
  cube(scene,mats.white,[2.13,.058,0],[.12,.024,trackHalf*2]);
  for(let m=100;m<400;m+=100){const marker=sign(String(400-m)+' m',256,128,scene,[2,1]);marker.position.set(2.13+m*(162-2.13)/400,1.1,-trackHalf-.8);}
  const gates=entries.map((e,i)=>{const gate=new T.Group();scene.add(gate);gate.position.set(3.1,0,(i-(entries.length-1)/2)*3.3);for(const z of [-1.3,1.3])cube(gate,mats.metal,[0,1.3,z],[.12,2.6,.12]);const door=new T.Group();gate.add(door);cube(door,mats.white,[0,1.6,0],[.1,.15,2.6]);cube(door,mats.white,[0,.9,0],[.1,.12,2.6]);return door;});
  const contactMap=texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(10,16,11,.4)');g.addColorStop(.45,'rgba(10,16,11,.23)');g.addColorStop(1,'rgba(10,16,11,0)');c.fillStyle=g;c.fillRect(0,0,w,h)},128,128);
  const contactMaterial=new T.MeshBasicMaterial({map:contactMap,transparent:true,opacity:.7,depthWrite:false});resources.add(contactMaterial);
  function horse(entry,index){
    const root=new T.Group();scene.add(root);root.position.z=(index-(entries.length-1)/2)*3.3;
    const body=new T.Group();root.add(body);
    const motion=motionProfile(random,index);
    const coats=['#744c36','#39332f','#b2aaa0','#573b29','#946546'];
    const fur=texture((c,w,h)=>{c.fillStyle=coats[index%coats.length];c.fillRect(0,0,w,h);for(let k=0;k<6500;k++){c.strokeStyle=k%2?'rgba(255,240,214,.06)':'rgba(18,12,9,.08)';const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+2+random()*4,y+1);c.stroke()}},256,256);
    const coat=mat('#ffffff',{map:fur,bumpMap:fur,bumpScale:.008,roughness:.47}),mane=mat(index===2?'#686057':'#1c1716',{roughness:.83});
    const silkMap=texture((c,w,h)=>{c.fillStyle=entry.color;c.fillRect(0,0,w,h);c.fillStyle='#e8eee2';c.beginPath();c.moveTo(0,h*.13);c.lineTo(w,h*.62);c.lineTo(w,h*.78);c.lineTo(0,h*.29);c.fill();c.fillRect(w*.1,0,w*.045,h);},128,128);
    const silk=mat('#ffffff',{map:silkMap,roughness:.65});
    // Sculpted ribcage, withers and hindquarters replace overlapping ellipsoids.
    sculpt(body,coat,[[-1.17,1.74,0,.06,.07],[-.92,1.76,0,.36,.32],[-.63,1.72,0,.46,.39],[-.22,1.68,0,.40,.37],[.25,1.74,0,.40,.34],[.68,1.76,0,.49,.35],[.97,1.81,0,.25,.23],[1.02,1.84,0,.05,.07]],44,24);
    sculpt(body,coat,[[.54,1.74,0,.26,.29],[.76,2.03,0,.36,.3],[.98,2.37,0,.27,.23],[1.13,2.66,0,.20,.18],[1.3,2.76,0,.11,.14]],30,24);
    // Head narrows toward the muzzle. The nose remains at x=2.13: ties/finish unchanged.
    sculpt(body,coat,[[1.12,2.76,0,.10,.14],[1.31,2.74,0,.24,.22],[1.54,2.58,0,.21,.18],[1.77,2.44,0,.13,.14],[1.98,2.37,0,.14,.17],[2.13,2.37,0,.002,.002]],30,24);
    const muzzleSkin=mat(index===2?'#6e675e':'#392b25',{roughness:.72});
    for(const z of [-.135,.135])ball(body,muzzleSkin,[1.985,2.365,z],[.095,.105,.04]);
    const noseTip=new T.Object3D();noseTip.name=`horse-nose-${index}`;noseTip.position.set(2.13,2.37,0);body.add(noseTip);
    for(const z of [-.165,.165]){ball(body,mats.black,[1.97,2.42,z],[.053,.026,.014]);link(body,mats.leather,[1.69,2.38,z],[1.96,2.31,z],.008);}
    if(index%3!==1){const blaze=ball(body,mats.white,[1.48,2.76,.003],[.28,.016,.054]);blaze.rotation.z=-.35;}
    for(const z of [-.19,.19]){
      sculpt(body,coat,[[1.2,2.83,z*.65,.07,.055],[1.2,3.03,z*.75,.065,.04],[1.29,3.19,z*.85,.002,.003]],12,12);
      ball(body,mats.black,[1.49,2.72,z*1.16],[.037,.026,.018]);ball(body,mats.white,[1.50,2.73,z*1.2],[.008,.008,.005]);
    }
    sculpt(body,mane,[[.47,2.06,0,.04,.045],[.58,2.28,0,.09,.07],[.79,2.6,0,.10,.065],[1.0,2.82,0,.075,.045],[1.19,2.9,0,.015,.015]],22,12);
    const tail=new T.Group();tail.position.set(-1.03,1.94,0);body.add(tail);
    sculpt(tail,mane,[[0,0,0,.08,.075],[-.25,-.08,0,.11,.10],[-.55,-.2,0,.12,.09],[-.85,-.4,0,.09,.07],[-1.16,-.48,0,.005,.006]],22,12);
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
    const arms=[];
    for(const z of [-.28,.28]){
      link(rider,mats.white,[-.1,.15,z],[.24,-.12,z*1.2],.095);link(rider,mats.black,[.24,-.12,z*1.2],[-.12,-.49,z*1.15],.07);ball(rider,mats.black,[-.04,-.5,z*1.15],[.16,.065,.08]);
      const arm=new T.Group();arm.name=`jockey-arm-${index}-${z>0?'salute':'reins'}`;arm.position.set(.4,.66,z*.62);rider.add(arm);
      link(arm,silk,[0,0,0],[.14,-.33,z*.38],.085);link(arm,silk,[.14,-.33,z*.38],[.42,-.39,z*.04],.055);ball(arm,mats.skin,[.44,-.39,z*.04],[.065,.06,.07]);arms.push(arm);
    }
    const head=new T.Group();head.position.set(.6,.89,0);rider.add(head);
    const standardFace=new T.Group();head.add(standardFace);
    ball(standardFace,mats.skin,[0,0,0],[.2,.235,.19]);ball(standardFace,mats.skin,[.17,-.025,0],[.095,.09,.09]);
    for(const z of [-.17,.17]){ball(standardFace,mats.dark,[.09,.03,z],[.1,.05,.025]);ball(standardFace,mats.black,[.11,.025,z*1.04],[.025,.022,.012])}
    ball(head,silk,[0,.19,0],[.26,.15,.23]);ball(head,mats.dark,[0,.13,.13],[.26,.03,.17]);
    for(const z of [-.47,.47]){const n=sign(String(index+1),128,128,body,[.36,.36],entry.color,'#ffffff');n.position.set(-.22,1.92,z);if(z<0)n.rotation.y=Math.PI;}
    // Soft contact shadow anchors the horse to the track, independent of shadow resolution.
    const shadow=mesh(root,geo(new T.PlaneGeometry(3.6,1.8)),contactMaterial,[0,.053,0]);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.receiveShadow=false;
    return {root,body,legs,tail,rider,head,arms,entry,index,motion,crossed:false,lastHoof:-1};
  }
  // Batch repeated stadium/rail geometry to keep mobile draw calls low.
  const batches=new Map();
  for(const o of [...scene.children])if(o.isMesh&&o.geometry===box){let list=batches.get(o.material);if(!list)batches.set(o.material,list=[]);list.push(o)}
  for(const [material,list] of batches){const batch=new T.InstancedMesh(box,material,list.length);list.forEach((o,i)=>{o.updateMatrix();batch.setMatrixAt(i,o.matrix);scene.remove(o)});batch.castShadow=true;batch.receiveShadow=true;scene.add(batch)}
  const horses=entries.map(horse);
  // Rigid meshes share draws; moving horse joints keep their own parent groups.
  mergeRigidParts(scene,geo);
  const parents=[];scene.traverse(o=>{if(o.isGroup)parents.push(o)});
  for(const parent of parents)mergeRigidParts(parent,geo);
  scene.traverse(o=>{if(o.isMesh){o.updateMatrix();o.matrixAutoUpdate=false}});
  // Rendering consumes immutable race frames; it never chooses winners.
  const dustPos=new Float32Array(entries.length*24*3),dustGeo=geo(new T.BufferGeometry());
  dustGeo.setAttribute('position',new T.BufferAttribute(dustPos,3));
  const dustMap=texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(210,186,150,.45)');g.addColorStop(1,'rgba(210,186,150,0)');c.fillStyle=g;c.fillRect(0,0,w,h)},32,32);
  const dustMaterial=new T.PointsMaterial({map:dustMap,color:'#bfa384',size:.6,transparent:true,opacity:.32,depthWrite:false});resources.add(dustMaterial);
  const dust=new T.Points(dustGeo,dustMaterial);dust.frustumCulled=false;scene.add(dust);
  const ui=document.createElement('div');ui.className='hr-overlay';
  ui.innerHTML=`<div class="hr-broadcast"><span>SISAL FC 2021 <b>RACING CLUB</b></span><span data-phase>AI CANCELLI</span></div>
    <div class="hr-count" aria-live="polite"></div><div class="hr-event" role="status"></div>
    <div class="hr-telemetry"><span data-distance></span><span data-time></span></div>
    <div class="hr-map"><i></i></div><ol class="hr-board" aria-label="Classifica live"></ol>
    <div class="hr-toolbar"><button data-pause>Pausa</button><button data-restart hidden>Restart</button>
    <select data-speed aria-label="Velocità replay" hidden><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select>
    <button data-camera>Regia auto</button><button data-audio aria-pressed="false">Audio spento</button>
    <label class="hr-volume">Volume<input data-volume type="range" min="0" max="100" value="50" aria-label="Volume audio"></label>
    <select data-quality aria-label="Qualità grafica"><option value="auto">Qualità AUTO</option><option value="high">HIGH</option><option value="medium">MEDIUM</option><option value="low">LOW</option></select>
    <button data-exit>Esci dalla gara</button></div><section class="hr-finish" hidden aria-label="Risultato gara"></section>`;
  host.appendChild(ui);
  const q=s=>ui.querySelector(s),board=q('.hr-board'),rows=entries.map((e,i)=>{const li=document.createElement('li');li.innerHTML='<b></b><i></i><span></span><small></small>';li.querySelector('i').style.background=e.color;li.querySelector('span').textContent=`${i+1} · ${e.name}`;board.appendChild(li);return li;});
  let time=-2.5,last=0,raf=0,paused=false,speed=1,notified=false,mode=0,lastCount=-1,lastHUD=-1,lastCrowd=-1,quality='auto',slow=0,qualityLevel=mobile?'medium':'high',finishShown=false;
  let resolveRun;const result=new Promise(resolve=>resolveRun=resolve),finishedIds=new Set();
  const world=new T.Vector3(),target=new T.Vector3(),eye=new T.Vector3();
  let width=1,height=1;
  function resizeView(){width=host.clientWidth;height=host.clientHeight;if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}}
  const resize=new ResizeObserver(resizeView);resize.observe(host);resizeView();
  function dispose(completed=false){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);audio?.dispose();scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.material?.map)textures.add(o.material.map)});textures.forEach(t=>t.dispose());resources.forEach(r=>r.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();ui.remove();resolveRun(completed);onExit(completed);}
  const observer=new MutationObserver(()=>{if(!host.isConnected)dispose(false)});observer.observe(document.body,{childList:true,subtree:true});
  function lost(e){e.preventDefault();dispose(false)}canvas.addEventListener('webglcontextlost',lost);
  function visibility(){last=0;cancelAnimationFrame(raf);if(document.hidden)audio?.pause();else if(!disposed){if(!paused)audio?.resume();raf=requestAnimationFrame(frame)}}document.addEventListener('visibilitychange',visibility);
  function setQuality(level){qualityLevel=level;renderScale=Math.min(devicePixelRatio||1,level==='high'?1.75:level==='medium'?1.15:.8);renderer.setPixelRatio(renderScale);renderer.shadowMap.enabled=level!=='low';sun.castShadow=level!=='low';Object.values(crowdParts).forEach(m=>m.visible=level!=='low');host.dataset.quality=level;}
  q('[data-quality]').onchange=e=>{quality=e.target.value;setQuality(quality==='auto'?(mobile?'medium':'high'):quality)};
  setQuality(qualityLevel);
  q('[data-camera]').onclick=()=>{mode=(mode+1)%4;q('[data-camera]').textContent=['Regia auto','Laterale','Tribuna','Leader'][mode]};
  q('[data-pause]').onclick=()=>{paused=!paused;q('[data-pause]').textContent=paused?'Play':'Pausa';last=0;paused?audio?.pause():audio?.resume()};
  q('[data-exit]').onclick=()=>dispose(notified||replay);
  q('[data-audio]').onclick=()=>{if(!audio)audio=window.SisalRaceAudio?.create();if(audio){audio.unlock();audio.toggle();audio.setVolume?.(Number(q('[data-volume]').value)/100);q('[data-audio]').textContent=audio.enabled?'Audio acceso':'Audio spento';q('[data-audio]').setAttribute('aria-pressed',String(audio.enabled));}};
  q('[data-volume]').oninput=e=>audio?.setVolume?.(Number(e.target.value)/100);
  q('[data-speed]').onchange=e=>{speed=Number(e.target.value)};
  function restart(){replay=true;time=-.3;last=0;paused=false;speed=Number(q('[data-speed]').value);finishShown=false;q('.hr-finish').hidden=true;q('[data-pause]').textContent='Pausa';finishedIds.clear();replayControls();}
  function replayControls(){q('[data-speed]').hidden=!replay;q('[data-restart]').hidden=!replay;}
  q('[data-restart]').onclick=restart;replayControls();
  function showFinish(){
    if(finishShown)return;finishShown=true;const panel=q('.hr-finish');panel.hidden=false;panel.replaceChildren();
    const kicker=document.createElement('small');kicker.textContent=race.photoFinish?'PHOTO FINISH · DISTACCO '+race.results[1].gap.toFixed(3)+' s':'ORDINE D’ARRIVO';panel.appendChild(kicker);
    const h=document.createElement('h2');h.textContent=race.results[0].name;panel.appendChild(h);
    const sub=document.createElement('p');sub.textContent='Vincitore della corsa · '+race.results[0].time.toFixed(3)+' s';panel.appendChild(sub);
    const podium=document.createElement('div');podium.className='hr-podium';
    for(const r of race.results.slice(0,3)){const item=document.createElement('article');item.dataset.place=r.position;const n=document.createElement('b');n.textContent=String(r.position).padStart(2,'0');const name=document.createElement('strong');name.textContent=r.name;const timing=document.createElement('span');timing.textContent=r.time.toFixed(3)+' s · '+(r.gap?'+'+r.gap.toFixed(3):'VINCITORE');item.append(n,name,timing);podium.appendChild(item);}panel.appendChild(podium);
    for(const r of race.results){const d=document.createElement('details');const summary=document.createElement('summary');summary.textContent=`${r.position}° · #${r.participantId} ${r.name} · ${r.time.toFixed(3)} s`;const p=document.createElement('p'),s=r.statistics;p.textContent=`Distacco: +${r.gap.toFixed(3)} s · Posizione dopo 1 s: ${s.startPosition} · Media posizione: ${s.averagePosition.toFixed(2)} · Migliore / peggiore: ${s.bestPosition} / ${s.worstPosition} · Sorpassi: ${s.overtakes} · Subiti: ${s.overtaken} · Al comando: ${s.timeLeading.toFixed(2)} s · Velocità media / massima: ${(s.averageSpeed*3.6).toFixed(1)} / ${(s.maxSpeed*3.6).toFixed(1)} km/h · Sprint: ${(s.sprintSpeed*3.6).toFixed(1)} km/h`;d.append(summary,p);panel.appendChild(d);}
    const play=document.createElement('button');play.textContent='Rivedi la gara';play.onclick=restart;panel.appendChild(play);
    if(race.photoFinish){const photo=document.createElement('button');photo.textContent='Rivedi il fotofinish · 0.5×';photo.onclick=()=>{restart();time=Math.max(0,race.results[0].time-1.8);speed=.5;q('[data-speed]').value='0.5';mode=4;};panel.appendChild(photo);}
    const close=document.createElement('button');close.textContent='Torna alle corse';close.onclick=()=>dispose(true);panel.appendChild(close);
  }
  // Compile all essential materials before starting the clock.
  camera.position.set(5,9,36);camera.lookAt(5,1,0);renderer.compile(scene,camera);
  function frame(now){
    if(disposed)return;if(!host.isConnected){dispose(false);return}
    const dt=last?Math.min((now-last)/1000,.15):0;last=now;
    if(!paused)time+=dt*(replay?speed:1);
    if(quality==='auto'&&!paused){slow=dt>.033?slow+1:Math.max(0,slow-1);if(slow>60){setQuality(qualityLevel==='high'?'medium':'low');slow=0;}}
    const elapsed=Math.max(0,time),snapshot=sampleRace(race,elapsed),leader=snapshot.ordered[0],p=leader.x/race.raceSettings.distance;
    const c=time<0?Math.ceil(-time):0;if(c!==lastCount){lastCount=c;if(!paused)audio?.countdown(c);if(!c)audio?.start();}
    q('.hr-count').textContent=time<0?String(c):time<.45?'VIA':'';
    const active=!paused&&time>=0;
    horses.forEach((h,i)=>{
      const r=snapshot.runners[i],coast=clamp((elapsed-r.result.time)/3,0,1);
      const phase=r.stride+h.motion.phase+coast*5,amp=time<0?.035:(1-smooth(coast))*clamp(r.speed/12,.1,1);
      h.body.position.y=(Math.sin(phase*2)*h.motion.bounce+.028)*amp;h.body.rotation.z=Math.sin(phase)*.022*amp;
      const noseOffset=2.13*Math.cos(h.body.rotation.z)-2.37*Math.sin(h.body.rotation.z);
      h.root.position.x=2.13+r.x*(162-2.13)/race.raceSettings.distance+7*(1-(1-coast)**2)-noseOffset;
      h.root.position.z=(r.lane-(entries.length-1)/2)*3.3;
      gates[i].rotation.y=-smooth(clamp(elapsed/.45,0,1))*Math.PI/2;
      h.legs.forEach(l=>{l.hip.rotation.z=Math.sin(phase+l.phase)*h.motion.stride*amp;l.shin.rotation.z=(l.hind?-1:1)*Math.max(0,Math.cos(phase+l.phase))*.92*amp});
      h.tail.rotation.y=Math.sin(phase*.47+h.motion.tailPhase)*.16;h.tail.rotation.z=.16*amp;
      h.rider.rotation.z=-Math.sin(phase*2+h.motion.riderPhase)*.035*amp-(p>.75?.07:0);h.head.rotation.z=Math.sin(phase)*.035*amp;
      h.arms[1].rotation.z=r.result.position===1?smooth(coast)*(2.2+(reduced?0:.1*Math.sin(elapsed*3))):0;
      audio?.gallop(i,active&&!r.crossed,Math.PI/(Math.max(4,r.speed)*1.03*2)/(replay?speed:1));
      if(r.crossed&&!finishedIds.has(i)){finishedIds.add(i);if(active)audio?.finish(r.result.position);host.dispatchEvent(new CustomEvent('sisal-race-arrival',{detail:{name:h.entry.name,place:r.result.position,time:r.result.time,noseX:162}}));}
      for(let j=0;j<24;j++){const age=(elapsed*1.6+j/24)%1,k=(i*24+j)*3;dustPos[k]=h.root.position.x-1.2-age*3;dustPos[k+1]=.08+age*.65;dustPos[k+2]=h.root.position.z+Math.sin(j*19)*age*.6;}
    });
    dust.visible=active&&!snapshot.complete&&!reduced&&qualityLevel!=='low';if(dust.visible)dustGeo.attributes.position.needsUpdate=true;
    const xs=horses.map(h=>h.root.position.x),center=(Math.max(...xs)+Math.min(...xs))/2,spread=Math.max(...xs)-Math.min(...xs);
    const portrait=camera.aspect<1,dist=(portrait?33:24)+spread*(portrait?1.05:.6)+Math.max(0,trackHalf-6.5)*2.6;
    const battle=snapshot.ordered.length>1&&leader.x-snapshot.ordered[1].x<1.5;
    let focus=center,cy=6.5,cz=dist,cx=center+5;
    if(!reduced){
      if(mode===2){cy=14;cz=dist*.9;}
      if(mode===3){focus=horses[leader.index].root.position.x;cx=focus+5;cz=Math.max(portrait?32:23,dist*.8);}
      if(mode===0&&battle&&p>.35&&!portrait){cy=4.5;cz=dist*.9;}
      if(mode===4||(mode===0&&p>.94)){focus=162;cx=166;cy=7;cz=dist+3;}
    }
    target.set(focus,1.4,0);eye.set(cx,cy,cz);
    if(time<-2.4||reduced){camera.position.copy(eye);world.copy(target)}else{camera.position.lerp(eye,1-Math.exp(-dt*2.4));world.lerp(target,1-Math.exp(-dt*3));}
    camera.lookAt(world);sun.position.set(center-15,24,18);sun.target.position.set(center,0,0);sun.target.updateMatrixWorld();
    scenery.update(elapsed,center,reduced||qualityLevel==='low');
    const crowdFrame=Math.floor(elapsed*(qualityLevel==='high'?12:5));if(crowdFrame!==lastCrowd&&qualityLevel!=='low'){lastCrowd=crowdFrame;updateCrowd(elapsed,snapshot.complete?1:p>.85?.8:.2);}
    if(lastHUD!==Math.floor(elapsed*10)||paused){lastHUD=Math.floor(elapsed*10);
      snapshot.ordered.forEach((r,rank)=>{const row=rows[r.index],previous=Number(row.dataset.rank||rank+1),delta=previous-rank-1;row.style.order=rank;row.querySelector('b').textContent=rank+1;row.querySelector('small').textContent=r.crossed?r.result.time.toFixed(3)+' s':rank===0?'IN TESTA':(leader.x-r.x).toFixed(1)+' m';if(delta){row.dataset.change=delta>0?'▲ +'+delta:'▼ '+delta;row.dataset.changed=elapsed;}if(elapsed-Number(row.dataset.changed)>1.5)row.dataset.change='';row.dataset.rank=rank+1;row.classList.toggle('hr-leading',rank===0);});
      q('[data-phase]').textContent=replay?'REPLAY':time<0?'AI CANCELLI':snapshot.complete?'ARRIVO':p<.12?'PARTENZA':p<.45?'GRUPPO':p<.75?'RETTILINEO':'SPRINT FINALE';
      q('[data-distance]').textContent=Math.ceil(Math.max(0,race.raceSettings.distance-leader.x))+' m al traguardo';q('[data-time]').textContent=elapsed.toFixed(1)+' s';q('.hr-map i').style.width=p*100+'%';
      const event=race.events.filter(e=>e.time<=elapsed&&elapsed-e.time<2.2).at(-1);
      q('.hr-event').textContent=event?event.type==='leader'?'NUOVO LEADER · '+entries[Number(event.participantId)-1].name:event.type==='duel'?'TESTA A TESTA':event.type==='sprint'?'ULTIMI METRI':event.type==='photo'?'PHOTO FINISH · '+event.gap.toFixed(3)+' s':'':'';
    }
    if(snapshot.complete&&!notified){notified=true;if(!replay)onFinish(race);}
    if(elapsed>=race.duration+2)showFinish();
    renderer.render(scene,camera);host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);
    raf=requestAnimationFrame(frame);
  }
  if(!document.hidden)raf=requestAnimationFrame(frame);return result;
}
