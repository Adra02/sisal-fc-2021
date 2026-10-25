import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import * as T from '../vendor/three.module.min.js';
import {makeAvatar} from '../arena-avatar.js';
import {createWorld,worldContext,stepWorld,captureWorld} from '../arena-world.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
const players=Array.from({length:7},(_,i)=>({key:'p'+i,name:'P'+i,games:i,appearance:{helmetVisible:'off'}})),w=createWorld(players),context=worldContext({players}),a=makeAvatar(players[0],0),wrists=a.limbs.filter(b=>['lWrist','rWrist'].includes(b.name));
let pickupChecks=0,placeChecks=0,worst=0,maximumGroundDrift=0;const point=new T.Vector3();
for(let tick=0;tick<400*24;tick++){
 stepWorld(w,context);if(tick%3)continue;
 const f=captureWorld(w,context);
 for(const ball of w.balls){const p=w.players.find(p=>p.key===ball.owner),state=f.actors.find(p=>p.key===ball.owner);if(!p||!state||!ball.motion)continue;const age=w.tick/24-ball.motion.at;
  if(ball.motion.type==='pickup'&&age<.45){maximumGroundDrift=Math.max(maximumGroundDrift,Math.hypot(ball.x-ball.motion.from[0],ball.y-ball.motion.from[1],ball.z-ball.motion.from[2]));continue;}
  a.update(state,f.t,.125);a.root.updateMatrixWorld(true);a.model.skeleton.update();const distance=Math.min(...wrists.map(b=>b.getWorldPosition(point).distanceTo(new T.Vector3(ball.x,ball.y,ball.z))));worst=Math.max(worst,distance);assert(distance<.21,'hand reaches the ball surface in '+ball.motion.type+': '+distance);if(ball.motion.type==='pickup')pickupChecks++;else placeChecks++;
 }
}
assert(pickupChecks>100&&placeChecks>100);assert.equal(maximumGroundDrift,0,'ball waits on the grass while player bends to collect it');a.dispose();console.log(JSON.stringify({test:'continuous world → actual Three wrist joints',pickupChecks,placeChecks,worstHandCenterDistance:worst,maximumGroundDrift,note:'bone geometry and simulation; not rendered GPU footage'}));
