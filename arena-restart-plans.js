// Shared football decisions, never a timed cutscene or a change to EA results.
import {FIELD} from './arena-layout.js?v=arena-12';
import {hash,clamp} from './arena-motion.js?v=arena-12';
import {now,actor,ballById,dist} from './arena-world-state.js?v=arena-12';
import {attackDirection,legalRestartPosition} from './arena-laws.js?v=arena-12';
import {passClearance,supportTarget} from './arena-tactics.js?v=arena-12';
import {isKeeper} from './arena-roles.js?v=arena-12';
const inside=point=>[clamp(point[0],-15.6,15.6),clamp(point[1],-24.3,24.3)];
const space=(w,p,team)=>Math.min(12,...w.players.filter(q=>q.team===1-team&&!q.rest&&!q.reserveKeeper).map(q=>Math.hypot(q.x-p[0],q.z-p[1])));
function teammates(w,m){const mates=m.teams[m.deadTeam].map(key=>actor(w,key)).filter(p=>p&&p.key!==m.taker&&!p.rest&&!isKeeper(p));return mates.length?mates:w.players.filter(p=>isKeeper(p)&&p.team===m.deadTeam&&!p.rest);}
export function buildRestartPlan(w,m){
 const taker=actor(w,m.taker),mates=teammates(w,m),d=attackDirection(m.deadTeam),side=Math.sign(m.spot[0])||1,t=now(w);
 if(!taker||!mates.length)return null;
 const id=hash(w.seed+':restart:'+m.restarts+':'+m.deadTeam),runs=[];let receiver,target,kind='pass',scheme='appoggio';
 if(m.restart==='throwIn'){
  const candidates=[];
  for(const q of mates)for(const inward of [3.6,5.8,8])for(const along of [-3.4,0,3.4]){
   const point=inside([side*(FIELD.halfWidth-inward),m.spot[1]+along*d]);
   const gap=passClearance(w,taker,{x:point[0],z:point[1]}),cost=Math.hypot(q.x-point[0],q.z-point[1]);
   candidates.push({q,point,score:Math.min(5,space(w,point,m.deadTeam))*1.5+Math.min(4,gap)*.7-cost*.55-Math.abs(along)*.08});
  }
  candidates.sort((a,b)=>b.score-a.score||(a.q.key<b.q.key?-1:1));const best=candidates[0];receiver=best.q;target=best.point;kind='throwIn';scheme='rimessa in appoggio';
  runs.push({key:receiver.key,point:target});
 }else if(m.restart==='corner'){
  const options=['primo palo','secondo palo','corto','rimorchio'];scheme=mates.length===1?'corto':options[id%options.length];
  const spots={ 'primo palo':[side*2.2,d*20.0], 'secondo palo':[-side*2.8,d*19.6], corto:[side*11.3,d*20.0], rimorchio:[side*1.4,d*12.3] };
  target=spots[scheme];receiver=[...mates].sort((a,b)=>Math.hypot(a.x-target[0],a.z-target[1])-Math.hypot(b.x-target[0],b.z-target[1]))[0];
  runs.push({key:receiver.key,point:target});kind=scheme==='corto'?'pass':'corner';
  const other=mates.filter(p=>p!==receiver),alternatives=[[side*2.2,d*20],[-side*2.8,d*19.6],[0,d*11.4],[-side*9,d*9]];
  for(const [i,q]of other.entries()){const point=alternatives.filter(p=>Math.hypot(p[0]-target[0],p[1]-target[1])>2)[i%3];runs.push({key:q.key,point:point||[-side*9,d*8]});}
 }else if(m.restart==='freeKick'||m.restart==='indirect'){
  const goalDistance=FIELD.halfLength-d*m.spot[1],lane=passClearance(w,taker,{x:0,z:d*FIELD.halfLength});
  const best=[...mates].sort((a,b)=>(space(w,[b.x,b.z],m.deadTeam)-dist(b,taker)*.15)-(space(w,[a.x,a.z],m.deadTeam)-dist(a,taker)*.15))[0];
  if(m.restart==='freeKick'&&goalDistance<17.5&&Math.abs(m.spot[0])<10&&lane>1.05){return {at:t,kind:'freeKick',scheme:'tiro diretto',target:[((id%101)/100-.5)*4.4,.45+(id%4)*.22,d*26.4],runs:[],receiver:null};}
  if(goalDistance>17&&goalDistance<32&&mates.length>1){scheme='pallone in area';target=[(id%2?1:-1)*2.8,d*19];receiver=best;kind='cross';}
  else{scheme='appoggio laterale';receiver=best;const relative=receiver.x>=m.spot[0]?1:-1;target=inside([m.spot[0]+relative*4.8,m.spot[1]-d*1.5]);kind='pass';}
  runs.push({key:receiver.key,point:target});
 }else return null;
 return {at:t,kind,scheme,receiver:receiver.key,target:[target[0],kind==='corner'||kind==='cross'?1.1:kind==='throwIn'?.48:FIELD.ballRadius,target[1]],runs};
}
export function applyRestartPlan(w,m){
 const plan=m.restartPlan;if(!plan)return;
 const preparing=['restart','placeRestart','readyRestart','throwing'].includes(m.phase);
 const ball=ballById(w,m.ball);if(!preparing&&(!plan.releasedAt||now(w)>plan.releasedAt+3.2||!ball?.flight||ball.flight.receiver!==plan.receiver))return;
 for(const run of plan.runs){const p=actor(w,run.key);if(!p||p.rest||p.kick||p.aerial||p.skill)continue;
  if(preparing&&['freeKick','indirect'].includes(m.restart)){run.point=supportTarget(w,p,{x:m.spot[0],z:m.spot[1]},run.point);if(p.key===plan.receiver){plan.target[0]=run.point[0];plan.target[2]=run.point[1];}}
  if(preparing&&!legalRestartPosition(run.point,p,m))continue;
  p.target=[...run.point];p.maxSpeed=Math.min(p.maxSpeed,preparing?4.2:5.1);p.faceLock=true;p.aim=Math.atan2(m.spot[0]-p.x,m.spot[1]-p.z);
  if(p.key===plan.receiver){p.signal={kind:'call',at:plan.at,until:plan.at+2.0};p.lookTarget=preparing?[m.spot[0],m.spot[1]]:[ball.x,ball.z];}
 }
}
export function restartReceiverReady(w,m){
 const plan=m.restartPlan;if(!plan?.receiver)return true;const q=actor(w,plan.receiver);if(!q)return false;
 return Math.hypot(q.x-plan.target[0],q.z-plan.target[2])<.55&&Math.hypot(q.vx,q.vz)<1.3;
}
