import {signaturePose} from './race-signature.js?v=club-8-racefix2';
import {styleColors,paintSilks} from './horse-style.js?v=club-8-racefix2';
/* Sisal Race / local WebGL scene. No network/API/photo downloads. */
import * as T from './vendor/three.module.min.js';
import {sculptGeometry,enhanceTrack,mergeRigidParts} from './race-visuals.js?v=32.1.40';
import {randomSource,raceSeed,motionProfile,racePlan,plannedProgress,spectatorProfile,spectatorPose} from './race-motion.js?v=32.1.39';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>x*x*(3-2*x);
export async function runRace(host,entries,{profile={},audio=null,title='TOP 3 · ULTIME 5',onFinish=()=>{},introduction=true}={}){
  if(!entries.length){audio?.dispose();return false}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const poseLabels={salute:'Saluto',arms:'Braccia al cielo',bow:'Inchino',crowd:'Verso il pubblico'};
  const trackHalf=Math.max(6.5,entries.length*1.65+.5);
  const seed=raceSeed(),random=randomSource(seed);host.dataset.raceSeed=String(seed);
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
  const mobile=matchMedia('(pointer: coarse)').matches;
  let renderScale=Math.min(devicePixelRatio||1,mobile?1.25:1.75);
  renderer.setPixelRatio(renderScale);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
  const canvas=renderer.domElement;canvas.setAttribute('aria-label','Corsa 3D: animazione della classifica ultime 5, con pari merito');host.appendChild(canvas);
  const scene=new T.Scene(),night=['night','stadium'].includes(profile.lighting);
  const sunset=profile.lighting==='sunset';
  scene.background=new T.Color(night?'#122033':sunset?'#d6b6a0':'#b5c9d1');scene.fog=new T.Fog(scene.background,62,165);
  const camera=new T.PerspectiveCamera(36,1,.1,230);
  const resources=new Set(),textures=new Set();let disposed=false;
  const geo=g=>(resources.add(g),g);
  const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.7,...extra});resources.add(m);return m};
  const sphere=geo(new T.SphereGeometry(1,mobile?18:24,mobile?12:16)),box=geo(new T.BoxGeometry(1,1,1));
  const sculpt=(parent,material,sections,steps=32,sides=20)=>mesh(parent,geo(sculptGeometry(sections,steps,sides)),material,[0,0,0]);
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
  for(let z=-Math.floor(trackHalf);z<=Math.floor(trackHalf);z++)for(let a=0;a<2;a++)cube(scene,(z+a)%2?mats.white:mats.black,[48+a*.45,.055,z],[.45,.025,1]);
  for(const z of [-trackHalf-1,trackHalf+1])cube(scene,z>0?mat('#182b2a',{transparent:true,opacity:.25,depthWrite:false}):mats.dark,[49,3.7,z],[.45,7.4,.45]);
  cube(scene,mats.dark,[49,7.3,0],[.55,.65,trackHalf*2+2.5]);
  const finish=sign('FINISH',512,128,scene,[5,1.2]);finish.rotation.y=-Math.PI/2;finish.position.set(48.65,7.15,0);
  const contactMap=texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(10,16,11,.4)');g.addColorStop(.45,'rgba(10,16,11,.23)');g.addColorStop(1,'rgba(10,16,11,0)');c.fillStyle=g;c.fillRect(0,0,w,h)},128,128);
  const contactMaterial=new T.MeshBasicMaterial({map:contactMap,transparent:true,opacity:.7,depthWrite:false});resources.add(contactMaterial);
  function horse(entry,index){
    const root=new T.Group();scene.add(root);root.position.z=(index-(entries.length-1)/2)*3.3;
    const body=new T.Group();root.add(body);
    const motion=motionProfile(random,index);
    const coats=['#744c36','#39332f','#b2aaa0','#573b29','#946546'];
    const custom=entry.appearance?styleColors(entry.appearance):null;
    const leather=custom?mat(custom.saddleColor,{roughness:.7}):mats.leather;
    const trim=custom?mat(custom.trimColor,{metalness:.72,roughness:.3}):mats.metal;
    const gloves=custom?mat(custom.glovesColor,{roughness:.8}):mats.skin;
    const breeches=custom?mat(custom.breechesColor,{roughness:.85}):mats.white;
    const cloth=custom?mat(custom.clothColor,{roughness:.8}):null;
    const helmet=custom?mat(custom.helmetColor,{roughness:.5}):null;
    const fur=texture((c,w,h)=>{c.fillStyle=custom?.coatColor||coats[index%coats.length];c.fillRect(0,0,w,h);for(let k=0;k<6500;k++){c.strokeStyle=k%2?'rgba(255,240,214,.06)':'rgba(18,12,9,.08)';const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+2+random()*4,y+1);c.stroke()}},256,256);
    const coat=mat('#ffffff',{map:fur,bumpMap:fur,bumpScale:.008,roughness:.47}),mane=mat(custom?.maneColor||(index===2?'#686057':'#1c1716'),{roughness:.83});
    const silkMap=texture((c,w,h)=>{if(custom){paintSilks(c,w,h,custom);return;}c.fillStyle=entry.color;c.fillRect(0,0,w,h);c.fillStyle='#e8eee2';c.beginPath();c.moveTo(0,h*.13);c.lineTo(w,h*.62);c.lineTo(w,h*.78);c.lineTo(0,h*.29);c.fill();c.fillRect(w*.1,0,w*.045,h);},128,128);
    const silk=mat('#ffffff',{map:silkMap,roughness:.65});
    // Sculpted ribcage, withers and hindquarters replace overlapping ellipsoids.
    sculpt(body,coat,[[-1.17,1.74,0,.06,.07],[-.92,1.76,0,.36,.32],[-.63,1.72,0,.46,.39],[-.22,1.68,0,.40,.37],[.25,1.74,0,.40,.34],[.68,1.76,0,.49,.35],[.97,1.81,0,.25,.23],[1.02,1.84,0,.05,.07]],44,24);
    sculpt(body,coat,[[.54,1.74,0,.26,.29],[.76,2.03,0,.36,.3],[.98,2.37,0,.27,.23],[1.13,2.66,0,.20,.18],[1.3,2.76,0,.11,.14]],30,24);
    // Head narrows toward the muzzle. The nose remains at x=2.13: ties/finish unchanged.
    sculpt(body,coat,[[1.12,2.76,0,.10,.14],[1.31,2.74,0,.24,.22],[1.54,2.58,0,.21,.18],[1.77,2.44,0,.13,.14],[1.98,2.37,0,.14,.17],[2.13,2.37,0,.002,.002]],30,24);
    const muzzleSkin=mat(index===2?'#6e675e':'#392b25',{roughness:.72});
    for(const z of [-.135,.135])ball(body,muzzleSkin,[1.985,2.365,z],[.095,.105,.04]);
    const noseTip=new T.Object3D();noseTip.name=`horse-nose-${index}`;noseTip.position.set(2.13,2.37,0);body.add(noseTip);
    for(const z of [-.165,.165]){ball(body,mats.black,[1.97,2.42,z],[.053,.026,.014]);link(body,leather,[1.69,2.38,z],[1.96,2.31,z],.008);}
    for(const z of [-.19,.19]){
      sculpt(body,coat,[[1.2,2.83,z*.65,.07,.055],[1.2,3.03,z*.75,.065,.04],[1.29,3.19,z*.85,.002,.003]],12,12);
      ball(body,mats.black,[1.49,2.72,z*1.16],[.037,.026,.018]);ball(body,mats.white,[1.50,2.73,z*1.2],[.008,.008,.005]);
    }
    sculpt(body,mane,[[.47,2.06,0,.04,.045],[.58,2.28,0,.09,.07],[.79,2.6,0,.10,.065],[1.0,2.82,0,.075,.045],[1.19,2.9,0,.015,.015]],22,12);
    const tail=new T.Group();tail.position.set(-1.03,1.94,0);body.add(tail);
    sculpt(tail,mane,[[0,0,0,.08,.075],[-.25,-.08,0,.11,.10],[-.55,-.2,0,.12,.09],[-.85,-.4,0,.09,.07],[-1.16,-.48,0,.005,.006]],22,12);
    // Saddle cloth, saddle, girth and bridle.
    ball(body,cloth||silk,[-.1,1.99,0],[.57,.28,.46]);ball(body,leather,[-.1,2.19,0],[.47,.13,.32]);
    for(const z of [-.43,.43]){link(body,leather,[-.05,2.12,z],[-.05,1.36,z],.035);link(body,leather,[1.9,2.55,z*.44],[1.24,2.8,z*.48],.025);link(body,leather,[1.84,2.47,z*.43],[.71,2.39,z*.5],.014)}
    for(const z of [-.33,.33]){const stirrup=mesh(body,geo(new T.TorusGeometry(.11,.012,6,20)),trim,[-.14,1.65,z]);stirrup.scale.set(.7,1,1);}
    if(custom)for(const z of [-.455,.455]){
      link(body,trim,[-.55,1.87,z],[.35,1.87,z],.012);
      link(body,trim,[-.55,1.87,z],[-.55,2.03,z],.012);
      ball(body,trim,[1.84,2.47,z*.43],[.033,.033,.014]);
    }
    const legs=[];
    for(const x of [-.78,.72])for(const z of [-.29,.29]){
      const hip=new T.Group();hip.position.set(x,1.56,z);body.add(hip);link(hip,coat,[0,0,0],[.07,-.62,0],.13,.075);ball(hip,coat,[.07,-.62,0],[.085,.09,.085]);const shin=new T.Group();shin.position.set(.07,-.62,0);hip.add(shin);link(shin,coat,[0,0,0],[0,-.62,0],.063,.042);if(custom&&(custom.socks==='all'||custom.socks==='rear'&&x<0))link(shin,mats.white,[0,-.39,0],[0,-.59,0],.055,.047);ball(shin,mats.black,[.065,-.66,0],[.14,.095,.09]);legs.push({hip,shin,phase:(x<0?0:Math.PI)+(z<0?.6:0),hind:x<0});
    }
    const rider=new T.Group();rider.position.set(-.15,2.17,0);body.add(rider);
    const torso=ball(rider,silk,[.23,.48,0],[.23,.43,.22]);torso.rotation.z=-.8;
    ball(rider,breeches,[-.1,.15,0],[.25,.17,.23]);
    const arms=[];
    for(const z of [-.28,.28]){
      link(rider,breeches,[-.1,.15,z],[.24,-.12,z*1.2],.095);link(rider,mats.black,[.24,-.12,z*1.2],[-.12,-.49,z*1.15],.07);ball(rider,mats.black,[-.04,-.5,z*1.15],[.16,.065,.08]);
      const arm=new T.Group();arm.name=`jockey-arm-${index}-${z>0?'salute':'reins'}`;arm.position.set(.4,.66,z*.62);rider.add(arm);
      link(arm,silk,[0,0,0],[.14,-.33,z*.38],.085);link(arm,silk,[.14,-.33,z*.38],[.42,-.39,z*.04],.055);ball(arm,gloves,[.44,-.39,z*.04],[.065,.06,.07]);arms.push(arm);
    }
    const head=new T.Group();head.position.set(.6,.89,0);rider.add(head);
    const standardFace=new T.Group();head.add(standardFace);
    ball(standardFace,mats.skin,[0,0,0],[.2,.235,.19]);ball(standardFace,mats.skin,[.17,-.025,0],[.095,.09,.09]);
    for(const z of [-.17,.17]){ball(standardFace,mats.dark,[.09,.03,z],[.1,.05,.025]);ball(standardFace,mats.black,[.11,.025,z*1.04],[.025,.022,.012])}
    ball(head,helmet||silk,[0,.19,0],[.26,.15,.23]);ball(head,mats.dark,[0,.13,.13],[.26,.03,.17]);
    if(custom){const stripe=ball(head,mat(custom.accentColor,{roughness:.5}),[0,.325,0],[.19,.016,.045]);stripe.name='jockey-helmet-stripe';}
    for(const z of [-.47,.47]){const n=sign(custom?.number||String(index+1),128,128,body,[.42,.38],'#10251c','#fff7e4');n.position.set(-.22,1.92,z);if(z<0)n.rotation.y=Math.PI;}
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
  const replayBadge=document.createElement('div');replayBadge.className='sr-photo-replay';replayBadge.hidden=true;replayBadge.setAttribute('role','status');ui.appendChild(replayBadge);
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
  positions.hidden=true;
  const labels=entries.map((e,i)=>{const row=document.createElement('span');const dot=document.createElement('i');dot.style.background=e.color;row.append(dot,document.createTextNode(e.name));positions.appendChild(row);return row});
  const namesLayer=document.createElement('div');namesLayer.className='sr-name-layer';ui.appendChild(namesLayer);
  const nameTags=entries.map(e=>{const n=document.createElement('div');n.className='sr-name-tag';n.textContent=e.appearance?.nickname||e.name;n.style.borderColor=e.color;namesLayer.appendChild(n);const line=document.createElement('i');line.className='sr-name-line';line.style.background=e.color;namesLayer.appendChild(line);return {n,line}});
  const world=new T.Vector3();
  const intro=document.createElement('div');intro.className='sr-intro';intro.innerHTML='<small>IL CLUB ENTRA IN PISTA</small><strong></strong><small data-stat></small><button type="button">Salta introduzione</button>';ui.appendChild(intro);
  let introLeft=introduction?Math.min(7,entries.length*1.7):0,introElapsed=0,introIndex=-1;intro.hidden=!introLeft;
  intro.querySelector('button').onclick=()=>{introLeft=0;intro.hidden=true;};
  const audioButton=ui.querySelector('[data-audio]');
  function audioState(){audioButton.textContent=audio?.enabled?'Audio: ON':'Attiva audio';audioButton.setAttribute('aria-pressed',String(Boolean(audio?.enabled)))}
  audioButton.onclick=()=>{if(!audio)audio=window.SisalRaceAudio?.create();else if(!audio.enabled){audio.unlock();if(audioMuted)audio.toggle();audioMuted=false}else{audio.toggle();audioMuted=true}setTimeout(audioState,80)};
  let audioMuted=false,lastCount=-1,started=false,lastAmbience=-1;
  audioState();
  let mode=profile.camera==='low'?1:0,raf=0,lastTime=0,clock=0,lastHUD=-1,finished=false,resolveRun;
  const result=new Promise(resolve=>resolveRun=resolve);
  function dispose(completed=false){if(disposed)return;disposed=true;audio?.dispose();cancelAnimationFrame(raf);observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.material?.map)textures.add(o.material.map)});textures.forEach(t=>t.dispose());resources.forEach(r=>r.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();ui.remove();resolveRun(completed)}
  function lost(e){e.preventDefault();dispose(false)}canvas.addEventListener('webglcontextlost',lost);
  function visibility(){lastTime=0;if(document.hidden){audio?.pause();cancelAnimationFrame(raf)}else if(!disposed){audio?.resume();raf=requestAnimationFrame(frame)}}document.addEventListener('visibilitychange',visibility);
  const observer=new MutationObserver(()=>{if(!host.isConnected)dispose(false)});observer.observe(document.body,{childList:true,subtree:true});
  let viewWidth=host.clientWidth,viewHeight=host.clientHeight,labelSizes=[],renderWidth=0,renderHeight=0;
  const resize=new ResizeObserver(()=>{viewWidth=host.clientWidth;viewHeight=host.clientHeight;if(viewWidth&&viewHeight){labelSizes=nameTags.map(({n})=>({w:n.offsetWidth,h:n.offsetHeight}))}});resize.observe(host);
  ui.querySelector('[data-camera]').onclick=()=>{mode=(mode+1)%3};ui.querySelector('[data-skip]').onclick=()=>dispose(true);
  ui.querySelector('[data-skip]').textContent='Vai alla classifica';
  const duration=profile.pace==='aggressive'?10:12;
  const choreography=racePlan(entries,random,duration);
  const lastArrival=Math.max(...choreography.map(p=>p.finishAt));
  let replayActive=false,replayDone=false,replayTime=0,replayHold=0,soundClock=0;
  let slowFrames=0,qualityCooldown=120;
  const start=2.5;
  const signatureStart=lastArrival+.65;
  const signatureDuration=Math.max(3.6,winners.length*1.8);
  const ceremonyStart=signatureStart+signatureDuration;
  const awardStep=2.15,ceremonyEnd=ceremonyStart+placeGroups.length*awardStep+2.2;
  function frame(now){
    if(disposed)return;if(!host.isConnected){dispose(false);return}
    // Brief finish-line slow motion makes the decisive pass readable even on
    // slower devices. Every horse and arrival uses this same simulation clock.
    let dt=lastTime?Math.min((now-lastTime)/1000,.25):0;
    // Adjust only render resolution after sustained overload, not on a single
    // late frame. Animation, geometry, ranks and effects stay unchanged.
    if(qualityCooldown>0)qualityCooldown--;
    else{slowFrames=dt>.032?slowFrames+1:Math.max(0,slowFrames-2);if(slowFrames>45&&renderScale>.85){renderScale=Math.max(.85,renderScale*.85);renderer.setPixelRatio(renderScale);qualityCooldown=180;slowFrames=0;}}
    const presenting=introLeft>0;
    if(presenting){introElapsed+=dt;introLeft=Math.max(0,introLeft-dt);const next=Math.min(entries.length-1,Math.floor(introElapsed/(Math.min(7,entries.length*1.7)/entries.length)));
      if(next!==introIndex){introIndex=next;const entry=entries[next];intro.querySelector('strong').textContent=entry.appearance?.nickname||entry.name;intro.querySelector('small').textContent=`IN PISTA · ${poseLabels[entry.appearance?.entrance]||'Saluto'}`;intro.querySelector('[data-stat]').textContent='';}
      dt=0;if(!introLeft){intro.hidden=true;}
    }
    const photoFinish=clock-start>duration*.91&&clock-start<lastArrival+.08;
    soundClock+=dt;
    if(replayActive){
      if(replayHold>0)replayHold=Math.max(0,replayHold-dt);
      else if(replayTime<duration&&replayTime+dt*.3>=duration){replayTime=duration;replayHold=.55;}
      else replayTime+=dt*.3;
      if(replayTime>lastArrival+.35){replayActive=false;replayDone=true;replayBadge.hidden=true;tiePanel.hidden=true;ui.classList.remove('sr-replaying');host.dataset.replayComplete='true';}
    }
    else clock+=Math.min(dt,photoFinish?.1:.25)*(photoFinish?.48:1);
    lastTime=now;
    if(!replayActive&&!replayDone&&clock-start>=lastArrival+.55){replayActive=true;replayTime=duration-.65;replayBadge.hidden=false;ui.classList.add('sr-replaying');host.dataset.replayCount='1';}
    const elapsed=replayActive?replayTime:Math.max(0,clock-start),p=clamp(elapsed/duration,0,1),racing=clock>=start&&p<1;
    const celebrating=replayDone&&elapsed>=signatureStart&&elapsed<ceremonyStart;
    const winnerIndex=celebrating?Math.min(winners.length-1,Math.floor((elapsed-signatureStart)/(signatureDuration/winners.length))):-1;
    const focusedIndex=presenting?introIndex:celebrating?entries.indexOf(winners[winnerIndex]):-1;
    ui.classList.toggle('sr-signature-active',presenting||celebrating);
    // Reserve a separate 200px lower area for identity and controls, outside the canvas.
    const stageHeight=focusedIndex>=0?Math.max(1,viewHeight-200):viewHeight;
    if(viewWidth>0&&stageHeight>0&&(renderWidth!==viewWidth||renderHeight!==stageHeight)){renderWidth=viewWidth;renderHeight=stageHeight;renderer.setSize(renderWidth,renderHeight,false);canvas.style.height=renderHeight+'px';camera.aspect=renderWidth/renderHeight;camera.updateProjectionMatrix();}
    if(celebrating){const entry=winners[winnerIndex];intro.hidden=false;intro.querySelector('small').textContent='ESULTANZA'+(winningTie?' · VINCITORI EX AEQUO':' · VINCITORE');intro.querySelector('strong').textContent=entry.appearance?.nickname||entry.name;intro.querySelector('[data-stat]').textContent=poseLabels[entry.appearance?.celebration]||'Saluto';intro.querySelector('button').hidden=true;winnerBanner.hidden=true;tiePanel.hidden=true;}else if(!presenting){intro.hidden=true;}
    host.dataset.raceStage=presenting?'intro':celebrating?'signature':replayActive?'replay':elapsed>=ceremonyStart?'awards':elapsed>=lastArrival?'celebration':'race';
    if(replayActive)replayBadge.textContent=elapsed<duration?'REPLAY · FOTOFINISH · 0,3×':winningTie?'FOTOFINISH · EX AEQUO':'FOTOFINISH · ARRIVO';
    if(clock<start){count.textContent=String(Math.max(1,3-Math.floor(clock/ .84)))}else if(elapsed<.6){count.textContent='VIA'}else{count.textContent='';}
    if(presenting)count.textContent='';
    const c=clock<start?Math.max(1,3-Math.floor(clock/.84)):0;
    if(!presenting&&c!==lastCount){lastCount=c;audio?.countdown(c)}
    if(clock>=start&&!started){started=true;audio?.start()}
    if(Math.floor(soundClock*2)!==lastAmbience){lastAmbience=Math.floor(soundClock*2);audioState()}
    const ordered=[];
    horses.forEach((h,i)=>{
      h.root.visible=focusedIndex<0||focusedIndex===i;
      const rank=h.entry.place,finishAt=choreography[i].finishAt;
      const f=clamp(elapsed/finishAt,0,1),progress=plannedProgress(elapsed,choreography[i]),coast=clamp((elapsed-finishAt)/2,0,1);
      const phase=elapsed*h.motion.speed+h.motion.phase,amp=clock<start?0:1-smooth(coast);
      h.body.position.y=(Math.sin(phase*2)*h.motion.bounce+.028)*amp;
      h.body.rotation.z=Math.sin(phase)*.022*amp;
      // Progress tracks the foremost point of the muzzle, not the saddle.
      // Compensate independent body pitch: all tied noses reach the same finish plane.
      const noseOffset=2.13*Math.cos(h.body.rotation.z)-2.37*Math.sin(h.body.rotation.z);
      const noseX=2.13+progress*(48-2.13)+5*(1-(1-coast)**2),x=noseX-noseOffset;
      h.root.position.x=x;
      if(!replayActive&&f>=1&&!h.crossed){
        h.crossed=true;
        if(!soundedFinishes.has(rank)){soundedFinishes.add(rank);audio?.finish(rank);}
        if(rank===1){
          nameTags[i].n.classList.add('sr-name-winner');
          if(celebrationAt===null){
            celebrationAt=elapsed;winnerBanner.textContent='🏆 '+winners.map(e=>e.name).join(' + ')+(winningTie?' · VINCITORI EX AEQUO':' · VINCE');winnerBanner.hidden=false;host.dataset.celebrations='1';
            if(winningTie){audio?.tie?.();tiePanel.replaceChildren();const heading=document.createElement('b');heading.textContent='ARRIVO EX AEQUO';tiePanel.appendChild(heading);for(const winner of winners){const row=document.createElement('span');row.textContent=winner.name+' · 1° · '+(winner.score||'stesso punteggio');tiePanel.appendChild(row)}tiePanel.hidden=false;host.dataset.tieFinish=String(winners.length);}
          }
        }
        host.dataset.arrivals=(host.dataset.arrivals||'')+rank+',';
        host.dispatchEvent(new CustomEvent('sisal-race-arrival',{detail:{name:h.entry.name,place:rank,time:finishAt,x:48,noseX,phase}}));
      }
      audio?.gallop?.(i,!replayActive&&clock>=start&&coast<.85,(Math.PI/(2*h.motion.speed))/(photoFinish?.48:1));
      h.legs.forEach(l=>{l.hip.rotation.z=Math.sin(phase+l.phase)*h.motion.stride*amp;l.shin.rotation.z=(l.hind?-1:1)*Math.max(0,Math.cos(phase+l.phase))*.92*amp});
      h.tail.rotation.y=Math.sin(phase*.47+h.motion.tailPhase)*.2;h.tail.rotation.z=.16*amp;
      h.rider.rotation.z=-Math.sin(phase*2+h.motion.riderPhase)*.035*amp;h.head.rotation.z=Math.sin(phase+h.motion.riderPhase)*.035*amp;
      // A gradual one-handed salute after crossing, with a distinct delay,
      // pumping rhythm and head turn for every winner. Other hand keeps the reins.
      const victoryAge=elapsed-finishAt-.25-(h.motion.riderPhase/(Math.PI*2))*.24;
      const salute=h.entry.place===1?smooth(clamp(victoryAge/.65,0,1)):0;
      signaturePose(h,h.entry.appearance?.celebration||'salute',Math.max(0,victoryAge),reduced,salute);
      if(presenting&&i===introIndex)signaturePose(h,h.entry.appearance?.entrance||'salute',introElapsed,reduced,1);
      nameTags[i].n.classList.toggle('sr-name-winner',h.entry.place===1&&f>=1);
      ordered.push({i,progress});
      for(let j=0;j<42;j++){const age=((elapsed*1.25+j/42)%1),idx=(i*42+j)*3;dustPos[idx]=x-1.2-age*4;dustPos[idx+1]=.1+age*.8;dustPos[idx+2]=h.root.position.z+Math.sin(j*34)*age*.7}
    });
    const ceremonyAge=elapsed-ceremonyStart;
    if(ceremonyAge>=0){
      ceremony.hidden=false;ui.classList.add('sr-awards-active');winnerBanner.hidden=true;tiePanel.hidden=true;
      const next=Math.min(placeGroups.length-1,Math.floor(ceremonyAge/awardStep));
      if(next>awardIndex){awardIndex=next;const group=placeGroups[next];awardCards[next].hidden=false;sparks.replaceChildren();if(!reduced)for(let k=0;k<24;k++){const spark=document.createElement('i');spark.style.left=(random()*100)+'%';spark.style.top=(random()*80+10)+'%';spark.style.animationDelay=(random()*.6)+'s';sparks.appendChild(spark);}awardCards.forEach((c,j)=>c.classList.toggle('sr-award-current',j===next));ceremonyStatus.textContent=group.place+'° posto'+(group.entries.length>1?' a pari merito':'')+' · '+group.entries.map(e=>e.name).join(' e ');audio?.medal?.(group.place,group.entries.length);host.dataset.awards=(host.dataset.awards||'')+group.place+',';if(group.place===1){winnerSpotlight.hidden=false;winnerSpotlight.classList.add('sr-winner-reveal');winnerNames.textContent=group.entries.map(e=>e.name).join(' + ');winnerStatus.textContent=group.entries.length>1?'VINCITORI EX AEQUO · COPPA CONDIVISA':'CAMPIONE · COPPA D’ORO';celebrationAt=elapsed;}}
      if(ceremonyAge>=placeGroups.length*awardStep){ceremonyStatus.textContent='ONORE A TUTTI I PREMIATI';ceremonyHeading.textContent='PODIO COMPLETO';}
    }
    const celebrationAge=celebrationAt===null?-1:elapsed-celebrationAt;
    const crowdClock=replayActive?start+elapsed:clock;
    if(Math.floor(crowdClock*(mobile?15:24))!==lastCrowdUpdate){lastCrowdUpdate=Math.floor(crowdClock*(mobile?15:24));updateCrowd(crowdClock,celebrationAge>=0?Math.min(1,celebrationAge*4):p>.85?.8:.25);host.dataset.crowdFrame=String(lastCrowdUpdate)}
    tieRings.forEach(r=>{r.visible=elapsed>=duration&&celebrationAt!==null&&ceremonyAge<0;r.scale.setScalar(reduced?1:1+.08*Math.sin(crowdClock*5))});
    confetti.visible=!replayActive&&celebrationAge>=0&&celebrationAge<4&&!reduced;
    if(confetti.visible){confettiData.forEach((d,i)=>{const t=Math.max(0,celebrationAge-d.delay),y=.7+d.vy*t-2.4*t*t;dummy.position.set(48+d.vx*t,Math.max(.08,y),d.side*(trackHalf+.2-d.vz*t));dummy.rotation.set(t*d.spin,t*2,t*d.spin*.7);dummy.scale.setScalar(celebrationAge<d.delay?0:1);dummy.updateMatrix();confetti.setMatrixAt(i,dummy.matrix)});confetti.instanceMatrix.needsUpdate=true;}
    dust.visible=racing&&!reduced;dustGeo.attributes.position.needsUpdate=true;
    ordered.sort((a,b)=>b.progress-a.progress||entries[a.i].place-entries[b.i].place);
    const xs=horses.map(h=>h.root.position.x),center=(Math.max(...xs)+Math.min(...xs))/2,spread=Math.max(...xs)-Math.min(...xs);
    const portrait=camera.aspect<1,dist=(portrait?25:19)+spread*.4+Math.max(0,trackHalf-6.5)*2.5;
    const camModes=[[center+4.5,5.8,dist],[center+7,3.5,dist*.93],[center+7,10,dist*.86]];
    const cp=camModes[reduced?0:mode];
    scenery.update(crowdClock,center,reduced);
    if(focusedIndex>=0){const h=horses[focusedIndex];camera.position.set(h.root.position.x+2,3.5,h.root.position.z+(camera.aspect<1?10:7));camera.lookAt(h.root.position.x+.2,1.9,h.root.position.z)}
    else if(replayActive){camera.position.set(48,7.2,dist);camera.lookAt(48,1.8,0)}
    else{if(clock<.1||reduced)camera.position.set(...cp);else camera.position.lerp(new T.Vector3(...cp),1-Math.exp(-dt*9));camera.lookAt(center+.5,1.45,0);}
    sun.position.set(center-10,24,18);sun.target.position.set(center,0,0);
    // Project labels from each head, then separate overlapping names with leader lines.
    camera.updateMatrixWorld();scene.updateMatrixWorld();
    const boxes=[];
    horses.forEach((h,i)=>{
      h.head.getWorldPosition(world);world.y+=.45;world.project(camera);
      const w=viewWidth,hh=viewHeight,ax=(world.x*.5+.5)*w,ay=(-world.y*.5+.5)*hh;
      const {n,line}=nameTags[i];n.hidden=focusedIndex>=0&&i!==focusedIndex;line.hidden=n.hidden;const nw=labelSizes[i]?.w||150,nh=labelSizes[i]?.h||26;
      let x=clamp(ax-nw/2,8,Math.max(8,w-nw-8)),y=Math.max(42,ay-nh-14);
      for(let attempt=0;attempt<entries.length+1;attempt++){
        if(!boxes.some(b=>x<b.x+b.w+6&&x+nw+6>b.x&&y<b.y+b.h+5&&y+nh+5>b.y))break;
        y-=nh+7;
      }
      y=Math.max(38,y);boxes.push({x,y,w:nw,h:nh});n.style.transform=`translate(${x}px,${y}px)`;
      const dx=ax-(x+nw/2),dy=ay-(y+nh);line.style.left=`${x+nw/2}px`;line.style.top=`${y+nh}px`;line.style.width=`${Math.hypot(dx,dy)}px`;line.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
    });
    if(lastHUD!==Math.floor(elapsed*24)||replayActive){
      lastHUD=Math.floor(elapsed*24);
      const visuallyCrossed=i=>elapsed>=choreography[i].finishAt;
      const finishedPlaces=new Set(horses.filter((h,i)=>visuallyCrossed(i)).map(h=>h.entry.place)).size;
      ordered.forEach(({i,progress},position)=>{
        const crossed=visuallyCrossed(i);
        const livePlace=crossed?entries[i].place:1+finishedPlaces+ordered.filter(other=>!visuallyCrossed(other.i)&&other.progress>progress+1e-8).length;
        const liveTied=crossed?entries.filter(e=>e.place===entries[i].place).length>1:ordered.filter(other=>!visuallyCrossed(other.i)&&Math.abs(other.progress-progress)<1e-8).length>1;
        labels[i].style.order=position;labels[i].dataset.position=String(livePlace)+(liveTied?' =':'');
      });meter.style.width=`${p*100}%`;
      caption.textContent=clock<start?'AI CANCELLI':p<.82?'RETTILINEO · CORSA DELLA TOP 3':p<.91?'ULTIMI METRI':p<1?'TESTA A TESTA · FOTOFINISH':'ARRIVO';
    }
    if(!replayActive&&elapsed>=lastArrival+.65&&!finished){finished=true;onFinish();}
    if(finished){count.textContent='';caption.textContent=`1° ${winners.map(e=>e.name).join(' + ')}${winningTie?' · EX AEQUO':''}`;}
    if(replayActive){count.textContent='';caption.textContent=replayHold>0?'ISTANTE ESATTO DEL PRIMO ARRIVO':'REPLAY DELLO STESSO ARRIVO';}
    positions.hidden=!started;
    renderer.render(scene,camera);
    if(Math.floor(clock)!==Number(host.dataset.visualSecond)){host.dataset.visualSecond=String(Math.floor(clock));host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);}
    if(elapsed>ceremonyEnd){dispose(true);return}raf=requestAnimationFrame(frame);
  }
  if(!document.hidden)raf=requestAnimationFrame(frame);return result;
}
