import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {makeAvatar} from '../arena-avatar.js';
import {SCENES} from '../arena-scenes.js';
import {sampleArena,SLOT_SECONDS} from '../arena-simulation.js';
import {FACE_OPTIONS} from '../jockey-options.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
const fixture={players:Array.from({length:6},(_,i)=>({key:'p'+i,name:'P'+i,appearance:{hair:'braids',skin:i%2?'ebony':'sand'}}))};
const avatar=makeAvatar(fixture.players[0],0);
let frames=0;
for(const scene of SCENES){let last=null;for(let t=0;t<SLOT_SECONDS;t+=.25){const a=sampleArena(fixture,900+t,scene).actors[0];avatar.update(a,t,.25);avatar.root.updateMatrixWorld(true);
avatar.root.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh){assert(o.geometry.attributes.position.array.every(Number.isFinite));}});
assert(avatar.head.children.length>0,'head look joint retains meshes');frames++;}}
avatar.dispose();
let variants=0;for(const [field,options] of Object.entries(FACE_OPTIONS))for(const val of Object.keys(options)){
 const a=makeAvatar({appearance:{[field]:val}},0);a.root.traverse(o=>{if(o.isMesh)assert(o.geometry.attributes.position.array.every(Number.isFinite))});a.dispose();variants++;
}
console.log('PASS '+frames+' articulated poses, head joint intact, finite matrices and '+variants+' physical customization variants. Real Three geometry, no GPU visual assertion.');
