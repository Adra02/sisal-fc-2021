import assert from 'node:assert/strict';import {createCanvas} from '@napi-rs/canvas';import * as T from '../vendor/three.module.min.js';
import {makeAvatar} from '../arena-avatar.js';import {sampleArena} from '../arena-simulation.js';import {SCENES} from '../arena-scenes.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
const snapshot={players:Array.from({length:6},(_,i)=>({key:'p'+i,name:'P'+i,appearance:{hair:'bald'}}))},scene=SCENES.find(s=>s.id==='oneTwo'),state=sampleArena(snapshot,11,scene),p=state.actors.find(a=>a.gesture==='kick');assert(p);assert.equal(p.actionTime,11);
const local=makeAvatar(p,0),absolute=makeAvatar(p,0);local.update(p,11,.016);absolute.update(p,1792811711,.016);local.root.updateMatrixWorld(true);absolute.root.updateMatrixWorld(true);
const a=local.limbs.find(b=>b.name==='rAnkle').getWorldPosition(new T.Vector3()),b=absolute.limbs.find(b=>b.name==='rAnkle').getWorldPosition(new T.Vector3());
assert(a.distanceTo(b)<1e-6,'foot contact must use action time, never the Unix clock; drift='+a.distanceTo(b));
local.root.worldToLocal(a);assert(a.x>.25,'the kicking ankle really extends at impact');local.dispose();absolute.dispose();
console.log('PASS actual ankle at impact: identical with local time and production Unix time; real foot extension, geometry only.');
