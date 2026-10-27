import assert from 'node:assert/strict';
import {createWorld,worldContext,stepWorld} from '../arena-world.js';
import {requestRestart} from '../arena-match.js';
const players=Array.from({length:8},(_,i)=>({key:'p'+i,name:'P'+i,games:10,appearance:{}})),results=[];
for(const restart of ['corner','freeKick'])for(const team of [0,1])for(const side of [-1,1])for(const variant of [0,1,2]){
 const w=createWorld(players,328794+variant),direction=team===0?-1:1;
 w.mode='match';w.groups=[];w.equipment.cones.forEach(c=>c.mode='stored');w.players.forEach((p,i)=>{p.team=p.bot?(p.key==='__keeper_bot'?0:1):i<4?0:1;p.keeperRole=p.bot;p.x=p.bot?0:(i%4-1.5)*4;p.z=p.bot?(p.team===0?24.8:-24.8):p.team===team?direction*4:-direction*9;});
 w.match={teams:[players.slice(0,4).map(p=>p.key),players.slice(4).map(p=>p.key)],keepers:['__keeper_bot','__keeper_away_bot'],score:[0,0],targetGoals:4,ball:'ball-0',phase:'play',holder:'p0',lastChange:0,lastDecision:999,passes:0,restarts:variant};
 const b=w.balls[0],point=restart==='corner'?[side*16.55,direction*25.55]:[side*(variant===1?10:2),direction*[18,8,-10][variant]];
 Object.assign(b,{x:point[0],y:.11,z:point[1],vx:0,vy:0,vz:0,mode:'free',owner:null,flight:null,group:'match'});requestRestart(w,restart,team,point);
 const scheme=w.match.restartPlan?.scheme;let release=null,outcome=null;
 for(let i=0;i<24*100;i++){
  stepWorld(w,worldContext({players}));
  if(!release)release=w.newEvents.find(e=>e.ball===b.id&&['corner','freeKick','pass','cross'].includes(e.type)&&e.actor===w.match?.taker);
  else{outcome=w.newEvents.find(e=>e.ball===b.id&&e.at>release.at&&['receive','interception','save','goal','post','badControl','restart','cornerAwarded','disallowedGoal'].includes(e.type));if(outcome)break;if(w.tick/24>release.at+15)break;}
 }
 assert(release,`${restart} reaches the strike: ${team}/${side}/${variant}`);assert(outcome,`${restart} continues to an actual result: ${team}/${side}/${variant} ${scheme}`);
 results.push({restart,scheme,release:release.type,outcome:outcome.type,directCornerGoal:restart==='corner'&&outcome.type==='goal'&&outcome.actor===release.actor,secondsAfterRelease:Math.round((outcome.at-release.at)*100)/100});
}
console.log(JSON.stringify({test:'set-piece complete outcomes',cases:results.length,results,note:'actual engine through control/interception/save/goal/frame/out; synthetic fixtures, not a guaranteed success rate'}));
