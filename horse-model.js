import * as T from './vendor/three.module.min.js';
import {microTexture} from './studio-materials.js?v=studio-9';
import data from './assets/studio/horse-body.js?v=studio-9';
import {styleColors} from './horse-style.js?v=studio-9';
import {geometry,mesh,tube,material,surface,smooth} from './studio-geometry.js?v=studio-9';
// All accounts share the same body. Calculate tack intersections only once.
const tackIntersections=new Map();

// CC0 artist topology; one common skeleton, fitted tack, no gameplay state.
export function createHorse(input={},number=''){
 const s=styleColors(input),group=new T.Group();group.name='anatomical-horse';
 const bones=data.bones.map(([name])=>{const b=new T.Bone();b.name=name;return b;});
 data.bones.forEach(([,parent,pos],i)=>{bones[i].position.set(...pos);if(parent>=0){bones[i].position.sub(new T.Vector3(...data.bones[parent][2]));bones[parent].add(bones[i]);}else group.add(bones[i]);});
 const legSpec=[['Bone_L.004','Bone_L.005',true,0],['Bone_R.004','Bone_R.005',true,.6],['Bone_L.001','Bone_L.002',false,Math.PI],['Bone_R.001','Bone_R.002',false,Math.PI+.6]],hoofRest=[],hoofBones=[];
 group.updateMatrixWorld(true);
 for(const [a,b]of legSpec){const shin=bones.find(x=>x.name===b),index=bones.indexOf(shin),d=data.parts.body,sole=[];
  for(let i=0;i<d.position.length/3;i++)if(d.position[i*3+1]<.105&&d.skinIndex.slice(i*4,i*4+4).some((v,k)=>v===index&&d.skinWeight[i*4+k]>.65))sole.push(new T.Vector3(...d.position.slice(i*3,i*3+3)));
  const foot=sole.reduce((v,p)=>v.add(p),new T.Vector3()).divideScalar(sole.length||1),ankle=new T.Vector3(foot.x-.025,.25,foot.z),hoof=new T.Bone();hoof.name='hoof-'+b;hoof.position.copy(shin.worldToLocal(ankle.clone()));shin.add(hoof);hoofRest.push({foot,ankle,sole,lowest:Math.min(...sole.map(p=>p.y)),shinIndex:index});hoofBones.push(hoof);
 }
 bones.push(...hoofBones);group.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);
 const coat=new T.Color(s.coatColor),hoof=new T.Color('#302b26'),muzzle=new T.Color('#423b34');
 function skinPart(tag,mat){const d=data.parts[tag],g=geometry(d);g.setAttribute('skinIndex',new T.Uint16BufferAttribute(d.skinIndex,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(d.skinWeight,4));
  if(tag==='body'){const indices=g.attributes.skinIndex,weights=g.attributes.skinWeight;
   for(let i=0;i<g.attributes.position.count;i++){const ids=[indices.getX(i),indices.getY(i),indices.getZ(i),indices.getW(i)],ws=[weights.getX(i),weights.getY(i),weights.getZ(i),weights.getW(i)],y=g.attributes.position.getY(i);
    for(let j=0;j<4;j++){const leg=hoofRest.findIndex(h=>h.shinIndex===ids[j]);if(leg<0||ws[j]<=0)continue;const f=1-smooth(.145,.34,y);if(!f)continue;const slot=ws.findIndex((w,k)=>w===0&&k!==j);if(f>=.999||slot<0){if(f>.5)ids[j]=bones.indexOf(hoofBones[leg]);}else{ids[slot]=bones.indexOf(hoofBones[leg]);ws[slot]=ws[j]*f;ws[j]*=1-f;}}
    const sum=ws.reduce((a,b)=>a+b,0)||1;indices.setXYZW(i,...ids);weights.setXYZW(i,...ws.map(w=>w/sum));
   }
  }
  const uv=[],colors=[];
  for(let i=0;i<d.position.length;i+=3){const[x,y,z]=d.position.slice(i,i+3);uv.push((x+2.2)/4.4,(y+z*.08)/3.2);if(tag==='body'){const c=coat.clone(),belly=Math.exp(-(((y-1.35)/.42)**2))*smooth(-1.35,-.75,x)*(1-smooth(.30,.7,x)),joint=1-smooth(.48,1.18,y),flank=Math.exp(-(((x+1.13)/.42)**2+((y-1.93)/.40)**2));c.multiplyScalar(1-.12*belly-.10*joint+.035*flank);if(y<.16)c.copy(hoof);else if((s.socks==='all'||s.socks==='rear'&&x<0)&&y<.51)c.lerp(new T.Color('#e6e1d5'),T.MathUtils.smoothstep(.51-y,0,.05));c.lerp(muzzle,T.MathUtils.smoothstep(x,1.92,2.1)*.56);colors.push(c.r,c.g,c.b);}}
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(colors.length)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const m=new T.SkinnedMesh(g,mat);m.name=tag==='body'?'equine-continuous-surface':'equine-'+tag;m.castShadow=true;m.receiveShadow=true;group.add(m);m.bind(skeleton,new T.Matrix4());return m;
 }
 const horse=skinPart('body',material('#fff',{vertexColors:true,roughness:.55,clearcoat:.025,clearcoatRoughness:.68,sheen:.30,sheenRoughness:.7,bumpMap:microTexture('coat',256),bumpScale:.0004}));
 const hair=material(s.maneColor,{roughness:.76,sheen:.22,bumpMap:microTexture('hair'),bumpScale:.0006});skinPart('mane',hair);skinPart('tail',hair);
 // Fine deterministic strands follow the original mane/tail skeleton.
 for(const tag of ['mane','tail']){const d=data.parts[tag],source=geometry(d),p=[],ix=[],si=[],sw=[],cols=[],normal=new T.Vector3(),along=new T.Vector3(),side=new T.Vector3(),root=new T.Vector3(),v=new T.Vector3(),count=tag==='mane'?500:700;
  for(let k=0;k<count;k++){const id=(k*137+53)%source.attributes.position.count;root.fromBufferAttribute(source.attributes.position,id);normal.fromBufferAttribute(source.attributes.normal,id);along.set(tag==='mane'?-.15:-.10,-1,0).addScaledVector(normal,normal.y).normalize();side.crossVectors(normal,along).normalize();const first=p.length/3,len=(tag==='mane'?.042:.075)*(1+.25*Math.sin(k*17.2)),shade=new T.Color(s.maneColor).multiplyScalar(.8+.18*Math.abs(Math.sin(k*39)));
   for(let row=0;row<=4;row++){const t=row/4,w=.0012*(1-t*.95);v.copy(root).addScaledVector(along,t*len).addScaledVector(normal,.0005+Math.sin(Math.PI*t)*.003);for(const sign of [-1,1]){p.push(v.x+side.x*w*sign,v.y+side.y*w*sign,v.z+side.z*w*sign);si.push(...d.skinIndex.slice(id*4,id*4+4));sw.push(...d.skinWeight.slice(id*4,id*4+4));cols.push(shade.r,shade.g,shade.b);}if(row<4){const j=first+row*2;ix.push(j,j+1,j+2,j+1,j+3,j+2);}}
  }
  const g=geometry({position:p,index:ix,color:cols});g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));const strands=new T.SkinnedMesh(g,material('#fff',{vertexColors:true,side:T.DoubleSide,roughness:.76,sheen:.15}));strands.name='rooted-equine-'+tag;group.add(strands);strands.bind(skeleton,new T.Matrix4());source.dispose();
 }
 for(const key of ['eyeLeft','eyeRight'])skinPart(key,material('#22190f',{roughness:.15,clearcoat:1,clearcoatRoughness:.08}));
 const lookup=Object.fromEntries(bones.map(b=>[b.name,b]));
 const legs=legSpec.map(([a,b,hind,phase],i)=>({hip:lookup[a],shin:lookup[b],hoof:hoofBones[i],hind,phase}));
 for(const [i,leg]of legs.entries()){
  const hip=new T.Vector3(),knee=new T.Vector3();leg.hip.getWorldPosition(hip);leg.shin.getWorldPosition(knee);const h=hoofRest[i],foot=h.foot,ankle=h.ankle;
  leg.gait={hipX:hip.x,hipY:hip.y,footX:foot.x,footY:foot.y,footZ:foot.z,ankleX:ankle.x,ankleY:ankle.y,soleHeight:foot.y-h.lowest,upper:Math.hypot(knee.x-hip.x,knee.y-hip.y),lower:Math.hypot(ankle.x-knee.x,ankle.y-knee.y),upperAngle:Math.atan2(knee.y-hip.y,knee.x-hip.x),lowerAngle:Math.atan2(ankle.y-knee.y,ankle.x-knee.x),kneeX:knee.x,kneeY:knee.y,solePoints:h.sole.map(p=>[p.x,p.y])};
 }
 const tail=lookup['Bone.004'];
 const leather=material(s.saddleColor,{roughness:.55,clearcoat:.10,clearcoatRoughness:.5,bumpMap:microTexture('leather'),bumpScale:.0004});
 const metal=material(s.trimColor,{metalness:.83,roughness:.3});
 // Fit cloth to the real barrel with intersections of the rest mesh, rather
 // than a rectangular panel that cuts into the horse. No network or extra asset.
 const probe=new T.Mesh(horse.geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));probe.updateMatrixWorld();const ray=new T.Raycaster();
 function topAt(x){const key='t'+x.toFixed(6);if(tackIntersections.has(key))return tackIntersections.get(key);ray.set(new T.Vector3(x,5,0),new T.Vector3(0,-1,0));const v=ray.intersectObject(probe)[0]?.point.y||2.15;tackIntersections.set(key,v);return v;}
 function sideAt(x,y,side){const key=[x.toFixed(6),y.toFixed(6),side].join(':');if(tackIntersections.has(key))return tackIntersections.get(key);ray.set(new T.Vector3(x,y,side*2),new T.Vector3(0,0,-side));const v=Math.abs(ray.intersectObject(probe)[0]?.point.z||0);tackIntersections.set(key,v);return v;}
 function girthAt(angle,side){const key='g'+angle.toFixed(6)+':'+side;if(tackIntersections.has(key))return tackIntersections.get(key);const center=new T.Vector3(.07,1.80,0),radial=new T.Vector3(0,Math.cos(angle),Math.sin(angle)*side);ray.set(center.clone().addScaledVector(radial,2),radial.clone().negate());const hit=ray.intersectObject(probe)[0];const p=(hit?.point||center.clone().addScaledVector(radial,.4)).clone().addScaledVector(radial,.018).toArray();tackIntersections.set(key,p);return p;}
 const saddleY=topAt(-.24)+.055;const seat=new T.Vector3(-.24,saddleY+.025,0);group.userData.seat=seat;
 const cv=globalThis.document?.createElement('canvas');let clothMap;
 if(cv){cv.width=512;cv.height=384;const c=cv.getContext('2d');c.fillStyle=s.clothColor;c.fillRect(0,0,512,384);c.strokeStyle=s.trimColor;c.lineWidth=9;c.strokeRect(10,10,492,364);c.setLineDash([2,5]);c.lineWidth=1;c.strokeStyle='#ffffff70';c.strokeRect(22,22,468,340);c.setLineDash([]);c.fillStyle='#f4edd9';c.textAlign='center';c.textBaseline='middle';c.font='800 145px system-ui';c.fillText(s.number||number,265,207);clothMap=new T.CanvasTexture(cv);clothMap.colorSpace=T.SRGBColorSpace;}
 for(const side of [-1,1]){
  const cloth=surface(group,material(clothMap?'#fff':s.clothColor,{map:clothMap,side:T.DoubleSide,roughness:.95,sheen:.28,bumpMap:microTexture('fabric'),bumpScale:.0007}),(u,v)=>{const x=-.79+u*.96,y=topAt(x)-.56*(1-v);return [x,y+.024,side*(sideAt(x,y,side)+.024)];},24,14);cloth.name='embroidered-number-cloth';
  if(side<0){const uv=cloth.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));}
  tube(group,leather,Array.from({length:17},(_,i)=>girthAt(.25+(Math.PI-.25)*i/16,side)),.018,40).name='fitted-girth';
  const stirrupY=seat.y-.67,stirrupZ=side*.46;
  tube(group,leather,[[-.16,saddleY,side*.26],[-.22,stirrupY+.18,stirrupZ],[-.22,stirrupY,stirrupZ]],.013,20);
  const stirrup=mesh(group,new T.TorusGeometry(.080,.008,8,24),metal,'stirrup');stirrup.position.set(-.22,stirrupY,stirrupZ);stirrup.scale.x=.8;
  const buckle=mesh(group,new T.TorusGeometry(.025,.005,6,16),metal);buckle.position.set(.07,1.79,side*(sideAt(.07,1.79,side)+.033));buckle.scale.y=1.35;
 }
 const saddle=mesh(group,new T.SphereGeometry(1,32,16),leather,'leather-saddle');saddle.position.set(-.25,saddleY,0);saddle.scale.set(.40,.048,.25);
 tube(group,leather,[[-.59,saddleY+.01,-.20],[-.60,saddleY+.09,0],[-.59,saddleY+.01,.20]],.032,24);
 tube(group,leather,[[.08,saddleY,-.17],[.10,saddleY+.06,0],[.08,saddleY,.17]],.025,20);
 // Bridle follows the sculpted poll, cheeks and muzzle; reins meet the hands.
 const headGear=new T.Group();headGear.name='fitted-bridle';group.add(headGear);const reins=[],bits=[];
 for(const side of [-1,1]){
  tube(headGear,leather,[[1.36,2.96,side*.10],[1.60,2.77,side*.14],[1.89,2.46,side*.13],[1.98,2.28,side*.12]],.010,24);
  tube(headGear,leather,[[2.02,2.47,side*.13],[2.05,2.34,side*.16],[1.99,2.24,side*.12]],.012,18);
  const ring=mesh(headGear,new T.TorusGeometry(.03,.004,6,20),metal);ring.position.set(1.98,2.29,side*.135);
  const bit=new T.Object3D();bit.position.set(1.98,2.29,side*.135);headGear.add(bit);bits.push(bit);
  const rein=tube(group,leather,[[1.98,2.29,side*.135],[1.12,2.18,side*.23],[seat.x+.72,seat.y+.18,side*.17]],.005,24);rein.name='flexible-rein';rein.userData.studioDynamic=true;rein.geometry.attributes.position.setUsage(T.DynamicDrawUsage);rein.geometry.attributes.normal.setUsage(T.DynamicDrawUsage);reins.push(rein);
 }
 tube(headGear,leather,[[2.04,2.47,-.13],[2.10,2.49,0],[2.04,2.47,.13]],.011,18);
 const headBone=lookup['Bone.002'],headRest=new T.Vector3(...data.bones[2][2]);
 headBone.add(headGear);headGear.position.copy(headRest).negate();
 const nose=new T.Object3D();nose.name='horse-nose';nose.position.set(2.13,2.37,0).sub(headRest);headBone.add(nose);
 const nosePosition=new T.Vector3(2.13,2.37,0);group.userData.nosePosition=nosePosition;
 group.userData.locomotion=(phase,power,reduced)=>{headBone.rotation.z=reduced?0:Math.sin(phase+.9)*.009*power;headBone.rotation.y=reduced?0:Math.sin(phase*.5)*.004*power;nosePosition.copy(nose.position).applyQuaternion(headBone.quaternion).add(headRest);tail.rotation.y=reduced?0:Math.sin(phase*.48)*.14*power;tail.rotation.z=.12*power;return nosePosition;};
 // Reuse buffers and attach the reins to the actual moving hands and bit.
 const bitPoint=new T.Vector3(),handPoint=new T.Vector3(),bend=new T.Vector3(),v=new T.Vector3(),tangent=new T.Vector3(),sideVector=new T.Vector3(),up=new T.Vector3();
 group.userData.fitReins=rider=>{if(!rider?.userData.reinHands)return;group.updateWorldMatrix(true,true);rider.updateWorldMatrix(true,true);
  for(let k=0;k<2;k++){group.worldToLocal(bits[k].getWorldPosition(bitPoint));group.worldToLocal(rider.userData.reinHands[k].getWorldPosition(handPoint));const release=rider.userData.reinRelease?.[k]||0;handPoint.lerp(v.set(seat.x+.30,seat.y+.05,k?.16:-.16),smooth(.10,.75,release));
   bend.copy(bitPoint).lerp(handPoint,.52);bend.y-=.08+.08*release;bend.z+=(k?1:-1)*.42;const p=reins[k].geometry.attributes.position,n=reins[k].geometry.attributes.normal;
   for(let j=0;j<=24;j++){const t=j/24,a=1-t;v.copy(bitPoint).multiplyScalar(a*a).addScaledVector(bend,2*a*t).addScaledVector(handPoint,t*t);tangent.copy(bend).sub(bitPoint).multiplyScalar(a).addScaledVector(up.copy(handPoint).sub(bend),t).normalize();sideVector.set(0,0,1).addScaledVector(tangent,-tangent.z).normalize();up.crossVectors(tangent,sideVector).normalize();
    for(let r=0;r<=6;r++){const angle=r*Math.PI/3,c=Math.cos(angle),sn=Math.sin(angle),i=j*7+r,nx=sideVector.x*c+up.x*sn,ny=sideVector.y*c+up.y*sn,nz=sideVector.z*c+up.z*sn;p.setXYZ(i,v.x+nx*.005,v.y+ny*.005,v.z+nz*.005);n.setXYZ(i,nx,ny,nz);}}
   p.needsUpdate=n.needsUpdate=true;reins[k].geometry.computeBoundingSphere();
  }
 };
 const ears=[lookup['Bone.001_L'],lookup['Bone.001_R']];group.userData.ears=ears;
 group.userData.react=(time,kind)=>{ears.forEach((ear,i)=>{ear.rotation.x=Math.sin(time*1.2+i)*.025+(kind==='ears'?Math.sin(time*5)*.08:0);});tail.rotation.x=Math.sin(time*1.5)*.035;};
 probe.material.dispose();return {group,legs,tail,skeleton,horse,seat};
}
