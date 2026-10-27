import assert from 'node:assert/strict';
import {requestRestart} from '../arena-match.js';
import {createWorld,worldContext,stepWorld} from '../arena-world.js';
const players=Array.from({length:6},(_,i)=>({key:'p'+i,name:'P'+i,games:5,appearance:{}}));
function fixture(){const w=createWorld(players);w.mode='match';w.groups=[];w.equipment.cones.forEach(c=>{c.mode='stored';c.x=19;c.z=19;});w.players.forEach((p,i)=>{p.team=p.bot?(p.key==='__keeper_bot'?0:1):i<3?0:1;p.x=p.bot?0:(i%3-1)*8;p.z=p.bot?(p.team===0?24.8:-24.8):p.team===0?5:-5;});w.match={teams:[['p0','p1','p2'],['p3','p4','p5']],score:[0,0],targetGoals:4,ball:'ball-0',carrier:'p3',holder:'p3',phase:'play',since:0,lastDecision:999,lastChange:-10,passes:20,nextFoul:0,restarts:0};const b=w.balls[0];Object.assign(b,{mode:'free',x:0,z:0,y:.14,vx:0,vy:0,vz:0,owner:null,flight:null,group:'match'});return {w,b,c:worldContext({players})};}
const results=[];
for(const scenario of ['throwIn','corner','penalty','freeKick']){
 const {w,b,c}=fixture();if(scenario==='throwIn')Object.assign(b,{x:17.2,z:1,vx:5,lastTouch:'p0',flight:{at:-1,type:'pass',from:'p0',team:0}});
 else if(scenario==='corner')Object.assign(b,{x:8,z:26.5,vz:5,lastTouch:'p0',flight:{at:-1,type:'shot',from:'p0',team:0}});
 else{const z=scenario==='penalty'?17:2,attacker=w.players.find(p=>p.key==='p3'),defender=w.players.find(p=>p.key==='p0');Object.assign(attacker,{x:0,z,heading:0});Object.assign(defender,{x:.48,z:z+.30});Object.assign(b,{x:0,z:z+.5,owner:null,lastTouch:'p3'});Object.assign(w.match,{phase:'foul',since:-2,deadTeam:1,spot:[0,z]});}
 let at=null,release=null,seen=[];for(let i=0;i<3600&&!release;i++){stepWorld(w,c);for(const e of w.newEvents){seen.push(e.type);if(e.type===scenario||scenario==='freeKick'&&e.scheme&&['cross','pass'].includes(e.type)){release=e;const p=w.players.find(p=>p.key===e.actor);at={pos:[p.x,p.z],ball:[b.x,b.y,b.z],gesture:p.action?.kind};}}}
 assert(release,'restart actually taken: '+scenario+' '+seen.join(','));if(scenario==='throwIn'){assert(Math.abs(at.pos[0])>17.1,'both feet at/outside touchline');assert(at.ball[1]>1.7,'overhead release');assert.equal(at.gesture,'throwIn');}if(scenario==='penalty'||scenario==='freeKick')assert(seen.includes(scenario+'Awarded'),'restart awarded from the controlled foul state');if(scenario==='corner')assert(seen.includes('cornerAwarded'));assert.equal(w.match.phase,'play');results.push({scenario,releaseAt:release.at,position:at.pos,ballHeight:at.ball[1]});
}
console.log(JSON.stringify({test:'continuous world set pieces',results,note:'controlled initial fixtures, actual movement/ball/restart logic; no production writes'}));
