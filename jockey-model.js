import * as T from './vendor/three.module.min.js';
import {microTexture} from './studio-materials.js?v=studio-6';
import bodyData from './assets/studio/human-body.js?v=studio-6';
import {buildFace} from './jockey-face.js?v=studio-6';
import {styleColors} from './horse-style.js?v=studio-6';
import {geometry,mesh,tube,material} from './studio-geometry.js?v=studio-6';
// The same body, joint rig and head scale for every account and every view.
export function createJockey({mat=material,mats={},silk,breeches,gloves,helmet,custom,index=0,showHelmet,standing=false,detail=1}){
 custom=custom||styleColors({});showHelmet=showHelmet??custom.helmetVisible!=='off';const rider=new T.Group();rider.name='sisal-jockey';
 const g=geometry(bodyData);g.setAttribute('skinIndex',new T.Uint16BufferAttribute(bodyData.skinIndex,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(bodyData.skinWeight,4));
 const uv=[];for(let i=0;i<bodyData.position.length;i+=3)uv.push((bodyData.position[i+2]+.62)/1.24,(bodyData.position[i+1]+1.1)/2.1);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 g.clearGroups();let start=0,last=bodyData.materials[0];for(let i=1;i<=bodyData.materials.length;i++)if(bodyData.materials[i]!==last){g.addGroup(start*3,(i-start)*3,last);start=i;last=bodyData.materials[i];}
 silk=silk||mat(custom.silkColor);silk.bumpMap=microTexture('fabric');silk.bumpScale=.00028;silk.roughness=.78;silk.sheen=.18;
 const pants=breeches||mat(custom.breechesColor);pants.roughness=.89;pants.bumpMap=microTexture('fabric');pants.bumpScale=.00023;const glove=gloves||mat(custom.glovesColor);glove.roughness=.61;glove.bumpMap=microTexture('leather');glove.bumpScale=.00015;const boots=material('#171b19',{roughness:.42,clearcoat:.10,bumpMap:microTexture('leather'),bumpScale:.00022});const body=new T.SkinnedMesh(g,[silk,pants,boots,glove]);body.name='tailored-jockey-body';body.castShadow=body.receiveShadow=true;rider.add(body);
 const bones=bodyData.bones.map(([name])=>{const b=new T.Bone();b.name=name;return b;});
 bodyData.bones.forEach(([,parent,pos],i)=>{bones[i].position.set(...pos);if(parent>=0){bones[i].position.sub(new T.Vector3(...bodyData.bones[parent][2]));bones[parent].add(bones[i]);}else body.add(bones[i]);});
 const skeleton=new T.Skeleton(bones);body.bind(skeleton);
 const poseOrientations=bones.map(()=>new T.Quaternion());
 const targets={pelvis:[0,0,0],chest:standing?[0,.49,0]:[.18,.45,0],lShoulder:standing?[0,.49,-.207]:[.23,.43,-.207],rShoulder:standing?[0,.49,.207]:[.23,.43,.207],lElbow:standing?[.03,.18,-.24]:[.48,.19,-.26],rElbow:standing?[.03,.18,.24]:[.48,.19,.26],lWrist:standing?[.04,-.1,-.23]:[.72,.18,-.17],rWrist:standing?[.04,-.1,.23]:[.72,.18,.17],lHip:[0,-.05,-.106],rHip:[0,-.05,.106],lKnee:standing?[0,-.48,-.12]:[.31,-.27,-.40],rKnee:standing?[0,-.48,.12]:[.31,-.27,.40],lAnkle:standing?[0,-.94,-.13]:[.02,-.61,-.46],rAnkle:standing?[0,-.94,.13]:[.02,-.61,.46]};
 const solvePoint=new T.Vector3(),solveParent=new T.Vector3(),solveDir=new T.Vector3(),solveInverse=new T.Quaternion();
 const firstChildren=bodyData.bones.map((_,i)=>bodyData.bones.findIndex((x,j)=>x[1]===i&&j>i));
 const restDirections=bodyData.bones.map(([,parent,pos],i)=>firstChildren[i]<0?null:new T.Vector3(...bodyData.bones[firstChildren[i]][2]).sub(new T.Vector3(...pos)).normalize());
 function solve(t,kind='rest',capture=true){
  for(let i=0;i<bones.length;i++){
   const bone=bones[i],[name,parent]=bodyData.bones[i],parentQ=parent<0?null:poseOrientations[parent],target=t[name],q=poseOrientations[i];
   solvePoint.set(...target);bone.position.copy(solvePoint);
   if(parent>=0){solveInverse.copy(parentQ).invert();bone.position.sub(solveParent.set(...t[bodyData.bones[parent][0]])).applyQuaternion(solveInverse);}
   q.identity();const child=firstChildren[i];
   if(name==='chest')q.setFromAxisAngle(solveDir.set(0,0,1),kind==='arena'?-Math.atan2(t.chest[0]-t.pelvis[0],t.chest[1]-t.pelvis[1]):(standing?0:kind==='racing'?-.50:-.22)+(kind==='bow'?-.22:0));
   else if(name!=='pelvis'&&child>=0){solveDir.set(...t[bodyData.bones[child][0]]).sub(solvePoint).normalize();q.setFromUnitVectors(restDirections[i],solveDir);}
   else if(name.includes('Wrist')){solvePoint.set(.08,-.025,name[0]==='l'?-.07:.07).normalize();solveDir.set(...(kind==='arms'?[0,1,0]:kind==='salute'&&name[0]==='r'?[.1,.8,-.4]:[1,-.1,0])).normalize();q.setFromUnitVectors(solvePoint,solveDir);}
   bone.quaternion.copy(q);if(parent>=0)bone.quaternion.premultiply(solveInverse);
  }
  if(kind!=='arena')body.updateMatrixWorld(true);
  return capture?bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()})):undefined;
 }
 const rest=solve(targets),poses={};
 for(const kind of ['salute','arms','bow','crowd','racing']){
  const t=structuredClone(targets),sx=standing?0:.23;
  if(kind==='racing'&&!standing){t.chest=[.30,.33,0];for(const side of ['l','r']){const z=side==='l'?-1:1;t[side+'Shoulder']=[.34,.32,z*.207];t[side+'Elbow']=[.53,.12,z*.26];}}
  if(kind==='salute'){t.rElbow=[sx+.04,.59,.47];t.rWrist=[sx+.16,.83,.12];}
  if(kind==='arms')for(const side of ['l','r']){const z=side==='l'?-1:1;t[side+'Elbow']=[sx-.02,.73,z*.40];t[side+'Wrist']=[sx-.04,1.01,z*.47];}
  if(kind==='crowd'){t.rElbow=[sx+.05,.62,.43];t.rWrist=[sx+.18,.76,.66];}
  poses[kind]=solve(t,kind);
 }
 bones.forEach((b,i)=>{b.position.copy(rest[i].p);b.quaternion.copy(rest[i].q);});
 // Neck is part of the same anatomical surface and rotates at its base.
 // A matched 0.108 scale removes the old jagged, detached head/collar seam.
 const chest=bones[1],neckBind=new T.Vector3(.05076,.624,0),chestBind=new T.Vector3(...bodyData.bones[1][2]);
 const head=new T.Group();head.name='jockey-neck-pivot';head.position.copy(neckBind.clone().sub(chestBind));chest.add(head);
 const faceFrame=new T.Group();faceFrame.position.y=.715068-.624;faceFrame.scale.setScalar(.675);head.add(faceFrame);buildFace(faceFrame,{s:custom,showHelmet,detail});head.userData=faceFrame.userData;
 const gear=new T.Group();gear.name='jockey-helmet';faceFrame.add(gear);gear.visible=showHelmet;
 const helmMat=helmet||mat(custom.helmetColor,{roughness:.4,clearcoat:.5});
 const cap=mesh(gear,new T.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI*.53),helmMat);cap.scale.set(.19,.215,.18);cap.position.set(.004,.115,0);
 const peak=mesh(gear,new T.SphereGeometry(1,32,16),helmMat);peak.scale.set(.12,.009,.145);peak.position.set(.155,.108,0);
 tube(gear,mat(custom.accentColor,{roughness:.65}),[[-.18,.13,0],[-.14,.27,0],[0,.333,0],[.14,.27,0],[.193,.13,0]],.009,28);
 for(const z of [-.13,.13])tube(gear,mat('#30342f'),[[.01,.1,z],[.13,-.1,z*.7],[.07,-.135,0]],.0035,16);

 const collar=mesh(chest,new T.CylinderGeometry(.074,.078,.026,40,1,true),silk,'fitted-standing-collar');collar.position.copy(new T.Vector3(.042,.620,0).sub(chestBind));collar.scale.x=.94;const seam=mesh(chest,new T.TorusGeometry(.074,.0008,5,40),mat(custom.accentColor,{roughness:.85}),'collar-seam');seam.position.copy(collar.position);seam.position.y+=.013;seam.rotation.x=Math.PI/2;seam.scale.x=.94;
 tube(chest,mat(custom.accentColor,{roughness:.9}),[[.10,.10,0],[.14,-.12,0],[.13,-.34,0]],.0018,20).name='zipper-tape';
 const arms=[bones.find(b=>b.name==='rShoulder'),bones.find(b=>b.name==='lShoulder')];arms.forEach((b,i)=>{b.userData.restRotation=b.rotation.clone();b.name=`jockey-arm-${index}-${i?'salute':'reins'}`;});
 rider.userData.reinHands=['lWrist','rWrist'].map(name=>{const hand=new T.Object3D();hand.name='rein-grip-'+name;hand.position.set(.025,-.006,0);bones.find(b=>b.name===name).add(hand);return hand;});
 let idleTime=0,gaitWeight=0,gaitPhase=0;
 rider.userData.locomotion=(weight,phase)=>{gaitWeight=standing?0:T.MathUtils.clamp(weight,0,1);gaitPhase=phase;};
 rider.userData.pose=(kind,age,reduced=false,weight=1)=>{
  const frame=poses[kind]||poses.salute,w=T.MathUtils.clamp(weight,0,1);rider.userData.reinRelease=kind==='arms'?[w,w]:kind==='salute'||kind==='crowd'?[0,w]:[0,0];
  bones.forEach((b,i)=>{b.position.copy(rest[i].p).lerp(poses.racing[i].p,gaitWeight).lerp(frame[i].p,w);b.quaternion.copy(rest[i].q).slerp(poses.racing[i].q,gaitWeight).slerp(frame[i].q,w);});
  if(!reduced){chest.position.y+=Math.sin(idleTime*1.65)*.002;const wrist=bones.find(b=>b.name==='rWrist');wrist.rotation.x+=Math.sin(age*4)*.10*w;}
  head.rotation.z=(standing?0:.17)+gaitWeight*.24*(1-w);
  if(!reduced)chest.position.y+=Math.sin(gaitPhase+.4)*.006*gaitWeight*(1-w);
  if(w>0){head.rotation.z=(standing?0:.17)+(kind==='bow'?-.14*w:0);head.rotation.y=kind==='crowd'?.3*w:0;}
 };
 rider.userData.idle=(time,pointer={x:0,y:0},reduced=false)=>{idleTime=time;head.rotation.y=reduced?0:T.MathUtils.lerp(head.rotation.y,pointer.x*.18,.09);head.rotation.z=(standing?0:.17)-(reduced?0:pointer.y*.04);if(head.userData.eyes)for(const eye of head.userData.eyes)eye.rotation.y=reduced?0:pointer.x*.10;const phase=time%5.4,blink=!reduced&&phase<.16?Math.sin(phase/.16*Math.PI):0;if(blink>0||head.userData.wasBlink){head.userData.blink?.(blink);head.userData.wasBlink=blink>0;}};
 rider.userData.arenaRig=standing?t=>{solve(t,'arena',false);}:undefined;
 rider.userData.headgear=gear;rider.userData.faceFrame=faceFrame;
 rider.userData.pose('salute',0,true,0);return {rider,head,arms,body,skeleton};
}
