import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import * as T from '../vendor/three.module.min.js';
import {makeAvatar} from '../arena-avatar.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
const avatar=makeAvatar({key:'gait',appearance:{hair:'bald'}},0),left=avatar.limbs.find(b=>b.name==='lAnkle'),right=avatar.limbs.find(b=>b.name==='rAnkle');
let checks=0,maximumSlip=0;
for(const speed of [1,2,4,6.8])for(const stride of [1.2,1.8,2.35]){
 const running=Math.max(0,Math.min(1,(speed-1.4)/2.2)),stance=.62-.22*running,previous=new Map();
 for(let t=0;t<1.2;t+=.003){
  const cycle=t*speed/stride,p={pos:[speed*t,0],look:[speed*t+10,0],heading:Math.PI/2,velocity:[speed,0],travel:speed*t,stepCycle:cycle,strideLength:stride,gesture:'run',phase:0,personality:0};avatar.update(p,t,.003);avatar.root.updateMatrixWorld(true);
  for(const [key,bone,offset]of [['l',left,0],['r',right,.5]]){const phase=(cycle+offset)%1,now=bone.getWorldPosition(new T.Vector3()),old=previous.get(key);if(old&&phase>.04&&phase<stance-.04&&phase>old.phase){const slip=Math.hypot(now.x-old.pos.x,now.z-old.pos.z);maximumSlip=Math.max(maximumSlip,slip);assert(slip<1e-5,'a planted ankle stays on the ground while the root moves');assert(Math.abs(now.y-old.pos.y)<1e-5);checks++;}previous.set(key,{pos:now,phase});}
 }
}
avatar.dispose();console.log(`PASS ${checks} planted-foot comparisons at 1–6.8 m/s with 3 stride lengths; maximum horizontal slip ${maximumSlip.toExponential(2)} m per sample. Bone-space test, not a visual FPS measurement.`);
