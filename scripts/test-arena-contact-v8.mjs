import assert from 'node:assert/strict';import {createCanvas} from '@napi-rs/canvas';import * as T from '../vendor/three.module.min.js';
import {makeAvatar} from '../arena-avatar.js';import {sampleArena,episodeAt,inspectSessionClip} from '../arena-simulation.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
const snapshot={players:Array.from({length:8},(_,i)=>({key:'p'+i,name:'P'+i,games:i<2?0:10,appearance:{hair:'bald',beard:'none',helmetVisible:'off'}}))},avatars=new Map();let feet=0,hands=0,maxFoot=0,maxHand=0,minFoot=99,minHand=99;const failures=[];
function nearestMaterial(avatar,material,point){const body=avatar.model.body,g=body.geometry,ids=new Set();for(const group of g.groups)if(group.materialIndex===material)for(let i=group.start;i<group.start+group.count;i++)ids.add(g.index.array[i]);body.skeleton.update();let min=99;const v=new T.Vector3();for(const id of ids){body.getVertexPosition(id,v);v.applyMatrix4(body.matrixWorld);min=Math.min(min,v.distanceTo(point));}return min;}
for(const serial of [0,2,4,5,8]){
 const clip=inspectSessionClip(snapshot,serial),slot=episodeAt(serial);
 for(const e of clip.events.filter(e=>['pass','cross','shot','penalty','freeKick','volley','save'].includes(e.type)).slice(0,20)){
  const f=sampleArena(snapshot,slot.start+e.at),p=f.actors.find(p=>p.key===e.actor);if(!p)continue;let avatar=avatars.get(p.key);if(!avatar){avatar=makeAvatar(p,0);avatars.set(p.key,avatar);}avatar.update(p,1792811711+e.at,.016,p.velocity);avatar.root.updateMatrixWorld(true);
  const point=new T.Vector3(...e.pos),m=nearestMaterial(avatar,e.type==='save'?3:2,point);
  if(e.type==='save'){hands++;maxHand=Math.max(maxHand,m);minHand=Math.min(minHand,m);if(m>.24)failures.push({kind:'hand',serial,type:e.type,at:e.at,dist:m,gesture:p.gesture,height:e.pos[1]});}
  else{feet++;maxFoot=Math.max(maxFoot,m);minFoot=Math.min(minFoot,m);if(m>.20)failures.push({kind:'foot',serial,type:e.type,at:e.at,dist:m,gesture:p.gesture});}
 }
}
for(const a of avatars.values())a.dispose();console.log(JSON.stringify({feet,hands,minFoot,minHand,maxFoot,maxHand,failures},null,2));assert(feet>15&&hands>2);assert.equal(failures.length,0,'a real boot/glove vertex must come within ball radius + 10 cm at contact; GPU not used');
