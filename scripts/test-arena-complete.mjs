import assert from 'node:assert/strict';
import {createWorld,worldContext,stepWorld,captureWorld,prepareWorldSnapshot} from '../arena-world.js';
import {releaseBall,stepBalls} from '../arena-world-ball.js';
import {reactToBalls} from '../arena-world-play.js';
import {friendlyLineup} from '../arena-teams.js';
import {createArenaTimeline} from '../arena-timeline.js';
import {startDribbleSkill} from '../arena-techniques.js';
import {impactPCM} from '../arena-audio.js';
const roster=n=>Array.from({length:n},(_,i)=>({key:'p'+i,name:'P'+i,games:i<4?0:20,appearance:{}}));
let checks=0;
const run=target=>{const w=createWorld(roster(2),123),p=w.players[0],b=w.balls[0];p.x=p.z=0;p.personality=1;b.x=b.z=0;b.y=.11;b.vx=b.vy=b.vz=0;b.mode='free';releaseBall(w,p,b,target,'outsidePass');for(let i=0;i<12;i++){w.tick++;stepBalls(w);}return b;};
const north=run([0,.11,10]),east=run([10,.11,0]);assert(Math.abs(north.x+east.z)<.002);assert(Math.abs(north.z-east.x)<.002);assert(Math.abs(east.z)>.05,'a rotated pass has a real lateral curve too');checks+=3;
for(const n of [3,4,7,14,24]){
 const s={players:roster(n),keeper:'p0'},benches=new Set();let old=null;
 for(let i=0;i<24;i++){const x=friendlyLineup(s,i),keys=x.teams.flat();assert.equal(x.keepers.filter(k=>k==='p0').length,1);assert(!keys.includes('p0'));assert.notEqual(x.benchKey,'p0');assert.equal(x.teams[0].length,x.teams[1].length);assert.equal(new Set([...keys,...x.keepers.filter(k=>!k.startsWith('__')),...(x.benchKey?[x.benchKey]:[])]).size,n);if(x.benchKey)benches.add(x.benchKey);if(old&&x.canVary){const signatures=x.teams.map(t=>t.slice().sort().join('|'));assert(signatures.every(v=>!old.includes(v)));}old=x.teams.map(t=>t.slice().sort().join('|'));checks+=6;}
 if(n%2===0&&n>=4)assert(benches.size>=2,'eligible zero-appearance outfield players rotate');
}
for(const [height,kind]of [[.11,'trap'],[.65,'thigh'],[1.12,'chest']]){
 const w=createWorld(roster(2)),p=w.players[0],b=w.balls[0];w.tick=24;p.x=0;p.z=0;p.heading=0;w.players[1].x=5;w.players[1].z=5;b.x=0;b.z=.25;b.y=height;b.mode='free';b.vx=0;b.vy=0;b.vz=-8;b.flight={from:'p1',type:'pass',at:0};w.groups=[{id:1,ball:b.id,stage:'play',kind:'passes',sign:1,members:['p0','p1'],rounds:0,turn:0}];reactToBalls(w,worldContext({players:roster(2)}));assert.equal(p.action.kind,kind);assert.equal(b.owner,p.key);assert(Math.abs(b.vz)<2);checks+=3;
}
{
 const players=roster(3),w=createWorld(players);w.focusBall=w.balls[1].id;w.tick=24;w.players[0].action={kind:'bicycle',ball:w.balls[0].id,start:.5,end:2};w.players[1].action={kind:'scissor',ball:w.balls[1].id,start:.5,end:2};assert.equal(captureWorld(w,worldContext({players})).technique.key,'p1','the camera follows the technique on the focused ball');checks++;
}
{
 const w=createWorld(roster(2)),p=w.players[0],opponent=w.players[1],b=w.balls[0],kinds=[];p.x=p.z=0;p.vx=2;p.vz=0;opponent.x=1.7;opponent.z=.5;b.x=.2;b.z=.2;b.y=.11;b.owner=p.key;
 for(let attempt=0;attempt<900;attempt++){w.tick+=240;p.skill=null;if(startDribbleSkill(w,p,b,opponent))kinds.push(p.skill.kind);if(kinds.length>=30)break;}
 assert.equal(new Set(kinds).size,3);assert(kinds.some((v,i)=>i>=3&&v!==kinds[i%3]),'choices are not a repeating three-item cycle');checks+=2;
}
const frame=t=>({t,elapsed:t,actors:[{key:'p0',name:'P0',pos:[t,0],heading:0,stepCycle:t,phase:.2,gesture:'run',actionTime:t}],balls:[{id:'b',pos:[t,.11,0],spin:[0,0,0]}],events:[{id:7,at:5,type:'goal',actor:'p0',pos:[0,.3,-26]}],scene:{title:'Partitella'},sounds:[]});
const timeline=createArenaTimeline();for(let i=0;i<=240;i++)timeline.record(frame(i/24));assert(timeline.available);assert.equal(timeline.events.length,1,'event ids deduplicated');assert.equal(timeline.events[0].actorName,'P0','event identity survives later roster changes');assert(timeline.start(7));let result=timeline.tick(.1);assert(result.frame.t<=10&&result.frame.t>=1.5);assert.equal(result.frame.actors[0].key,'p0');timeline.stop();assert.equal(timeline.tick(.1),null);
for(let i=241;i<600;i++)timeline.record(frame(i/24));assert.equal(timeline.start(7),false,'an expired event cannot replay invented frames');assert.equal(timeline.events.length,1);checks+=7;
for(const type of ['pass','strike','header','cloth','grass']){const a=impactPCM(type,22050,12),b=impactPCM(type,22050,98);assert(a.every(Number.isFinite));assert(a.some((v,i)=>v!==b[i]),'distinct contact variants');assert(a.every(v=>Math.abs(v)<=.821));checks+=3;}
const keeperCases=[];
for(const n of [3,7,14]){
 const players=roster(n),s={players,keeper:'p0'},w=createWorld(players),c=worldContext(s),counts={};let matchSeen=false,keeperSeen=false,ended=0,minimum=10;
 for(let i=0;i<1200*24;i++){stepWorld(w,c);for(const e of w.newEvents){counts[e.type]=(counts[e.type]||0)+1;if(e.type==='matchEnd')ended++;}
  if(w.match){matchSeen=true;assert(w.match.keepers.includes('p0'));assert(w.players.find(p=>p.key==='p0').keeperRole);assert.equal(w.players.filter(p=>p.bot&&p.team!=null).length,1);const a=captureWorld(w,c).actors.find(p=>p.key==='p0');keeperSeen||=a.goalkeeper;}
  if(i%24===0){for(let a=0;a<w.players.length;a++)for(let b=a+1;b<w.players.length;b++)minimum=Math.min(minimum,Math.hypot(w.players[a].x-w.players[b].x,w.players[a].z-w.players[b].z));}
  assert(w.balls.every(b=>[b.x,b.y,b.z,b.vx,b.vy,b.vz].every(Number.isFinite)));
 }
 assert(matchSeen&&keeperSeen);assert(minimum>.64);assert(counts.pass||counts.shot);keeperCases.push({players:n,seconds:1200,minimum,ended,offside:counts.offside||0,shots:counts.shot||0,saves:counts.save||0});checks+=5;
}
const start=performance.now(),snap=prepareWorldSnapshot(roster(14),'p0',150),bytes=Buffer.byteLength(JSON.stringify(snap));assert(bytes<1500000);assert.equal(snap.checkpoints.length,5);assert(snap.checkpoints.every(x=>x.state.version===11));checks+=3;
console.log(JSON.stringify({test:'Arena completa',checks,curve:{north:[north.x,north.z],east:[east.x,east.z]},keeperCases,checkpoint:{players:14,cpuMs:Math.round(performance.now()-start),bytes},note:'Real deterministic engine, numerical audio and replay; no GPU/FPS or physical-phone claim.'}));
