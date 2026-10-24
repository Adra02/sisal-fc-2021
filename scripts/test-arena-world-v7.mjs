import assert from 'node:assert/strict';
import {sampleArena,episodeAt,sceneAt} from '../arena-simulation.js';
import {dialogueFor} from '../arena-dialogue.js';
import {SCENES} from '../arena-scenes.js';
const snapshot={players:Array.from({length:14},(_,i)=>({key:'p'+i,name:'Giocatore '+i,appearance:{helmetVisible:'off'}})),keeper:null};
const unix=1792811711,serial=sceneAt(unix).serial,start=Math.floor(serial/36)*36;
const durations=new Set(),variants=new Set();let boundaries=0,samples=0,maxSpeed=0,movingContacts=0;
for(let i=start;i<start+72;i++){
 const slot=episodeAt(i);durations.add(slot.duration.toFixed(2));assert(slot.duration>40&&slot.duration<60);assert.equal(sceneAt(slot.start+.01).serial,i);assert.equal(sceneAt(slot.start+slot.duration-.001).serial,i);
 for(const offset of [0,.1,3,9,17,26,35,slot.duration-.001]){
  if(offset>=slot.duration)continue;const t=slot.start+offset,a=sampleArena(snapshot,t),b=sampleArena(structuredClone(snapshot),t);assert.deepEqual(a,b,'a late-joining independent device sees the same state');assert.equal(a.actors.length,15);assert(a.actors.every(p=>Number.isFinite(p.actionTime)));
  for(const p of a.actors){assert([...p.pos,...p.velocity,p.heading,p.stepCycle].every(Number.isFinite));maxSpeed=Math.max(maxSpeed,Math.hypot(...p.velocity));if(p.gesture==='kick'&&p.contact!=null){assert(Math.abs(p.actionTime-p.contact)<.7);movingContacts++;}}
  variants.add(JSON.stringify(a.variation));samples++;
 }
 const end=slot.start+slot.duration,a=sampleArena(snapshot,end-.00001),b=sampleArena(snapshot,end+.00001);
 for(const p of a.actors){const next=b.actors.find(x=>x.key===p.key);assert(Math.hypot(p.pos[0]-next.pos[0],p.pos[1]-next.pos[1])<.0001,'actor position continues across episode/period boundaries: '+p.key);}
 boundaries++;
}
assert(durations.size>40,'actual duration changes');assert(variants.size>25,'different staging, not only new titles');assert(maxSpeed<7.2,'speed remains plausible in real seconds');assert(movingContacts>0);
const appearances=new Set();for(let i=0;i<67;i++)appearances.add(sceneAt(episodeAt(i).start+.001).scene.id);assert.equal(appearances.size,67,'all catalogue episodes before shuffling next deck');
let lines=0;const texts=new Set();
for(const scene of SCENES)for(let i=0;i<16;i++){
 const ds=dialogueFor(scene,i+100,['a','b','c'],{eventAt:scene.event==='sky'?27:18});assert(ds.length>=3);assert(ds.some(d=>/^(Dio|Madonna|Gesù) /u.test(d.text)),'the requested fictional blasphemy is really present for every event');
 for(let j=0;j<ds.length;j++){const d=ds[j];assert(d.at<d.until&&d.until<50);if(j)assert(d.at>=ds[j-1].until,'no overlapping dialogue');assert(d.text.length<240,'short readable bubbles');texts.add(d.text);lines++;}
 assert.deepEqual(ds,dialogueFor(scene,i+100,['a','b','c'],{eventAt:scene.event==='sky'?27:18}));
}
assert(texts.size>950,'varied complete phrases across the deterministic catalogue');
const again=sampleArena(snapshot,unix);for(const t of [unix+20000,unix-20000,unix+5000])sampleArena(snapshot,t);assert.deepEqual(sampleArena(snapshot,unix),again,'cache eviction and seeking never change the shared result');
console.log(`PASS real-second shared world: ${samples} samples / ${boundaries} continuous episode boundaries (including periods), independent late joiners, ${durations.size} durations / ${variants.size} stage variants; peak ${maxSpeed.toFixed(2)} m/s. ${lines} finite, non-overlapping dialogue lines / ${texts.size} distinct complete phrases; no AI/network calls.`);
