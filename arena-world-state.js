// Shared, serializable simulation state. No browser, network or account writes.
import {DT,hash,clamp} from './arena-motion.js?v=arena-12';
import {BALL_RACK,BENCH,TRAINING_CONES,FIELD} from './arena-layout.js?v=arena-12';
export const WORLD_VERSION=11,SESSION_SECONDS=1800,HZ=24;
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const unit=(x,z)=>{const n=Math.hypot(x,z)||1;return [x/n,z/n];};
export const actor=(w,key)=>w.players.find(p=>p.key===key);
export const ballById=(w,id)=>w.balls.find(b=>b.id===id);
export const now=w=>w.tick*DT;
export function rnd(w){let x=w.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;w.rng=x>>>0;return w.rng/4294967296;}
export const integer=(w,a,b)=>a+Math.floor(rnd(w)*(b-a+1));
export const choose=(w,items)=>items.length?items[Math.floor(rnd(w)*items.length)]:null;
export function shuffled(w,items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=integer(w,0,i);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function emit(w,type,p,target,b,extra={}){
 const e={id:++w.eventId,at:now(w),type,actor:p?.key||p||null,target:target?.key||target||null,ball:b?.id||null,pos:b?[b.x,b.y,b.z]:p?[p.x,.1,p.z]:[0,0,0],...extra};
 w.events.push(e);if(w.events.length>72)w.events.shift();w.newEvents.push(e);return e;
}
export function pose(w,p,kind,duration,extra={}){if(!p)return;const t=now(w);p.action={kind,start:t,end:t+duration,...extra};}
export function person(key,index,bot=false){return {key,bot,personality:hash(key),x:bot?0:-12+(index%5)*5.6,z:bot?(index===0?-24.8:24.8):2+Math.floor(index/5)*3,vx:0,vz:0,heading:Math.PI,travel:0,cycle:hash(key)%997/997,stride:1,elevation:0,energy:0,team:null,group:null,action:null,rest:null,seatedTarget:false,priority:1};}
export function createWorld(players,seed=328794){
 const roster=[...players].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0),w={version:WORLD_VERSION,tick:0,seed:seed>>>0,rng:(hash('sisal-live:'+seed)||1),eventId:0,mode:'training',players:roster.map((p,i)=>person(p.key,i)),balls:[],groups:[],groupId:0,completed:0,nextMatchAt:24,matchIndex:0,match:null,events:[],newEvents:[],dialogue:[],speechMemory:{recent:[],mistakes:{},lastAt:-20,lastSpeaker:null},environment:{wind:.3},equipment:{cones:TRAINING_CONES.map(([x,z],i)=>({id:'cone-'+i,x,z,y:0,mode:'field',owner:null,tilt:0}))},lastActivity:null,trainingShots:{}};
 if(roster.length>25){const columns=Math.ceil(roster.length/12);w.players.forEach((p,i)=>{p.x=((i%columns)-(columns-1)/2)*Math.min(3,28/Math.max(1,columns-1));p.z=-18+Math.floor(i/columns)*3;});}
 w.players.push(person('__keeper_bot',0,true),person('__keeper_away_bot',1,true));
 for(let i=0;i<Math.min(8,Math.max(4,Math.ceil(roster.length/4)+2));i++)w.balls.push({id:'ball-'+i,x:BALL_RACK.x+(i%2)*.35,y:.14,z:BALL_RACK.z+Math.floor(i/2)*.34,vx:0,vy:0,vz:0,spinX:0,spinY:0,spinZ:0,mode:'rack',owner:null,group:null,lastTouch:null,flight:null,motion:null,net:null});
 w.nextMatchAt=integer(w,20,36);return w;
}
export function reconcileWorld(previous,players){
 if(!previous||previous.version!==WORLD_VERSION)return createWorld(players);
 const w=structuredClone(previous),keys=new Set(players.map(p=>p.key));w.players=w.players.filter(p=>p.bot||keys.has(p.key));
 for(const p of players)if(!w.players.some(a=>a.key===p.key)){const n=person(p.key,w.players.length);n.x=18.4;n.z=-18+(w.players.length%5)*1.4;n.arriving=true;w.players.push(n);}
 const all=new Set(w.players.map(p=>p.key));for(const b of w.balls){if(b.owner&&!all.has(b.owner)){b.owner=null;b.mode='free';b.y=.14;b.vy=0;}if(b.flight?.from&&!all.has(b.flight.from))b.flight.from=null;}
 if(w.groups.some(g=>g.members.some(k=>!all.has(k)))||w.match?.teams?.flat().some(k=>!all.has(k))||players.some(p=>!previous.players.some(a=>a.key===p.key))){
  // Changes to the roster cancel participation, not positions or the ball.
  resetActivities(w);
 }
 for(const c of w.equipment?.cones||[]){if(c.owner&&!all.has(c.owner)){c.owner=null;c.mode='field';c.y=0;}if(c.claim&&!all.has(c.claim))c.claim=null;}
 w.newEvents=[];return w;
}
export function resetActivities(w){
 w.mode='training';w.groups=[];w.match=null;for(const p of w.players){p.group=null;p.team=null;p.keeperRole=false;p.reserveKeeper=false;p.kick=null;p.throw=null;p.equipmentJob=null;p.aerial=null;p.skill=null;if(p.rest?.reason==='odd'){p.rest.phase='rise';p.rest.riseAt=now(w);}}
 for(const b of w.balls){b.group=null;b.flight=null;b.net=null;if(b.owner||b.motion){b.owner=null;b.motion=null;b.mode='free';b.vy=0;}}
 for(const c of w.equipment?.cones||[]){c.claim=null;if(c.owner){c.owner=null;c.mode='field';c.y=0;}}
}
export function exportWorld(w){const copy=structuredClone(w);copy.newEvents=[];return copy;}
export function handPoint(p,side=1){const h=p.heading,s=Math.sin(h),c=Math.cos(h);return [p.x+s*.29+c*.13*side,.97+(p.elevation||0)+Math.sin(p.cycle*Math.PI*2)*.012,p.z+c*.29-s*.13*side];}
export function footPointWorld(p,d=.36){return [p.x+Math.sin(p.heading)*d,FIELD.ballRadius,p.z+Math.cos(p.heading)*d];}
export function beginPickup(w,p,b,reach=.64){
 if(b.motion||(b.owner&&b.owner!==p.key)||b.y>.55||Math.hypot(p.x-b.x,p.z-b.z)>Math.min(.76,reach))return false;
 p.motorAcceleration=[-p.vx*9.5,-p.vz*9.5];b.owner=p.key;b.mode='pickup';b.flight=null;b.net=null;b.vx=b.vy=b.vz=0;b.motion={type:'pickup',at:now(w),until:now(w)+.85,from:[b.x,b.y,b.z]};
 pose(w,p,'collect',1.0,{contact:now(w)+.28,handTarget:[b.x,b.y,b.z]});return true;
}
export function beginPlace(w,p,b,point){
 if(b.mode!=='hand'||b.owner!==p.key||b.motion)return false;
 b.mode='place';b.motion={type:'place',at:now(w),until:now(w)+.60,from:[b.x,b.y,b.z],to:[point[0],FIELD.ballRadius,point[1]]};pose(w,p,'placeBall',.95,{contact:now(w)+.60,handTarget:[...b.motion.from]});return true;
}
export function setRest(w,p,reason='fatigue',seatIndex=0){p.rest={phase:'approach',seat:seatIndex%BENCH.seats.length,reason,until:now(w)+integer(w,16,26),at:now(w)};p.group=null;p.team=null;}
export function updateRest(w,p){
 const r=p.rest;if(!r)return null;const seat=BENCH.seats[r.seat],t=now(w);p.aim=-Math.PI/2;p.seatedTarget=false;
 if(r.phase==='approach'){if(Math.hypot(p.x-BENCH.front,p.z-seat[1])<.14)r.phase='backstep';return [BENCH.front,seat[1]];}
 if(r.phase==='backstep'){p.seatedTarget=true;p.maxSpeed=.65;if(Math.hypot(p.x-seat[0],p.z-seat[1])<.04){r.phase='seated';r.since=t;}return [...seat];}
 if(r.phase==='seated'){p.seatedTarget=true;p.maxSpeed=0;if(t>=r.until&&r.reason!=='odd')r.phase='rise',r.riseAt=t;return [...seat];}
 if(r.phase==='rise'){p.seatedTarget=true;p.maxSpeed=0;if(t-r.riseAt>1.0)r.phase='leave';return [p.x,p.z];}
 if(r.phase==='leave'){p.seatedTarget=true;p.maxSpeed=1.2;if(p.x<BENCH.front+.05){p.rest=null;p.seatedTarget=false;p.energy=Math.max(0,p.energy-.45);}return [BENCH.front-.1,seat[1]];}
 return [p.x,p.z];
}
export function restWeight(w,p){const r=p.rest;if(!r)return 0;const seat=BENCH.seats[r.seat];return r.phase==='backstep'?clamp(1-Math.abs(p.x-seat[0])/.55):r.phase==='seated'?1:r.phase==='rise'?1-clamp(now(w)-r.riseAt):0;}
