// Procedural skills are selected from the actual ball/space, never from a timer-only scene.
import {FIELD} from './arena-layout.js?v=arena-11';
import {clamp,hash} from './arena-motion.js?v=arena-11';
import {now,actor,dist,unit,rnd,pose,emit} from './arena-world-state.js?v=arena-11';
import {releaseBall} from './arena-world-ball.js?v=arena-11';
import {TECHNIQUES} from './arena-technique-data.js?v=arena-11';
import {predictBall} from './arena-ball-flight.js?v=arena-11';
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function receiveHeading(p,b,d){const toBall=Math.atan2(b.x-p.x,b.z-p.z),toGoal=d<0?Math.PI:0;return toBall+angle(toGoal,toBall)*.35;}
export function chooseGroundTechnique(w,p,b,target,normal){
 const t=now(w);if(t-(p.lastTechnique??-30)<7)return normal;
 const distance=Math.hypot(target[0]-b.x,target[2]-b.z),turn=Math.abs(angle(Math.atan2(target[0]-b.x,target[2]-b.z),p.heading));let kind=normal;
 if(normal==='pass'&&distance<9&&turn>1.65&&rnd(w)<.38)kind='heelPass';
 else if(normal==='pass'&&distance>4&&distance<19&&turn>.25&&turn<1.6&&rnd(w)<.28)kind='outsidePass';
 else if(normal==='shot'&&distance>6&&distance<17){const r=rnd(w);if(r<.24)kind='outsideShot';else if(r<.35&&distance<13)kind='chip';}
 if(kind!==normal)p.lastTechnique=t;return kind;
}
export function startDribbleSkill(w,p,b,opponent){
 const t=now(w);if(p.skill||p.kick||b.owner!==p.key||b.y>.25||dist(p,b)>.61||dist(p,opponent)<1.1||dist(p,opponent)>2.7||t-(p.lastSkill??-20)<8||rnd(w)>.07)return false;
 const lateral=(opponent.x-p.x)*Math.cos(p.heading)-(opponent.z-p.z)*Math.sin(p.heading),speed=Math.hypot(p.vx,p.vz),recent=p.recentSkills||[];
 const weighted=[{kind:'stepover',weight:speed>2.1?3:1},{kind:'bodyFeint',weight:Math.abs(lateral)>.45?3:2},{kind:'soleRoll',weight:speed<2.1?3:1}].map(x=>({...x,weight:x.weight*(recent.at(-1)===x.kind?.16:recent.includes(x.kind)?.6:1)}));
 let ticket=rnd(w)*weighted.reduce((sum,x)=>sum+x.weight,0),kind=weighted.at(-1).kind;for(const x of weighted){ticket-=x.weight;if(ticket<=0){kind=x.kind;break;}}
 p.recentSkills=[...recent.slice(-2),kind];const spec=TECHNIQUES[kind],d=w.match?(p.team===0?-1:1):Math.sign(b.vz)||1;
 p.skillIndex=(p.skillIndex||0)+1;p.lastSkill=t;p.skill={kind,ball:b.id,at:t,until:t+spec.duration,dir:[Math.sin(p.heading),Math.cos(p.heading)],side:lateral>0?-1:1,touches:0};pose(w,p,kind,spec.duration,{ball:b.id,contact:t+spec.wind,footTarget:[b.x,b.y,b.z],side:p.skill.side});return true;
}
export function planTechnique(w,p){
 const t=now(w);if(p.aerial){const a=p.aerial,spec=TECHNIQUES[a.kind],age=t-a.at;p.target=[...a.origin];p.maxSpeed=0;p.faceLock=true;p.aim=a.heading;
  p.elevation=a.kind==='header'?clamp((a.point?.[1]||1.52)-1.49,0,.22)*Math.sin(clamp(age/(spec.wind*2))*Math.PI):['bicycle','scissor'].includes(a.kind)?.32*Math.sin(clamp(age/.70)*Math.PI):0;
  if(age>=spec.duration)p.aerial=null;
 }else if(p.skill){const s=p.skill;p.target=[p.x+s.dir[0]*.18,p.z+s.dir[1]*.18];p.maxSpeed=1.4;p.faceLock=true;p.aim=Math.atan2(s.dir[0],s.dir[1]);}
}
export function tryAerial(w,b,m,g){
 if(b.pendingFinish)return true;
 const f=b.flight,t=now(w);if(!f||!['cross','corner'].includes(f.type)||t-f.at<.20||b.y<.4||b.y>4||b.vy>1.5)return false;
 const candidates=w.players.filter(p=>!p.bot&&!p.rest&&!p.aerial&&p.key!==f.from&&t-(p.lastAerial??-30)>4&&(m?p.team!=null:g?.members.includes(p.key))&&!f.offside?.includes(p.key)).sort((a,c)=>dist(a,b)-dist(c,b));
 for(const p of candidates){
  const d=m?(p.team===0?-1:1):g.sign;if(d*p.z<8||dist(p,b)>7)continue;
  const clear=w.players.every(q=>q===p||q.rest||dist(p,q)>1.65),acro=p.lastAerialKind==='bicycle'?['scissor']:p.lastAerialKind==='scissor'?['bicycle']:['bicycle','scissor'];
  const allowAcro=clear&&(!!f.finishPreference||hash(p.key+':'+f.from+':'+f.at)%100<55),options=allowAcro?[...acro,'volley','header']:['volley','header'];
  if(f.finishPreference&&options.includes(f.finishPreference))options.sort((a,b)=>(a===f.finishPreference?-1:0)-(b===f.finishPreference?-1:0));
  for(const kind of options){
   const spec=TECHNIQUES[kind],point=predictBall(b,spec.wind),range=kind==='header'?.31:.82,low=kind==='header'?1.42:kind==='volley'?.3:1.05,high=kind==='header'?1.75:kind==='volley'?1.12:1.95;
   if(Math.hypot(point[0]-p.x,point[2]-p.z)>range||point[1]<low||point[1]>high)continue;
   const heading=Math.atan2(-p.x*.12,d)+(kind==='bicycle'?Math.PI:0);if(Math.abs(angle(heading,p.heading))>spec.wind*7.5+.3)continue;
   p.aerial={kind,ball:b.id,at:t,contact:t+spec.wind,origin:[p.x,p.z],point,heading,from:f.from,flightAt:f.at};p.lastAerial=t;p.lastAerialKind=kind;
   b.pendingFinish={key:p.key,contact:t+spec.wind};pose(w,p,kind,spec.duration,{ball:b.id,foot:1,contact:t+spec.wind,footTarget:kind==='header'?undefined:point,headTarget:kind==='header'?point:undefined,side:p.personality%2?1:-1,jumpHeight:.12});emit(w,'techniqueSetup',p,null,b,{technique:kind});return true;
  }
 }
 return false;
}
export function stepTechniques(w){
 const t=now(w);
 for(const p of w.players){
  const s=p.skill;if(s){const b=w.balls.find(b=>b.id===s.ball);if(!b||b.owner!==p.key||dist(p,b)>1.05||p.kick||t>=s.until){p.skill=null;continue;}
   const age=t-s.at,first=s.kind==='soleRoll'?.20:TECHNIQUES[s.kind].wind,second=s.kind==='soleRoll'?.48:Infinity;
   if(!s.touches&&age>=first||s.touches===1&&age>=second){const roll=s.kind==='soleRoll'&&!s.touches,side=s.side*(s.kind==='bodyFeint'?-1:1),force=roll?1.45:3.1;b.vx=(roll?-s.dir[1]*side:s.dir[0]+s.dir[1]*side*.36)*force;b.vz=(roll?s.dir[0]*side:s.dir[1]-s.dir[0]*side*.36)*force;b.vy=0;b.lastTouch=p.key;p.nextTouch=t+.24;s.touches++;if(p.action)p.action.footTarget=[b.x,b.y,b.z];emit(w,'touch',p,null,b,{technique:s.kind,intensity:.28});if(s.touches===1)emit(w,s.kind,p,null,b);}
  }
  const a=p.aerial;if(!a)continue;const b=w.balls.find(b=>b.id===a.ball);
  if(!a.contacted&&(!b||b.flight?.from!==a.from||b.flight.at!==a.flightAt||b.owner)){if(b?.pendingFinish?.key===p.key)b.pendingFinish=null;a.contacted=true;a.cancelled=true;}
  if(!a.contacted&&t>=a.contact){a.contacted=true;b.pendingFinish=null;const clear=!['bicycle','scissor'].includes(a.kind)||w.players.every(q=>q===p||q.rest||dist(q,p)>1.3),range=a.kind==='header'?.36:.92,valid=clear&&dist(p,b)<range&&b.y>(a.kind==='header'?1.15:.20)&&b.y<2.1;
   if(valid){const d=w.match?(p.team===0?-1:1):(w.groups.find(g=>g.ball===b.id)?.sign||-1),from=b.flight.from;releaseBall(w,p,b,[(rnd(w)-.5)*4.5,.4+rnd(w)*.55,d*26.5],a.kind);emit(w,'combination',p,from,b);}
   else emit(w,'techniqueMiss',p,null,b,{technique:a.kind});
  }
  if(t-a.at>=TECHNIQUES[a.kind].duration)p.aerial=null;
 }
}
