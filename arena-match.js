import {clamp} from './arena-motion.js?v=arena-8';
import {FIELD,BALL_RACK} from './arena-layout.js?v=arena-8';
import {now,actor,ballById,dist,unit,rnd,integer,pose,emit,beginPlace} from './arena-world-state.js?v=arena-8';
import {prepareKick,prepareThrow,dribble,putInRack} from './arena-world-ball.js?v=arena-8';
import {attackDirection as direction,ownGoalSign,inPenaltyArea,restartSpot,restartPosition,restartLayout,kickoffPosition,readyToRestart} from './arena-laws.js?v=arena-8';
import {equipmentClear} from './arena-equipment.js?v=arena-8';
const near=(p,point,d=.18)=>Math.hypot(p.x-point[0],p.z-point[1])<d;
const face=(p,q)=>p.aim=Math.atan2(q.x-p.x,q.z-p.z);
const keepers=w=>w.players.filter(p=>p.bot);
export function fieldShape(p,m){
 const list=m.teams[p.team]||[],i=Math.max(0,list.indexOf(p.key)),n=list.length;
 const shapes={1:[[0,-3]],2:[[-6,-4],[6,5]],3:[[-7,-4],[7,-4],[0,7]],4:[[0,-9],[-9,-1],[9,-1],[0,8]],5:[[0,-10],[-9,-3],[9,-3],[-6,8],[6,8]],6:[[-6,-10],[6,-10],[-10,-1],[10,-1],[-5,9],[5,9]]};
 const shape=shapes[n]?.[i]||[(i%3-1)*9,-11+Math.floor(i/3)*22/Math.max(1,Math.ceil(n/3)-1)];return [shape[0],shape[1]*direction(p.team)];
}
export function requestRestart(w,type,team,point){
 const m=w.match,b=ballById(w,m.ball),candidates=m.teams[team].map(k=>actor(w,k)).filter(p=>p&&!p.rest),keeper=keepers(w).find(p=>p.team===team);
 m.restart=type;m.deadTeam=team;m.spot=restartSpot(type,team,point);
 m.taker=(type==='goalKick'&&keeper?keeper:candidates.sort((a,c)=>dist(a,b)-dist(c,b))[0])?.key;
 m.holder=m.taker;m.phase='restart';m.since=now(w);m.restarts=(m.restarts||0)+1;m.signalled=false;
 for(const p of w.players){if(p.kick?.ball===b.id)p.kick=null;if(p.throw?.ball===b.id)p.throw=null;}
 if(b.owner&&b.owner!==m.taker){b.owner=null;b.mode='free';b.motion=null;b.vy=0;}
 b.net=null;b.flight=null;b.restartGuard=null;
 emit(w,type==='penalty'?'penaltyAwarded':type==='freeKick'?'freeKickAwarded':type==='indirect'?'indirectAwarded':type==='corner'?'cornerAwarded':'restart',actor(w,m.taker),null,b,{restart:type,team});
}
function matesFor(w,p){return w.players.filter(q=>q!==p&&q.team===p.team&&!q.rest&&(!q.bot||w.match.teams[p.team].length===1));}
function kickRestart(w,m,p,b){
 const type=m.restart||'kickoff',mates=matesFor(w,p),d=direction(p.team);
 if(!m.signalled){m.signalled=true;emit(w,'restartSignal',p,null,b,{restart:type});}
 if(type==='kickoff'){
  const q=mates.sort((a,c)=>(a.bot?20:0)+dist(a,p)-(c.bot?20:0)-dist(c,p))[0];
  if(q)prepareKick(w,p,b,[q.x,FIELD.ballRadius,q.z],'kickoff',q.key);
 }else if(type==='penalty'||type==='freeKick')prepareKick(w,p,b,[(rnd(w)-.5)*5.1,.3+rnd(w)*1.0,d*26.4],type);
 else if(type==='corner'){
  const q=mates.sort((a,c)=>Math.abs(a.x)+Math.abs(a.z-d*17)-Math.abs(c.x)-Math.abs(c.z-d*17))[0];if(q)prepareKick(w,p,b,[q.x,1.0,q.z],'corner',q.key);
 }else{
  const q=mates.sort((a,c)=>dist(a,p)-dist(c,p))[0];if(q)prepareKick(w,p,b,[q.x,FIELD.ballRadius,q.z],type==='goalKick'?'goalKick':type==='indirect'?'indirect':'pass',q.key);
 }
}
export function planMatch(w,context,{carryTo,aimPickup}){
 const m=w.match,b=ballById(w,m.ball),t=now(w),carrier=actor(w,m.carrier);if(!b)return;
 // An unreachable ball stays where it landed. A player fetches a spare instead.
 if(b.onRoof&&m.phase!=='play'){
  const spare=w.balls.find(q=>q.mode==='rack'&&!q.group);if(spare){b.owner=null;b.group=null;b.flight=null;m.ball=spare.id;spare.group='match';m.phase=m.phase==='gather'?'gather':'restart';m.signalled=false;emit(w,'reserveBall',actor(w,m.taker||m.carrier),null,spare);return;}
 }
 const holder=actor(w,b.owner),attacking=holder?.team??b.flight?.team??0;
 const nearest=team=>w.players.filter(p=>p.team===team&&!p.bot&&!p.rest).sort((a,c)=>dist(a,b)-dist(c,b));
 const loose=new Map([0,1].map(team=>[team,nearest(team)[0]?.key]));
 let presser=null;
 if(holder&&!holder.bot){const candidates=nearest(1-holder.team);const current=actor(w,m.pressure?.key);if(current&&m.pressure.holder===holder.key&&t<m.pressure.until&&!current.rest&&dist(current,b)<dist(candidates[0]||current,b)+2)presser=current;else{presser=candidates[0];m.pressure={key:presser?.key,holder:holder.key,until:t+.75};}}
 const dead=['restart','placeRestart','readyRestart','kickoff'].includes(m.phase);
 const setup=m.phase==='gather'?{...m,restart:'kickoff',spot:[0,0],deadTeam:0,taker:m.holder}:m,layout=dead||m.phase==='gather'?restartLayout(w,setup,fieldShape):null;
 for(const p of w.players){
  if(p.rest||p.team==null)continue;
  if(m.phase==='gather'&&w.groups.some(g=>g.stage!=='done'&&g.members.includes(p.key)))continue;
  if(p.bot){
   const sign=ownGoalSign(p.team);p.faceLock=true;p.target=p.anticipate&&t-p.anticipate.at<.45?[p.anticipate.point[0],sign*24.8]:[clamp(b.x*.23,-2.35,2.35),sign*24.8];p.aim=sign<0?0:Math.PI;
   if(layout)p.target=layout.get(p.key)||p.target;
   continue;
  }
  const base=fieldShape(p,m),d=direction(p.team);
  p.target=[clamp(base[0]+b.x*.16,-14.3,14.3),clamp(base[1]*.72+b.z*.42,-22,22)];face(p,b);
  if(m.phase==='play'){
   if(holder===p&&!p.kick){
    const cut=Math.abs(p.x)>9&&m.teams[p.team].length<2,vector=unit(cut?-p.x:clamp(p.x+(m.passes%3===2?(p.x>=0?1.5:-1.5):p.x>0?-.2:.2),-13,13)-p.x,d*4),front=(b.x-p.x)*vector[0]+(b.z-p.z)*vector[1],regain=dist(p,b)>.62||front<.02,lead=regain?-.30:.72;
    p.target=[clamp(b.x+vector[0]*lead,-16.5,16.5),clamp(b.z+vector[1]*lead,-26.0,26.0)];p.aim=Math.atan2(vector[0],vector[1]);p.maxSpeed=4.8;if(front>-.05)dribble(w,p,b,vector);
   }else if(p===presser&&holder){const v=unit(p.x-b.x,p.z-b.z),gap=holder.kick?1.05:.52;p.target=[b.x+v[0]*gap,b.z+v[1]*gap];}
   else if(!holder&&loose.get(p.team)===p.key){const look=clamp(dist(p,b)/5.3,.08,.55);p.target=[clamp(b.x+b.vx*look,-17,17),clamp(b.z+b.vz*look,-26,26)];}
   else if(p.team===attacking){p.target[1]=clamp(p.target[1]+d*3.3,-22,22);if(m.passes%3===2&&m.teams[p.team].indexOf(p.key)%3!==1)p.target=[base[0]>0?12:-12,clamp((holder?.z??b.z)+d*5,-22,22)];}
   if(b.flight?.receiver===p.key)p.target=[clamp(b.flight.destination[0],-16.5,16.5),clamp(b.flight.destination[2],-25.5,25.5)];
  }else if(m.phase==='gather'||dead)p.target=layout.get(p.key)||base;
  else if(m.phase==='goal'){
   p.target=t-m.since<1.1?[p.x,p.z]:kickoffPosition(p,{...m,restart:'kickoff',spot:[0,0],taker:m.carrier},base);p.maxSpeed=4.4;
  }else if(m.phase==='foul'){p.target=[p.x,p.z];p.maxSpeed=0;}
 }
 if(m.phase==='gather'){
  if(w.groups.some(g=>g.stage!=='done'))return;
  if(carrier)carryTo(w,carrier,b,[0,0],.09);
  const setup={...m,restart:'kickoff',spot:[0,0],deadTeam:0,taker:m.holder};
  if(equipmentClear(w)&&readyToRestart(w,setup,b)){m.phase='kickoff';m.restart='kickoff';m.spot=[0,0];m.deadTeam=0;m.taker=m.holder;m.since=t;w.mode='match';}
 }else if(m.phase==='kickoff'){
  const p=actor(w,m.taker||m.holder);if(p&&near(p,p.target,.20)&&readyToRestart(w,m,b)&&!p.kick){p.faceLock=true;kickRestart(w,m,p,b);}
 }else if(m.phase==='play'){
  if(holder?.bot){
   const mates=matesFor(w,holder);if(b.mode==='hand'){holder.target=[holder.x,holder.z];holder.maxSpeed=0;if(t>=(m.heldUntil||0)){const q=mates.sort((a,c)=>dist(a,holder)-dist(c,holder))[0];if(q)prepareThrow(w,holder,b,[q.x,.35,q.z],'throw',q.key);}}
   else if(!holder.kick&&t>=m.lastDecision){const q=mates[0];if(q)prepareKick(w,holder,b,[q.x,FIELD.ballRadius,q.z],'pass',q.key);m.lastDecision=t+.55;}
  }else if(holder&&b.owner===holder.key&&!holder.kick&&t>=m.lastDecision){
   const mates=matesFor(w,holder),d=direction(holder.team),goalDistance=26-d*holder.z;
   if(Math.abs(holder.x)>9&&d*holder.z>2&&mates.length){const q=mates.slice().sort((a,c)=>Math.abs(a.x)+Math.abs(a.z-d*19)-Math.abs(c.x)-Math.abs(c.z-d*19))[0];prepareKick(w,holder,b,[q.x,1.0,q.z],'cross',q.key);}
   else if(goalDistance<18&&Math.abs(holder.x)<14.5&&(rnd(w)<.68||!mates.length))prepareKick(w,holder,b,[(rnd(w)-.5)*5.1,.25+rnd(w)*1.05,d*26.4],'shot');
   else if(mates.length){
    const ranked=mates.map(p=>({p,value:d*(p.z-holder.z)*.6-Math.abs(dist(p,holder)-9)+rnd(w)*5+Math.min(6,...w.players.filter(q=>q.team!==holder.team&&!q.rest).map(q=>dist(q,p)))})).sort((a,c)=>c.value-a.value),q=ranked[0].p;
    prepareKick(w,holder,b,[q.x,FIELD.ballRadius,q.z],'pass',q.key);m.passes++;
   }
   m.lastDecision=t+.45+rnd(w)*.45;
  }
  if(holder&&!holder.bot&&b.owner===holder.key&&t-m.lastChange>.65&&presser&&dist(presser,b)<.62&&dist(presser,holder)<.85){
   const relativeSpeed=Math.hypot(holder.vx-presser.vx,holder.vz-presser.vz),late=dist(presser,holder)<dist(presser,b)+.25;
   if(late&&dist(holder,b)>.40&&relativeSpeed>1.25&&t-(m.lastFoul??-30)>12&&rnd(w)<.35/24){m.phase='foul';m.since=t;m.deadTeam=holder.team;m.spot=[holder.x,holder.z];m.victim=holder.key;m.lastFoul=t;b.owner=null;b.vx*=.12;b.vz*=.12;holder.kick=null;pose(w,holder,'fall',1.05,{dirty:true});pose(w,presser,'tackle',.65);emit(w,'foul',presser,holder,b);}
   else if(!holder.kick&&rnd(w)<.10){b.owner=presser.key;m.holder=presser.key;m.lastChange=t;m.lastDecision=t+.35;b.vx*=.25;b.vz*=.25;pose(w,presser,'trap',.35,{contact:t,footTarget:[b.x,b.y,b.z]});emit(w,'interception',presser,holder,b);}
  }
 }else if(m.phase==='foul'&&t-m.since>1.05){const penalty=inPenaltyArea(m.spot[0],m.spot[1],1-m.deadTeam);requestRestart(w,penalty?'penalty':'freeKick',m.deadTeam,m.spot);}
 else if(m.phase==='restart'||m.phase==='placeRestart'){
  const p=actor(w,m.taker);if(p){
   if(m.restart==='throwIn'){
    if(b.mode==='hand'&&b.owner===p.key){p.target=[Math.sign(m.spot[0])*(FIELD.halfWidth+.28),m.spot[1]];const q=matesFor(w,p).sort((a,c)=>dist(a,p)-dist(c,p))[0];
     if(q){face(p,q);if(near(p,p.target,.15)&&Math.hypot(p.vx,p.vz)<.8&&w.players.every(a=>a.team===p.team||a.rest||dist(a,{x:m.spot[0],z:m.spot[1]})>=2)){prepareThrow(w,p,b,[q.x,.5,q.z],'throwIn',q.key);m.phase='throwing';}}
    }else aimPickup(w,p,b);
   }else{carryTo(w,p,b,m.spot,.09);if(!b.owner&&!b.motion&&near(b,m.spot,.10)&&Math.hypot(b.vx,b.vz)<.20&&Math.abs(b.vy)<.20){m.phase='readyRestart';m.since=t;}}
  }
 }else if(m.phase==='readyRestart'){
  if(!near(b,m.spot,.12)&&!w.players.some(p=>p.kick?.ball===b.id)){m.phase='restart';m.signalled=false;return;}
  const p=actor(w,m.taker);if(p&&near(p,p.target,.20)&&readyToRestart(w,m,b)&&!p.kick){if(m.restart==='kickoff'){m.holder=p.key;m.phase='kickoff';}else kickRestart(w,m,p,b);}
 }else if(m.phase==='goal'&&t-m.since>1.8){
  if(m.score.some(s=>s>=m.targetGoals)){m.phase='finish';m.since=t;emit(w,'matchEnd',null,null,b,{score:[...m.score]});}
  else requestRestart(w,'kickoff',m.deadTeam,[0,0]);
 }else if(m.phase==='finish'){
  const p=actor(w,m.carrier)||w.players.find(p=>!p.bot&&!p.rest);if(p)carryTo(w,p,b,[BALL_RACK.x,BALL_RACK.z]);
  if(b.mode==='free'&&!b.owner&&!b.motion&&Math.hypot(b.x-BALL_RACK.x,b.z-BALL_RACK.z)<.25){putInRack(w,b);w.mode='training';w.match=null;w.groups=[];w.nextMatchAt=w.completed+integer(w,24,46);for(const a of w.players){a.team=null;a.group=null;if(a.rest?.reason==='odd'){a.rest.phase='rise';a.rest.riseAt=t;}}}
 }
}
