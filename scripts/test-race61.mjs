import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import * as T from '../vendor/three.module.min.js';
import {createHorse} from '../horse-model.js';
import {createJockey} from '../jockey-model.js';
import {animateGallop,dustSample} from '../horse-gait.js';
import {spectatorPose,fitLimb,sampleSpectator} from '../race-crowd.js';
import {spectatorProfile,randomSource} from '../race-motion.js';
import {disposeTree} from '../studio-geometry.js';

globalThis.document={createElement:()=>createCanvas(512,512)};
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const h=createHorse({number:'17'}),j=createJockey({});h.group.add(j.rider);j.rider.position.copy(h.seat);
const profile={phase:0,stride:.6},stride=1.65+.6*.45;
let flightFrames=0,bodyMin=Infinity,bodyMax=-Infinity,maxGroundDrift=0;
const starts=[],previous=[false,false,false,false],planted=new Map();
for(let f=0;f<1000;f++){
 const d=(1+f/1000)*stride,pose=animateGallop(h,{distance:d,drive:1,profile});
 bodyMin=Math.min(bodyMin,pose.bodyY);bodyMax=Math.max(bodyMax,pose.bodyY);
 if(!pose.contacts.length)flightFrames++;
 for(let i=0;i<4;i++){
  const target=pose.targets[i];assert(Object.values(target).every(v=>typeof v==='boolean'||Number.isFinite(v)));
  if(target.contact&&!previous[i])starts.push(i);
  if(target.contact){const x=d+(2.13-pose.noseOffset)+target.x;if(planted.has(i))maxGroundDrift=Math.max(maxGroundDrift,Math.abs(x-planted.get(i)));else planted.set(i,x);}else planted.delete(i);
  previous[i]=target.contact;
 }
 assert(pose.targets.some(t=>t.contact)||pose.suspension>=0);
 j.rider.userData.locomotion(1,pose.phase,pose.riderLift);j.rider.userData.pose('salute',0,false,0);
 for(const b of [...h.skeleton.bones,...j.skeleton.bones])assert([...b.position.toArray(),...b.quaternion.toArray()].every(Number.isFinite));
}
assert.deepEqual(starts,[0,1,2,3],'four distinct supports, hind pair then fore pair');
assert(flightFrames>120&&flightFrames<400,'a bounded gathered suspension between strides');
assert(bodyMax-bodyMin>.035,'body follows support and suspension');
assert(maxGroundDrift<1e-9,'a planted hoof does not slide across the ground');
const seamA=animateGallop(h,{distance:stride*(2-.000001),profile}),seamB=animateGallop(h,{distance:stride*(2+.000001),profile});
assert(Math.abs(seamA.bodyY-seamB.bodyY)<.00001&&Math.abs(seamA.pitch-seamB.pitch)<.00001,'suspension remains continuous across the stride seam');
function snapshot(d,reduced=false){const p=animateGallop(h,{distance:d,drive:1,profile,reduced});return {pose:p,bones:h.legs.flatMap(l=>[l.hip.rotation.z,l.shin.rotation.z,l.hoof.rotation.z])};}
for(const reduced of [false,true]){
 const expected=snapshot(9.5,reduced);
 for(const fps of [15,30,60,120]){
  for(let frame=0;frame<=fps;frame++)snapshot(8.5+frame/fps,reduced);
  assert.deepEqual(snapshot(9.5,reduced),expected,'same actual pose independent of sampling rate');
 }
 for(let i=0;i<42;i++)assert.deepEqual(dustSample(h,9.5,profile,i),dustSample(h,9.5,profile,i));
}
const rng=randomSource(328794),people=Array.from({length:100},(_,i)=>spectatorProfile(rng,i));
let maxArmError=0,maxLegError=0,maxStep=0;
for(const reduced of [false,true])for(const p of people){
 let before;
 for(let frame=0;frame<900;frame++){
  const time=frame/60,pose=sampleSpectator(p,time,.25+.7*frame/900,reduced,frame<450?10:24);
  const vector=[pose.rise,pose.sway,...pose.hands.flatMap(x=>[...x.elbow,...x.hand])];assert(vector.every(Number.isFinite));
  if(before)maxStep=Math.max(maxStep,...vector.map((v,i)=>Math.abs(v-before[i])));before=vector;
  for(const [i,sign]of [-1,1].entries()){
   const start=[sign*.18*p.width,.59*p.height,0],hand=pose.hands[i].hand.map((v,k)=>v*(k===1?p.height:1)),hint=pose.hands[i].elbow.map((v,k)=>v*(k===1?p.height:1));
   const arm=fitLimb(start,hand,hint,.29*p.height,.27*p.height);
   maxArmError=Math.max(maxArmError,Math.abs(distance(start,arm.joint)-.29*p.height),Math.abs(distance(arm.joint,arm.end)-.27*p.height));
   const hip=[0,.04+pose.rise,0],ankle=[0,-.49,.38],leg=fitLimb(hip,ankle,[0,-.01+pose.rise*.5,.3],.36*p.height+.03,.46*p.height+.03);
   maxLegError=Math.max(maxLegError,distance(leg.end,ankle));
  }
 }
}
assert(maxArmError<1e-9,'fixed arm segment lengths throughout every gesture');
assert(maxLegError<1e-9,'feet stay at the authored floor position');
assert(maxStep<.06,'interpolation and rate changes do not introduce a gesture jump');
for(const target of [[0,0,0],[8,8,8],[0,-.001,0]]){
 const v=fitLimb([0,0,0],target,[0,0,1],.29,.27);
 assert(Math.abs(distance([0,0,0],v.joint)-.29)<1e-9);assert(Math.abs(distance(v.joint,v.end)-.27)<1e-9);
}
disposeTree(h.group);
console.log(JSON.stringify({pass:true,suspensionFrames:flightFrames,bodyTravel:bodyMax-bodyMin,maxGroundDrift,maxArmError,maxLegError,maxInterpolatedStep:maxStep,fpsSamples:[15,30,60,120],spectatorProfiles:people.length}));
console.log('PASS actual skeletal animation + support order, planted-foot stability, replay, reduced motion, fixed crowd limbs/feet and sampled-pose continuity. No real GPU or device FPS assertion.');
