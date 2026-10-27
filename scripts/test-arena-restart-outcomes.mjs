import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const base=process.argv[2],root=base?path.resolve(base):path.resolve(import.meta.dirname,'..');
const {requestRestart}=await import(pathToFileURL(path.join(root,'arena-match.js')));
const {createWorld,worldContext,stepWorld}=await import(pathToFileURL(path.join(root,'arena-world.js')));
export function restartFixture({size=6,side=1,z=0,team=0,seed=12,press=false}={}){
 const players=Array.from({length:size},(_,i)=>({key:'p'+i,name:'P'+i,games:5,appearance:{}})),w=createWorld(players,seed),half=size/2;
 w.mode='match';w.groups=[];w.equipment.cones.forEach(c=>{c.mode='stored';c.x=19;c.z=19;});
 w.players.forEach((p,i)=>{p.team=p.bot?(p.key==='__keeper_bot'?0:1):i<half?0:1;p.keeperRole=p.bot;
  p.x=p.bot?0:p.team===team?side*(12-(i%half)*2.5):press?side*(8-(i%half)*2):-side*(6+(i%half)*2);
  p.z=p.bot?(p.team===0?24.8:-24.8):Math.max(-22,Math.min(22,z+(i%half-half/2)*3+(p.team===team?0:7)));});
 w.match={teams:[players.slice(0,half).map(p=>p.key),players.slice(half).map(p=>p.key)],keepers:['__keeper_bot','__keeper_away_bot'],score:[0,0],targetGoals:4,ball:'ball-0',carrier:'p0',holder:'p0',phase:'play',since:0,lastDecision:999,lastChange:-10,passes:20,restarts:0};
 const b=w.balls[0];Object.assign(b,{mode:'free',x:side*17.3,z,y:.11,vx:0,vy:0,vz:0,owner:null,flight:null,group:'match'});
 requestRestart(w,'throwIn',team,[side*17,z]);return {w,b,context:worldContext({players})};
}
const rows=[],failures=[];
for(const press of [false,true]){
 let attempts=0,released=0,ownReceipt=0,targetReceipt=0,lost=0,continued=0;
 for(const size of [2,6,14])for(const side of [-1,1])for(const z of [-22,-10,0,10,22])for(const team of [0,1]){
  const {w,b,context}=restartFixture({size,side,z,team,seed:72+attempts,press});attempts++;let kick=null,touch=null,stepsAfter=0;
  for(let i=0;i<24*65;i++){
   stepWorld(w,context);
   if(!kick){kick=w.newEvents.find(e=>e.type==='throwIn');if(kick){released++;assert(b.y>1.7,'actual overhead release');}}
   else if(!touch){
    touch=w.newEvents.find(e=>e.ball===b.id&&['receive','interception','badControl'].includes(e.type));
    if(touch){const p=w.players.find(p=>p.key===touch.actor);if(p?.team===team){ownReceipt++;if(touch.actor===kick.target)targetReceipt++;}else{lost++;failures.push({press,size,side,z,team,cause:'interception',by:p?.key,at:touch.at,aim:kick.target});}}
    else if(w.newEvents.some(e=>e.type==='restart'&&e.at>kick.at+.1)){lost++;failures.push({press,size,side,z,team,cause:'outOrMiss',ball:[b.x,b.y,b.z],aim:kick.target,receiver:w.players.find(p=>p.key===kick.target)});break;}
    else if(w.tick/24>kick.at+6){lost++;failures.push({press,size,side,z,team,cause:'outOrMiss',ball:[b.x,b.y,b.z],aim:kick.target,receiver:w.players.find(p=>p.key===kick.target)});break;}
   }else if(++stepsAfter>=24){if(w.match?.phase==='play')continued++;break;}
  }
 }
 const row={press,attempts,released,ownReceipt,targetReceipt,lost,continued};rows.push(row);
 if(!base&&!process.env.ARENA_REPORT_ONLY){assert.equal(released,attempts,'all controlled throw-ins reach release');assert(ownReceipt/attempts>=(press?.70:.85),'controlled reception threshold, allowing real defensive interceptions');assert(!failures.some(f=>f.press===press&&f.cause==='outOrMiss'),'no throw misses its playable reception corridor');assert(continued/attempts>=.80,'the action continues rather than hanging at the throw');}
}
console.log(JSON.stringify({test:base?'baseline restart outcomes':'updated restart outcomes',rows,failures:process.env.ARENA_REPORT_ONLY?failures:undefined,note:'actual fixed-step engine; synthetic positions, both teams/sides, no guarantee for every live situation'}));
