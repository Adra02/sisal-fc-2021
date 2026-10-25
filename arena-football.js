import {DT,clamp,hash,random,bodyState,movePlayers,footPoint,length,BENCH_SEATS} from './arena-motion.js?v=arena-7';
import {allocateClip,record,action,finishStates,seatExits} from './arena-clip.js?v=arena-7';
import {clipPlayers} from './arena-training.js?v=arena-7';
import {friendlyLineup} from './arena-teams.js?v=arena-7';
const GRAVITY=9.81,BALL_RADIUS=.14;
const norm=(x,z)=>{const d=Math.hypot(x,z)||1;return [x/d,z/d];};
export function buildFriendly(snapshot,slot,startStates){
 const lineup=friendlyLineup(snapshot,slot.matchIndex),rng=random(hash('football5:'+slot.serial)),teamFor=new Map(lineup.teams.flatMap((a,t)=>a.map(k=>[k,t]))),identities=clipPlayers(snapshot).map(p=>({...p,team:teamFor.get(p.key)??(p.key==='__keeper_bot'?0:p.key==='__keeper_away_bot'?1:null),active:p.key!==lineup.benchKey,goalkeeper:p.key.startsWith('__keeper_')}));
 const states=startStates.map(p=>({...p,team:teamFor.get(p.key)??(p.key==='__keeper_bot'?0:p.key==='__keeper_away_bot'?1:null),goalkeeper:p.key.startsWith('__keeper_'),seatedTarget:p.key===lineup.benchKey,maxSpeed:4.6,aim:undefined})),byKey=new Map(states.map(p=>[p.key,p])),team=[states.filter(p=>p.team===0&&!p.goalkeeper),states.filter(p=>p.team===1&&!p.goalkeeper)],keeper=[byKey.get('__keeper_bot'),byKey.get('__keeper_away_bot')],seat=BENCH_SEATS[slot.matchIndex%BENCH_SEATS.length];
 const clip=allocateClip(identities,slot.duration);clip.scene=slot.scene;clip.lineup=lineup;clip.positions=new Float32Array(clip.frames*3);clip.scores=new Uint8Array(clip.frames*2);clip.phases=new Uint8Array(clip.frames);clip.score=[0,0];const exits=seatExits(clip,startStates,lineup.benchKey);
 let owner=team[0][0]||null,ball={pos:[0,BALL_RADIUS,0],vel:[0,0,0]},phase='kickoff',phaseAt=0,decisionAt=0,pending=null,flight=null,holdUntil=0,lastChange=-10,nextFoul=18+rng()*8,passes=0,lastTouch=0,now=0,control=null,deadSpot=[0,0],deadTeam=0,deadType='kickoff',spareBalls=[];
 const direction=t=>t===0?-1:1;
 function event(type,actor,target,pos,extra={}){clip.events.push({at:now,type,actor:actor?.key||actor||null,target:target?.key||target||null,pos:pos?[...pos]:[...ball.pos],...extra});}
 function shape(p,idx){const members=team[p.team],i=members.indexOf(p),rows=Math.max(1,Math.ceil(members.length/3)),row=Math.floor(i/3),inRow=Math.min(3,members.length-row*3),col=i%3;return [(col-(inRow-1)/2)*(inRow===3?10:12),direction(p.team)*(-10+row*(21/Math.max(1,rows-1)))];}
 function kick(from,to,type='pass'){
  if(!from||pending)return;const target=Array.isArray(to)?to:[to.x,.14,to.z],heading=Math.atan2(target[0]-from.x,target[2]-from.z);from.aim=heading;
  pending={from,to,type,at:now+.34,target};action(clip,from.key,type==='cross'?'cross':type==='shot'||type==='penalty'||type==='freeKick'?'shot':'kick',now,now+.88,{contact:now+.34});
 }
 function release(){
  const {from,to,type,target}=pending,origin=['penalty','freeKick'].includes(type)?[deadSpot[0],.14,deadSpot[1]]:footPoint(from),dest=Array.isArray(to)?[...target]:[to.x+to.vx*.22,.14,to.z+to.vz*.22],dist=Math.hypot(dest[0]-origin[0],dest[2]-origin[2]),isShot=['shot','penalty','freeKick'].includes(type),duration=isShot?clamp(dist/(15+rng()*4),.35,1.5):type==='cross'?1.35+rng()*.30:clamp(dist/8.8,.24,2.6);
  ball.pos=[...origin];ball.vel=[(dest[0]-origin[0])/duration,type==='cross'?(dest[1]-origin[1]+.5*GRAVITY*duration*duration)/duration:isShot&&type==='freeKick'?5.2:isShot?((dest[1]-origin[1])+.5*GRAVITY*duration*duration)/duration:0,(dest[2]-origin[2])/duration];
  const act=clip.actions.get(from.key).at(-1);act.footTarget=[...origin];act.contact=now;owner=null;flight={at:now,type,from:from.key,team:from.team,receiver:Array.isArray(to)?null:to.key,destination:dest,duration,curve:type==='freeKick'?(rng()>.5?1:-1)*.5:0};lastTouch=from.team;event(type,from,Array.isArray(to)?null:to,origin);pending=null;lastChange=now;
 }
 function beginRestart(type,t,spot){phase=type==='penalty'?'penalty':type==='freeKick'?'freeKick':'restart';phaseAt=now;deadSpot=[clamp(spot[0],-15.9,15.9),clamp(spot[1],-24,24)];deadTeam=t;deadType=type;owner=team[t].slice().sort((a,b)=>Math.hypot(a.x-deadSpot[0],a.z-deadSpot[1])-Math.hypot(b.x-deadSpot[0],b.z-deadSpot[1]))[0];flight=null;pending=null;ball.pos=[deadSpot[0],BALL_RADIUS,deadSpot[1]];ball.vel=[0,0,0];}
 for(let i=0;i<clip.frames;i++){
  now=Math.min(slot.duration,i*DT);
  let releasedThisTick=false;
  const attacking=owner?.team??flight?.team??deadTeam,targets=[];
  const press=owner&&!owner.goalkeeper?team[1-owner.team].slice().sort((a,b)=>Math.hypot(a.x-owner.x,a.z-owner.z)-Math.hypot(b.x-owner.x,b.z-owner.z)).slice(0,2):[];
  for(const p of states){
   p.maxSpeed=p.goalkeeper?4.8:4.6;p.priority=p===owner?.15:1;p.aim=undefined;p.elevation=0;
   let target=[p.x,p.z];
   if(p.key===lineup.benchKey){p.maxSpeed=2.2;p.aim=-Math.PI/2;target=[...seat];if(p.x>21.25&&Math.hypot(p.x-seat[0],p.z-seat[1])>1)target=[20.9,seat[1]];if(Math.hypot(p.x-seat[0],p.z-seat[1])<.12&&!clip.actions.get(p.key).some(g=>g.kind==='sit'))action(clip,p.key,'sit',now,slot.duration+1,{hold:true});}
   else if(p.goalkeeper){
    const ownGoal=p.team===0?24.8:-24.8;target=[clamp(ball.pos[0]*.27,-2.1,2.1),ownGoal];p.aim=p.team===0?Math.PI:0;
    if(flight&&flight.team!==p.team&&['shot','penalty','freeKick','volley'].includes(flight.type)&&now-flight.at>.20){const ahead=p.team===0?25.0:-25.0,tg=(ahead-ball.pos[2])/(ball.vel[2]||.01),x=ball.pos[0]+ball.vel[0]*clamp(tg,0,1.6);target=[clamp(x,-2.6,2.6),ownGoal];}
    if(owner===p&&now<holdUntil){target=[p.x,p.z];p.maxSpeed=0;}
   }else{
    const base=shape(p),dir=direction(p.team),ballX=clamp(ball.pos[0],-15,15),ballZ=clamp(ball.pos[2],-23,23),j=hash(p.key)%997;
    target=[clamp(base[0]+ballX*.24+Math.sin(now*.7+j)*.55,-14.3,14.3),clamp(base[1]+ballZ*.30+Math.cos(now*.55+j)*.55,-21.6,21.6)];
    if(phase==='play'){
     if(owner===p){target=[clamp(p.x+Math.sin(slot.serial+passes)*2,-14,14),clamp(p.z+dir*4.6,-23,23)];if(pending)target=[p.x,p.z];}
     else if(owner&&p.team===owner.team){const isWing=team[p.team].indexOf(p)%3!==1;if(isWing&&passes%3===2)target=[base[0]>=0?12:-12,clamp(owner.z+dir*6,-21,21)];else target[1]=clamp(target[1]+dir*3,-22,22);}
     else if(press.includes(p)&&owner){const n=norm(p.x-owner.x,p.z-owner.z);target=[owner.x+n[0]*.72,owner.z+n[1]*.72];}
     else if(!owner){const nearest=team[p.team].slice().sort((a,b)=>Math.hypot(a.x-ballX,a.z-ballZ)-Math.hypot(b.x-ballX,b.z-ballZ)).slice(0,2);if(nearest.includes(p))target=[ballX+ball.vel[0]*.15,ballZ+ball.vel[2]*.15];if(flight?.receiver===p.key)target=[flight.destination[0],flight.destination[2]];}
    }
    if(phase==='kickoff'){target=[...base];if(p===owner)target=[0,0];else if(Math.hypot(target[0],target[1])<3){const n=norm(target[0]||Math.sin(hash(p.key)),target[1]||1);target=[n[0]*3.2,n[1]*3.2];}}
    if(['restart','penalty','freeKick'].includes(phase)){
     if(p===owner)target=[deadSpot[0],deadSpot[1]-dir*.40];else if(p.team!==deadTeam&&phase==='freeKick'&&team[p.team].indexOf(p)<3){const k=team[p.team].indexOf(p),attack=direction(deadTeam);target=[deadSpot[0]+(k-1)*.78,clamp(deadSpot[1]+attack*9.15,-23,23)];}
     else if(phase==='penalty')target=[clamp(base[0],-13,13),clamp(deadSpot[1]-direction(deadTeam)*(3+team[p.team].indexOf(p)%3),-21,21)];
    }
    p.aim=pending?.from===p?Math.atan2(pending.target[0]-p.x,pending.target[2]-p.z):undefined;
   }
   if(phase==='foul'){target=[p.x,p.z];p.maxSpeed=0;}
   if(now<1&&exits.has(p.key)){p.seatedTarget=true;target=[21.0,p.z];p.maxSpeed=2.0;p.aim=-Math.PI/2;}
   targets.push(target);
  }
  if(i)movePlayers(states,targets,Math.min(DT,slot.duration-(i-1)*DT));
  if(pending&&now>=pending.at){release();releasedThisTick=true;}
  if(phase==='kickoff'&&owner&&now-phaseAt>2&&Math.hypot(owner.x,owner.z)<.4){phase='play';decisionAt=now+.6;event('kickoff',owner);}
  if(['restart','penalty','freeKick'].includes(phase)&&owner&&Math.hypot(owner.x-deadSpot[0],owner.z-(deadSpot[1]-direction(deadTeam)*.4))<.35&&now-phaseAt>1.0){
   phase='play';decisionAt=now+1.5;
   if(['penalty','freeKick'].includes(deadType))kick(owner,[rng()*4.6-2.3,.35+rng()*1.1,direction(deadTeam)*26.15],deadType);else{const to=team[deadTeam].find(p=>p!==owner);if(to)kick(owner,to,'pass');}
  }
  if(phase==='goal'&&now-phaseAt>1.5){const t=deadTeam;phase='kickoff';phaseAt=now;owner=team[t][Math.floor(rng()*team[t].length)]||null;ball.pos=[0,BALL_RADIUS,0];ball.vel=[0,0,0];decisionAt=now+1;}
  if(phase==='foul'&&now-phaseAt>1.6){const dir=direction(deadTeam),pen=dir*deadSpot[1]>14.0&&Math.abs(deadSpot[0])<7;beginRestart(pen?'penalty':'freeKick',deadTeam,pen?[0,dir*15]:deadSpot);event(pen?'penaltyAwarded':'freeKickAwarded',owner);}
  if(owner){
   if(phase==='play'||phase==='kickoff'){
    const foot=footPoint(owner);if(pending&&['penalty','freeKick'].includes(pending.type))ball.pos=[deadSpot[0],.14,deadSpot[1]];else if(owner.goalkeeper&&owner.holdOffset&&(now<holdUntil||pending)){const hand=[owner.x+owner.holdOffset[0],owner.holdOffset[1],owner.z+owner.holdOffset[2]],u=pending?clamp((now-(pending.at-.34))/.34):0;ball.pos=hand.map((v,i)=>v+(foot[i]-v)*u*u);}else if(control&&control.key===owner.key&&now-control.at<.22){const u=clamp((now-control.at)/.22),w=u*u*(3-2*u);ball.pos=control.point.map((v,i)=>v+(foot[i]-v)*w);}else ball.pos=foot;
   }ball.vel=[0,0,0];
   if(phase==='play'&&!pending&&now>=decisionAt){
    if(owner.goalkeeper){if(now>=holdUntil){const to=team[owner.team].slice().sort((a,b)=>Math.hypot(a.x-owner.x,a.z-owner.z)-Math.hypot(b.x-owner.x,b.z-owner.z))[0];if(to)kick(owner,to,'pass');decisionAt=now+2;}}
    else{
     const dir=direction(owner.team),mates=team[owner.team].filter(p=>p!==owner),goalDistance=26-dir*owner.z,wide=Math.abs(owner.x)>8.5;
     if(wide&&dir*owner.z>3&&mates.length){const receiver=mates.slice().sort((a,b)=>Math.abs(a.x)+Math.abs(a.z-dir*20)-Math.abs(b.x)-Math.abs(b.z-dir*20))[0];kick(owner,receiver,'cross');}
     else if(goalDistance<18&&Math.abs(owner.x)<10&&rng()<.72)kick(owner,[rng()*5.2-2.6,.3+rng()*1.2,dir*26.15],'shot');
     else if(mates.length){const ranked=mates.map(p=>({p,value:dir*(p.z-owner.z)*.6-Math.abs(Math.hypot(p.x-owner.x,p.z-owner.z)-10)+rng()*8+(passes%3===2&&Math.abs(p.x)>9?12:0)})).sort((a,b)=>b.value-a.value);kick(owner,ranked[0].p,'pass');passes++;}
     decisionAt=now+1.8+rng()*1.3;
    }
   }
   if(phase==='play'&&!owner.goalkeeper&&now-lastChange>.8){
    const close=press[0],d=close?Math.hypot(close.x-owner.x,close.z-owner.z):99;
    if(close&&d<.93&&now>=nextFoul){const victim=owner;deadSpot=[victim.x,victim.z];deadTeam=victim.team;phase='foul';phaseAt=now;nextFoul=now+24+rng()*16;action(clip,close.key,'tackle',now,now+.8);action(clip,victim.key,'fall',now,now+1.25);event('foul',close,victim);owner=null;pending=null;flight=null;ball.vel=[0,0,0];}
    else if(!pending&&close&&d<.77&&rng()<.08){const previous=owner;owner=close;lastChange=now;decisionAt=now+.75;action(clip,close.key,'trap',now,now+.4,{footTarget:footPoint(close)});event('interception',close,previous);}
   }
  }else if(phase==='play'&&flight&&!releasedThisTick){
   const prior=[...ball.pos];ball.vel[1]-=GRAVITY*DT;ball.vel[0]+=flight.curve*DT;for(let a=0;a<3;a++)ball.pos[a]+=ball.vel[a]*DT;
   if(ball.pos[1]<BALL_RADIUS){ball.pos[1]=BALL_RADIUS;if(Math.abs(ball.vel[1])>.9)ball.vel[1]*=-.40;else ball.vel[1]=0;ball.vel[0]*=.992;ball.vel[2]*=.992;}
   const defending=keeper[1-flight.team];
   if(defending&&now-flight.at>.15&&Math.abs(ball.pos[2]-defending.z)<.65&&Math.abs(ball.pos[0]-defending.x)<.80&&ball.pos[1]<1.75){
    const target=[...ball.pos];action(clip,defending.key,'save',Math.max(flight.at,now-.34),now+.75,{contact:now,handTarget:target,handOffset:[target[0]-defending.x,target[1],target[2]-defending.z],side:target[0]-defending.x>=0?1:-1});event('save',defending,flight.from,target);owner=defending;defending.holdOffset=[target[0]-defending.x,target[1],target[2]-defending.z];holdUntil=now+.8;decisionAt=holdUntil;lastChange=now;flight=null;
   }else{
    const crossed=Math.abs(prior[2])<=26&&Math.abs(ball.pos[2])>26;
    if(crossed&&Math.abs(ball.pos[0])<2.86&&ball.pos[1]<2.26){const scoring=ball.pos[2]<0?0:1;clip.score[scoring]++;event('goal',flight.from,null,ball.pos,{team:scoring,ownGoal:scoring!==flight.team});spareBalls.push({pos:[clamp(ball.pos[0],-2.7,2.7),.14,Math.sign(ball.pos[2])*27.0],at:now});for(const p of team[scoring])action(clip,p.key,'celebrate',now,now+1.4);phase='goal';phaseAt=now;deadTeam=1-scoring;owner=null;flight=null;pending=null;}
    else if((Math.abs(ball.pos[0])>17||Math.abs(ball.pos[2])>28)&&now-flight.at>.2){event('out',flight.from);beginRestart('kickIn',1-lastTouch,[clamp(ball.pos[0],-16,16),clamp(ball.pos[2],-23,23)]);}
    else if(now-flight.at>.24){
     const candidates=states.filter(p=>p.team!=null&&!p.goalkeeper&&Math.hypot(p.x-ball.pos[0],p.z-ball.pos[2])<.72);
     const receiver=candidates.sort((a,b)=>Math.hypot(a.x-ball.pos[0],a.z-ball.pos[2])-Math.hypot(b.x-ball.pos[0],b.z-ball.pos[2]))[0];
     if(receiver&&ball.pos[1]<1.0){
      if(flight.type==='cross'&&receiver.team===flight.team&&direction(receiver.team)*receiver.z>12&&ball.pos[1]>.32){const hit=[...ball.pos],dest=[rng()*4.4-2.2,.4+rng()*.6,direction(receiver.team)*26.15],duration=Math.max(.32,Math.hypot(dest[0]-hit[0],dest[2]-hit[2])/17);action(clip,receiver.key,'volley',now-.30,now+.52,{contact:now,footTarget:hit});ball.vel=[(dest[0]-hit[0])/duration,(dest[1]-hit[1]+.5*GRAVITY*duration*duration)/duration,(dest[2]-hit[2])/duration];flight={at:now,type:'volley',from:receiver.key,team:receiver.team,receiver:null,destination:dest,duration,curve:0};owner=null;lastTouch=receiver.team;lastChange=now;event('volley',receiver);}
      else{owner=receiver;control={key:receiver.key,at:now,point:[...ball.pos]};action(clip,receiver.key,'trap',now-.08,now+.5,{contact:now,footTarget:[...ball.pos]});event(receiver.team===flight.team?'receive':'interception',receiver,flight.from);flight=null;lastChange=now;decisionAt=now+.65;}
     }else if(now-flight.at>5.5){const nearest=states.filter(p=>p.team!=null&&!p.goalkeeper).sort((a,b)=>Math.hypot(a.x-ball.pos[0],a.z-ball.pos[2])-Math.hypot(b.x-ball.pos[0],b.z-ball.pos[2]))[0];if(nearest&&Math.hypot(nearest.x-ball.pos[0],nearest.z-ball.pos[2])<1){owner=nearest;flight=null;decisionAt=now+.5;lastChange=now;}}
    }
   }
  }
  ball.pos=ball.pos.map(v=>Math.round(v*100000)/100000);ball.vel=ball.vel.map(v=>Math.round(v*100000)/100000);record(clip,states,i);clip.positions.set(ball.pos,i*3);clip.scores.set(clip.score,i*2);clip.phases[i]=['kickoff','play','foul','freeKick','penalty','restart','goal'].indexOf(phase);
 }
 clip.end=finishStates(states);clip.spareBalls=spareBalls;return clip;
}
