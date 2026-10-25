import assert from 'node:assert/strict';
import {FIELD as F} from '../arena-layout.js';
import {createWorld,worldContext,stepWorld,exportWorld} from '../arena-world.js';
import {restartSpot,legalRestartPosition,readyToRestart,crossedGoal,outOfPlay,offsideAtRelease,inPenaltyArea,attackDirection} from '../arena-laws.js';
import {stepBalls,releaseBall} from '../arena-world-ball.js';
import {reactToBalls} from '../arena-world-play.js';
import {requestRestart} from '../arena-match.js';
const roster=n=>Array.from({length:n},(_,i)=>({key:'p'+i,name:'Player '+i,games:i,appearance:{}}));
function fixture(){const players=roster(6),w=createWorld(players),c=worldContext({players});w.mode='match';w.groups=[];w.equipment.cones.forEach(q=>Object.assign(q,{mode:'stored',x:19,z:19}));for(const [i,p]of w.players.entries()){p.rest=null;p.team=p.bot?(p.key==='__keeper_bot'?0:1):i<3?0:1;p.x=p.bot?0:(i%3-1)*8;p.z=p.bot?(p.team===0?24.8:-24.8):p.team===0?5:-5;}
 w.match={teams:[['p0','p1','p2'],['p3','p4','p5']],score:[0,0],targetGoals:5,ball:'ball-0',carrier:'p0',holder:'p0',phase:'play',since:0,lastDecision:999,lastChange:-10,passes:0,restarts:0};const b=w.balls[0];Object.assign(b,{x:0,y:F.ballRadius,z:0,vx:0,vy:0,vz:0,mode:'free',group:'match',owner:null,flight:null,motion:null,onRoof:false});return {players,w,c,b};}
let checks=0;
// Entire ball, not its centre, must cross. Above/along the bar cannot count.
const ball={x:0,y:.4,z:26.10,previous:[0,.4,25.8]};assert.equal(crossedGoal(ball),0);assert.equal(crossedGoal({...ball,z:26.12}),1);assert.equal(crossedGoal({...ball,z:26.3,y:2.5,previous:[0,2.5,25.8]}),0);assert.equal(crossedGoal({...ball,x:3,z:26.3,previous:[3,.4,25.8]}),0);checks+=4;
assert.equal(outOfPlay({x:17.1,z:0},0),null);assert.equal(outOfPlay({x:17.12,z:0},0).team,1);assert.equal(outOfPlay({x:6,z:26.12},0).type,'corner');assert.equal(outOfPlay({x:6,z:26.12},1).type,'goalKick');checks+=4;
for(const team of [0,1]){const spot=restartSpot('goalKick',team,[16,25]);assert(inPenaltyArea(...spot,team));assert(Math.abs(spot[0])<F.goalAreaHalfWidth);assert(Math.abs(spot[1])>22);assert.equal(restartSpot('penalty',team,[0,0])[1],attackDirection(team)*15);checks+=4;}
{
 const {w,b}=fixture(),m={...w.match,restart:'kickoff',deadTeam:0,taker:'p0',spot:[0,0]},p=w.players.find(p=>p.key==='p3');
 assert(!legalRestartPosition([0,1],p,m),'opponent cannot stand inside circle');assert(!legalRestartPosition([0,12],p,m),'opponent cannot stand in wrong half');assert(legalRestartPosition([0,-12],p,m));
 w.players.filter(q=>q.team===0).forEach(q=>q.z=-12);w.players.filter(q=>q.team===1).forEach(q=>q.z=-12);assert(!readyToRestart(w,m,b));checks+=4;
}
// Swept goal-frame contact works even when one step crosses the thin frame.
for(const surface of ['post','crossbar']){const {w,b}=fixture();Object.assign(b,{x:surface==='post'?3:0,y:surface==='post'?.6:2.4,z:25.5,vz:24,vy:0});stepBalls(w);assert(w.newEvents.some(e=>e.type==='post'&&e.surface===surface));assert(b.vz<0,'frame rebounds back into field');assert.equal(crossedGoal(b),0);checks+=3;}
{
 const {w,b}=fixture(),p=w.players[0],mate=w.players[1];Object.assign(p,{z:0});Object.assign(mate,{z:-19});w.players.filter(p=>p.team===1&&!p.bot).forEach(p=>p.z=-10);assert(offsideAtRelease(w,p,b,'pass').includes(mate.key));for(const type of ['goalKick','corner','throwIn'])assert.deepEqual(offsideAtRelease(w,p,b,type),[]);checks+=4;
 w.tick=12;b.flight={at:0,from:p.key,team:0,type:'pass',offside:[mate.key],destination:[0,.11,-19]};Object.assign(b,{x:mate.x,z:mate.z,y:.11});reactToBalls(w,worldContext({players:roster(6)}));assert(w.newEvents.some(e=>e.type==='offside'));assert.equal(w.match.restart,'indirect');assert.equal(w.match.deadTeam,1);checks+=3;
}
for(const kind of ['throwIn','indirect','keeperThrow']){const {w,b,c}=fixture();Object.assign(b,{x:1,y:.4,z:-26.3,previous:[1,.4,-25.95],vx:0,vz:-8,restartGuard:{type:kind,team:0,kicker:'p0'},flight:{at:0,from:'p0',team:0,type:kind}});reactToBalls(w,c);assert.deepEqual(w.match.score,[0,0]);assert.equal(w.match.restart,'goalKick');checks+=2;}
{
 const {w,b,c}=fixture();Object.assign(b,{x:1.4,y:.4,z:-26.3,previous:[1.4,.4,-25.95],vz:-8,lastTouch:'p0',flight:{at:0,from:'p0',team:0,type:'shot'}});reactToBalls(w,c);assert.deepEqual(w.match.score,[1,0]);assert.equal(w.match.deadTeam,1);let kickoff=false;for(let i=0;i<120*24&&!kickoff;i++){stepWorld(w,c);if(w.newEvents.some(e=>e.type==='kickoff')){kickoff=true;const e=w.newEvents.find(e=>e.type==='kickoff');assert.equal(w.players.find(p=>p.key===e.actor).team,1);for(const p of w.players.filter(p=>p.team!=null&&p.key!==e.actor)){assert(attackDirection(p.team)*p.z<.05,'own half at actual release: '+p.key);if(p.team===0)assert(Math.hypot(p.x,p.z)>=9.15);}}}assert(kickoff,'conceding team actually restarts');checks++;
}
const equipment=[];for(const n of [2,7,14]){const players=roster(n),w=createWorld(players),c=worldContext({players});let started=false,collections=0,stores=0;for(let tick=0;tick<600*24&&!started;tick++){stepWorld(w,c);for(const e of w.newEvents){if(e.type==='equipmentCollect')collections++;if(e.type==='equipmentStore')stores++;if(e.type==='kickoff'){started=true;assert.equal(w.equipment.cones.length,6);assert(w.equipment.cones.every(q=>q.mode==='stored'&&Math.abs(q.x)>F.halfWidth),'cones actually carried outside before release');}}}assert(started,'friendly starts after tidying field: '+n);assert.equal(collections,6);assert(stores>=2);equipment.push({players:n,collections,stores,seconds:w.tick/24});}
{
 const {w,b,c}=fixture();requestRestart(w,'throwIn',1,[17,7]);b.onRoof=true;b.y=3.35;b.x=24;b.z=8;const old=b.id;stepWorld(w,c);assert.notEqual(w.match.ball,old);assert(b.onRoof,'old ball stays on the roof');assert(w.newEvents.some(e=>e.type==='reserveBall'));checks++;
}
console.log(JSON.stringify({test:'Arena football laws and equipment',checks,equipment,note:'actual deterministic physics and controlled scenarios; reduced pitch, no full 11v11/VAR/card adjudication'}));
