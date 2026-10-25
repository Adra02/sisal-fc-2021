import assert from 'node:assert/strict';
import {sampleArena,episodeAt,inspectSessionClip,prewarmArena} from '../arena-simulation.js';
import {friendlyLineup} from '../arena-teams.js';
import {motionAt,frameAt} from '../arena-clip.js';
import {DT} from '../arena-motion.js';
import {arenaRoster} from '../lib/arena.js';
const roster=n=>({players:Array.from({length:n},(_,i)=>({key:'p'+i,name:'P'+i,games:i<2?0:10,appearance:{helmetVisible:i%2?'on':'off',hair:'crop'}})),keeper:null});
const sig=a=>[...a].sort().join('|');let rotations=0;
for(const n of [2,3,4,5,7,14,15,31]){
 const s=roster(n),counts=new Map();let prior;
 for(let i=0;i<96;i++){
  const l=friendlyLineup(s,i),joined=l.teams.flat();assert.equal(l.teams[0].length,l.teams[1].length);assert.equal(new Set(joined).size,n-n%2);assert(!joined.includes(l.benchKey));
  if(n%2){assert(['p0','p1'].includes(l.benchKey),'known zero appearances have priority');counts.set(l.benchKey,(counts.get(l.benchKey)||0)+1);}
  if(prior&&l.canVary){for(const t of l.teams)for(const last of prior.teams)assert.notEqual(sig(t),sig(last),'neither previous side may return just with its colour reversed');}
  assert.deepEqual(l,friendlyLineup(structuredClone(s),i),'shared lineup independent of device');prior=l;rotations++;
 }
 if(n%2)assert.equal(counts.get('p0'),counts.get('p1'),'fair shuffled rotation among equal zero-appearance candidates');
}
const unknown=roster(7);unknown.players.forEach(p=>p.games=null);const allBench=new Set(Array.from({length:28},(_,i)=>friendlyLineup(unknown,i).benchKey));assert.equal(allBench.size,7,'unknown appearance values are not converted to zero; all eligible members rotate');
const normalized=arenaRoster({parsed:[{name:'Zero',gamesPlayed:'0'},{name:'Unknown'},{name:'Active',gamesPlayed:'8'}]},[]);assert.equal(normalized.find(p=>p.key==='zero').games,0);assert.equal(normalized.find(p=>p.key==='unknown').games,null);assert.equal(normalized.find(p=>p.key==='active').games,8);
const s=roster(15),original=structuredClone(s),types={},phrases=[],kinds=new Set();let frames=0,minGap=99,maxSpeed=0,boundaries=0,goals=0,crosses=0,matchFouls=0;
for(let serial=0;serial<36;serial++){
 const c=inspectSessionClip(s,serial),slot=episodeAt(serial);kinds.add(c.scene.kind);assert(c.duration>20&&c.duration<145);assert(c.events.every(e=>e.at>=0&&e.at<=c.duration));
 for(const e of c.events){types[e.type]=(types[e.type]||0)+1;if(e.type==='penalty'){assert(Math.abs(e.pos[0])<1e-5);assert(Math.abs(Math.abs(e.pos[2])-15)<1e-5,'ball is on the penalty mark');}
  if(e.type==='goal'){assert(Math.abs(e.pos[2])>26&&Math.abs(e.pos[0])<2.86&&e.pos[1]<2.26,'a goal follows a real crossing within the opening');goals++;}
  if(e.type==='cross'){const sample=sampleArena(s,slot.start+Math.min(c.duration,e.at+.60));assert(sample.balls[0].pos[1]>1.2,'cross is a real aerial flight');crosses++;}
 }
 for(let i=0;i<c.frames;i+=3){const off=i*c.players.length*9;for(let p=0;p<c.players.length;p++){const o=off+p*9;assert([...c.motion.subarray(o,o+9)].every(Number.isFinite));maxSpeed=Math.max(maxSpeed,Math.hypot(c.motion[o+2],c.motion[o+3]));for(let q=p+1;q<c.players.length;q++){const z=off+q*9,gap=Math.hypot(c.motion[o]-c.motion[z],c.motion[o+1]-c.motion[z+1]);minGap=Math.min(minGap,gap);assert(gap>.670,'bodies must not collapse onto the same point: '+serial+' / '+i+' / '+p+' / '+q+' / '+gap);}}frames++;}
 for(let t=.02;t<c.duration;t+=.71){const f=sampleArena(s,slot.start+t);for(let i=0;i<f.actors.length;i++)for(let j=i+1;j<f.actors.length;j++){const a=f.actors[i],b=f.actors[j];assert(Math.hypot(a.pos[0]-b.pos[0],a.pos[1]-b.pos[1])>.666,'interpolation keeps the body clearance');}assert(f.balls.every(b=>b.pos.every(Number.isFinite)));}
 if(serial<35){const f=sampleArena(s,slot.start+slot.duration-.00001),g=sampleArena(s,episodeAt(serial+1).start+.00001);for(const p of f.actors){const q=g.actors.find(x=>x.key===p.key);assert(Math.hypot(p.pos[0]-q.pos[0],p.pos[1]-q.pos[1])<.001,'no teleport at a drill/match boundary');}boundaries++;}
 for(let i=0;i<c.messages.length;i++){const m=c.messages[i];assert(m.text.length<260);assert(m.at<m.until&&m.until<c.duration);if(i)assert(m.at>=c.messages[i-1].until);assert(c.players.some(p=>p.key===m.speaker));phrases.push(m.text);}
 if(c.lineup){matchFouls+=c.events.filter(e=>e.type==='foul').length;assert.equal(c.lineup.teams.flat().length,14);assert(['p0','p1'].includes(c.lineup.benchKey));assert(c.events.some(e=>e.type==='kickoff'));const goal=c.events.find(e=>e.type==='goal');if(goal){const before=sampleArena(s,slot.start+goal.at-.07),after=sampleArena(s,slot.start+goal.at+.07);assert.equal(after.match.score.reduce((a,b)=>a+b,0),before.match.score.reduce((a,b)=>a+b,0)+1,'no premature goal/score reveal');}}
}
assert(matchFouls>0,'friendly fouls stop play and award a real restart');
for(const type of ['cross','penalty','freeKick','foul','save','pass','shot','goal'])assert(types[type]>0,'real production session contains '+type);
for(const k of ['cross','penalty','freeKick','foul','friendly'])assert(kinds.has(k));assert(maxSpeed<7,'plausible root speed, including collision correction');assert(new Set(phrases).size/phrases.length>.82,'full sentences vary, not only labels');assert.deepEqual(s,original,'no style/account/club-stat mutation');
const peer=structuredClone(s);for(const t of [episodeAt(5).start+48,episodeAt(35).start+63,episodeAt(2).start+16])assert.deepEqual(sampleArena(s,t),sampleArena(peer,t),'late joining, seek and independent cache have the same physics, score and speech');
for(const n of [1,2,3]){const small=roster(n);for(const serial of [0,2,5,8]){const c=inspectSessionClip(small,serial),f=sampleArena(small,episodeAt(serial).start+c.duration*.55);assert(f.actors.every(p=>p.pos.every(Number.isFinite)));assert(f.balls.every(b=>b.pos.every(Number.isFinite)));}if(n===1)assert(inspectSessionClip(small,8).events.some(e=>e.type==='freeKick'),'a single player practices a free kick rather than waiting for an impossible foul');}
const abort=new AbortController();abort.abort();await assert.rejects(prewarmArena(s,60,{signal:abort.signal}),/annullata/);
// World generation makes no HTTP requests. Authentication happens in the existing API boundary.
const oldFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('unexpected network request')};sampleArena(s,episodeAt(5).start+10);globalThis.fetch=oldFetch;
console.log(JSON.stringify({test:'production Arena 5',rotations,physicsFrames:frames,continuousBoundaries:boundaries,minimumBodyGap:minGap,maxRootSpeed:maxSpeed,events:types,goals,crosses,matchFouls,dialogueLines:phrases.length,distinctSentences:new Set(phrases).size,lateJoin:'identical',clubData:'unchanged',networkRequests:0}));
