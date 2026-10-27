import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createWorld,worldContext,stepWorld,advanceWorld,captureWorld,prepareWorldSnapshot,reconcileWorld,exportWorld} from '../arena-world.js';
import {sampleContinuous,prewarmContinuous} from '../arena-live-cache.js';
import {friendlyLineup} from '../arena-teams.js';
const roster=n=>Array.from({length:n},(_,i)=>({key:'p'+i,name:'Giocatore '+i,games:i<2?0:20,appearance:{}}));
const metrics={cases:[],contactChecks:0,frames:0};
for(const n of [1,2,3,7,14,24]){
 const s={players:roster(n),keeper:null},w=createWorld(s.players),c=worldContext(s),counts={},positions=new Map();let lastEvent=0,lastEventTime=0,minimum=100,maxGap=0,maxBallStep=0,ended=0;
 const seconds=n===14?3600:900,begin=performance.now();
 for(let tick=0;tick<seconds*24;tick++){
  const old=w.balls.map(b=>[b.x,b.y,b.z]);stepWorld(w,c);metrics.frames++;
  for(const e of w.newEvents){counts[e.type]=(counts[e.type]||0)+1;if(e.type==='matchEnd')ended++;}
  if(w.eventId!==lastEvent){maxGap=Math.max(maxGap,(w.tick-lastEventTime)/24);lastEventTime=w.tick;lastEvent=w.eventId;}
  for(const g of w.groups.filter(g=>g.stage!=='done'))assert(w.tick/24-g.since<120,'one activity stuck: '+n+' '+g.kind+' '+g.stage);
  assert(w.players.every(p=>[p.x,p.z,p.vx,p.vz,p.heading].every(Number.isFinite)));
  w.balls.forEach((b,i)=>{assert([b.x,b.y,b.z,b.vx,b.vy,b.vz].every(Number.isFinite));const d=Math.hypot(b.x-old[i][0],b.y-old[i][1],b.z-old[i][2]);maxBallStep=Math.max(maxBallStep,d);assert(d<2.1,'one stable ball cannot teleport '+b.id+' '+d);if(b.owner)assert(w.players.some(p=>p.key===b.owner));});
  if(tick%12===0)for(let i=0;i<w.players.length;i++)for(let j=i+1;j<w.players.length;j++){const a=w.players[i],b=w.players[j],d=Math.hypot(a.x-b.x,a.z-b.z);minimum=Math.min(minimum,d);assert(d>.64,'capsule penetration '+n+' '+a.key+' '+b.key+' '+d);metrics.contactChecks++;}
 }
 maxGap=Math.max(maxGap,(w.tick-lastEventTime)/24);assert(maxGap<110,'no global activity stall: '+n+' '+maxGap);assert(counts.collect&&counts.place,'real ball retrieval and placement');if(n>=2){assert(counts.kickoff,'a real friendly begins');if(n===14)assert(ended>0,'a full-roster friendly reaches its goal target');}assert(counts.pass||counts.shot||counts.juggle,'play actually happens');
 metrics.cases.push({players:n,simulatedSeconds:seconds,cpuMs:Math.round(performance.now()-begin),minimumCapsuleDistance:minimum,maxBallStep,maxEventGap:maxGap,counts});
 if(n===14){const cosmetic={players:s.players.map(p=>({...p,name:'Altro '+p.key,appearance:{hair:'bald',number:'99',skin:'ebony'}}))},a=createWorld(s.players),b=createWorld(cosmetic.players);advanceWorld(a,4000,c);advanceWorld(b,4000,worldContext(cosmetic));assert.deepEqual(a.players,b.players,'cosmetics do not drive physics');assert.deepEqual(a.balls,b.balls);assert.deepEqual(a.match,b.match);}
}
const s={players:roster(7),keeper:null},begin=performance.now(),first=prepareWorldSnapshot(s.players,null,100),next=prepareWorldSnapshot(s.players,null,101,first);assert.deepEqual(next.world.start,first.end,'half-hour handoff preserves every position, ball, dialogue and action');assert.equal(next.world.start.tick,43200);assert.equal(first.checkpoints.length,5);assert.deepEqual(first.world.start,createWorld(s.players));
const cloudStart=first.checkpoints[3],client={players:s.players,keeper:null,world:{version:11,startAt:cloudStart.at,start:cloudStart.state}},secondDevice=structuredClone(client);await prewarmContinuous(client,cloudStart.at/1000+41.35);await prewarmContinuous(secondDevice,cloudStart.at/1000+41.35);assert.deepEqual(sampleContinuous(client,cloudStart.at/1000+41.35),sampleContinuous(secondDevice,cloudStart.at/1000+41.35),'same server time and shared checkpoint give same frame on independent clients');
const boundary=101*1800;const f1=sampleContinuous(first,boundary),f2=sampleContinuous(next,boundary);for(const a of f1.actors){const b=f2.actors.find(b=>b.key===a.key);assert(Math.hypot(a.pos[0]-b.pos[0],a.pos[1]-b.pos[1])<.25,'no half-hour respawn');}
const restored=reconcileWorld(first.end,[...s.players.slice(1),{key:'new',name:'Nuovo'}]);for(const p of restored.players.filter(p=>p.key!=='new')){const original=first.end.players.find(q=>q.key===p.key);assert.deepEqual([p.x,p.z],[original.x,original.z]);}assert(restored.players.some(p=>p.key==='new'&&p.x>17));assert(!restored.players.some(p=>p.key==='p0'));assert(restored.balls.every(b=>!b.owner||restored.players.some(p=>p.key===b.owner)));
let signatures=new Set(),bench=[];for(let i=0;i<12;i++){const l=friendlyLineup(s,i);signatures.add(l.teams.map(t=>[...t].sort().join(',')).sort().join('|'));bench.push(l.benchKey);}assert(signatures.size>1);assert(bench.includes('p0')&&bench.includes('p1'));assert(bench.every(k=>['p0','p1'].includes(k)));
const payloadBytes=Buffer.byteLength(JSON.stringify(first));metrics.checkpoint={players:7,payloadBytes,cpuMs:Math.round(performance.now()-begin)};if(process.env.ARENA_METRICS_FILE)await fs.writeFile(process.env.ARENA_METRICS_FILE,JSON.stringify(metrics,null,2));console.log('PASS continuous worlds: '+metrics.frames+' fixed steps, '+metrics.contactChecks+' body distances, 1/2/3/7/14/24 members, real contacts/play/restarts, independent clients, checkpoint continuity, cosmetic invariance, roster reconciliation, fair bench and new teams. '+payloadBytes+' byte checkpoint (7 players). Simulated physics, not GPU/FPS.');
