import assert from 'node:assert/strict';
import {sampleArena,sceneAt,SLOT_SECONDS,hash} from '../arena-simulation.js';
import {SCENES} from '../arena-scenes.js';
import {dialogueFor} from '../arena-dialogue.js';
const snap={players:Array.from({length:14},(_,i)=>({key:'p'+i,name:'Player '+i,appearance:{skin:i%2?'ebony':'sand',celebration:'bow'}})),keeper:null};
assert.equal(new Set(SCENES.map(s=>s.id)).size,SCENES.length);
let samples=0;
for(const scene of SCENES)for(let t=0;t<30;t+=.125){
 const a=sampleArena(snap,900+t,scene),b=sampleArena(structuredClone(snap),900+t,scene);
 assert.deepEqual(a,b,'cross-device deterministic state');
 for(const p of a.actors){assert(p.pos.every(Number.isFinite));assert(p.look.every(Number.isFinite));assert(Math.abs(p.pos[0])<30&&Math.abs(p.pos[1])<40)}
 for(const ball of a.balls){assert(ball.pos.every(Number.isFinite));assert(ball.pos[1]>=0)}
 samples++;
}
const seen=new Set();for(let i=0;i<SCENES.length;i++)seen.add(sceneAt(i*SLOT_SECONDS).scene.id);assert.equal(seen.size,SCENES.length,'every episode once in each shuffled deck');
for(const n of [0,1,2,3,6,32,128]){const data={players:Array.from({length:n},(_,i)=>({key:'p'+i,name:'P'+i,appearance:{}})),keeper:null};const state=sampleArena(data,120.3);assert.equal(state.actors.length,data.players.length+1);for(const p of state.actors)assert(Math.abs(p.pos[0])<=13&&p.pos[1]<=20&&p.pos[1]>=-20,'128 players remain on the pitch')}
const realKeeper=sampleArena({...snap,keeper:'p3'},120);assert.equal(realKeeper.actors.length,14);assert.equal(realKeeper.actors.at(-1).key,'p3');
for(const scene of SCENES){const serial=hash(scene.id);const lines=dialogueFor(scene,serial,['a','b','c']);assert.deepEqual(lines,dialogueFor(scene,serial,['a','b','c']));for(let i=1;i<lines.length;i++)assert(lines[i].at>=lines[i-1].until,'no simultaneous dialogue');}
assert.deepEqual(sampleArena(snap,1020),sampleArena(snap,1020),'join/resume direct sampling');
console.log('PASS '+samples+' deterministic choreography samples, '+SCENES.length+' episodes, finite bounded actors/balls, cast fallback, keeper replacement, non-overlapping dialogue and seek/resume.');

const roof=SCENES.find(s=>s.id==='roof');
const up=sampleArena(snap,911,roof),replacement=sampleArena(snap,922,roof);
assert.deepEqual(up.balls[0].pos,[9,3.42,2.5],'miss lands on the actual pavilion roof');
assert(replacement.balls[1].visible,'stray ball stays on the roof while a spare is returned');
assert.deepEqual(replacement.balls[1].pos,[9,3.42,2.5]);
