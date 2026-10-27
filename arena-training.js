import {createDrillPlan,varyDrillPlan} from './arena-drills.js?v=arena-12';
import {DT,clamp,mix,hash,bodyState,movePlayers,sampleTrack,footPoint,BENCH_SEATS} from './arena-motion.js?v=arena-12';
import {allocateClip,record,motionAt,action,finishStates,seatExits} from './arena-clip.js?v=arena-12';
import {FIELD,PAVILION} from './arena-layout.js?v=arena-12';
export function clipPlayers(snapshot){return [...(snapshot.players||[]).map(p=>({...p,personality:hash(p.key)})),{key:'__keeper_bot',name:'BOT · Portiere',appearance:{silk:'gold',number:'1'},goalkeeper:true},{key:'__keeper_away_bot',name:'BOT · Seconda porta',appearance:{silk:'sky',number:'12'},goalkeeper:true}];}
export function initialStates(snapshot){const p=clipPlayers(snapshot),n=(snapshot.players||[]).length,cols=Math.min(10,Math.max(3,Math.ceil(Math.sqrt(n*1.4)))),rows=Math.ceil(n/cols);return p.map((a,i)=>bodyState(a,a.key==='__keeper_bot'?[0,-24.8]:a.key==='__keeper_away_bot'?[0,24.8]:[-13+(i%cols)*26/(cols-1),2+Math.floor(i/cols)*Math.min(3,20/Math.max(1,rows-1))]));}
function storyAt(t,duration,arrival){const end=duration-1.4;if(t<arrival)return t/arrival*9;return t<end?9+(t-arrival)/(end-arrival)*26:35+(t-end)/1.4*15;}
function timeAt(story,duration,arrival){return story<9?story/9*arrival:story<35?arrival+(story-9)/26*(duration-1.4-arrival):duration-1.4+(story-35)/15*1.4;}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function pointAt(clip,key,t,heading){const p=motionAt(clip,key,t);return p?footPoint(p,heading??p.heading):[0,.14,0];}
export function buildTraining(snapshot,slot,startStates){
 const states=startStates.map(p=>({...p,team:null,seatedTarget:false,maxSpeed:4.25,aim:undefined})),origins=new Map(states.map(p=>[p.key,[p.x,p.z]])),plan=varyDrillPlan(createDrillPlan(snapshot,slot.scene,slot.serial,origins));
 const identities=clipPlayers(snapshot).map(p=>({...p,goalkeeper:p.goalkeeper||p.key===snapshot.keeper,active:plan.cast.some(a=>a.key===p.key)||p.key===plan.k.key}));
 const clip=allocateClip(identities,slot.duration);clip.scene=slot.scene;clip.plan=plan;const exits=seatExits(clip,startStates);
 const map=new Map(plan.all.map(p=>[p.key,p])),cast=new Set(plan.cast.map(p=>p.key)),longest=Math.max(0,...plan.cast.map(p=>distance(p.home,sampleTrack(p,9)))),arrival=Math.min(slot.duration-12,Math.max(4,1.5*longest/4.0));
 clip.story=t=>storyAt(t,slot.duration,arrival);const real=t=>timeAt(t,slot.duration,arrival);clip.real=real;
 let seatOwner=null,seat=null;
 if(['break','benchSave'].includes(slot.scene.id)&&plan.cast[0]){seatOwner=plan.cast[0].key;seat=BENCH_SEATS[hash(slot.serial)%BENCH_SEATS.length];}
 for(let i=0;i<clip.frames;i++){
  const now=Math.min(slot.duration,i*DT),story=clip.story(now),targets=[];
  for(const p of states){
   const a=map.get(p.key);let target=a?sampleTrack(a,story):(p.key==='__keeper_away_bot'?[0,24.8]:[3,24.8]);
   const gesture=a?.gestures.findLast(g=>story>=g.start&&story<=g.end),facing=a?.faces.findLast(f=>story>=f.start&&story<=f.end);
   p.seatedTarget=p.key===seatOwner&&story>8&&story<33;
   if(p.seatedTarget){target=[...seat];if(p.x>21.2&&distance([p.x,p.z],seat)>.8)target=[20.9,seat[1]];p.aim=-Math.PI/2;}
   else if(facing)p.aim=Math.atan2(facing.p[0]-p.x,facing.p[1]-p.z);else p.aim=p.key===plan.k.key?0:undefined;
   // Non-participants keep training instead of standing still through a long tail.
   if(a&&!cast.has(p.key)&&p.key!==plan.k.key){const seed=hash(p.key+slot.serial),phase=now/(3.6+(seed%11)*.13),step=Math.floor(phase),next=hash(seed+':'+step);target=[a.home[0]+Math.sin(next)*.65,a.home[1]+Math.cos(next)*.65];p.maxSpeed=1.25;}
   else p.maxSpeed=gesture&&['kick','heel','volley','trap','sit','seatedTrap'].includes(gesture.kind)?1.4:4.25;
   if(now<1&&exits.has(p.key)){p.seatedTarget=true;target=[21.0,p.z];p.maxSpeed=2.0;p.aim=-Math.PI/2;}
   targets.push(target);
  }
  if(i)movePlayers(states,targets,Math.min(DT,slot.duration-(i-1)*DT));record(clip,states,i);
 }
 // Gestures use the real episode clock; ball contact overrides generic traps.
 for(const a of plan.all)for(const g of a.gestures){if(['kick','heel','volley','trap','chest','dive','juggle'].includes(g.kind))continue;let kind=g.kind;if(a.key===seatOwner&&kind==='seatedTrap')kind='sit';action(clip,a.key,kind,real(g.start),real(g.end),{dirty:kind==='slide'});}
 const rendered=[];
 for(const script of plan.balls){
  let owner=script.initial?.key||null,lastAt=0,lastPoint=owner?pointAt(clip,owner,0):script.events[0]?.from||[0,.14,0],segments=[];
  for(const ev of script.events){
   const kicker=plan.all.find(a=>a.gestures.some(g=>['kick','heel','volley'].includes(g.kind)&&g.contact===ev.start));
   const start=real(ev.start),receiver=ev.owner?.key||null;let end=real(ev.end),from=kicker?pointAt(clip,kicker.key,start):[...ev.from],to=receiver?pointAt(clip,receiver,end):[...ev.to];
   const rolling=ev.arc<.08&&Math.max(from[1],to[1])<.3,speed=receiver?(rolling?7.5:9.5):16;
   if(kicker){end=Math.min(end,start+Math.max(.20,Math.hypot(to[0]-from[0],to[2]-from[2])/speed));if(receiver)to=pointAt(clip,receiver,end);const heading=Math.atan2(to[0]-from[0],to[2]-from[2]);from=pointAt(clip,kicker.key,start,heading);const g=kicker.gestures.find(g=>g.contact===ev.start);action(clip,kicker.key,g?.kind||'kick',Math.max(0,start-.42),start+.52,{contact:start,footTarget:from,strength:receiver?.45:1});}
   if(ev.from[1]>.45){from[1]=ev.from[1];if(receiver)to[1]=ev.to[1];}
   segments.push({start,end,from,to,arc:ev.arc,owner:receiver,prior:owner,held:[...lastPoint],lastAt,rolling});
   if(receiver)action(clip,receiver,'trap',end-.16,end+.42,{contact:end,footTarget:to});
   if(kicker){clip.events.push({at:start,type:receiver?'pass':'shot',actor:kicker.key,target:receiver,pos:from});clip.events.push({at:end,type:ev.arc>4?'out':receiver?'receive':plan.scene.event,actor:receiver||kicker.key,target:kicker.key,pos:to});}
   if(['save','saveApplause','read','feint'].includes(slot.scene.event)&&!receiver&&kicker){const k=motionAt(clip,plan.k.key,end);to[0]=k.x;to[2]=k.z+.32;to[1]=.75;action(clip,plan.k.key,'save',Math.max(0,end-.45),end+.7,{contact:end,handTarget:[...to],side:to[0]>=0?1:-1});}
   owner=receiver;lastPoint=to;lastAt=end;
  }
  rendered.push({segments,initial:script.initial?.key||null,initialPoint:script.events[0]?.from||[0,.14,0],visibleFrom:real(script.visibleFrom??0),visibleUntil:real(script.visibleUntil??50)});
 }
 // Deterministic local practice for the members outside the highlighted drill.
 const waiting=states.filter(p=>map.has(p.key)&&!cast.has(p.key)&&p.key!==plan.k.key),used=new Set();
 for(const p of waiting){if(used.has(p.key))continue;const other=waiting.filter(q=>q!==p&&!used.has(q.key)).sort((a,b)=>distance([p.x,p.z],[a.x,a.z])-distance([p.x,p.z],[b.x,b.z]))[0];if(!other)continue;used.add(p.key);used.add(other.key);if(distance([p.x,p.z],[other.x,other.z])>8)continue;const script={segments:[],initial:p.key,initialPoint:pointAt(clip,p.key,0),visibleFrom:0,visibleUntil:slot.duration};let from=p,to=other,at=1+(hash(p.key+slot.serial)%10)/10;while(at<slot.duration-1){const a=pointAt(clip,from.key,at),b=pointAt(clip,to.key,at+.6),end=at+Math.max(.25,Math.hypot(a[0]-b[0],a[2]-b[2])/6.8),heading=Math.atan2(b[0]-a[0],b[2]-a[2]),origin=pointAt(clip,from.key,at,heading);script.segments.push({start:at,end,from:origin,to:pointAt(clip,to.key,end),arc:0,owner:to.key,prior:from.key,rolling:true});action(clip,from.key,'kick',at-.42,at+.4,{contact:at,footTarget:origin});action(clip,to.key,'trap',end-.16,end+.4,{footTarget:pointAt(clip,to.key,end),contact:end});[from,to]=[to,from];at=end+1.0+(hash(to.key+at.toFixed(2))%13)/10;}rendered.push(script);}
 if(plan.juggle)action(clip,plan.juggle.actor.key,'juggle',real(plan.juggle.start),real(plan.juggle.end));
 clip.balls=rendered;clip.end=finishStates(states);clip.eventAt=real(plan.eventAt);return clip;
}
export function trainingBalls(clip,t){
 const result=clip.balls.map(script=>{
  if(t<script.visibleFrom||t>script.visibleUntil)return {pos:[0,.14,0],visible:false};let owner=script.initial,held=owner?pointAt(clip,owner,t):script.initialPoint;
  for(const e of script.segments){if(t<e.start){if(owner){const current=pointAt(clip,owner,t),u=clamp((t-(e.lastAt||0))/(e.start-(e.lastAt||0)||1));return {pos:[mix(current[0],e.from[0],u*u*.25),.14,mix(current[2],e.from[2],u*u*.25)],visible:true};}return {pos:[...held],visible:true};}if(t<=e.end){const u=clamp((t-e.start)/(e.end-e.start)),v=e.rolling?u*(1.06-.06*u):u;return {pos:[mix(e.from[0],e.to[0],v),mix(e.from[1],e.to[1],u)+4*e.arc*u*(1-u),mix(e.from[2],e.to[2],v)],visible:true};}owner=e.owner;held=e.to;}
  return {pos:owner?pointAt(clip,owner,t):[...held],visible:true};
 });
 const story=clip.story(t),plan=clip.plan;
 if(plan.juggle&&story>=plan.juggle.start&&story<=plan.juggle.end){const p=motionAt(clip,plan.juggle.actor.key,t),period=1.35,u=((t-clip.real(plan.juggle.start))%period+period)%period/period,base=footPoint(p);result[0]={pos:[base[0],.18+4*.80*u*(1-u),base[2]],visible:true};}
 for(const [hold,height,forward]of [[plan.inspect,.98,.34],[plan.hidden,.82,-.26],[plan.collected,.94,.30]])if(hold&&story>=hold.start&&story<=hold.end){const p=motionAt(clip,hold.actor.key,t);result[0]={pos:[p.x+Math.sin(p.heading)*forward,height,p.z+Math.cos(p.heading)*forward],visible:true};}
 return result;
}
