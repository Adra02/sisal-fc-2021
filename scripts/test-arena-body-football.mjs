import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import * as T from '../vendor/three.module.min.js';
import {makeAvatar} from '../arena-avatar.js';
import {movePlayers} from '../arena-motion.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
const avatar=makeAvatar({key:'football-body',appearance:{hair:'bald'}},0);
const state={pos:[0,0],look:[0,8],heading:0,velocity:[0,0],gesture:'idle',phase:0,stepCycle:.2,personality:0,preciseMotion:true,actionTime:1};
const joint=(name)=>{avatar.root.updateMatrixWorld(true);return avatar.limbs.find(b=>b.name===name).getWorldPosition(new T.Vector3());};
avatar.update(state,1,.016);const idleHand=joint('rWrist'),idleFoot=joint('rAnkle');
avatar.update({...state,signal:{kind:'call',at:0,until:2}},1,.016);const callingHand=joint('rWrist'),callingFoot=joint('rAnkle');assert(callingHand.distanceTo(idleHand)>.06,'the free arm calls for the pass');assert(callingFoot.distanceTo(idleFoot)<.001,'a call does not replace the planted leg pose');
avatar.update({...state,shielding:true},1,.016);assert(joint('rWrist').distanceTo(idleHand)>.05,'ball protection changes the arms');
const pivotFeet=[];for(let i=0;i<240;i++){const t=i/60;avatar.update({...state,pivot:1,heading:t*.8,stepCycle:t*.35,actionTime:t},t,1/60);const foot=joint('lAnkle');assert(Number.isFinite(foot.x+foot.y+foot.z));pivotFeet.push(foot.y);}
assert(Math.max(...pivotFeet)-Math.min(...pivotFeet)>.005,'stationary pivots have a small stepping phase');
const p={key:'stop',x:0,z:0,vx:0,vz:0,heading:0,cycle:0,travel:0,maxSpeed:5.5};for(let i=0;i<800;i++)movePlayers([p],[[0,6]]);assert(Math.hypot(p.x,p.z-6)<.04);assert(Math.hypot(p.vx,p.vz)<.06,'settled feet do not oscillate around the target');
avatar.dispose();console.log(JSON.stringify({test:'football body geometry',callingWristTravel:callingHand.distanceTo(idleHand),callingAnkleTravel:callingFoot.distanceTo(idleFoot),pivotFootHeightRange:Math.max(...pivotFeet)-Math.min(...pivotFeet),settledPosition:[p.x,p.z],note:'actual Three skeleton and motor, no GPU rendering or phone FPS claim'}));
