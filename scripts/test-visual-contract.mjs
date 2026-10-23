import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import * as T from '../vendor/three.module.min.js';
import {createHorse} from '../horse-model.js';
import {createJockey} from '../jockey-model.js';
import {animateGallop,dustSample} from '../horse-gait.js';
import {microTexture} from '../studio-materials.js';
import {disposeTree} from '../studio-geometry.js';
globalThis.document={createElement:()=>createCanvas(128,128)};
const h=createHorse(),profile={stride:.6,phase:.3},root=new T.Group();root.add(h.group);
const p=h.horse.geometry.attributes.position,si=h.horse.geometry.attributes.skinIndex,sw=h.horse.geometry.attributes.skinWeight;
const samples=h.legs.map(l=>{const b=h.skeleton.bones.indexOf(l.hoof),ids=[];for(let i=0;i<p.count;i++)if(p.getY(i)<.1&&[0,1,2,3].some(j=>si.array[i*4+j]===b&&sw.array[i*4+j]>.65))ids.push(i);assert(ids.length);return ids;});
let maxFloor=0,maxSlide=0,maxNose=0,previous=[];
for(let frame=0;frame<650;frame++){
 const distance=1+frame*.004,pose=animateGallop(h,{distance,profile});h.group.position.y=pose.bodyY;h.group.rotation.z=pose.pitch;root.position.x=2.13+distance-pose.noseOffset;root.updateMatrixWorld(true);h.skeleton.update();
 const nose=h.group.getObjectByName('horse-nose').getWorldPosition(new T.Vector3());maxNose=Math.max(maxNose,Math.abs(nose.x-(2.13+distance)));
 for(let j=0;j<4;j++){const points=samples[j].map(i=>h.horse.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(p,i)).applyMatrix4(h.horse.matrixWorld)),floor=Math.min(...points.map(v=>v.y)),center=points.reduce((a,b)=>a.add(b),new T.Vector3()).divideScalar(points.length),contact=pose.targets[j].contact;
  if(contact){maxFloor=Math.max(maxFloor,Math.abs(floor-.04));if(previous[j]?.contact)maxSlide=Math.max(maxSlide,Math.abs(center.x-previous[j].x));}previous[j]={contact,x:center.x};assert(floor>-.02,'no deep ground penetration');
 }
}
assert(maxFloor<.015,'planted soles follow the ground');assert(maxSlide<.006,'planted hooves do not slide with the body');assert(maxNose<1e-7,'head motion cannot move the planned nose coordinate');
animateGallop(h,{distance:4.2,drive:0,profile});animateGallop(h,{distance:4.2,drive:1e-6,profile});let nearRest=Math.max(...h.legs.flatMap(l=>[l.hip,l.shin,l.hoof].map(b=>Math.abs(b.rotation.z))));assert(nearRest<1e-5,'no pose snap at standstill');
const j=createJockey({});h.group.add(j.rider);j.rider.position.copy(h.seat);let reinsChecked=0;
for(const kind of ['salute','arms','bow','crowd'])for(const weight of [0,.5,1]){
 j.rider.userData.pose(kind,1,false,weight);h.group.userData.fitReins(j.rider);root.updateMatrixWorld(true);const reins=[];h.group.traverse(o=>{if(o.name==='flexible-rein')reins.push(o);});assert.equal(reins.length,2);
 for(let k=0;k<2;k++){const g=reins[k].geometry.attributes.position;assert([...g.array].every(Number.isFinite));const end=new T.Vector3();for(let q=0;q<6;q++)end.add(new T.Vector3().fromBufferAttribute(g,24*7+q));end.divideScalar(6).applyMatrix4(reins[k].matrixWorld);if(!j.rider.userData.reinRelease[k])assert(end.distanceTo(j.rider.userData.reinHands[k].getWorldPosition(new T.Vector3()))<1e-5,'rein reaches the held hand');}reinsChecked++;
}
for(let i=0;i<42;i++){assert(!dustSample(h,0,profile,i).visible);assert.deepEqual(dustSample(h,8.13,profile,i),dustSample(h,8.13,profile,i));}
const a=microTexture('skin'),b=microTexture('skin');assert.notEqual(a,b);assert.equal(a.image,b.image);let disposedB=false;b.addEventListener('dispose',()=>disposedB=true);a.dispose();assert(!disposedB,'disposing one portrait cannot dispose another');b.dispose();
disposeTree(root);
console.log(JSON.stringify({test:'actual skinned contacts and visual contracts',maxFloorErrorMeters:maxFloor,maxPlantedSlideMeters:maxSlide,maxPlannedNoseErrorMeters:maxNose,startStopDiscontinuityRadians:nearRest,reinPoses:reinsChecked,textures:'independent disposal',dust:'deterministic touchdown history'}));
