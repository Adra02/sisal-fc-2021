import assert from 'node:assert/strict';import {createCanvas} from '@napi-rs/canvas';import * as T from '../vendor/three.module.min.js';import {createHorse} from '../horse-model.js';import {animateGallop} from '../horse-gait.js';import {disposeTree} from '../studio-geometry.js';import {randomSource,motionProfile} from '../race-motion.js';
globalThis.document={createElement:()=>createCanvas(128,128)};
for(const reduced of [false,true]){
 const h=createHorse(),profile=motionProfile(randomSource(328794),0),g=h.horse.geometry,ix=g.attributes.skinIndex,w=g.attributes.skinWeight,p=g.attributes.position,vertices=h.legs.map(l=>{const b=h.skeleton.bones.indexOf(l.hoof),a=[];for(let i=0;i<p.count;i++)if(p.getY(i)<.10&&[0,1,2,3].some(j=>ix.array[i*4+j]===b&&w.array[i*4+j]>.65))a.push(i);return a;});
 const tracks=vertices.map(()=>[]);let maxFloorError=0,maxLift=0;
 for(let frame=0;frame<180;frame++){
  const pose=animateGallop(h,{distance:1+frame*.018,drive:1,reduced,profile});h.group.position.y=pose.bodyY;h.group.rotation.z=pose.pitch;h.group.updateMatrixWorld(true);h.skeleton.update();
  vertices.forEach((ids,j)=>{const points=ids.map(i=>h.horse.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(p,i)).applyMatrix4(h.horse.matrixWorld));const center=points.reduce((a,v)=>a.add(v),new T.Vector3()).divideScalar(points.length);tracks[j].push(center);const min=Math.min(...points.map(v=>v.y));assert(min>-.12,'hoof must not sink through the surface: '+min);maxLift=Math.max(maxLift,min);if(pose.targets[j].contact)maxFloorError=Math.max(maxFloorError,Math.abs(min-.04));});
 }
 for(const path of tracks){assert(Math.max(...path.map(v=>v.x))-Math.min(...path.map(v=>v.x))>.35,'actual skinned hooves swing forward/back');assert(Math.max(...path.map(v=>v.y))-Math.min(...path.map(v=>v.y))>.20,'actual skinned hooves leave ground');}
 assert(maxFloorError<.035,'contact error bounded: '+maxFloorError);assert(maxLift>.23);
 const replay=animateGallop(h,{distance:2.37,reduced,profile}),rot=h.legs.map(l=>[l.hip.rotation.z,l.shin.rotation.z]);animateGallop(h,{distance:5.9,reduced,profile});assert.deepEqual(animateGallop(h,{distance:2.37,reduced,profile}),replay,'replay/seek deterministic');assert.deepEqual(h.legs.map(l=>[l.hip.rotation.z,l.shin.rotation.z]),rot);
 animateGallop(h,{distance:2.37,drive:0,reduced,profile});for(const leg of h.legs){assert.equal(Math.abs(leg.hip.rotation.z),0);assert.equal(Math.abs(leg.shin.rotation.z),0);}
 console.log('PASS actual skinned hoof trajectories; reduced motion =',reduced,'max sole/contact discrepancy =',maxFloorError.toFixed(4),'m; replay deterministic; stationary reset');disposeTree(h.group);
}
