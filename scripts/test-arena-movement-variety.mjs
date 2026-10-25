import assert from 'node:assert/strict';
import {createWorld,worldContext,stepWorld} from '../arena-world.js';
const cases=[];
for(const n of [4,6,9,12,16])for(const seed of [17,6001]){
 const players=Array.from({length:n},(_,i)=>({key:'member-'+seed+'-'+i,name:'Member '+i,games:i<2?0:10,appearance:{}})),w=createWorld(players,seed),c=worldContext({players}),events={};let last=0,maxGap=0;
 for(let tick=0;tick<600*24;tick++){
  stepWorld(w,c);for(const e of w.newEvents){events[e.type]=(events[e.type]||0)+1;last=tick;}
  maxGap=Math.max(maxGap,(tick-last)/24);assert(w.players.every(p=>[p.x,p.z,p.vx,p.vz].every(Number.isFinite)));
 }
 assert(maxGap<110,'activity must not stall with different names/teams/decisions: '+n+'/'+seed+' '+maxGap);assert(events.kickoff,'friendly begins for roster '+n+'/'+seed);assert((events.pass||0)+(events.shot||0)>5,'actual play, not moving bodies only');cases.push({players:n,seed,maxGap,passes:events.pass||0,shots:events.shot||0,kickoffs:events.kickoff||0});
}
console.log(JSON.stringify({test:'different Arena rosters and simulation seeds',fixedSteps:144000,cases,note:'simulated activity and state invariants, not production footage'}));
