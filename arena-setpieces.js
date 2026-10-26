import {DT,clamp,hash,random,movePlayers,footPoint,BENCH_SEATS} from './arena-motion.js?v=arena-10';
import {allocateClip,record,action,finishStates,seatExits} from './arena-clip.js?v=arena-10';
import {clipPlayers} from './arena-training.js?v=arena-10';
const G=9.81;
export function buildSetPiece(snapshot,slot,startStates){
 const rng=random(hash('set-piece5:'+slot.serial)),source=clipPlayers(snapshot),real=source.filter(p=>!p.goalkeeper),count=real.length,rotation=((slot.serial%Math.max(1,count))+count)%Math.max(1,count),cast=[...real.slice(rotation),...real.slice(0,rotation)].slice(0,6),keys=new Set(cast.map(p=>p.key)),players=source.map(p=>({...p,active:keys.has(p.key)||p.key==='__keeper_bot'})),states=startStates.map(p=>({...p,team:null,maxSpeed:4.4,seatedTarget:false,priority:keys.has(p.key)?.25:1,aim:undefined})),map=new Map(states.map(p=>[p.key,p])),[a,b,c,d,e,f]=cast.map(p=>map.get(p.key)),k=map.get('__keeper_bot'),side=rng()>.5?1:-1,isCross=slot.scene.kind==='cross',isFoul=slot.scene.kind==='foul'&&cast.length>1;
 const clip=allocateClip(players,slot.duration);clip.positions=new Float32Array(clip.frames*3);clip.scene=slot.scene;clip.events=[];const exits=seatExits(clip,startStates);clip.phases=new Uint8Array(clip.frames);
 if(!a){for(let i=0;i<clip.frames;i++)record(clip,states,i);clip.end=finishStates(states);return clip;}
 let spot=isCross?[12*side,-13]:slot.scene.kind==='penalty'?[0,-15]:[side*3,-11.5],ball={pos:[0,.14,0],vel:[0,0,0]},stage='setup',stageAt=0,owner=a,shot=null,now=0,nextAt=0,attempts=0,fouled=false,collector=null,events=[];
 const fixed=new Map();const set=(p,x,z)=>{if(p)fixed.set(p.key,[x,z]);};
 set(a,spot[0],spot[1]+.40);set(b,isCross?0:-4,isCross?-21:-13);set(c,isCross?-3:4,isCross?-19:-13);set(d,1,slot.scene.kind==='penalty'?-10:-20.65);set(e,0,slot.scene.kind==='penalty'?-10:-20.65);set(f,-1,slot.scene.kind==='penalty'?-10:-20.65);set(k,0,-24.8);
 if(isFoul){spot=[0,-9];set(a,0,-8.6);set(b,.72,-8.6);}
 const event=(type,p,target,extra={})=>events.push({at:now,type,actor:p?.key||null,target:target?.key||null,pos:[...ball.pos],...extra});
 function begin(from,to,type,flightTime,height,arc=0){const origin=footPoint(from),heading=Math.atan2(to[0]-origin[0],to[2]-origin[2]);from.aim=heading;const act={from,to,type,release:now+.34,duration:flightTime,height,curve:arc,fromPoint:origin};shot=act;stage='windup';stageAt=now;action(clip,from.key,type==='cross'?'cross':type==='volley'?'volley':'shot',now,now+.94,{contact:act.release,footTarget:origin});}
 for(let i=0;i<clip.frames;i++){
  now=Math.min(slot.duration,i*DT);let releasedThisTick=false;const targets=[];
  for(const p of states){p.maxSpeed=4.4;p.aim=undefined;p.seatedTarget=false;p.elevation=0;let target=fixed.get(p.key)||[p.x,p.z];
   if(p.goalkeeper){p.aim=p.key==='__keeper_bot'?0:Math.PI;if(p.key==='__keeper_away_bot')target=[0,24.8];}
   if(p===a)p.aim=Math.atan2(-p.x,-26-p.z);
   if(stage==='windup'&&shot?.from===p){target=[p.x,p.z];p.maxSpeed=0;p.aim=Math.atan2(shot.to[0]-p.x,shot.to[2]-p.z);}
   if(stage==='flight'&&shot?.type==='freeKick'&&[c,d,e,f].includes(p)&&Math.abs(p.z-ball.pos[2])<3){p.elevation=Math.max(0,Math.sin((now-shot.release)*5))*.17;}
   if(stage==='flight'&&p===k&&shot&&now-shot.release>.20&&shot.type!=='cross'){const t=(-24.7-ball.pos[2])/(ball.vel[2]||.01);target=[clamp(ball.pos[0]+ball.vel[0]*Math.max(0,t),-2.5,2.5),-24.8];}
   if(stage==='collect'&&p===collector)target=[clamp(ball.pos[0],-28,26),clamp(ball.pos[2]+.30,-30,30)];
   if(!keys.has(p.key)&&!p.goalkeeper){const phase=Math.floor(now/(3.8+(hash(p.key)%9)*.17)),r=hash(p.key+slot.serial+':'+phase);target=[p.x+Math.sin(r)*.13,p.z+Math.cos(r)*.13];p.maxSpeed=.8;}
   if(p!==a&&(!isFoul||fouled)){const dx=p.x-spot[0],dz=p.z-(spot[1]+.40),distance=Math.hypot(dx,dz);if(distance<1.55){const h=hash(p.key),ux=distance>.01?dx/distance:Math.sin(h),uz=distance>.01?dz/distance:Math.cos(h);target=[spot[0]+ux*2,spot[1]+.4+uz*2];}}
   if(now<1&&exits.has(p.key)){p.seatedTarget=true;target=[21.0,p.z];p.maxSpeed=2.0;p.aim=-Math.PI/2;}
   targets.push(target);
  }
  if(i)movePlayers(states,targets,Math.min(DT,slot.duration-(i-1)*DT));
  if(owner){const foot=footPoint(owner);if(stage==='windup'&&['penalty','freeKick'].includes(shot?.type))ball.pos=[spot[0],.14,spot[1]];else if(owner===k&&k.holdOffset&&(stage==='held'||stage==='windup')){const hand=[k.x+k.holdOffset[0],k.holdOffset[1],k.z+k.holdOffset[2]],u=stage==='windup'?clamp((now-stageAt)/.34):0;ball.pos=hand.map((v,j)=>v+(foot[j]-v)*u*u);}else ball.pos=foot;}
  if(stage==='setup'&&now>nextAt+3&&Math.hypot(a.x-spot[0],a.z-(spot[1]+.40))<.44&&now>6){
   if(isFoul&&!fouled&&b&&Math.hypot(a.x-b.x,a.z-b.z)<.85){fouled=true;stage='foul';stageAt=now;action(clip,a.key,'fall',now,now+1.25);action(clip,b.key,'tackle',now,now+.85);event('foul',b,a);owner=null;ball.vel=[0,0,0];}
   else if(!isFoul||fouled){
    if(isCross&&b)begin(a,[b.x,.58,b.z],'cross',1.55,.58);
    else begin(a,[rng()*4.6-2.3,.35+rng()*1.1,-26.25],slot.scene.kind==='penalty'?'penalty':'freeKick',Math.max(slot.scene.kind==='penalty'?.65:1.05,Math.abs(-26-a.z)/17),.7,slot.scene.kind==='freeKick'?.7:0);
   }
  }
  if(stage==='foul'&&now-stageAt>1.5){stage='setup';nextAt=now;owner=a;spot=[a.x,a.z-.40];fixed.set(a.key,[a.x,a.z]);for(const [j,p]of [c,d,e].entries())if(p)fixed.set(p.key,[spot[0]+(j-1)*.78,spot[1]-9.15]);event('freeKickAwarded',a,b);}
  if(stage==='windup'&&now>=shot.release){
   const origin=['penalty','freeKick'].includes(shot.type)?[spot[0],.14,spot[1]]:footPoint(shot.from);if(shot.type==='volley')origin[1]=ball.pos[1];ball.pos=[...origin];const duration=shot.duration;ball.vel=[(shot.to[0]-origin[0])/duration,shot.type==='return'?0:(shot.to[1]-origin[1]+.5*G*duration*duration)/duration,(shot.to[2]-origin[2])/duration];shot.fromPoint=origin;const act=clip.actions.get(shot.from.key).at(-1);act.footTarget=[...origin];act.contact=now;owner=null;stage='flight';releasedThisTick=true;stageAt=now;event(shot.type,shot.from,shot.type==='cross'?b:null);attempts++;
  }
  if(stage==='flight'&&!releasedThisTick){
   const prior=[...ball.pos];ball.vel[1]-=G*DT;ball.vel[0]+=shot.curve*DT;for(let j=0;j<3;j++)ball.pos[j]+=ball.vel[j]*DT;if(ball.pos[1]<.14){ball.pos[1]=.14;ball.vel[1]*=-.36;ball.vel[0]*=.98;ball.vel[2]*=.98;}
   const blocker=shot.type==='freeKick'?[c,d,e,f].filter(Boolean).find(p=>Math.hypot(p.x-ball.pos[0],p.z-ball.pos[2])<.42&&ball.pos[1]<1.50+p.elevation):null;
   if(blocker){event('block',blocker,shot.from);action(clip,blocker.key,'cover',now-.12,now+.6);ball.vel[2]*=-.38;ball.vel[0]+=(rng()-.5)*3;shot.type='rebound';}
   else if(shot.type==='cross'&&b&&now-shot.release>1.1&&Math.hypot(b.x-ball.pos[0],b.z-ball.pos[2])<.85&&ball.pos[1]<1.1){const contact=[...ball.pos],dest=[rng()*4-2,.55,-26.20],duration=.55;action(clip,b.key,'volley',now-.30,now+.52,{contact:now,footTarget:contact});event('volley',b);shot={from:b,to:dest,type:'volley',release:now,duration,curve:0};ball.vel=[(dest[0]-contact[0])/duration,(dest[1]-contact[1]+.5*G*duration*duration)/duration,(dest[2]-contact[2])/duration];owner=null;stageAt=now;ball.pos=contact;}
   else if(shot.type!=='cross'&&shot.type!=='return'&&Math.abs(ball.pos[2]-k.z)<.65&&Math.abs(ball.pos[0]-k.x)<.75&&ball.pos[1]<1.75){const point=[...ball.pos];action(clip,k.key,'save',Math.max(shot.release,now-.4),now+.7,{contact:now,handTarget:point,handOffset:[point[0]-k.x,point[1],point[2]-k.z],side:point[0]>=k.x?1:-1});event('save',k,shot.from);stage='held';stageAt=now;owner=k;k.holdOffset=[point[0]-k.x,point[1],point[2]-k.z];collector=k;ball.vel=[0,0,0];}
   else if(prior[2]>=-26&&ball.pos[2]<-26&&Math.abs(ball.pos[0])<2.86&&ball.pos[1]<2.26){event('goal',shot.from,null,{team:0});stage='collect';stageAt=now;collector=c||b||a;owner=null;ball.pos=[clamp(ball.pos[0],-2.7,2.7),.14,-27.0];ball.vel=[0,0,0];}
   else if(now-stageAt>4.0||Math.abs(ball.pos[0])>28||Math.abs(ball.pos[2])>29){event('out',shot.from);stage='collect';stageAt=now;collector=c||b||a;ball.vel=[0,0,0];ball.pos[0]=clamp(ball.pos[0],-26,26);ball.pos[2]=clamp(ball.pos[2],-29,29);}
  }
  if(stage==='collect'&&collector&&Math.hypot(collector.x-ball.pos[0],collector.z-ball.pos[2])<.55){owner=collector;stage='held';stageAt=now;event('collect',collector);}
  if(stage==='held'&&now-stageAt>1.0){const origin=footPoint(owner),target=footPoint(a),time=Math.max(.6,Math.hypot(origin[0]-target[0],origin[2]-target[2])/9);begin(owner,target,'return',time,.14);}
  // A returned ball is trapped rather than counted as another attempt on goal.
  if(stage==='flight'&&shot?.type==='return'&&Math.hypot(a.x-ball.pos[0],a.z-ball.pos[2])<.7&&now-stageAt>.2){owner=a;action(clip,a.key,'trap',now,now+.45,{footTarget:[...ball.pos]});stage='setup';nextAt=now-1;shot=null;}
  ball.pos=ball.pos.map(v=>Math.round(v*100000)/100000);ball.vel=ball.vel.map(v=>Math.round(v*100000)/100000);record(clip,states,i);clip.positions.set(ball.pos,i*3);clip.phases[i]=['setup','windup','flight','held','collect','foul'].indexOf(stage);
 }
 clip.events=events;clip.end=finishStates(states);clip.attempts=attempts;return clip;
}
