import assert from 'node:assert/strict';
import {SCENES} from '../arena-scenes.js';
import {FIELD,PAVILION,PROPS,ARENA_BOUNDS,STATIONS} from '../arena-layout.js';
import {sampleArena,inspectArenaScene,SLOT_SECONDS,EPOCH_MS,sceneAt,episodeAt} from '../arena-simulation.js';
import {dialogueFor} from '../arena-dialogue.js';
const snapshot={players:Array.from({length:12},(_,i)=>({key:'p'+i,name:'Player '+i,appearance:{celebration:i%2?'bow':'arms'}})),keeper:null};
assert.equal(SCENES.length,67);assert.equal(new Set(SCENES.map(s=>s.id)).size,67);assert.equal(EPOCH_MS/1000%SLOT_SECONDS,0,'snapshots change at an episode boundary');
for(const p of PROPS)assert(p.minX>FIELD.halfWidth,'entire '+p.id+' is outside the touchline');
let samples=0,maxSpeed=0;
for(const scene of SCENES){
 const plan=inspectArenaScene(snapshot,scene);
 for(const a of plan.all){for(let i=1;i<a.track.length;i++)assert(a.track[i].at>a.track[i-1].at,scene.id+' strictly increasing actor track');}
 for(const ball of plan.balls){let end=-1;for(const segment of ball.events){assert(segment.start>=end-1e-8,scene.id+' one ball cannot make two passes at once');assert(segment.end>segment.start);assert([...segment.from,...segment.to].every(Number.isFinite));end=segment.end;}}
 for(let t=0;t<SLOT_SECONDS;t+=.125){
  const a=sampleArena(snapshot,t,scene),b=sampleArena(structuredClone(snapshot),t,scene);assert.deepEqual(a,b,'same state on two devices');
  for(const p of a.actors){assert([...p.pos,...p.velocity,p.heading,p.travel,p.stepCycle,p.strideLength].every(Number.isFinite));assert(p.pos[0]>=ARENA_BOUNDS.minX&&p.pos[0]<=ARENA_BOUNDS.maxX&&p.pos[1]>=ARENA_BOUNDS.minZ&&p.pos[1]<=ARENA_BOUNDS.maxZ);maxSpeed=Math.max(maxSpeed,Math.hypot(...p.velocity));}
  for(const ball of a.balls){assert(ball.pos.every(Number.isFinite));assert(ball.pos[1]>=0);}
  samples++;
 }
 const lines=dialogueFor(scene,plan.serial,plan.cast.map(p=>p.key),{eventAt:plan.eventAt,botKeeper:true});for(let i=0;i<lines.length;i++){assert(lines[i].at>=0&&lines[i].until<SLOT_SECONDS);if(i)assert(lines[i].at>=lines[i-1].until,'one bubble at a time');}
}
assert(maxSpeed<7.2,'controlled running speeds');
const tunnel=SCENES.find(s=>s.id==='tunnel'),tp=inspectArenaScene(snapshot,tunnel),b=tp.cast[1];assert.deepEqual(sampleArena(snapshot,20,tunnel).actors.find(p=>p.key===b.key).pos,STATIONS.rondo,'tunnel victim moves into the centre');
const roof=SCENES.find(s=>s.id==='roof'),r=sampleArena(snapshot,19,roof),spare=sampleArena(snapshot,31,roof);assert.deepEqual(r.balls[0].pos,[PAVILION.x,3.48,PAVILION.z]);assert(spare.balls[1].visible);assert.deepEqual(sampleArena(snapshot,44,roof).balls[0].pos,r.balls[0].pos,'roof ball stays there while a replacement is used');
assert.equal(sampleArena(snapshot,29,roof).props.spare,false,'spare remains in rack until collected');assert.equal(sampleArena(snapshot,44,roof).props.spare,true,'used spare cannot reappear in the rack');
for(const id of ['revenge','rematch']){const scene=SCENES.find(s=>s.id===id),p=inspectArenaScene(snapshot,scene);assert.equal(p.consequence.key,p.cast[0].key);assert.deepEqual(sampleArena(snapshot,30,scene).actors.find(a=>a.key===p.cast[0].key).pos,STATIONS.duel,'the return tunnel also changes the player in the middle');}
const sky=SCENES.find(s=>s.id==='silence');assert.notDeepEqual(sampleArena(snapshot,23,sky).balls[0].pos,r.balls[0].pos,'sky shot is a separate scene from the roof');assert.equal(inspectArenaScene(snapshot,sky).eventAt,27,'comment follows a silent reaction');
const recovery=SCENES.find(s=>s.id==='netRecovery');assert(sampleArena(snapshot,30,recovery).balls[0].pos[2]>FIELD.netZ+.5,'recovered ball actually leaves the net');
for(const id of ['volley','tennis'])for(let t=12;t<26;t+=.1)assert(sampleArena(snapshot,t,SCENES.find(s=>s.id===id)).balls[0].pos[1]>.5,'aerial exchanges stay above the ground');
const chain=inspectArenaScene(snapshot,SCENES.find(s=>s.id==='wholeTeam'));assert.equal(chain.cast.length,12);assert.equal(new Set(chain.beats.filter(b=>b.type==='pass').map(b=>b.actor)).size,12,'the whole normal roster takes part in the chain');
const tiny=inspectArenaScene(snapshot,SCENES.find(s=>s.id==='tinyShot'));assert(tiny.cast[0].track.some(p=>p.p[1]>-12),'tiny shot has an actual run-up, not stationary legs');
const collect=sampleArena(snapshot,15,SCENES.find(s=>s.id==='shirtCarry'));assert(collect.balls[0].pos[1]>.85,'shirt carry uses the real ball at hand level');
const callback=SCENES.find(s=>s.id==='callback'),cp=inspectArenaScene(snapshot,callback),lines=dialogueFor(callback,0,cp.cast.map(p=>p.key),{eventAt:cp.eventAt});assert(lines.find(l=>l.at===13.6).at<cp.beats.find(x=>x.type==='nutmeg').at);assert(lines.find(l=>l.at===28).at>cp.beats.find(x=>x.type==='nutmeg').at,'reply follows successful action');
for(const n of [0,1,2,3,6,32,128]){const s={players:snapshot.players.slice(0,n)};if(n>12)s.players=Array.from({length:n},(_,i)=>({key:'p'+i,name:'P'+i,appearance:{}}));for(const scene of SCENES){const f=sampleArena(s,17,scene);assert.equal(f.actors.length,n+1);assert(f.actors.every(p=>p.pos.every(Number.isFinite)));}}
const real=sampleArena({...snapshot,keeper:'p3'},18);assert.equal(real.actors.length,12);assert.equal(real.actors.at(-1).key,'p3');
const deck=new Set(Array.from({length:67},(_,i)=>sceneAt(episodeAt(i).start+.001).scene.id));assert.equal(deck.size,67);
for(let t=0;t<49.9;t+=.37){const state=sampleArena(snapshot,t);assert.deepEqual(state,sampleArena(snapshot,t),'direct seek does not depend on frame count');}
console.log(`PASS ${samples} scene samples across all 67 recovered episodes; independent devices, ball timelines, props outside pitch, tunnel consequence, roof/spare, callback timing, keeper and roster sizes; peak run ${maxSpeed.toFixed(2)} m/s.`);
