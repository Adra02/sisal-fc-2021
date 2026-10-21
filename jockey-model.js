import * as T from './vendor/three.module.min.js';
import {microTexture} from './studio-materials.js';
import bodyData from './assets/studio/human-body.js';
import {buildFace} from './jockey-face.js?v=studio-1';
import {styleColors} from './horse-style.js?v=studio-1';
import {geometry,mesh,tube,material} from './studio-geometry.js';
// Anatomical surface + joint skinning. Equal body/height for every account.
export function createJockey({mat=material,mats={},silk,breeches,gloves,helmet,custom,index=0,showHelmet=true,standing=false}){
 custom=custom||styleColors({});const rider=new T.Group();rider.name='sisal-jockey';
 const g=geometry(bodyData);g.setAttribute('skinIndex',new T.Uint16BufferAttribute(bodyData.skinIndex,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(bodyData.skinWeight,4));
 const uv=[];for(let i=0;i<bodyData.position.length;i+=3)uv.push((bodyData.position[i+2]+.62)/1.24,(bodyData.position[i+1]+1.1)/2.1);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 g.clearGroups();let start=0,last=bodyData.materials[0];for(let i=1;i<=bodyData.materials.length;i++)if(bodyData.materials[i]!==last){g.addGroup(start*3,(i-start)*3,last);start=i;last=bodyData.materials[i];}
 if(silk){silk.bumpMap=microTexture('fabric');silk.bumpScale=.0008;}const boots=material('#171b19',{roughness:.43,metalness:.03,clearcoat:.2});const body=new T.SkinnedMesh(g,[silk||mat(custom.silkColor),breeches||mat(custom.breechesColor),boots,gloves||mat(custom.glovesColor)]);body.name='tailored-jockey-body';body.castShadow=true;body.receiveShadow=true;rider.add(body);
 const bones=bodyData.bones.map(([name])=>{const b=new T.Bone();b.name=name;return b;});
 bodyData.bones.forEach(([name,parent,pos],i)=>{const p=new T.Vector3(...pos);if(parent>=0){p.sub(new T.Vector3(...bodyData.bones[parent][2]));bones[parent].add(bones[i]);}else body.add(bones[i]);bones[i].position.copy(p);});
 const skeleton=new T.Skeleton(bones);body.bind(skeleton);
 const targets={pelvis:[0,0,0],chest:standing?[0,.49,0]:[.23,.43,0],lShoulder:standing?[0,.49,-.207]:[.23,.43,-.207],rShoulder:standing?[0,.49,.207]:[.23,.43,.207],lElbow:standing?[.03,.18,-.24]:[.48,.19,-.26],rElbow:standing?[.03,.18,.24]:[.48,.19,.26],lWrist:standing?[.04,-.1,-.23]:[.72,.18,-.17],rWrist:standing?[.04,-.1,.23]:[.72,.18,.17],lHip:[0,-.05,-.106],rHip:[0,-.05,.106],lKnee:standing?[0,-.48,-.12]:[.34,-.28,-.46],rKnee:standing?[0,-.48,.12]:[.34,-.28,.46],lAnkle:standing?[0,-.94,-.13]:[-.04,-.61,-.48],rAnkle:standing?[0,-.94,.13]:[-.04,-.61,.48]};
 // Orient each joint from its bind direction into the same mounted/standing pose.
 for(let i=0;i<bones.length;i++){
  const b=bones[i],parent=bodyData.bones[i][1],name=bodyData.bones[i][0],target=new T.Vector3(...targets[name]);
  if(parent<0)b.position.copy(target);else{body.updateMatrixWorld(true);const parentBone=bones[parent];b.position.copy(parentBone.worldToLocal(target.clone()));}
  const child=bodyData.bones.findIndex((x,j)=>x[1]===i&&j>i);if(child>=0){const from=new T.Vector3(...bodyData.bones[child][2]).sub(new T.Vector3(...bodyData.bones[i][2])).normalize();const to=new T.Vector3(...targets[bodyData.bones[child][0]]).sub(target).normalize();const q=new T.Quaternion().setFromUnitVectors(from,to);if(parent>=0){const qp=new T.Quaternion();bones[parent].getWorldQuaternion(qp);q.premultiply(qp.invert());}b.quaternion.copy(q);}
 }
 body.updateMatrixWorld(true);skeleton.update();
 const head=new T.Group();head.position.set(standing?0:.29,standing?.72:.71,0);head.scale.setScalar(.72);rider.add(head);
 buildFace(head,{s:custom,showHelmet});
 const gear=new T.Group();gear.name='jockey-helmet';head.add(gear);gear.visible=showHelmet;
 const helmMat=helmet||mat(custom.helmetColor,{roughness:.4,clearcoat:.5});
 const cap=mesh(gear,new T.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI*.53),helmMat);cap.scale.set(.175,.18,.16);cap.position.set(.004,.11,0);
 const peak=mesh(gear,new T.SphereGeometry(1,32,16),helmMat);peak.scale.set(.12,.009,.145);peak.position.set(.142,.11,0);
 tube(gear,mat(custom.accentColor,{roughness:.65}),[[-.14,.13,0],[-.11,.23,0],[0,.29,0],[.12,.23,0],[.17,.13,0]],.009,28);
 for(const z of [-.13,.13])tube(gear,mat('#30342f'),[[.01,.1,z],[.13,-.1,z*.7],[.07,-.135,0]],.0035,16);
 // Stand collar, zipper tape and stitches follow the actual body orientation.
 const collar=mesh(rider,new T.TorusGeometry(.093,.017,8,32),silk||mat(custom.silkColor));collar.rotation.x=Math.PI/2;collar.position.set(standing?0:.27,standing?.59:.56,0);
 tube(rider,mat(custom.accentColor,{roughness:.9}),standing?[[.125,.57,0],[.15,.35,0],[.14,.1,0]]:[[.43,.58,0],[.38,.37,0],[.25,.17,0]],.0023,28);
 const arms=[bones.find(b=>b.name==='rShoulder'),bones.find(b=>b.name==='lShoulder')];arms.forEach((b,i)=>{b.userData.restRotation=b.rotation.clone();b.name=`jockey-arm-${index}-${i?'salute':'reins'}`;});
 const chest=bones[1],chestRest=chest.position.clone(),wrists=bones.filter(b=>/Wrist/.test(b.name));const wristRest=wrists.map(b=>b.rotation.clone());const idle={head,arms,body,hair:head.userData.hair};
 rider.userData.idle=(time,pointer={x:0,y:0},reduced=false)=>{if(reduced)return;const breath=Math.sin(time*1.65)*.0035;chest.position.copy(chestRest);chest.position.y+=breath;wrists.forEach((b,i)=>{b.rotation.copy(wristRest[i]);b.rotation.z+=Math.sin(time*.65+i)*.009;});head.position.y=(standing?.72:.71)+breath;head.rotation.y=T.MathUtils.lerp(head.rotation.y,pointer.x*.18,.05);head.rotation.z=T.MathUtils.lerp(head.rotation.z,-pointer.y*.06,.04);if(head.userData.eyes)for(const eye of head.userData.eyes)eye.rotation.y=pointer.x*.12;const phase=time%5.4,blink=phase<.16?Math.sin(phase/.16*Math.PI):0;if(blink>0||head.userData.wasBlink){head.userData.blink?.(blink);head.userData.wasBlink=blink>0;}if(idle.hair){idle.hair.rotation.z=Math.sin(time*1.2)*.003;}};
 rider.userData.headgear=gear;return {rider,head,arms,body,skeleton};
}
