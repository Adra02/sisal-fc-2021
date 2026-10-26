// Activity decisions react to completed play. There is no scene duration,
// countdown, camera script or periodic repositioning in this director.
import {DT,clamp,hash} from './arena-motion.js?v=arena-9';
import {BALL_RACK,BENCH} from './arena-layout.js?v=arena-9';
import {friendlyLineup} from './arena-teams.js?v=arena-9';
import {rnd,integer,choose,shuffled,now,actor,ballById,dist,unit,emit,pose,beginPickup,beginPlace,setRest,updateRest,handPoint} from './arena-world-state.js?v=arena-9';
import {prepareKick,dribble,releaseBall,putInRack,prepareThrow} from './arena-world-ball.js?v=arena-9';

import {planMatch,requestRestart} from './arena-match.js?v=arena-9';
import {crossedGoal,outOfPlay,inPenaltyArea} from './arena-laws.js?v=arena-9';
import {planEquipment,stepEquipment} from './arena-equipment.js?v=arena-9';
import {isShot,recordPracticeShot,rotatePractice} from './arena-practice.js?v=arena-9';
import {chooseGroundTechnique,planTechnique,tryAerial,receiveHeading} from './arena-techniques.js?v=arena-9';
const direction=team=>team===0?-1:1;
const members=w=>w.players.filter(p=>!p.bot);
const near=(p,x,z,d=.25)=>Math.hypot(p.x-x,p.z-z)<d;
const speed=b=>Math.hypot(b.vx,b.vz);
const face=(p,b)=>p.aim=Math.atan2(b.x-p.x,b.z-p.z);
export function goalie(w,sign,context){return sign<0&&context.keeper&&w.mode!=='match'&&!actor(w,context.keeper)?.rest?actor(w,context.keeper):actor(w,sign<0?'__keeper_bot':'__keeper_away_bot');}
function aimPickup(w,p,b){
 if(b.motion&&b.owner===p.key){p.target=[p.x,p.z];p.maxSpeed=0;return;}
 const d=unit(b.x-p.x,b.z-p.z);p.target=[b.x-d[0]*.35,b.z-d[1]*.35];face(p,b);
 // Approach the accessible face of the pavilion wall, never a point inside it.
 if(b.z>1.2&&b.z<14.8&&b.x>26.3&&b.x<27.9)p.target=[b.x<27.1?Math.min(b.x-.35,26.39):Math.max(b.x+.35,27.81),b.z];
 const nearBench=b.z>2.7&&b.z<13.35&&b.x>20.7&&b.x<23.4;
 if(nearBench)p.target=[b.x<22.04?Math.min(b.x-.35,21.31):Math.max(b.x+.35,22.77),b.z];
 if(near(p,...p.target,.14)&&Math.hypot(p.vx,p.vz)<1&&b.y<.55)beginPickup(w,p,b,nearBench?.76:.64);
}
function carryTo(w,p,b,point,tolerance=.20){
 if(b.mode==='free'&&!b.owner&&!b.motion&&b.y<.2&&Math.hypot(b.x-point[0],b.z-point[1])<tolerance&&speed(b)<.35)return true;
 if(b.mode==='hand'){
  const tag=point.join(',');if(p.delivery?.tag!==tag){const d=unit(point[0]-p.x,point[1]-p.z);p.delivery={tag,target:[point[0]-d[0]*.34,point[1]-d[1]*.34]};}
  p.target=[...p.delivery.target];p.priority=.15;face(p,{x:point[0],z:point[1]});
  if(near(p,...p.target,.13)&&Math.hypot(p.vx,p.vz)<.7)beginPlace(w,p,b,point);
 }else if(b.mode==='pickup'||b.mode==='place'){p.target=[p.x,p.z];p.maxSpeed=0;}
 else aimPickup(w,p,b);
}
function groupPositions(g,p,index){
 const s=g.sign,spot=g.spot,n=g.members.length;
 if(['passes','rondo','duel'].includes(g.kind)){
  if(g.kind==='rondo'&&p.key===g.chaser)return g.stage==='play'?[spot[0],spot[1]]:[spot[0]+1.4,spot[1]+1.4];
  g.orientation??=g.turn*.19;
  const a=(index/Math.max(2,n))*Math.PI*2+g.orientation,r=Math.max(n>4?4:3,n*.80/(Math.PI*2));return [spot[0]+Math.sin(a)*r,spot[1]+Math.cos(a)*r];
 }
 if(p.key===g.holder)return [spot[0],spot[1]-s*.36];
 if(g.kind==='cross'&&p.key===g.receiver)return [clamp(spot[0]*-.15,-2,2),s*20];
 if(g.kind==='freeKick'&&index>1&&index<5)return [spot[0]+(index-3)*.78,spot[1]+s*9.15];
 return [clamp(spot[0]+(index%3-1)*2.1,-13,13),spot[1]-s*(2+Math.floor(index/3)*1.6)];
}
function chooseKind(w,g){
 const all=g.index<2?['cross','finishing','penalty','freeKick','passes','rondo','juggle','duel']:['passes','rondo','duel','juggle'];
 let kind=choose(w,all.filter(k=>k!==g.kind));if(g.members.length<3&&kind==='rondo')kind='passes';if(g.members.length<2&&['passes','rondo','duel','cross'].includes(kind))kind='finishing';
 return kind;
}
function configureGroup(w,g,kind){
 delete g.pendingShooter;
 g.kind=kind;g.rounds=0;g.turn=integer(w,0,12);g.orientation=g.turn*.19;g.targetRounds=integer(w,3,7);g.sign=g.index%2?1:-1;
 for(const key of g.members){const p=actor(w,key);if(p){p.group=g.id;p.team=null;}}
 g.spot=g.index<2?[g.index%2?8:-8,g.sign*13]:[-7,4];
 if(kind==='penalty')g.spot=[0,g.sign*15];if(kind==='freeKick')g.spot=[integer(w,-4,4),g.sign*10.5];if(kind==='finishing')g.spot=[integer(w,-6,6),g.sign*16];if(['passes','rondo','duel','juggle'].includes(kind))g.spot=g.index<2?[g.index%2?8:-8,g.sign*8]:[-7,4];
 if(kind==='cross')g.spot=[g.index%2?12:-12,g.sign*13];
 g.holder=g.members[g.turn%g.members.length];g.receiver=g.members[(g.turn+1)%g.members.length];g.chaser=g.members.at(-1);g.stage='fetch';g.carrier=g.holder;g.since=now(w);g.lastDecision=0;g.lastEvent=0;
}
function assignGroups(w,context){
 const free=shuffled(w,members(w).filter(p=>!p.rest&&p.key!==context.keeper));
 if(!free.length)return;
 const n=Math.min(3,Math.max(1,Math.floor(free.length/3))),groups=Array.from({length:n},(_,i)=>({id:++w.groupId,index:i,members:[]}));
 free.forEach((p,i)=>{groups[i%n].members.push(p.key);p.group=groups[i%n].id;p.team=null;});
 for(const g of groups){const b=w.balls.find(b=>b.mode==='rack'&&!b.group)||w.balls.find(b=>!b.group&&!b.owner&&!b.onRoof&&b.y<.4);if(!b)continue;b.group=g.id;g.ball=b.id;configureGroup(w,g,chooseKind(w,g));w.groups.push(g);}
}
function finishGroup(w,g){g.stage='return';g.carrier=ballById(w,g.ball)?.owner||g.holder;g.since=now(w);}
function planGroup(w,g,context){
 const b=ballById(w,g.ball),p=actor(w,g.holder),carrier=actor(w,g.carrier),t=now(w);if(!b||!p)return;
 for(const [i,key]of g.members.entries()){const a=actor(w,key);if(!a||a.rest)continue;a.target=groupPositions(g,a,i);face(a,b);}
 if(['fetch','deliver','recover','return'].includes(g.stage)&&g.carrier!==g.holder){p.target=[g.spot[0]+1.5,g.spot[1]-g.sign*1.5];}
 const keeper=goalie(w,g.sign,context);if(keeper){keeper.target=keeper.anticipate&&t-keeper.anticipate.at<.5?[keeper.anticipate.point[0],g.sign*24.8]:[clamp(b.x*.18,-2,2),g.sign*24.8];keeper.aim=g.sign<0?0:Math.PI;}
 if(g.stage==='fetch'){
  if(b.mode==='hand'&&b.owner===g.carrier)g.stage='deliver';else if(carrier)aimPickup(w,carrier,b);
 }else if(g.stage==='deliver'){
  if(carrier)carryTo(w,carrier,b,g.spot);
  if(b.mode==='free'&&!b.motion&&!b.owner&&Math.hypot(b.x-g.spot[0],b.z-g.spot[1])<.2){g.stage='ready';g.since=t;}
 }else if(g.stage==='ready'){
  p.target=[b.x,b.z-g.sign*.36];p.aim=g.sign<0?Math.PI:0;
  if(near(p,...p.target,.16)&&t-g.since>.35&&speed(b)<.35){b.owner=p.key;g.stage='play';g.since=t;g.lastDecision=t+.25;}
 }else if(g.stage==='play'){
  if(b.owner&&actor(w,b.owner)&&b.mode!=='hand')g.holder=b.owner;
  const holder=actor(w,g.holder);if(!holder)return;
  if(g.kind==='juggle'){
   const period=1.12,u=(t-g.since)%period;
   if(!b.flight&&!b.owner&&b.y<=.16&&near(holder,b.x,b.z,.55))b.owner=holder.key;
   holder.target=[b.x-Math.sin(holder.heading)*.34,b.z-Math.cos(holder.heading)*.34];
   if(b.y<=.17&&near(holder,b.x,b.z,.62)&&t>=(g.nextJuggle||0)){b.vy=3.3;b.vx=(holder.x+Math.sin(holder.heading)*.36-b.x)*2;b.vz=(holder.z+Math.cos(holder.heading)*.36-b.z)*2;b.owner=null;b.mode='free';b.flight={type:'juggle',from:holder.key,at:t};pose(w,holder,'juggle',.65,{contact:t,footTarget:[b.x,b.y,b.z]});g.nextJuggle=t+.55;g.rounds++;w.completed++;emit(w,'juggle',holder,null,b);}
   if(Math.hypot(b.x-holder.x,b.z-holder.z)>1.5||g.rounds>=g.targetRounds){g.stage='recover';g.carrier=holder.key;g.nextKind=chooseKind(w,g);}
  }else if(b.owner===holder.key&&t>=g.lastDecision&&!holder.kick){
   if(g.kind==='cross'&&g.receiver!==holder.key){const q=actor(w,g.receiver),spot=q&&groupPositions(g,q,g.members.indexOf(q.key));if(q&&(Math.hypot(q.x-spot[0],q.z-spot[1])>.55||Math.hypot(q.vx,q.vz)>1)){holder.target=[holder.x,holder.z];holder.maxSpeed=0;return;}}
   const receiver=actor(w,g.members.filter(k=>k!==holder.key&&k!==g.chaser)[g.turn%Math.max(1,g.members.length-2)]||g.members.find(k=>k!==holder.key));
   if(['passes','rondo','duel'].includes(g.kind)&&receiver){g.receiver=receiver.key;prepareKick(w,holder,b,[receiver.x,.14,receiver.z],'pass',receiver.key);}
   else{let type=g.kind==='penalty'?'penalty':g.kind==='freeKick'?'freeKick':g.kind==='cross'&&actor(w,g.receiver)!==holder?'cross':'shot';const to=type==='cross'?actor(w,g.receiver):null,target=to?[to.x,[.75,1.4,1.65][g.turn%3],to.z]:[(rnd(w)-.5)*5.4,.35+rnd(w)*1.15,g.sign*26.5];if(type==='shot')type=chooseGroundTechnique(w,holder,b,target,type);prepareKick(w,holder,b,target,type,to?.key||null);}
   g.lastDecision=t+1.5;
  }
  if(g.kind==='rondo'&&g.chaser&&g.chaser!==g.holder){const chaser=actor(w,g.chaser);if(chaser){const n=unit(chaser.x-b.x,chaser.z-b.z),gap=holder.kick?.95:.48;chaser.target=[b.x+n[0]*gap,b.z+n[1]*gap];}}
  const incoming=actor(w,b.flight?.receiver);if(incoming){incoming.target=[clamp(b.flight.destination?.[0]??b.x,-15,15),clamp(b.flight.destination?.[2]??b.z,-24,24)];incoming.aim=b.flight.finishPreference?(g.sign<0?Math.PI:0)+(b.flight.finishPreference==='bicycle'?Math.PI:0):receiveHeading(incoming,b,g.sign);incoming.faceLock=true;}
  if(b.mode==='hand'){g.carrier=b.owner;g.stage=g.members.includes(b.owner)?'recover':'keeperReturn';g.returnKeeper=b.owner;g.since=t;}
  else if(b.onRoof){const spare=w.balls.find(q=>q.mode==='rack'&&!q.group);if(spare){b.group=null;g.ball=spare.id;spare.group=g.id;g.stage='fetch';g.carrier=g.holder;}}
  else if(!b.flight&&!b.owner&&speed(b)<.4&&t-g.since>2){g.stage='recover';g.carrier=g.members.slice().sort((a,c)=>dist(actor(w,a),b)-dist(actor(w,c),b))[0];g.since=t;}
 }else if(g.stage==='keeperReturn'){
  const k=actor(w,g.returnKeeper);p.target=[g.spot[0],g.spot[1]-g.sign*.36];
  if(k&&b.mode==='hand'&&b.owner===k.key){k.target=[k.x,k.z];k.maxSpeed=0;face(k,p);if(!k.throw&&t-g.since>.95)prepareThrow(w,k,b,[p.target[0],.35,p.target[1]],'throw',p.key);}
  if(b.flight?.type==='throw'){g.stage='play';g.since=t;g.lastDecision=t+.75;}
 }else if(g.stage==='recover'){
  const c=actor(w,g.carrier)||p,footRecovery=!g.nextKind&&['passes','rondo','duel','juggle'].includes(g.kind)&&b.mode==='free'&&!b.owner&&!b.motion&&b.y<.3&&Math.abs(b.x)<16.7&&Math.abs(b.z)<25.5;
  if(footRecovery){const d=unit(b.x-c.x,b.z-c.z);c.target=[b.x-d[0]*.32,b.z-d[1]*.32];face(c,b);if(dist(c,b)<.58){b.owner=c.key;b.lastTouch=c.key;b.flight=null;b.vx*=.12;b.vz*=.12;g.holder=c.key;g.stage='play';g.since=t;g.lastDecision=t+.32;pose(w,c,'trap',.38,{contact:t,footTarget:[b.x,b.y,b.z]});emit(w,'receive',c,null,b);}}
  else if(b.mode==='hand'&&b.owner===c.key){if(g.nextKind){const kind=g.nextKind;delete g.nextKind;configureGroup(w,g,kind);g.carrier=c.key;g.stage='deliver';}else{if(g.pendingShooter)rotatePractice(w,g);else if(!['finishing','penalty','freeKick','cross'].includes(g.kind))g.holder=g.members.includes(c.key)?c.key:g.members[g.turn%g.members.length];g.receiver=g.members.find(k=>k!==g.holder);g.stage='deliver';}}else aimPickup(w,c,b);
 }else if(g.stage==='return'){
  const c=actor(w,g.carrier)||p,rack=[BALL_RACK.x+(Number(b.id.split('-')[1])%2)*.35,BALL_RACK.z+Math.floor(Number(b.id.split('-')[1])/2)*.34];
  const ahead=w.groups.find(q=>q.stage==='return'&&q.id<g.id);if(ahead){c.target=[16.4-g.index*.85,18+g.index*1.0];return;}
  carryTo(w,c,b,rack);
  if(!b.owner&&!b.motion&&b.y<.2&&Math.hypot(b.x-rack[0],b.z-rack[1])<.25){putInRack(w,b);g.stage='done';for(const key of g.members){const a=actor(w,key);if(a)a.group=null;}}
 }
}
function startGather(w,context){
 const lineup=friendlyLineup(context.snapshot,w.matchIndex++),b=w.balls.find(b=>!b.onRoof&&b.mode!=='rack'&&b.y<.4)||w.balls.find(b=>b.mode==='rack');if(!b)return;
 for(const g of w.groups)if(g.ball!==b.id)finishGroup(w,g);else{g.stage='done';b.group=null;for(const key of g.members){const p=actor(w,key);if(p)p.group=null;}}
 const teams=lineup.teams,all=teams.flat();for(const p of w.players){p.team=teams[0].includes(p.key)?0:teams[1].includes(p.key)?1:p.key==='__keeper_bot'?0:p.key==='__keeper_away_bot'?1:null;if(p.rest){p.rest.phase='rise';p.rest.riseAt=now(w);}}
 if(lineup.benchKey){const p=actor(w,lineup.benchKey);setRest(w,p,'odd',w.matchIndex);}
 const carrier=b.owner&&all.includes(b.owner)?b.owner:all.slice().sort((a,c)=>dist(actor(w,a),b)-dist(actor(w,c),b))[0];
 w.match={teams,benchKey:lineup.benchKey,benchReason:lineup.reason,score:[0,0],targetGoals:integer(w,3,5),ball:b.id,carrier,phase:'gather',since:now(w),holder:teams[0][0],lastDecision:0,lastChange:now(w),passes:0,foulsSince:0,nextFoul:integer(w,8,17),restarts:0,canVary:lineup.canVary};
 b.group='match';w.mode='gather';emit(w,'gather',actor(w,carrier),null,b);
}
export function planWorld(w,context){
 const t=now(w);for(const p of w.players){p.target=[p.x,p.z];p.maxSpeed=p.bot?5.3:5.5;p.faceLock=false;p.priority=1;p.aim=undefined;p.elevation=0;p.seatedTarget=false;if(p.action&&p.action.end<t)p.action=null;}
 if(w.mode==='training'&&!(w.completed>=w.nextMatchAt&&members(w).length>=2&&w.groups.every(g=>g.stage==='done'))){
  if(!w.groups.some(g=>g.stage!=='done'))w.groups=[];
  if(!w.groups.length)assignGroups(w,context);
  for(const g of w.groups)if(g.stage!=='done')planGroup(w,g,context);
 }else if(w.match){for(const g of w.groups)if(g.stage!=='done')planGroup(w,g,context);planMatch(w,context,{carryTo,aimPickup});}
 planEquipment(w);
 // Resting players approach from the front, backstep and rise before leaving.
 for(const p of w.players){if(p.rest){const target=updateRest(w,p);if(target)p.target=target;}if(p.kick){const b=ballById(w,p.kick.ball),h=Math.atan2(p.kick.target[0]-b.x,p.kick.target[2]-b.z)+(p.kick.type==='heelPass'?Math.PI:0);p.faceLock=true;p.aim=h;p.target=p.kick.stage==='swing'?[p.x,p.z]:[b.x-Math.sin(h)*.36,b.z-Math.cos(h)*.36];p.maxSpeed=p.kick.stage==='swing'?0:3.8;p.priority=.2;}
  planTechnique(w,p);
  if(!p.rest&&!p.bot&&p.group==null&&w.mode==='training'&&Math.hypot(p.x-BALL_RACK.x,p.z-BALL_RACK.z)<2.2){p.target=[15.8,18+(hash(p.key)%5)*1.1];}
  if(p.bot&&w.mode==='training'&&!w.groups.some(g=>goalie(w,g.sign,context)?.key===p.key)){p.target=[p.key==='__keeper_bot'?4:-4,p.key==='__keeper_bot'?-23.5:23.5];p.aim=p.key==='__keeper_bot'?0:Math.PI;}
  if(p.action?.kind==='fall'&&t-p.action.start<.9)p.target=[p.x,p.z],p.maxSpeed=0;
  if(p.throw){p.faceLock=true;p.target=[p.x,p.z];p.maxSpeed=0;p.aim=Math.atan2(p.throw.target[0]-p.x,p.throw.target[2]-p.z);}
  if(p.action?.kind==='header')p.elevation=(p.action.jumpHeight||.12)*Math.sin(clamp((t-p.action.start)/(p.action.end-p.action.start))*Math.PI);
 }
}
function illegalTouch(w,p,b){
 const m=w.match?.ball===b.id?w.match:null;if(!m)return false;
 const offside=b.flight?.offside?.includes(p.key),second=b.restartGuard?.kicker===p.key;
 if(offside||second){const code=offside?'offside':'secondTouch';emit(w,code,p,null,b);b.owner=null;b.vx*=.08;b.vz*=.08;requestRestart(w,'indirect',1-p.team,[p.x,p.z]);return true;}
 if(b.restartGuard&&b.restartGuard.kicker!==p.key)b.restartGuard=null;
 return false;
}
function receive(w,p,b,event='receive'){
 if(illegalTouch(w,p,b))return;
 const from=b.flight?.from;b.owner=p.key;b.lastTouch=p.key;b.flight=null;b.vx*=.15;b.vz*=.15;b.vy=Math.min(0,b.vy)*.1;p.nextTouch=now(w)+.25;pose(w,p,'trap',.40,{contact:now(w),footTarget:[b.x,b.y,b.z]});emit(w,event,p,from,b);
 if(w.match&&w.match.ball===b.id){w.match.holder=p.key;w.match.lastChange=now(w);w.match.lastDecision=now(w)+.32;}
 const g=w.groups.find(g=>g.ball===b.id&&g.stage==='play');if(g){g.holder=p.key;g.rounds++;g.turn++;g.lastDecision=now(w)+.32;w.completed++;if(g.kind==='rondo'&&event==='interception')g.chaser=from;}
}
export function reactToBalls(w,context){
 const t=now(w);
 for(const b of w.balls){
  if(['rack','hand','pickup','place'].includes(b.mode)||b.net)continue;
  const m=w.match?.ball===b.id?w.match:null,g=w.groups.find(g=>g.ball===b.id&&g.stage==='play');
  if(m&&m.phase!=='play')continue;
  if(!m&&!g)continue;
  if(b.flight){
   const sign=b.vz>=0?1:-1,k=m?actor(w,sign<0?'__keeper_away_bot':'__keeper_bot'):goalie(w,sign,context),toward=Math.abs(b.z)>19&&Math.sign(b.vz)===sign;
   if(k&&toward&&t-b.flight.at>.18){const ahead=(sign*24.7-b.z)/(b.vz||.01);if(ahead>0&&ahead<.8){k.target=[clamp(b.x+b.vx*ahead,-2.7,2.7),sign*24.8];k.anticipate={at:t,point:[clamp(b.x+b.vx*ahead,-2.8,2.8),clamp(b.y+b.vy*ahead-4.905*ahead*ahead,.2,2.0),sign*24.8]};}}
   const legalHands=!m||k&&inPenaltyArea(k.x,k.z,k.team)&&(b.flight.team!==k.team||b.flight.type==='header');
   if(k&&toward&&!legalHands&&Math.abs(b.z-k.z)<.70&&Math.abs(b.x-k.x)<.75&&b.y<.55){receive(w,k,b,'receive');continue;}
   if(k&&toward&&legalHands&&Math.abs(b.z-k.z)<.65&&Math.abs(b.x-k.x)<.74&&b.y<1.85){
    const incoming=speed(b),catchable=incoming<16&&Math.abs(b.x-k.x)<.45&&b.y>.30&&b.y<1.5&&rnd(w)<.64,point=[b.x,b.y,b.z],side=b.x>=k.x?1:-1;
    pose(w,k,'save',.95,{contact:t,handTarget:point,handOffset:[b.x-k.x,b.y,b.z-k.z],side,jumpHeight:b.y>1.5?.16:0});
    if(catchable){b.owner=k.key;b.mode='hand';b.handSide=side;b.grip={at:t,offset:[b.x-k.x,b.y,b.z-k.z]};b.flight=null;b.motion=null;b.restartGuard=null;emit(w,'save',k,b.lastTouch,b,{saveType:'catch'});if(m){m.holder=k.key;m.heldUntil=t+.9;}else if(g){rotatePractice(w,g);g.stage='keeperReturn';g.since=t;g.returnKeeper=k.key;g.carrier=k.key;}}
    else{b.vx=side*(2.5+rnd(w)*3);b.vz=-sign*(2.5+rnd(w)*4);b.vy=1.5+rnd(w)*2;b.lastTouch=k.key;b.flight={...b.flight,shotBy:b.flight.shotBy||b.flight.from,from:k.key,type:'deflection',at:t};b.restartGuard=null;emit(w,'save',k,null,b,{saveType:'deflect',intensity:.6});}
    w.completed++;continue;
   }
  }
  const goal=crossedGoal(b);if(goal){
   const scoring=goal<0?0:1,guard=b.restartGuard;
   if(m&&guard){
    const ownGoal=scoring!==guard.team,directForbidden=['throwIn','indirect','keeperThrow'].includes(guard.type);
    if(ownGoal&&guard.type!=='keeperThrow'||!ownGoal&&directForbidden){emit(w,'disallowedGoal',guard.kicker,null,b,{reason:ownGoal?'directOwnGoal':'directRestart'});requestRestart(w,ownGoal?'corner':'goalKick',ownGoal?1-guard.team:1-scoring,[Math.sign(b.x||1)*16.5,goal*26]);continue;}
   }
   const scorer=b.flight?.shotBy||b.flight?.from||b.lastTouch;b.net=goal;b.owner=null;b.flight=null;b.restartGuard=null;b.vx*=.35;b.vz*=.3;emit(w,'goal',actor(w,scorer),null,b,{team:scoring,ownGoal:actor(w,scorer)?.team!=null&&actor(w,scorer).team!==scoring,intensity:.7});w.completed++;
   if(m){const scoring=goal<0?0:1;m.score[scoring]++;m.phase='goal';m.since=t;m.deadTeam=1-scoring;m.carrier=m.teams[m.deadTeam].slice().sort((a,c)=>dist(actor(w,a),b)-dist(actor(w,c),b))[0];
    for(const p of w.players)if(p.kick?.ball===b.id)p.kick=null;
    for(const [i,key]of m.teams[scoring].entries()){const p=actor(w,key);p.reaction={kind:['celebrate','arms','salute','crowd'][hash(key+w.eventId)%4],at:t+.15+(i%4)*.18,until:t+1.9+(i%3)*.12};}
   }else if(g){g.rounds++;g.stage='recover';g.carrier=g.members[(g.turn+1)%g.members.length];g.holder=g.carrier;g.since=t;b.net=null;}
   continue;
  }
  if(m&&m.phase==='play'){const decision=outOfPlay(b,actor(w,b.lastTouch)?.team??b.flight?.team??0);if(decision){requestRestart(w,decision.type,decision.team,decision.point);continue;}}
  if(m&&!b.owner&&!b.flight&&b.y<.30&&speed(b)<3){const receiver=w.players.filter(p=>!p.bot&&!p.rest&&p.team!=null&&dist(p,b)<.66).sort((a,c)=>dist(a,b)-dist(c,b))[0];if(receiver){receive(w,receiver,b,'receive');continue;}}
  if(g&&(Math.abs(b.x)>17.5||Math.abs(b.z)>28||b.onRoof)){g.stage='recover';g.carrier=g.members.slice().sort((a,c)=>dist(actor(w,a),b)-dist(actor(w,c),b))[0];g.rounds++;w.completed++;emit(w,'out',b.lastTouch,null,b);b.flight=null;}
  if(g&&b.flight&&t-b.flight.at>5.5&&b.y<.4&&speed(b)<1){b.flight=null;g.stage='recover';g.carrier=g.members.slice().sort((a,c)=>dist(actor(w,a),b)-dist(actor(w,c),b))[0];g.since=t;}
  if(b.flight&&tryAerial(w,b,m,g))continue;
  if(b.flight&&t-b.flight.at>.2&&b.y<1.1){
   const eligible=w.players.filter(p=>(!p.bot||b.flight.receiver===p.key)&&!p.rest&&(p.key!==b.flight.from||t-b.flight.at>.8)&&(m?p.team!=null:g?.members.includes(p.key))&&Math.hypot(p.x-b.x,p.z-b.z)<.64).sort((a,c)=>dist(a,b)-dist(c,b)),receiver=eligible[0];
   if(receiver){
    if(illegalTouch(w,receiver,b))continue;
    const dir=m?direction(receiver.team):g?.sign||-1,goodCross=['cross','corner'].includes(b.flight.type)&&b.y>.34&&dir*receiver.z>12;
    if(goodCross){receive(w,receiver,b,'receive');}
    else receive(w,receiver,b,m&&receiver.team!==b.flight.team?'interception':g?.chaser===receiver.key?'interception':'receive');
   }
  }
  if(g&&g.stage==='play'&&g.rounds>=g.targetRounds&&!b.flight&&!actor(w,g.holder)?.kick){if(w.completed>=w.nextMatchAt&&members(w).length>=2)finishGroup(w,g);else{g.stage='recover';g.carrier=b.owner||g.holder;g.nextKind=chooseKind(w,g);}}
 }
}
export function afterWorld(w,context){
 const t=now(w);stepEquipment(w);
 for(const e of w.newEvents){
  const practice=w.groups.find(g=>g.ball===e.ball&&g.stage==='play');if(practice&&isShot(e.type))recordPracticeShot(w,practice,e.actor);
  if(['pass','outsidePass','heelPass','cross','shot','outsideShot','chip','bicycle','scissor','penalty','freeKick','volley','header','corner','throwIn','throw','kickoff','goalKick','indirect'].includes(e.type)){
   if(w.match&&w.match.ball===e.ball){w.match.phase='play';w.match.lastChange=t;w.match.lastDecision=t+.30;}
   const g=w.groups.find(g=>g.ball===e.ball);if(g)g.since=t;
  }
 }
 for(const p of w.players){if(p.reaction&&t>=p.reaction.at&&t<p.reaction.until&&!p.action)pose(w,p,p.reaction.kind,p.reaction.until-t);if(p.reaction&&t>=p.reaction.until)p.reaction=null;p.energy=clamp(p.energy+Math.hypot(p.vx,p.vz)*DT/2200,0,1);}
 if(w.mode==='training'&&w.completed>=w.nextMatchAt&&members(w).length>=2){for(const g of w.groups)if(g.stage==='play'&&!ballById(w,g.ball)?.flight&&!actor(w,g.holder)?.kick)finishGroup(w,g);if(w.groups.every(g=>g.stage==='done'))startGather(w,context);}
 if(w.mode==='training'){
  const done=w.groups.filter(g=>g.stage==='done');for(const g of done){if(w.completed<w.nextMatchAt){const candidate=g.members.map(k=>actor(w,k)).find(p=>p&&p.energy>.35&&!w.players.some(q=>q.rest));if(candidate&&g.members.length>2){setRest(w,candidate);g.members=g.members.filter(k=>k!==candidate.key);}const b=w.balls.find(b=>b.mode==='rack'&&!b.group);if(b&&g.members.length){g.ball=b.id;b.group=g.id;configureGroup(w,g,chooseKind(w,g));}}}
 }
}
