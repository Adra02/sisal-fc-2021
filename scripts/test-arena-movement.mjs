import assert from 'node:assert/strict';
import {movePlayers,DT,MIN_DISTANCE} from '../arena-motion.js';
import {createWorld,worldContext,stepWorld} from '../arena-world.js';
import {planWorld} from '../arena-world-play.js';
const person=(key,x,z)=>({key,x,z,vx:0,vz:0,heading:0,travel:0,cycle:0});
const results=[];
for(const n of [2,4,6]){
 const players=Array.from({length:n},(_,i)=>person('p'+i,Math.sin(i/n*Math.PI*2)*2,Math.cos(i/n*Math.PI*2)*2));let minimum=99;
 for(let tick=0;tick<30*24;tick++){
  movePlayers(players,players.map(()=>[0,0]),DT);
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)minimum=Math.min(minimum,Math.hypot(players[i].x-players[j].x,players[i].z-players[j].z));
 }
 const maximumSpeed=Math.max(...players.map(p=>Math.hypot(p.vx,p.vz)));assert(minimum>MIN_DISTANCE-.02,'shared destination retains body space');assert(maximumSpeed<.05,'players settle at an occupied destination instead of orbiting: '+n+' '+maximumSpeed);results.push({case:'shared destination',players:n,minimum,maximumSpeed});
}
for(const count of [2,6]){
 const targets=Array.from({length:count},(_,i)=>[(i-(count-1)/2)*.80,0]),players=targets.map((p,i)=>person('wall'+i,targets[count-i-1][0],(i%2?-.2:.2)));
 for(let tick=0;tick<35*24;tick++)movePlayers(players,targets,DT);
 const maxError=Math.max(...players.map((p,i)=>Math.hypot(p.x-targets[i][0],p.z-targets[i][1])));assert(maxError<.08,'a wall arrives at its assigned places, including swapped approaches');results.push({case:'stationary wall',players:count,maxError});
}
const players=Array.from({length:6},(_,i)=>({key:'p'+i,name:'P'+i,appearance:{},games:2}));
{
 const w=createWorld(players),c=worldContext({players});w.nextMatchAt=999;w.groups=[{id:1,index:0,members:['p0','p1','p2'],ball:'ball-0',kind:'passes',spot:[-8,-8],turn:0,sign:-1,holder:'p0',carrier:'p0',receiver:'p1',chaser:'p2',stage:'play',since:0,lastDecision:999,rounds:0,targetRounds:999}];Object.assign(w.balls[0],{mode:'free',x:-8,z:-8,y:.14,group:1});
 planWorld(w,c);const target=[...w.players.find(p=>p.key==='p1').target];w.groups[0].turn=19;planWorld(w,c);assert.deepEqual(w.players.find(p=>p.key==='p1').target,target,'a completed pass does not rotate the entire exercise around its centre');
}
{
 const w=createWorld(players),c=worldContext({players});w.mode='gather';w.players.forEach((p,i)=>p.team=p.bot?0:i<3?0:1);w.groups=[{id:1,index:0,members:['p1','p2'],ball:'ball-1',kind:'passes',spot:[-8,-8],turn:0,sign:-1,holder:'p1',carrier:'p1',stage:'return',since:0}];Object.assign(w.balls[1],{mode:'hand',owner:'p1',group:1});w.match={teams:[['p0','p1','p2'],['p3','p4','p5']],phase:'gather',ball:'ball-0',holder:'p0',carrier:'p0'};
 planWorld(w,c);const returning=w.players.find(p=>p.key==='p1');assert(returning.target[0]>18&&returning.target[1]>15,'returning a ball has priority over the pending friendly formation');
}
{
 const roster=players.slice(0,2),w=createWorld(roster),c=worldContext({players:roster});w.mode='match';w.groups=[];w.match={teams:[['p0'],['p1']],ball:'ball-0',holder:'p0',carrier:'p0',phase:'play',lastDecision:999,lastChange:0,passes:0,nextFoul:999,score:[0,0],targetGoals:5};w.players.find(p=>p.key==='p0').team=0;w.players.find(p=>p.key==='p1').team=1;Object.assign(w.players[0],{x:3,z:11.9,heading:Math.PI});Object.assign(w.players[1],{x:6,z:13});Object.assign(w.balls[0],{mode:'free',x:3.05,z:12.7,y:.14,owner:'p0',group:'match'});
 let touches=0;for(let tick=0;tick<8*24;tick++){stepWorld(w,c);touches+=w.newEvents.filter(e=>e.type==='touch').length;}assert(touches>0,'a dribbler recovers a ball behind them instead of remaining paired with a stationary defender');
}
console.log(JSON.stringify({test:'Arena movement regressions',results,also:['stable exercise anchors','ball-return job priority','dribbler recovers a stopped ball'],note:'actual fixed-step movement and planning; no rendered GPU or production writes'}));
