import * as T from './vendor/three.module.min.js';
import {microTexture} from './studio-materials.js';
import data from './assets/studio/horse-body.js';
import {styleColors} from './horse-style.js?v=studio-1';
import {geometry,mesh,tube,material,surface} from './studio-geometry.js';
export function createHorse(input={},number=''){
 const s=styleColors(input),group=new T.Group();group.name='anatomical-horse';
 const color=[];const coat=new T.Color(s.coatColor),dark=new T.Color('#312b27');const uv=[];
 for(let i=0;i<data.position.length;i+=3){const[x,y,z]=data.position.slice(i,i+3),c=coat.clone();const muzzle=Math.max(0,Math.min(1,(x-1.76)/.23))*Math.max(0,Math.min(1,(2.53-y)/.15));c.lerp(dark,muzzle*.72);c.multiplyScalar(1+Math.sin(i*9.13)*.02);if(s.socks==='all'||s.socks==='rear'&&x<0)if(y<.47)c.lerp(new T.Color('#e9e5dc'),Math.min(1,(.47-y)*30));color.push(c.r,c.g,c.b);uv.push((x+2.15)/4.28,(y+z*.15)/3.2);}
 const g=geometry({...data,color,uv});g.setAttribute('skinIndex',new T.Uint16BufferAttribute(data.skinIndex,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(data.skinWeight,4));
 const coatMat=material('#ffffff',{vertexColors:true,roughness:.57,clearcoat:.06,clearcoatRoughness:.65,bumpMap:microTexture('hair'),bumpScale:.003});const horse=new T.SkinnedMesh(g,coatMat);horse.name='equine-continuous-surface';horse.castShadow=true;horse.receiveShadow=true;group.add(horse);
 const root=new T.Bone();horse.add(root);const bones=[root],legs=[];
 for(const x of [-.78,.70])for(const z of [-.27,.27]){const hip=new T.Bone();hip.position.set(x,1.56,z);root.add(hip);const shin=new T.Bone();shin.position.set(.07,-.62,0);hip.add(shin);bones.push(hip,shin);legs.push({hip,shin,phase:(x<0?0:Math.PI)+(z<0?.6:0),hind:x<0});}
 const skeleton=new T.Skeleton(bones);horse.bind(skeleton);
 const leather=material(s.saddleColor,{roughness:.52,clearcoat:.15}),metal=material(s.trimColor,{metalness:.82,roughness:.28}),mane=material(s.maneColor,{roughness:.85,sheen:.4});
 const reins=[];const tail=new T.Group();tail.position.set(-1.04,1.95,0);group.add(tail);
 for(let i=0;i<18;i++){const off=(i/17-.5)*.12;tube(tail,mane,[[0,0,off],[-.21,-.12,off],[-.5,-.39,off*.7],[-.67,-.66,off*.45]],.012,22);}
 const crest=[];for(let i=0;i<20;i++){const t=i/19;crest.push([.49+t*.69,2.12+t*.76,0]);}tube(group,mane,crest,.035,32);
 for(let i=0;i<23;i++){const t=i/22;tube(group,mane,[[.50+t*.67,2.14+t*.75,-.018],[.47+t*.64,2.10+t*.76,-.056],[.46+t*.61,2.04+t*.75,-.077]],.007,12);}
 const ears=[],headParts=new T.Group();group.add(headParts);headParts.name='horse-head-details';
 for(const z of [-.14,.14]){
  const ear=new T.Group();ear.position.set(1.20,2.89,z);headParts.add(ear);surface(ear,material(s.coatColor),(u,v)=>{const a=u*Math.PI*2,r=Math.sin(v*Math.PI)*.064;return [Math.cos(a)*r+v*.06,v*.29,Math.sin(a)*r*.54];},24,16);ears.push(ear);
  const eye=mesh(headParts,new T.SphereGeometry(.031,20,14),material('#130f0b',{roughness:.12,clearcoat:1}));eye.position.set(1.44,2.76,z*1.18);eye.scale.z=.52;
  const nostril=mesh(headParts,new T.SphereGeometry(.045,20,12),material('#251d19',{roughness:.7}));nostril.position.set(2.018,2.41,z);nostril.scale.set(.9,.55,.2);
  tube(headParts,leather,[[1.2,2.88,z],[1.44,2.77,z*1.3],[1.86,2.49,z],[2.015,2.37,z]],.012,24);
  tube(headParts,leather,[[2.02,2.46,z],[1.96,2.34,z],[1.88,2.31,z]],.013,20);
 }
 headParts.position.set(1,2.5,0);for(const child of headParts.children)child.position.sub(headParts.position);let reacted=false;
 // Cloth is a curved textile surface over the barrel; the number shares its UVs.
 const cv=globalThis.document?.createElement('canvas');let clothMap;
 if(cv){cv.width=512;cv.height=256;const c=cv.getContext('2d');c.fillStyle=s.clothColor;c.fillRect(0,0,512,256);c.strokeStyle=s.trimColor;c.lineWidth=8;c.strokeRect(12,12,488,232);c.setLineDash([2,4]);c.lineWidth=1;c.strokeStyle='#ffffff70';c.strokeRect(23,23,466,210);c.setLineDash([]);if(s.number||number){c.fillStyle='#f7efe0';c.textAlign='center';c.textBaseline='middle';c.font='700 142px Georgia';c.fillText(s.number||number,256,142);}clothMap=new T.CanvasTexture(cv);clothMap.colorSpace=T.SRGBColorSpace;}
 for(const side of [-1,1]){
  const textile=surface(group,material(clothMap?'#ffffff':s.clothColor,{map:clothMap,side:T.DoubleSide,roughness:.94,sheen:.25}),(u,v)=>{const x=-.63+u*1.05,y=1.83+v*.37,z=side*(.43-Math.pow(v,2)*.13+Math.sin(u*Math.PI)*.015);return [x,y,z];},32,12);textile.name='embroidered-number-cloth';if(side<0){const uv=textile.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));}
  tube(group,leather,[[-.08,2.2,side*.31],[-.02,1.95,side*.435],[.02,1.47,side*.36]],.022,24);
  const buckle=mesh(group,new T.TorusGeometry(.043,.006,6,16),metal);buckle.position.set(.01,1.76,side*.405);buckle.scale.y=1.35;
  const stirrup=mesh(group,new T.TorusGeometry(.102,.009,8,32),metal);stirrup.position.set(-.06,1.55,side*.37);stirrup.scale.x=.72;
  const rein=tube(group,leather,[[1.92,2.37,side*.16],[1.08,2.33,side*.23],[.57,2.35,side*.17]],.006,32);rein.name='flexible-rein';rein.userData.studioDynamic=true;reins.push(rein);
 }
 const saddle=mesh(group,new T.SphereGeometry(1,36,16),leather);saddle.position.set(-.12,2.19,0);saddle.scale.set(.43,.08,.29);
 tube(group,leather,[[-.46,2.22,-.23],[-.46,2.28,0],[-.46,2.22,.23]],.045,24);
 for(let i=0;i<legs.length;i++){const h=legs[i].shin;const hoof=mesh(h,new T.CylinderGeometry(.078,.105,.12,24),material('#282725',{roughness:.45}));hoof.position.set(.03,-.86,0);hoof.scale.z=.8;}
 const nose=new T.Object3D();nose.name='horse-nose';nose.position.set(2.13,2.37,0);group.add(nose);
 group.userData.ears=ears;group.userData.react=(time,kind)=>{const nod=kind==='ears'?Math.sin(time*3)*.025:0;headParts.rotation.z=nod;if(nod||reacted){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=data.position[i*3],y=data.position[i*3+1],z=data.position[i*3+2],w=T.MathUtils.smoothstep(y,2.2,2.65)*T.MathUtils.smoothstep(x,.8,1.2),a=nod*w,dx=x-1,dy=y-2.5;p.setXYZ(i,1+dx*Math.cos(a)-dy*Math.sin(a),2.5+dx*Math.sin(a)+dy*Math.cos(a),z);}p.needsUpdate=true;reacted=!!nod;}for(let i=0;i<ears.length;i++){ears[i].rotation.z=Math.sin(time*2+i)*.08;ears[i].rotation.x=kind==='ears'?Math.sin(time*8)*.2:0;}tail.rotation.x=Math.sin(time*1.5)*.04;for(const r of reins){r.rotation.x=Math.sin(time*1.7)*.002;r.rotation.z=Math.sin(time*1.3)*.001;}};
 return {group,legs,tail,skeleton,horse};
}
