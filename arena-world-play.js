// Activity decisions react to completed play. There is no scene duration,
// countdown, camera script or periodic repositioning in this director.
import {DT,clamp,hash} from './arena-motion.js?v=arena-6';
import {BALL_RACK,BENCH} from './arena-layout.js?v=arena-6';
import {friendlyLineup} from './arena-teams.js?v=arena-6';
import {rnd,integer,choose,shuffled,now,actor,ballById,dist,unit,emit,pose,beginPickup,beginPlace,setRest,updateRest,handPoint} from './arena-world-state.js?v=arena-6';
import {prepareKick,dribble,releaseBall,putInRack,prepareThrow} from './arena-world-ball.js?v=arena-6';

const direction=team=>team===0?-1:1;
const members=w=>w.players.filter(p=>!p.bot);
const near=(p,x,z,d=.25)=>Math.hypot(p.x-x,p.z-z)<d;
const speed=b=>Math.hypot(b.vx,b.vz);
const face=(p,b)=>p.aim=Math.atan2(b.x-p.x,b.z-p.z);
export function goalie(w,sign,context){return sign<0&&context.keeper&&w.mode!=='match'&&!actor(w,context.keeper)?.rest?actor(w,context.keeper):actor(w,sign<0?'__keeper_bot':'__keeper_away_bot');}
function aimPickup(w,p,b){
 if(b.motion&&b.owner===p.key){p.target=[p.x,p.z];p.maxSpeed=0;return;}
 const d=unit(b.x-p.x,b.z-p.z);p.target=[b.x-d[0]*.35,b.z-d[1]*.35];face(p,b);
 if(near(p,...p.target,.14)&&Math.hypot(p.vx,p.vz)<1&&b.y<.55)beginPickup(w,p,b);
}
function carryTo(w,p,b,point){
 if(b.mode==='free'&&!b.owner&&!b.motion&&b.y<.2&&Math.hypot(b.x-point[0],b.z-point[1])<.22&&speed(b)<.35)return true;
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
  const a=(index/Math.max(2,n))*Math.PI*2+g.turn*.19,r=Math.max(n>4?4:3,n*.80/(Math.PI*2));return [spot[0]+Math.sin(a)*r,spot[1]+Math.cos(a)*r];
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
 g.kind=kind;g.rounds=0;g.turn=integer(w,0,12);g.targetRounds=integer(w,3,7);g.sign=g.index%2?1:-1;
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
   const receiver=actor(w,g.members.filter(k=>k!==holder.key&&k!==g.chaser)[g.turn%Math.max(1,g.members.length-2)]||g.members.find(k=>k!==holder.key));
   if(['passes','rondo','duel'].includes(g.kind)&&receiver){g.receiver=receiver.key;prepareKick(w,holder,b,[receiver.x,.14,receiver.z],'pass',receiver.key);}
   else{const type=g.kind==='penalty'?'penalty':g.kind==='freeKick'?'freeKick':g.kind==='cross'&&actor(w,g.receiver)!==holder?'cross':'shot',to=type==='cross'?actor(w,g.receiver):null;prepareKick(w,holder,b,to?[to.x,.62,to.z]:[(rnd(w)-.5)*5.4,.35+rnd(w)*1.15,g.sign*26.5],type,to?.key||null);}
   g.lastDecision=t+1.5;
  }
  if(g.kind==='rondo'&&g.chaser&&g.chaser!==g.holder){const chaser=actor(w,g.chaser);if(chaser){const n=unit(chaser.x-b.x,chaser.z-b.z);chaser.target=[b.x+n[0]*.45,b.z+n[1]*.45];}}
  const incoming=actor(w,b.flight?.receiver);if(incoming){incoming.target=[clamp(b.x+b.vx*.18,-15,15),clamp(b.z+b.vz*.18,-24,24)];face(incoming,b);}
  if(b.mode==='hand'){g.carrier=b.owner;g.stage=g.members.includes(b.owner)?'recover':'keeperReturn';g.returnKeeper=b.owner;g.since=t;}
  else if(b.onRoof){const spare=w.balls.find(q=>q.mode==='rack'&&!q.group);if(spare){b.group=null;g.ball=spare.id;spare.group=g.id;g.stage='fetch';g.carrier=g.holder;}}
  else if(!b.flight&&!b.owner&&speed(b)<.4&&t-g.since>2){g.stage='recover';g.carrier=g.members.slice().sort((a,c)=>dist(actor(w,a),b)-dist(actor(w,c),b))[0];g.since=t;}
 }else if(g.stage==='keeperReturn'){
  const k=actor(w,g.returnKeeper);p.target=[g.spot[0],g.spot[1]-g.sign*.36];
  if(k&&b.mode==='hand'&&b.owner===k.key){k.target=[k.x,k.z];k.maxSpeed=0;face(k,p);if(!k.throw&&t-g.since>.95)prepareThrow(w,k,b,[p.target[0],.35,p.target[1]],'throw',p.key);}
  if(b.flight?.type==='throw'){g.stage='play';g.since=t;g.lastDecision=t+.75;}
 }else if(g.stage==='recover'){
  const c=actor(w,g.carrier)||p;if(b.mode==='hand'&&b.owner===c.key){if(g.nextKind){const kind=g.nextKind;delete g.nextKind;configureGroup(w,g,kind);g.carrier=c.key;g.stage='deliver';}else{g.holder=g.members.includes(c.key)?c.key:g.members[g.turn%g.members.length];g.receiver=g.members.find(k=>k!==g.holder);g.stage='deliver';}}else aimPickup(w,c,b);
 }else if(g.stage==='return'){
  const c=actor(w,g.carrier)||p,rack=[BALL_RACK.x+(Number(b.id.split('-')[1])%2)*.35,BALL_RACK.z+Math.floor(Number(b.id.split('-')[1])/2)*.34];
  const ahead=w.groups.find(q=>q.stage==='return'&&q.id<g.id);if(ahead){c.target=[16.4-g.index*.85,18+g.index*1.0];return;}
  carryTo(w,c,b,rack);
  if(!b.owner&&!b.motion&&b.y<.2&&Math.hypot(b.x-rack[0],b.z-rack[1])<.25){putInRack(w,b);g.stage='done';for(const key of g.members){const a=actor(w,key);if(a)a.group=null;}}
 }
}
function fieldShape(w,p,match){
 const list=match.teams[p.team],i=list.indexOf(p.key),rows=Math.max(1,Math.ceil(list.length/3)),row=Math.floor(i/3),cols=Math.min(3,list.length-row*3),column=i%3;return [(column-(cols-1)/2)*(cols===3?9:11),direction(p.team)*(-11+row*(21/Math.max(1,rows-1)))];
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
function planMatch(w,context){
 const m=w.match,b=ballById(w,m.ball),t=now(w),carrier=actor(w,m.carrier);if(!b)return;
 const holder=actor(w,b.owner),attacking=holder?.team??b.flight?.team??0;
 const loose=new Map([0,1].map(team=>[team,new Set(w.players.filter(p=>p.team===team&&!p.bot&&!p.rest).sort((a,c)=>dist(a,b)-dist(c,b)).slice(0,2).map(p=>p.key))]));
 const press=holder&&!holder.bot?w.players.filter(p=>p.team===1-holder.team&&!p.bot&&!p.rest).sort((a,c)=>dist(a,holder)-dist(c,holder)).slice(0,2):[];
 for(const p of w.players){
  if(p.rest)continue;
  if(p.bot){const sign=p.team===0?1:-1;p.target=p.anticipate&&t-p.anticipate.at<.5?[p.anticipate.point[0],sign*24.8]:[clamp(b.x*.23,-2.35,2.35),sign*24.8];p.aim=sign<0?0:Math.PI;}
  else if(p.team!=null){
   const base=fieldShape(w,p,m),dir=direction(p.team);p.target=[clamp(base[0]+b.x*.20+Math.sin(t*.47+hash(p.key))*.4,-14.3,14.3),clamp(base[1]+b.z*.28,-22,22)];face(p,b);
   if(m.phase==='play'){
    if(holder===p&&!p.kick){const cutInside=Math.abs(p.x)>8&&m.teams[p.team].length<2,dx=cutInside?-p.x:clamp(p.x+(m.passes%3===2?(p.x>=0?2:-2):p.x>0?-.25:.25),-13,13)-p.x,d=unit(dx,dir*4);p.target=[clamp(b.x+d[0]*.8,-16.5,16.5),clamp(b.z+d[1]*.8,-26.2,26.2)];p.aim=Math.atan2(d[0],d[1]);if(b.owner===p.key)dribble(w,p,b,d);}
    else if(press.includes(p)&&holder){const n=unit(p.x-b.x,p.z-b.z);p.target=[b.x+n[0]*.42,b.z+n[1]*.42];}
    else if(!holder){if(loose.get(p.team)?.has(p.key))p.target=[clamp(b.x+b.vx*.18,-17,17),clamp(b.z+b.vz*.18,-26.2,26.2)];}
    else if(p.team===attacking){p.target[1]=clamp(p.target[1]+dir*3,-22,22);if(m.passes%3===2&&m.teams[p.team].indexOf(p.key)%3!==1)p.target=[base[0]>0?12:-12,clamp(holder.z+dir*5,-22,22)];}
    if(b.flight?.receiver===p.key)p.target=[clamp(b.flight.destination[0],-15,15),clamp(b.flight.destination[2],-24,24)];
   }else if(['gather','kickoff'].includes(m.phase)){
    p.target=[...base];
    if(p.key===m.holder)p.target=m.phase==='gather'?[1.6,-direction(p.team)*1.4]:[0,-direction(p.team)*.36];
    else p.target[1]=-direction(p.team)*(3+Math.abs(base[1])*.8);
   }else if(['restart','placeRestart','readyRestart'].includes(m.phase)){
    const spot=m.spot;if(p.key===m.taker)p.target=[spot[0],spot[1]-direction(p.team)*.36];
    else if(p.team!==m.deadTeam&&m.restart==='freeKick'&&m.teams[p.team].indexOf(p.key)<3){const i=m.teams[p.team].indexOf(p.key);p.target=[clamp(spot[0]+(i-1)*.8,-15,15),clamp(spot[1]+direction(m.deadTeam)*9.15,-24,24)];}
    else p.target=[base[0],clamp(base[1]-direction(m.deadTeam)*3,-22,22)];
    if(p.key!==m.taker&&Math.hypot(p.target[0]-spot[0],p.target[1]-spot[1])<2.1){const a=(hash(p.key)%628)/100;p.target=[spot[0]+Math.sin(a)*2.6,spot[1]+Math.cos(a)*2.6];}
   }else if(m.phase==='goal'||m.phase==='foul'){p.maxSpeed=1.7;p.target=[p.x+Math.sin(hash(p.key))*.3,p.z+Math.cos(hash(p.key))*.3];}
  }
 }
 if(m.phase==='gather'){
  if(w.groups.some(g=>g.stage!=='done'))return;
  if(carrier)carryTo(w,carrier,b,[0,0]);
  const ready=w.players.filter(p=>p.team!=null&&!p.bot&&!p.rest&&p.key!==m.carrier).every(p=>Math.hypot(p.x-p.target[0],p.z-p.target[1])<1.1);
  if(!b.owner&&!b.motion&&Math.hypot(b.x,b.z)<.25&&ready){m.phase='kickoff';m.since=t;w.mode='match';m.holder=m.teams[0][0];}
 }else if(m.phase==='kickoff'){
  const p=actor(w,m.holder);if(p){p.target=[b.x,b.z-direction(p.team)*.36];p.aim=direction(p.team)<0?Math.PI:0;if(near(p,...p.target,.17)&&Math.hypot(p.vx,p.vz)<.8){b.owner=p.key;m.phase='play';m.lastDecision=t+.6;emit(w,'kickoff',p,null,b,{team:p.team});}}
 }else if(m.phase==='play'){
  if(holder?.bot&&b.mode==='hand'){
   holder.target=[holder.x,holder.z];holder.maxSpeed=0;
   if(t>=(m.heldUntil||0)){const receiver=m.teams[holder.team].map(k=>actor(w,k)).sort((a,c)=>dist(a,holder)-dist(c,holder))[0];if(receiver)prepareThrow(w,holder,b,[receiver.x,.35,receiver.z],'throw',receiver.key);}
  }else if(holder&&!holder.bot&&b.owner===holder.key&&!holder.kick&&t>=m.lastDecision){
   const mates=m.teams[holder.team].map(k=>actor(w,k)).filter(p=>p!==holder),dir=direction(holder.team),goalDistance=26-dir*holder.z;
   if(Math.abs(holder.x)>8.5&&dir*holder.z>2&&mates.length){const receiver=mates.slice().sort((a,c)=>Math.abs(a.x)+Math.abs(a.z-dir*20)-Math.abs(c.x)-Math.abs(c.z-dir*20))[0];prepareKick(w,holder,b,[receiver.x,.6,receiver.z],'cross',receiver.key);}
   else if(goalDistance<18&&Math.abs(holder.x)<14.5&&(rnd(w)<.75||!mates.length))prepareKick(w,holder,b,[(rnd(w)-.5)*5.2,.35+rnd(w)*1.1,dir*26.4],'shot');
   else if(mates.length){const ranked=mates.map(p=>({p,value:dir*(p.z-holder.z)*.6-Math.abs(dist(p,holder)-9)+rnd(w)*7+(m.passes%3===2&&Math.abs(p.x)>8?10:0)})).sort((a,c)=>c.value-a.value);prepareKick(w,holder,b,[ranked[0].p.x,.14,ranked[0].p.z],'pass',ranked[0].p.key);m.passes++;}
   m.lastDecision=t+1.0+rnd(w)*1.1;
  }
  if(holder&&!holder.bot&&b.owner===holder.key&&t-m.lastChange>.65){const defender=press[0];if(defender&&dist(defender,b)<.62&&dist(defender,holder)<.85){
   if(m.passes>=m.nextFoul&&dist(holder,b)>.40){m.phase='foul';m.since=t;m.deadTeam=holder.team;m.spot=[b.x,b.z];m.victim=holder.key;m.nextFoul=m.passes+integer(w,9,18);b.owner=null;b.vx*=.12;b.vz*=.12;holder.kick=null;pose(w,holder,'fall',1.3,{dirty:true});pose(w,defender,'tackle',.8);emit(w,'foul',defender,holder,b);}
   else if(!holder.kick&&rnd(w)<.12){b.owner=defender.key;m.holder=defender.key;m.lastChange=t;m.lastDecision=t+.6;b.vx*=.25;b.vz*=.25;pose(w,defender,'trap',.45,{contact:t,footTarget:[b.x,b.y,b.z]});emit(w,'interception',defender,holder,b);}
  }}
 }else if(m.phase==='foul'&&t-m.since>1.5){const dir=direction(m.deadTeam),pen=dir*m.spot[1]>14&&Math.abs(m.spot[0])<7;requestRestart(w,pen?'penalty':'freeKick',m.deadTeam,pen?[0,dir*15]:m.spot);}
 else if(['restart','placeRestart'].includes(m.phase)){
  const p=actor(w,m.taker);if(p){if(m.restart==='throwIn'){
   if(b.mode==='hand'&&b.owner===p.key){p.target=[...m.spot];const mate=m.teams[p.team].map(k=>actor(w,k)).filter(q=>q!==p).sort((a,c)=>dist(a,p)-dist(c,p))[0];if(mate){face(p,mate);if(near(p,...m.spot,.18)&&Math.hypot(p.vx,p.vz)<.7){prepareThrow(w,p,b,[mate.x,.35,mate.z],'throwIn',mate.key);m.phase='throwing';}}else{beginPlace(w,p,b,m.spot);m.phase='readyRestart';}}else aimPickup(w,p,b);
  }else{carryTo(w,p,b,m.spot);if(!b.owner&&!b.motion&&Math.hypot(b.x-m.spot[0],b.z-m.spot[1])<.23){m.phase='readyRestart';m.since=t;}}}
 }else if(m.phase==='readyRestart'){
  const p=actor(w,m.taker);if(p&&near(p,...p.target,.16)&&speed(b)<.3&&!p.kick){
   if(m.restart==='kickoff'){m.holder=p.key;m.phase='kickoff';}
   else if(['penalty','freeKick'].includes(m.restart))prepareKick(w,p,b,[(rnd(w)-.5)*4.8,.4+rnd(w),direction(p.team)*26.4],m.restart);
   else if(m.restart==='corner'){const receiver=m.teams[p.team].map(k=>actor(w,k)).filter(q=>q!==p).sort((a,c)=>Math.abs(a.x)-Math.abs(c.x))[0];if(receiver)prepareKick(w,p,b,[receiver.x,.7,receiver.z],'corner',receiver.key);}
   else{const receiver=m.teams[p.team].map(k=>actor(w,k)).find(q=>q!==p);if(receiver)prepareKick(w,p,b,[receiver.x,.14,receiver.z],'pass',receiver.key);else{m.phase='play';b.owner=p.key;}}
  }
 }else if(m.phase==='goal'&&t-m.since>2.1){
  if(m.score.some(s=>s>=m.targetGoals)){m.phase='finish';m.since=t;emit(w,'matchEnd',null,null,b,{score:[...m.score]});}
  else requestRestart(w,'kickoff',m.deadTeam,[0,0]);
 }else if(m.phase==='finish'){
  const p=actor(w,m.carrier)||members(w).find(p=>!p.rest);if(p)carryTo(w,p,b,[BALL_RACK.x,BALL_RACK.z]);
  if(b.mode==='free'&&!b.owner&&!b.motion&&Math.hypot(b.x-BALL_RACK.x,b.z-BALL_RACK.z)<.25){putInRack(w,b);w.mode='training';w.match=null;w.groups=[];w.nextMatchAt=w.completed+integer(w,24,46);for(const a of w.players){a.team=null;a.group=null;if(a.rest?.reason==='odd'){a.rest.phase='rise';a.rest.riseAt=t;}}}
 }
}
function requestRestart(w,type,team,spot){
 const m=w.match,b=ballById(w,m.ball);m.restart=type;m.deadTeam=team;m.spot=[type==='throwIn'?Math.sign(spot[0])*17.25:clamp(spot[0],-16.6,16.6),clamp(spot[1],-25.6,25.6)];m.taker=m.teams[team].map(k=>actor(w,k)).filter(Boolean).sort((a,c)=>dist(a,b)-dist(c,b))[0]?.key;m.phase='restart';m.since=now(w);m.restarts++;m.holder=m.taker;
 if(b.owner&&b.owner!==m.taker){b.owner=null;b.mode='free';b.motion=null;b.vy=0;}b.net=null;b.flight=null;
 emit(w,type==='penalty'?'penaltyAwarded':type==='freeKick'?'freeKickAwarded':type==='corner'?'cornerAwarded':'restart',actor(w,m.taker),null,b);
}
export function planWorld(w,context){
 const t=now(w);for(const p of w.players){p.target=[p.x,p.z];p.maxSpeed=p.bot?4.6:4.3;p.priority=1;p.aim=undefined;p.elevation=0;p.seatedTarget=false;if(p.action&&p.action.end<t)p.action=null;}
 if(w.mode==='training'&&!(w.completed>=w.nextMatchAt&&members(w).length>=2&&w.groups.every(g=>g.stage==='done'))){
  if(!w.groups.some(g=>g.stage!=='done'))w.groups=[];
  if(!w.groups.length)assignGroups(w,context);
  for(const g of w.groups)if(g.stage!=='done')planGroup(w,g,context);
 }else if(w.match){for(const g of w.groups)if(g.stage!=='done')planGroup(w,g,context);planMatch(w,context);}
 // Resting players approach from the front, backstep and rise before leaving.
 for(const p of w.players){if(p.rest){const target=updateRest(w,p);if(target)p.target=target;}if(p.kick){const b=ballById(w,p.kick.ball),h=Math.atan2(p.kick.target[0]-b.x,p.kick.target[2]-b.z);p.aim=h;p.target=p.kick.stage==='swing'?[p.x,p.z]:[b.x-Math.sin(h)*.36,b.z-Math.cos(h)*.36];p.maxSpeed=p.kick.stage==='swing'?0:2.5;p.priority=.2;}
  if(!p.rest&&!p.bot&&p.group==null&&w.mode==='training'&&Math.hypot(p.x-BALL_RACK.x,p.z-BALL_RACK.z)<2.2){p.target=[15.8,18+(hash(p.key)%5)*1.1];}
  if(p.bot&&w.mode==='training'&&!w.groups.some(g=>goalie(w,g.sign,context)?.key===p.key)){p.target=[p.key==='__keeper_bot'?4:-4,p.key==='__keeper_bot'?-23.5:23.5];p.aim=p.key==='__keeper_bot'?0:Math.PI;}
  if(p.action?.kind==='fall'&&t-p.action.start<.9)p.target=[p.x,p.z],p.maxSpeed=0;
  if(p.throw){p.target=[p.x,p.z];p.maxSpeed=0;p.aim=Math.atan2(p.throw.target[0]-p.x,p.throw.target[2]-p.z);}
  if(p.action?.kind==='header')p.elevation=.12*Math.sin(clamp((t-p.action.start)/(p.action.end-p.action.start))*Math.PI);
 }
}
function crossingGoal(b){const before=b.previous||[b.x,b.y,b.z];if(Math.abs(before[2])<=26.14&&Math.abs(b.z)>26.14&&Math.abs(b.x)<2.86&&b.y<2.26)return Math.sign(b.z);return 0;}
function receive(w,p,b,event='receive'){
 const from=b.flight?.from;b.owner=p.key;b.lastTouch=p.key;b.flight=null;b.vx*=.15;b.vz*=.15;b.vy=Math.min(0,b.vy)*.1;p.nextTouch=now(w)+.35;pose(w,p,'trap',.52,{contact:now(w),footTarget:[b.x,b.y,b.z]});emit(w,event,p,from,b);
 if(w.match&&w.match.ball===b.id){w.match.holder=p.key;w.match.lastChange=now(w);w.match.lastDecision=now(w)+.65;}
 const g=w.groups.find(g=>g.ball===b.id);if(g){g.holder=p.key;g.rounds++;g.turn++;g.lastDecision=now(w)+.65;w.completed++;if(g.kind==='rondo'&&event==='interception')g.chaser=from;}
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
   if(k&&toward&&Math.abs(b.z-k.z)<.65&&Math.abs(b.x-k.x)<.74&&b.y<1.85){
    const incoming=speed(b),catchable=incoming<16&&Math.abs(b.x-k.x)<.45&&b.y>.30&&b.y<1.5&&rnd(w)<.64,point=[b.x,b.y,b.z],side=b.x>=k.x?1:-1;
    pose(w,k,'save',.95,{contact:t,handTarget:point,handOffset:[b.x-k.x,b.y,b.z-k.z],side,jumpHeight:b.y>1.5?.16:0});
    if(catchable){b.owner=k.key;b.mode='hand';b.handSide=side;b.grip={at:t,offset:[b.x-k.x,b.y,b.z-k.z]};b.flight=null;b.motion=null;emit(w,'save',k,b.lastTouch,b,{saveType:'catch'});if(m){m.holder=k.key;m.heldUntil=t+.9;}else if(g){g.stage='keeperReturn';g.since=t;g.returnKeeper=k.key;g.carrier=k.key;g.holder=g.members[(g.turn+1)%g.members.length];}}
    else{b.vx=side*(2.5+rnd(w)*3);b.vz=-sign*(2.5+rnd(w)*4);b.vy=1.5+rnd(w)*2;b.lastTouch=k.key;b.flight={...b.flight,from:k.key,type:'deflection',at:t};emit(w,'save',k,null,b,{saveType:'deflect'});}
    w.completed++;continue;
   }
  }
  const goal=crossingGoal(b);if(goal){
   const scorer=b.flight?.from||b.lastTouch;b.net=goal;b.owner=null;b.flight=null;b.vx*=.35;b.vz*=.3;emit(w,'goal',actor(w,scorer),null,b,{team:goal<0?0:1});w.completed++;
   if(m){const scoring=goal<0?0:1;m.score[scoring]++;m.phase='goal';m.since=t;m.deadTeam=1-scoring;m.carrier=m.teams[m.deadTeam].slice().sort((a,c)=>dist(actor(w,a),b)-dist(actor(w,c),b))[0];
    for(const p of w.players)if(p.kick?.ball===b.id)p.kick=null;
    for(const [i,key]of m.teams[scoring].entries()){const p=actor(w,key);p.reaction={kind:['celebrate','arms','salute','crowd'][hash(key+w.eventId)%4],at:t+.15+(i%4)*.18,until:t+1.9+(i%3)*.12};}
   }else if(g){g.rounds++;g.stage='recover';g.carrier=g.members[(g.turn+1)%g.members.length];g.holder=g.carrier;g.since=t;b.net=null;}
   continue;
  }
  if(m&&m.phase==='play'&&(Math.abs(b.x)>17.15||Math.abs(b.z)>26.6)){
   const last=actor(w,b.lastTouch),team=last?.team??0;if(Math.abs(b.z)>26.6){const end=Math.sign(b.z),defending=end<0?1:0;requestRestart(w,team===defending?'corner':'goalKick',1-team,team===defending?[Math.sign(b.x||1)*16.5,end*25.5]:[0,end*21]);}
   else requestRestart(w,'throwIn',1-team,[Math.sign(b.x)*16.6,clamp(b.z,-23,23)]);continue;
  }
  if(m&&!b.owner&&!b.flight&&b.y<.30&&speed(b)<3){const receiver=w.players.filter(p=>!p.bot&&!p.rest&&p.team!=null&&dist(p,b)<.66).sort((a,c)=>dist(a,b)-dist(c,b))[0];if(receiver){receive(w,receiver,b,'receive');continue;}}
  if(g&&(Math.abs(b.x)>17.5||Math.abs(b.z)>28||b.onRoof)){g.stage='recover';g.carrier=g.members.slice().sort((a,c)=>dist(actor(w,a),b)-dist(actor(w,c),b))[0];g.rounds++;w.completed++;emit(w,'out',b.lastTouch,null,b);b.flight=null;}
  if(g&&b.flight&&t-b.flight.at>5.5&&b.y<.4&&speed(b)<1){b.flight=null;g.stage='recover';g.carrier=g.members.slice().sort((a,c)=>dist(actor(w,a),b)-dist(actor(w,c),b))[0];g.since=t;}
  if(b.flight&&t-b.flight.at>.2&&b.y<1.1){
   const eligible=w.players.filter(p=>!p.bot&&!p.rest&&p.key!==b.flight.from&&(m?p.team!=null:g?.members.includes(p.key))&&Math.hypot(p.x-b.x,p.z-b.z)<.64).sort((a,c)=>dist(a,b)-dist(c,b)),receiver=eligible[0];
   if(receiver){
    const dir=m?direction(receiver.team):g?.sign||-1,goodCross=['cross','corner'].includes(b.flight.type)&&b.y>.34&&dir*receiver.z>12;
    if(goodCross){const from=b.flight.from,point=[b.x,b.y,b.z];pose(w,receiver,'volley',.75,{contact:t,footTarget:point});releaseBall(w,receiver,b,[(rnd(w)-.5)*4.7,.45+rnd(w)*.6,dir*26.4],'volley');emit(w,'combination',receiver,from,b);}
    else receive(w,receiver,b,m&&receiver.team!==b.flight.team?'interception':g?.chaser===receiver.key?'interception':'receive');
   }
  }
  if(b.flight&&['cross','corner'].includes(b.flight.type)&&b.vy<0&&b.y>=1.28&&b.y<1.82){
   const receiver=w.players.filter(p=>!p.bot&&!p.rest&&p.key!==b.flight.from&&(m?p.team!=null:g?.members.includes(p.key))&&dist(p,b)<.52).sort((a,c)=>dist(a,b)-dist(c,b))[0];
   if(receiver){const from=b.flight.from,dir=m?direction(receiver.team):g.sign;pose(w,receiver,'header',.7,{contact:t,jumpHeight:.12});releaseBall(w,receiver,b,[(rnd(w)-.5)*4.2,.5,dir*26.5],'header');emit(w,'combination',receiver,from,b);}
  }
  if(g&&g.stage==='play'&&g.rounds>=g.targetRounds&&!b.flight&&!actor(w,g.holder)?.kick){if(w.completed>=w.nextMatchAt&&members(w).length>=2)finishGroup(w,g);else{g.stage='recover';g.carrier=b.owner||g.holder;g.nextKind=chooseKind(w,g);}}
 }
}
export function afterWorld(w,context){
 const t=now(w);
 for(const e of w.newEvents){
  if(['pass','cross','shot','penalty','freeKick','volley','header','corner','throwIn','throw'].includes(e.type)){
   if(w.match&&w.match.ball===e.ball){w.match.phase='play';w.match.lastChange=t;}
   const g=w.groups.find(g=>g.ball===e.ball);if(g)g.since=t;
  }
 }
 for(const p of w.players){if(p.reaction&&t>=p.reaction.at&&t<p.reaction.until&&!p.action)pose(w,p,p.reaction.kind,p.reaction.until-t);if(p.reaction&&t>=p.reaction.until)p.reaction=null;p.energy=clamp(p.energy+Math.hypot(p.vx,p.vz)*DT/2200,0,1);}
 if(w.mode==='training'&&w.completed>=w.nextMatchAt&&members(w).length>=2){for(const g of w.groups)if(g.stage==='play'&&!ballById(w,g.ball)?.flight&&!actor(w,g.holder)?.kick)finishGroup(w,g);if(w.groups.every(g=>g.stage==='done'))startGather(w,context);}
 if(w.mode==='training'){
  const done=w.groups.filter(g=>g.stage==='done');for(const g of done){if(w.completed<w.nextMatchAt){const candidate=g.members.map(k=>actor(w,k)).find(p=>p&&p.energy>.35&&!w.players.some(q=>q.rest));if(candidate&&g.members.length>2){setRest(w,candidate);g.members=g.members.filter(k=>k!==candidate.key);}const b=w.balls.find(b=>b.mode==='rack'&&!b.group);if(b&&g.members.length){g.ball=b.id;b.group=g.id;configureGroup(w,g,chooseKind(w,g));}}}
 }
}
