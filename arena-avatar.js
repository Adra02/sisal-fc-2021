/* Arena movement uses the SAME fitted body, face, rooted hair and saved style as racing. */
import * as T from './vendor/three.module.min.js';
import {createJockey} from './jockey-model.js?v=studio-5';
import {styleColors,paintSilks} from './horse-style.js?v=studio-5';
import {material,mesh,disposeTree} from './studio-geometry.js?v=studio-5';
const clamp=T.MathUtils.clamp,TAU=Math.PI*2,scale=.86;
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
function joint(a,b,l1,l2,pole){
 const axis=new T.Vector3().subVectors(b,a),d=clamp(axis.length(),.015,l1+l2-.0001);axis.normalize();
 const along=(l1*l1-l2*l2+d*d)/(2*d),bend=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
 return a.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
}
export function makeAvatar(player,quality=1){
 const s=styleColors(player.appearance),root=new T.Group();root.name='arena-player-'+(player.key||'');
 const c=document.createElement('canvas');c.width=c.height=256;paintSilks(c.getContext('2d'),256,256,s);
 const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
 const model=createJockey({custom:s,standing:true,detail:quality?.40:.20,silk:material('#fff',{map:tx})});
 const {rider,head,skeleton}=model;rider.scale.setScalar(scale);rider.position.y=.94*scale+.055;root.add(rider);
 const rig=rider.userData.arenaRig;let fullDetail=true;
 const fibres=[];rider.traverse(o=>{if(o.name.includes('fibres'))fibres.push(o);});
 // A small irregular grass stain stays attached to the leg, not floating in world space.
 const stainCanvas=document.createElement('canvas');stainCanvas.width=stainCanvas.height=64;const dc=stainCanvas.getContext('2d');
 for(let i=0;i<55;i++){dc.fillStyle=`rgba(57,85,32,${.12+(i%4)*.06})`;dc.beginPath();dc.ellipse(32+Math.sin(i*19)*21,32+Math.cos(i*13)*20,2+i%6,1+i%4,i,0,TAU);dc.fill();}
 const stainMap=new T.CanvasTexture(stainCanvas);stainMap.colorSpace=T.SRGBColorSpace;
 const thigh=skeleton.bones.find(b=>b.name==='lHip');const stain=mesh(thigh,new T.PlaneGeometry(.14,.20),material('#fff',{map:stainMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),'arena-grass-stain');stain.rotation.y=Math.PI/2;stain.position.set(.082,-.22,0);stain.castShadow=false;
 const wrist=skeleton.bones.find(b=>b.name==='rWrist'),drink=new T.Group();wrist.add(drink);
 mesh(drink,new T.CylinderGeometry(.028,.033,.14,12),material('#84bca2',{roughness:.35}), 'arena-water-bottle').position.y=.065;
 mesh(drink,new T.CylinderGeometry(.016,.016,.02,10),material('#e4eae3'),'bottle-cap').position.y=.145;drink.visible=false;
 let previous=null,previousTime=null;
 function update(p,time,dt,velocity){
  // Derive movement from the simulation (same time on every device), never accumulated frames.
  const delta=time-(previousTime??time),vx=velocity?.[0]??(delta>0&&delta<.5?(p.pos[0]-(previous?.[0]??p.pos[0]))/delta:0),vz=velocity?.[1]??(delta>0&&delta<.5?(p.pos[1]-(previous?.[1]??p.pos[1]))/delta:0);
  const speed=Math.min(4,Math.hypot(vx,vz)),moving=speed>.035,heading=Math.atan2(p.look[0]-p.pos[0],p.look[1]-p.pos[1]);
  root.position.set(p.pos[0],0,p.pos[1]);root.rotation.set(0,heading-Math.PI/2,0);
  const g=p.gesture||'idle',ph=clamp(p.phase||0,0,1),phase=time*7.2+(p.personality||0)*2.1,targets={};
  let lower=0,lean=0;
  if(['bend','collect','inspect','breath','laugh','bow'].includes(g))lean={bend:.65,collect:.48,inspect:.12,breath:.32,laugh:.24,bow:.65}[g];
  if(g==='laces'){lower=.48;lean=.62;}if(g==='sit'){lower=.38;lean=.10;}
  if(['slide','getUp'].includes(g)){const f=g==='slide'?ease(ph):1-ease(ph);lower=f*.56;lean=-.42*f;}
  if(g==='dive'){lower=.40*Math.sin(ph*Math.PI);root.rotation.z=Math.sin(ph*Math.PI)*.62;}
  if(g==='stumble')root.rotation.z=Math.sin(ph*Math.PI*4)*.12;
  const bob=moving?Math.sin(phase*2)*.008:Math.sin(time*1.65)*.0015;
  targets.pelvis=[0,-lower+bob,0];targets.chest=[Math.sin(lean)*.49,Math.cos(lean)*.49-lower+bob,0];
  const dir=new T.Vector3(vx,0,vz).applyAxisAngle(new T.Vector3(0,1,0),-root.rotation.y);if(speed>.001)dir.divideScalar(Math.max(speed,.001));
  for(const [side,sign]of [['l',-1],['r',1]]){
   const cycle=(((phase+(sign>0?Math.PI:0))/TAU)%1+1)%1,stride=Math.min(.58,speed*.47),swing=cycle>.62;
   const fx=moving?(swing?-.5+ease((cycle-.62)/.38):.5-cycle/.62)*stride:0,lift=moving&&swing?Math.sin((cycle-.62)/.38*Math.PI)*.13:0;
   const hip=new T.Vector3(0,-.05-lower+bob,sign*.106),foot=new T.Vector3(dir.x*fx,-.94+lift,sign*.13+dir.z*fx);
   if(sign>0){
    if(g==='kick'||g==='heel'){foot.x=(g==='heel'?-1:1)*(-.13+.76*Math.sin(ph*Math.PI));foot.y+=.22*Math.sin(ph*Math.PI);}
    if(g==='juggle'){foot.x=.26;foot.y+=.06+.18*Math.max(0,Math.cos((time-5)*TAU/1.4));}
    if(g==='sole'||g==='lookBoot'){foot.x=.32;foot.y+=g==='sole'?.17:.33;}
   }
   if(g==='nutmeg')foot.z=sign*.31;
   if(g==='block')foot.z=sign*.075;
   if(['sit','laces'].includes(g))foot.x=.35;
   if(g==='slide')foot.x=sign>0?.69:.35;
   const knee=joint(hip,foot,.43,.47,new T.Vector3(1,0,sign*.1));
   targets[side+'Hip']=hip.toArray();targets[side+'Knee']=knee.toArray();targets[side+'Ankle']=foot.toArray();
   const shoulder=new T.Vector3(targets.chest[0],targets.chest[1],sign*.207),hand=new T.Vector3(-dir.x*fx*.62,-.10-lower,sign*.24);
   if(['arms','celebrate'].includes(g))hand.set(0,.99-lower,sign*.43);
   if(['salute','wave','call','highFive','crowd'].includes(g)&&sign>0)hand.set(.12,.79-lower,g==='crowd'?.57:.22);
   if(['shrug','dodge','stumble'].includes(g))hand.set(.12,.24-lower,sign*.49);
   if(['point','referee','explain'].includes(g)&&sign>0)hand.set(.49,.46-lower,.24);
   if(['handsHips','keeper','freeze'].includes(g))hand.set(.10,.05-lower,sign*.22);
   if(['clap','pat'].includes(g))hand.set(.40,.34-lower,sign*(.045+.09*Math.abs(Math.sin(time*7))));
   if(g==='cover')hand.set(.18,.67-lower,sign*.075);
   if(g==='drink'&&sign>0)hand.set(.18,.70-lower,.05);
   if(g==='hair'&&sign>0)hand.set(.02,.91-lower,.07);
   if(['inspect','collect'].includes(g))hand.set(.41,.12-lower,sign*.10);
   if(g==='hide')hand.set(-.16,-.03-lower,sign*.07);
   if(g==='laces')hand.set(.38,-.72,sign*.08);
   if(g==='breath')hand.set(.27,-.38-lower,sign*.14);
   if(g==='laugh')hand.set(.29,.10-lower,sign*.14);
   const elbow=joint(shoulder,hand,.31,.30,new T.Vector3(-.45,0,sign));
   targets[side+'Shoulder']=shoulder.toArray();targets[side+'Elbow']=elbow.toArray();targets[side+'Wrist']=hand.toArray();
  }
  rig(targets);stain.visible=!!p.dirty;drink.visible=g==='drink';
  if(fullDetail)rider.userData.idle(time,{x:0,y:0},false);
  head.rotation.z=lean*.20;head.rotation.y=g==='laugh'?Math.sin(time*6)*.05:0;
  previous=[...p.pos];previousTime=time;
 }
 return {root,update,head,model,limbs:skeleton.bones,setDetail:full=>{fullDetail=full;for(const o of fibres)o.visible=full;},dispose:()=>disposeTree(root)};
}
