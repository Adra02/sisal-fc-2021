import {SCENES} from './arena-scenes.js?v=arena-7';
import {FIELD,PAVILION,STATIONS} from './arena-layout.js?v=arena-7';
export const EPOCH_MS=1800000,SLOT_SECONDS=50,VERSION=2;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
export function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let x=Math.imul(seed^seed>>>15,1|seed);x^=x+Math.imul(x^x>>>7,61|x);return ((x^x>>>14)>>>0)/4294967296}}
export function shuffle(items,seed){const a=[...items],r=random(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const point=(p,y=.14)=>[p[0],y,p[1]],flat=p=>[p[0],p[2]],angle=(a,b)=>Math.atan2(b[0]-a[0],b[1]-a[1]);
const angleMix=(a,b,u)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*u;
export function flight(keys,t){if(t<=keys[0].t)return [...keys[0].p];for(let i=1;i<keys.length;i++){const a=keys[i-1],b=keys[i];if(t<=b.t){const u=clamp((t-a.t)/(b.t-a.t)),p=mix(a.p,b.p,u);p[1]+=4*(b.arc||0)*u*(1-u);return p}}return [...keys.at(-1).p]}
// Waiting players train in pairs, in separate lanes behind the central drill.
export function home(i,n){const pair=Math.floor(i/2),cols=Math.min(6,Math.max(1,Math.ceil(Math.sqrt(n/2)))),col=pair%cols,row=Math.floor(pair/cols);return [-13+col*(26/Math.max(1,cols-1))+(i%2?1:-1)*.6,3+row*Math.min(3.0,20/Math.max(1,Math.ceil(n/2/cols)-1))]}
// A shared half-hour contains 36 episodes with different real durations.
// Choreography uses a local 50 s story clock; no timer writes or AI requests.
const epochTimelines=new Map(),worlds=new WeakMap(),forcedPlans=new Map(),snapshotIds=new WeakMap();let snapshotSerial=0;
function snapshotId(s){if(!snapshotIds.has(s))snapshotIds.set(s,++snapshotSerial);return snapshotIds.get(s);}
const mod=(n,d)=>((n%d)+d)%d;
function timeline(epoch){
 if(epochTimelines.has(epoch))return epochTimelines.get(epoch);
 const r=random(hash('arena4-tempo:'+epoch)),raw=Array.from({length:36},()=>44+r()*12),factor=1800/raw.reduce((a,b)=>a+b,0);let cursor=epoch*1800;
 const slots=raw.map((v,i)=>{const serial=epoch*36+i,duration=i===35?(epoch+1)*1800-cursor:v*factor,deck=Math.floor(serial/SCENES.length),scene=shuffle(SCENES,hash('SISAL-ARENA-4:'+deck))[mod(serial,SCENES.length)],arrival=5+r()*3.4,pace=.86+r()*.24;const slot={scene,serial,start:cursor,duration,arrival,actionDuration:26/pace};cursor+=duration;return slot;});
 epochTimelines.set(epoch,slots);if(epochTimelines.size>4)epochTimelines.delete(epochTimelines.keys().next().value);return slots;
}
export function episodeAt(serial){return {...timeline(Math.floor(serial/36))[mod(serial,36)]};}
function storyClock(slot,elapsed){const {arrival,actionDuration,duration}=slot;if(elapsed<arrival)return {t:elapsed/arrival*9,storyRate:9/arrival};if(elapsed<arrival+actionDuration)return {t:9+(elapsed-arrival)/actionDuration*26,storyRate:26/actionDuration};return {t:35+(elapsed-arrival-actionDuration)/(duration-arrival-actionDuration)*15,storyRate:15/(duration-arrival-actionDuration)};}
export function sceneAt(time){const slots=timeline(Math.floor(time/1800)),slot=slots.find(s=>time<s.start+s.duration)||slots.at(-1),elapsed=clamp(time-slot.start,0,slot.duration);return {...slot,elapsed,...storyClock(slot,elapsed)};}
function actorTrack(player,index,n){return {...player,home:home(index,n),track:[],gestures:[],faces:[],personality:hash(player.key)};}
function posAt(actor,t){const keys=actor.track;if(!keys.length)return [...actor.home];if(t<=keys[0].at)return [...keys[0].p];for(let i=1;i<keys.length;i++){const a=keys[i-1],b=keys[i];if(t<=b.at)return mix(a.p,b.p,smooth((t-a.at)/(b.at-a.at)))}return [...keys.at(-1).p];}
function locomotion(actor,t){
 const keys=actor.track;let travelled=0,stepCycle=0;
 for(let i=1;i<keys.length;i++){
  const a=keys[i-1],b=keys[i],length=dist(a.p,b.p),duration=b.at-a.at,strideLength=.98+Math.min(6,1.5*length/duration)*.23;
  if(t>=b.at){travelled+=length;stepCycle+=length/strideLength;continue;}
  if(t>=a.at){const u=clamp((t-a.at)/duration),e=smooth(u),v=6*u*(1-u)/duration;return {travel:travelled+length*e,stepCycle:stepCycle+length*e/strideLength,strideLength,turnWeight:smooth((t-a.at)/1.1)*(1-smooth((t-b.at+1.2)/1.2)),velocity:[(b.p[0]-a.p[0])*v,(b.p[1]-a.p[1])*v]};}break;
 }
 return {travel:travelled,stepCycle,strideLength:1,velocity:[0,0]};
}
function goto(actor,p,start,end){if(!actor)return;const from=posAt(actor,start);actor.track=actor.track.filter(k=>k.at<start);actor.track.push({at:start,p:from},{at:end,p:[...p]});}
function gesture(actor,kind,start,end,extra={}){if(actor)actor.gestures.push({kind,start,end,...extra});}
function face(actor,p,start,end){if(actor)actor.faces.push({p,start,end});}
const foot=(actor,t,target)=>{const p=posAt(actor,t),a=target?angle(p,target):Math.PI;return [p[0]+Math.sin(a)*.40,.14,p[1]+Math.cos(a)*.40]};
function heldPoint(actor,t,height,forward){const p=posAt(actor,t),facing=[...actor.faces].reverse().find(f=>t>=f.start&&t<=f.end),a=facing?angle(p,facing.p):Math.PI/2;return [p[0]+Math.sin(a)*forward,height,p[1]+Math.cos(a)*forward];}
export function createDrillPlan(snapshot,scene,serial,origins=null){
 const players=snapshot.players||[],field=players.filter(p=>p.key!==snapshot.keeper),keeper=players.find(p=>p.key===snapshot.keeper)||{key:'__keeper_bot',name:'BOT · Portiere',appearance:{silk:'gold',number:'1'}};
 const all=field.map((p,i)=>actorTrack(p,i,field.length)),k=actorTrack(keeper,0,1);k.home=[0,FIELD.goalZ+1.2];all.push(k);
 const roster=shuffle(field.map((_,i)=>i),hash('cast4:'+Math.floor(serial/36))),rotation=mod(serial*6,Math.max(1,roster.length)),order=shuffle([...roster.slice(rotation),...roster.slice(0,rotation)].slice(0,scene.kind==='chain'?24:6),hash('roles4:'+serial));for(const i of roster)if(!order.includes(i))order.push(i);const cast=order.slice(0,scene.kind==='chain'?24:6).map(i=>all[i]);
 if(origins)for(const actor of all)if(origins.has(actor.key))actor.home=[...origins.get(actor.key)];
 if(field.length<3&&!['juggle','shot','rest'].includes(scene.kind))scene={...scene,kind:'juggle',event:'juggle',title:'Palleggi in attesa dei compagni'};
 const [a,b,c,d,e,f]=cast,plan={scene,serial,all,cast,k,balls:[],sounds:[],beats:[],eventAt:17,netAt:null,netX:0,roof:false,order};if(!a)return plan;
 const center=STATIONS[scene.kind]||STATIONS.pass;
 const shape=scene.kind==='chain'?cast.map((_,i)=>[center[0]+Math.sin(i*Math.PI*2/cast.length)*Math.max(4,Math.min(7.5,cast.length*.28)),center[1]+Math.cos(i*Math.PI*2/cast.length)*Math.max(4,Math.min(7.5,cast.length*.28))]):scene.kind==='shot'?[[0,-16.4],[4,-15],[-4,-21],[-.75,-21],[.75,-21],[5,-22]]:scene.kind==='rest'?[[21,5],[21,8],[20,11],[18.4,5],[18.4,8],[18.4,11]]:scene.kind==='tennis'?[[7,2],[11,2],[7,8],[11,8],[12,5],[6,5]]:[[center[0]-3,center[1]+2.7],[center[0]+3,center[1]+2.7],[center[0]+3,center[1]-2.7],[center[0]-3,center[1]-2.7],[center[0],center[1]],[center[0],center[1]-4.2]];
 cast.forEach((p,i)=>p.track=[{at:0,p:p.home},{at:9,p:shape[i]}]);k.track=[{at:0,p:k.home}];
 const main={initial:a,events:[]};plan.balls.push(main);
 function kick(from,to,start,end,arc=0,opts={}){if(!from||!to)return;const target=Array.isArray(to)?flat(to):posAt(to,end),origin=foot(from,start,target),destination=Array.isArray(to)?[...to]:foot(to,end,posAt(from,start));if(opts.height){origin[1]=opts.height;destination[1]=opts.height;}else if(opts.air&&!Array.isArray(to))destination[1]=1.05;main.events.push({start,end,from:origin,to:destination,arc,owner:Array.isArray(to)?null:to,hold:!!opts.hold});gesture(from,opts.height?'volley':opts.heel?'heel':'kick',start-.65,start+.55,{contact:start});const at=posAt(from,start);face(from,opts.heel?[2*at[0]-target[0],2*at[1]-target[1]]:target,start-1,start+1.2);if(!Array.isArray(to)){gesture(to,opts.height?'volley':opts.air?'chest':'trap',end-.35,end+.70,{contact:end});face(to,posAt(from,start),end-1,end+.5);}plan.sounds.push({at:start,type:'kick',pos:origin},{at:end,type:opts.hit||'touch',pos:destination});plan.beats.push({type:opts.hit||'pass',at:end,actor:from.key,target:Array.isArray(to)?null:to.key});}
 function roundPasses(partners,start=10,interval=3.2,cycles=2,arc=0){if(partners.length<2)return;for(let j=0;j<partners.length*cycles;j++)kick(partners[j%partners.length],partners[(j+1)%partners.length],start+j*interval,start+(j+1)*interval-.65,arc);}
 if(['pass','square','chain'].includes(scene.kind)){
  const ring=scene.kind==='chain'?cast:scene.kind==='square'?cast.slice(0,4):cast.slice(0,3);if(!['oneTwo','long','accidental','distract','fake','heel','ignored','behind','both','swap','encourage','space'].includes(scene.event))roundPasses(ring,10,scene.kind==='chain'?24/Math.max(1,ring.length):3,1,scene.event==='loft'?2.4:0);
  if(scene.event==='oneTwo'&&b){kick(a,b,11,13);goto(a,[center[0]+.5,center[1]-4],13,17);kick(b,a,15,17);kick(a,c||b,19,22);gesture(a,'call',17.5,19);plan.eventAt=22;}
  if(scene.kind==='square'){cast.slice(0,4).forEach((p,i)=>{const start=12+i*3;goto(p,shape[(i+1)%4],start,start+3.8)});plan.eventAt=23;}
  if(['long','accidental','distract'].includes(scene.event)&&b){main.events=[];kick(a,[2,.14,-4],12,14);goto(b,[2,-4],14,19);gesture(b,'trap',19,20);kick(b,a,21,24,scene.event==='accidental'?.6:0,{heel:scene.event==='accidental'});gesture(b,scene.event==='distract'?'search':'shrug',14.5,17);plan.eventAt=15;}
  if(scene.event==='fake'&&b){face(a,c?posAt(c,12):[0,-12],10,11.8);kick(a,b,12,14);kick(b,c||a,17,19);gesture(c||b,'brake',13,16);}
  if(scene.event==='dispute'){gesture(a,'point',17,21);gesture(b,'point',17.5,21);gesture(c,'referee',21,24);plan.eventAt=19;}
  if(scene.event==='heel'&&b){main.events=[];kick(a,b,11,13);kick(b,c||a,15,17,.65,{heel:true});gesture(b,'bow',18,21);plan.eventAt=17;}
  if(['signal','space','ignored'].includes(scene.event)){gesture(b,'call',10,13);if(scene.event==='ignored'){main.events=[];kick(a,c||a,11,13);kick(c||a,b,22,24);gesture(b,'handsHips',14,21);plan.eventAt=24;}}
  if(scene.event==='space'&&b){gesture(b,'point',10,12);goto(b,[center[0]+5,center[1]-2],11,15);kick(a,b,13,15);kick(b,c||a,18,20);plan.eventAt=15.5;}
  if(scene.event==='behind'){face(a,[-12,-7],8,10.5);gesture(b,'call',10.5,12);kick(a,b,13,16);kick(b,c||a,20,23);plan.eventAt=13;}
  if(scene.event==='both'&&b){main.events=[];kick(c||a,[center[0],.14,center[1]+2.6],11,13);goto(a,[center[0]-.5,center[1]+2.6],11,14);goto(b,[center[0]+.5,center[1]+2.6],11,14);gesture(a,'brake',13,16);gesture(b,'brake',13,16);gesture(a,'bow',16,19);kick(b,c||a,21,24);plan.eventAt=14;}
  if(scene.event==='swap'&&b){kick(a,b,11,13);goto(a,[center[0]+3,center[1]+4.6],18,22);goto(b,shape[0],18,23);gesture(a,'wave',18,20);kick(b,a,25,28);plan.eventAt=23;}
  if(scene.event==='ovation'){cast.slice(1).forEach(p=>gesture(p,'clap',18,23));plan.eventAt=18;}
  if(scene.event==='encourage'&&b){gesture(b,'call',10,12);kick(a,b,13,15);goto(a,[center[0],center[1]-2],15,18);kick(b,a,18,20);gesture(b,'clap',21,24);plan.eventAt=20;}
 }
 if(['rondo','duel'].includes(scene.kind)){
  const ring=[a,b,c,d].filter(Boolean),chaser=e||c||b;if(!['nutmeg','revenge','rematch','sole','lesson','laugh'].includes(scene.event)){roundPasses(ring,10,3.1,1);roundPasses(ring,25,2.5,1);}
  if(chaser&&ring.length>=4){for(let j=0;j<5;j++)goto(chaser,[center[0]+Math.sin(j*1.8)*1.4,center[1]+Math.cos(j*1.8)*1.4],9+j*4,12+j*4);}
  if(['nutmeg','revenge','rematch'].includes(scene.event)&&b){
   main.events=[];goto(a,[center[0]-3,center[1]+2],9,10);goto(b,[center[0],center[1]+2],9,10);if(c)goto(c,[center[0]+3,center[1]+2],9,10);
   if(scene.id==='callback'){kick(a,[center[0]-1,.14,center[1]+4.5],11,12.5);gesture(a,'stumble',12.5,14);gesture(b,'laugh',13,16);goto(a,[center[0]-1,center[1]+4.1],13,16);kick(a,c||b,18,20);kick(c||b,a,22,24);}
   const nutAt=scene.id==='callback'?26:13;kick(a,c||[center[0]+3,.14,center[1]+2],nutAt,nutAt+1.6);gesture(b,'nutmeg',nutAt-.4,nutAt+1.3);plan.beats.push({type:'nutmeg',at:nutAt+.8,actor:a.key,target:b.key});
   goto(b,center,nutAt+2.5,nutAt+5.5);if(chaser&&chaser!==b)goto(chaser,shape[1],nutAt+2.5,nutAt+5.5);
   if(c&&(scene.event==='nutmeg'||scene.id==='callback')){kick(c,a,nutAt+6,nutAt+8);kick(a,d||c,nutAt+9,nutAt+11);}
   if(scene.event!=='nutmeg'&&scene.id!=='callback'){
    gesture(b,'block',nutAt-.5,nutAt+1.5);main.events[0].to=[center[0]-.38,.14,center[1]+2];main.events[0].owner=b;
    goto(a,[center[0]-1.2,center[1]+2],18,21);goto(b,[center[0]+1.5,center[1]+2],18,21);
    if(d)goto(d,[center[0]-3,center[1]+2],18,21);
    kick(b,d||[center[0]-3,.14,center[1]+2],24,25.6);gesture(a,'nutmeg',23.6,26);goto(a,center,27,30);goto(b,shape[0],27,30);
    plan.beats.push({type:'return-nutmeg',at:24.8,actor:b.key,target:a.key});
   }
   if(scene.id==='callback')gesture(a,'bow',33,34.5);plan.eventAt=nutAt+2;plan.consequence={kind:'center-swap',key:['revenge','rematch'].includes(scene.event)&&scene.id!=='callback'?a.key:b.key,at:['revenge','rematch'].includes(scene.event)&&scene.id!=='callback'?30:nutAt+5.5};
  }
  if(scene.event==='sole'&&b){main.events=[];goto(a,[center[0]-.65,center[1]],9,11);goto(b,[center[0]+.65,center[1]],9,11);main.events.push({start:11,end:22,from:[center[0]-.25,.14,center[1]],to:[center[0]+.25,.14,center[1]],arc:0,owner:a,hold:true});gesture(a,'sole',11,22);gesture(b,scene.id==='soleDuel'?'sole':'block',11,22);plan.sole={duel:scene.id==='soleDuel',start:11,end:22,center};kick(a,c||b,24,27);plan.eventAt=22;}
  if(scene.event==='lesson'&&b){main.initial=b;gesture(b,'explain',9,11);kick(b,a,11,13);const loose=[center[0]-5,.14,center[1]+5];main.events.push({start:13,end:14.5,from:[...main.events.at(-1).to],to:loose,arc:.18});gesture(a,'stumble',13,15);goto(a,flat(loose),14.5,18);kick(a,b,20,22);const second=[center[0]+5,.14,center[1]+4];main.events.push({start:22,end:23.5,from:[...main.events.at(-1).to],to:second,arc:.16});goto(b,flat(second),23.5,28);gesture(b,'stumble',22,24);gesture(a,'laugh',25,30);gesture(b,'shrug',28,31);plan.eventAt=26;}
  if(scene.event==='balance'){gesture(a,'stumble',14,18);gesture(b,'dodge',15,18);plan.eventAt=16;}
  if(scene.event==='slide'){goto(a,[center[0]-1,center[1]-1.2],14,17);gesture(a,'slide',14,17);gesture(a,'getUp',17,21);plan.stain={key:a.key,at:15.5};plan.eventAt=18;}
  if(scene.event==='laugh'&&b){kick(a,b,11,13);const loose=[center[0]+5,.14,center[1]+4];main.events.push({start:13,end:15,from:[...main.events.at(-1).to],to:loose,arc:.2});gesture(b,'stumble',13,16);goto(b,flat(loose),16,21);kick(b,a,24,27);cast.filter(p=>p!==b).forEach((p,i)=>gesture(p,i%2?'clap':'laugh',17+i*.3,23+i*.3));plan.eventAt=18;}
  if(scene.event==='intruder'){plan.balls.push({initial:null,events:[{start:11,end:14,from:[-14,.14,-8],to:[4,.14,-8],arc:0},{start:14,end:17,from:[4,.14,-8],to:[6,.14,-8],arc:0}],visibleFrom:10,visibleUntil:34});cast.forEach((p,i)=>gesture(p,'dodge',12+i*.15,15+i*.15));goto(b,[6,-8],16,20);gesture(b,'sole',20,23);plan.eventAt=14;}
 }
 if(scene.kind==='shot'){
  const ev=scene.event,post=['post','postLook','crossbar'].includes(ev),save=['save','saveApplause','read','feint'].includes(ev),roof=ev==='roof',sky=ev==='sky',at=ev==='interrupted'?22:15,hit=at+(roof?3.4:sky?3.8:1.5);
  if(ev==='tiny'){goto(a,[0,-11.6],9,10.5);goto(a,[0,-16.4],10.5,15);}
  let target=ev==='crossbar'?[0,2.4,FIELD.goalZ]:post?[2.98,.55,FIELD.goalZ]:roof?[PAVILION.x,3.48,PAVILION.z]:sky?[7,.14,-30.5]:ev==='bottle'?PAVILION.bottle:save?[.8,.70,FIELD.goalZ+1.05]:[1.7,.55,FIELD.netZ+.1];
  kick(a,target,at,hit,roof?7:sky?8:ev==='tiny'?0:.55,{hit:post?'metal':ev==='bottle'?'plastic':save?'save':roof?'roof':sky?'out':'net'});plan.eventAt=hit+.2;
  if(roof){plan.roof=true;plan.roofAt=hit;cast.forEach(p=>face(p,[target[0],target[2]],hit,22));gesture(a,'handsHips',hit,24);if(b){plan.spareFrom=30;goto(b,flat(PAVILION.spare),20,29);gesture(b,'bend',29,31);face(b,[PAVILION.spare[0],PAVILION.spare[2]],29,31);const dest=foot(a,35,posAt(b,32));plan.balls.push({initial:null,visibleFrom:30,events:[{start:32,end:35,from:[...PAVILION.spare],to:dest,arc:.6,owner:a}]});gesture(b,'kick',31.35,32.55,{contact:32});plan.sounds.push({at:32,type:'kick',pos:PAVILION.spare});plan.beats.push({type:'spare-return',at:35,actor:b.key,target:a.key});}}
  if(sky){cast.forEach(p=>{face(p,flat(target),hit,27);gesture(p,'freeze',hit,26);});plan.eventAt=27;}
  if(post){main.events.push({start:hit,end:hit+2,from:target,to:[1,.14,FIELD.goalZ+6],arc:.5});gesture(a,'celebrate',at+.2,hit);gesture(a,'freeze',hit,hit+2.5);gesture(b,'laugh',hit+1,hit+5);}
  if(ev==='wall'){gesture(c,'cover',at-.7,hit+1);gesture(d,'dodge',at-.3,hit+1);gesture(e,'cover',at-.3,hit+1);}
  if(save){goto(k,[.8,FIELD.goalZ+1.05],ev==='read'?11:at-.6,ev==='read'?13:hit);gesture(k,'dive',at+.2,hit+.7);gesture(k,'getUp',hit+.7,hit+4);gesture(k,'point',hit+4,hit+7);gesture(b,'clap',hit+2,hit+6);main.events.push({start:hit,end:hit+1.2,from:target,to:[2,.14,FIELD.goalZ+5],arc:.4});}
  if(ev==='feint'){gesture(a,'kick',11,12);gesture(k,'handsHips',12,14);}
  if(ev==='literal'){goto(k,[8,FIELD.goalZ+1.5],11,17);gesture(b,'call',17,20);goto(k,k.home,23,29);}
  if(ev==='interrupted'&&b){goto(b,[-1,-18],11,14);gesture(b,'bend',14,17);goto(b,[4,-18],17,20);gesture(a,'handsHips',13,20);}
  if(ev==='tiny'){main.initial=null;main.events[0].to=[0,.14,-17.1];main.events[0].arc=0;gesture(a,'shrug',18,23);}
  if(ev==='miss'){const still=[shape[0][0]+.5,.14,shape[0][1]-.4];main.initial=null;main.events=[{start:9,end:34,from:still,to:still,arc:0,hold:true}];face(a,[0,FIELD.goalZ],9,18);gesture(a,'kick',14.35,15.55,{contact:15});gesture(a,'lookBoot',17,22);plan.sounds=[];plan.beats=[{type:'miss',at:15,actor:a.key}];plan.eventAt=16;}
  if(ev==='target')gesture(a,'point',10,12);
  if(ev==='referee')gesture(b,'referee',18,23);
  if(ev==='unseen'){cast.slice(1).forEach(p=>face(p,[10,10],12,19));gesture(a,'call',20,25);plan.eventAt=20;}
  if(ev==='line'&&c){goto(c,[1.7,FIELD.goalZ+.8],11,16.3);gesture(c,'slide',15.5,17);main.events[0].to=[1.7,.2,FIELD.goalZ+.8];main.events.push({start:16.5,end:19,from:[1.7,.2,FIELD.goalZ+.8],to:[7,.14,-19],arc:1});gesture(c,'getUp',18,21);plan.eventAt=17;}
  if(!roof&&!sky&&!post&&!save&&!['tiny','miss','bottle','line'].includes(ev)){plan.netAt=hit;plan.netX=target[0];}
  if(ev==='net'&&scene.id==='netRecovery'){goto(a,[1.7,FIELD.goalZ-.65],19,25);gesture(a,'bend',25,27.5);face(a,b?posAt(b,28):[0,-15],27,29);main.events.push({start:27.3,end:28.1,from:[...target],to:foot(a,28.1,b?posAt(b,28):[0,-15]),arc:.18,owner:a});gesture(a,'sole',27.3,29);goto(a,[3.8,FIELD.goalZ+1],28.1,31);kick(a,b||[0,.14,-16],32,34);plan.eventAt=28;}
  if(ev==='net'&&scene.id==='netMotion'){gesture(a,'arms',19,23);gesture(b,'clap',19,24);plan.eventAt=20;}
  if(ev==='bottle')plan.bottleAt=hit;
  if(ev==='postLook')cast.slice(1).forEach(p=>face(p,[target[0],target[2]],hit,hit+4));
 }
 if(['juggle','tennis'].includes(scene.kind)){
  if(scene.kind==='tennis'&&c){main.events=[];[[a,c],[c,b],[b,d||c],[d||c,a]].forEach(([from,to],i)=>kick(from,to,11+i*4,14+i*4,1.8,{height:.55}));plan.eventAt=19;}
  else if(scene.event==='volley'&&b){main.events=[];for(let i=0;i<6;i++)kick(i%2?b:a,i%2?a:b,11+i*3.2,13.7+i*3.2,1.3,{height:.65});plan.eventAt=19;}
  else if(scene.event==='chest'){main.events=[];if(b)kick(b,a,11,14,2.0,{air:true});gesture(a,'chest',13.5,15);kick(a,[1.6,.65,FIELD.netZ+.1],17,18.6,1.3);plan.netAt=18.6;plan.netX=1.6;plan.eventAt=18.8;}
  else{plan.juggle={actor:a,start:10,end:34};gesture(a,'juggle',10,34);plan.eventAt=18;}
 }
 if(scene.kind==='rest'){
  gesture(a,'breath',11,32);gesture(b,'drink',15,21);
  if(scene.id==='break'){goto(a,[PAVILION.benchX,5],10,11.5);gesture(a,'sit',11.5,31);}
  if(scene.id==='fatigue'){gesture(a,'breath',10,33);if(b){goto(b,[20.5,5.6],21,23);face(b,posAt(a,23),22,28);gesture(b,'pat',23,27);}}
  if(scene.event==='hiddenLaugh'&&b){goto(a,[20.7,7.2],9,11.5);face(a,posAt(b,12),11,16);gesture(a,'pat',12,15);gesture(a,'laugh',16,21);gesture(b,'handsHips',18,24);}
  if(scene.event==='inspect'){face(a,b?posAt(b,12):[18,10],11,19);gesture(a,'inspect',12,18);gesture(a,'shrug',21,25);kick(a,b||[18,.14,10],26,28);plan.inspect={actor:a,start:12,end:18};plan.eventAt=16;}
  if(scene.event==='benchSave'){goto(a,[PAVILION.benchX,PAVILION.benchZ-2],8,11);gesture(a,'sit',11,33);face(a,[0,6],11,33);main.initial=null;main.events=[{start:12,end:15,from:[14,.14,6],to:[PAVILION.benchX-.38,.14,6],arc:0,owner:a},{start:19,end:22,from:[PAVILION.benchX-.38,.14,6],to:[14,.14,6],arc:0}];gesture(a,'seatedTrap',14.5,19.8);plan.eventAt=16;}
  if(scene.event==='five'){gesture(a,'highFive',12,16);face(b,[26,16],11,17);gesture(a,'hair',17,20);gesture(b,'highFive',25,28);plan.eventAt=16;}
  if(scene.event==='hide'){face(a,b?posAt(b,12):[18,8],11,25);gesture(a,'hide',12,24);gesture(b,'search',13,23);gesture(c,'point',23,27);plan.hidden={actor:a,start:12,end:24};plan.eventAt=21;}
  if(scene.event==='laces'){gesture(a,'laces',11,28);plan.eventAt=19;}
  if(scene.event==='copy'){gesture(a,a.appearance?.celebration||'celebrate',12,17);gesture(b,a.appearance?.celebration||'celebrate',22,27);plan.eventAt=24;}
  if(scene.event==='giveWay'&&b){goto(a,[19.5,6.5],11,14);goto(b,[19.5,9.5],11,14);for(let j=0;j<3;j++){goto(a,[19+(j%2?1:-1)*.5,7],15+j*3,17+j*3);goto(b,[19+(j%2?1:-1)*.5,8.7],15+j*3,17+j*3);}gesture(a,'bow',26,29);plan.eventAt=21;}
  if(scene.event==='collect'){face(a,b?posAt(b,12):[18,8],11,23);gesture(a,'collect',12,22);plan.collected={actor:a,start:12,end:22};plan.balls.push({initial:null,visibleFrom:16,events:[{start:16,end:18,from:heldPoint(a,16,.94,.30),to:[19.5,.14,7.5],arc:.2}]},{initial:null,visibleFrom:19,events:[{start:19,end:21,from:heldPoint(a,19,.94,.30),to:[20,.14,9.5],arc:.2}]});gesture(b,'sole',22,25);plan.eventAt=20;}
  if(scene.event==='closing'){cast.forEach((p,i)=>gesture(p,i%2?'wave':'bend',18+i*.6,23+i*.6));goto(a,flat(PAVILION.spare),18,24);gesture(a,'collect',24,30);plan.collected={actor:a,start:24,end:34};plan.spareFrom=24;plan.eventAt=25;}
 }
 // Hold the actual finishing position. The next drill walks from here instead
 // of resetting the whole squad to identical home spots every 50 seconds.
 if(scene.kind==='shot'){const last=k.track.at(-1);if(last&&dist(last.p,[0,FIELD.goalZ+1.2])>.1)goto(k,[0,FIELD.goalZ+1.2],Math.max(36,last.at+.1),46);}
 for(const ball of plan.balls)ball.events.sort((x,y)=>x.start-y.start);return plan;
}
function sampleBall(script,t){
 if(t<(script.visibleFrom??0)||t>(script.visibleUntil??50))return {pos:[0,.14,0],visible:false};
 let owner=script.initial,lastAt=0,held=script.initialPoint|| (owner?foot(owner,0):script.events[0]?.from||[0,.14,0]);
 for(const ev of script.events){
  if(t<ev.start){
   if(owner){const root=posAt(owner,t),lastRoot=posAt(owner,lastAt),nextRoot=posAt(owner,ev.start),u=smooth((t-lastAt)/(ev.start-lastAt));const offset=mix([held[0]-lastRoot[0],held[1],held[2]-lastRoot[1]],[ev.from[0]-nextRoot[0],ev.from[1],ev.from[2]-nextRoot[1]],u);return {pos:[root[0]+offset[0],offset[1],root[1]+offset[2]],visible:true};}
   return {pos:[...held],visible:true};
  }
  if(t<=ev.end){const u=clamp((t-ev.start)/(ev.end-ev.start)),p=mix(ev.from,ev.to,u);p[1]+=4*ev.arc*u*(1-u);return {pos:p,visible:true};}
  owner=ev.owner;held=ev.to;lastAt=ev.end;
 }
 if(owner){const root=posAt(owner,t),prior=posAt(owner,lastAt);return {pos:[held[0]+root[0]-prior[0],held[1]+(.14-held[1])*smooth((t-lastAt)/.9),held[2]+root[1]-prior[1]],visible:true};}
 return {pos:[...held],visible:true};
}
export function inspectArenaScene(snapshot,scene,serial=0){return createDrillPlan(snapshot,scene,serial);}

export function varyDrillPlan(plan){
 const {scene,serial}=plan,r=random(hash('stage4:'+serial)),center=STATIONS[scene.kind]||STATIONS.pass;
 const drill=['pass','rondo','duel','square','chain','juggle'].includes(scene.kind)&&scene.event!=='chest',mirror=scene.kind==='shot'&&!['roof','bottle'].includes(scene.event)&&r()>.5;
 const yaw=drill?(r()-.5)*1.25:0,shift=drill?[(r()-.5)*3.4,(r()-.5)*3]:[0,0],cos=Math.cos(yaw),sin=Math.sin(yaw);
 const transform=p=>drill?[center[0]+(p[0]-center[0])*cos-(p[1]-center[1])*sin+shift[0],center[1]+(p[0]-center[0])*sin+(p[1]-center[1])*cos+shift[1]]:mirror?[-p[0],p[1]]:[...p];
 const transform3=p=>{const v=transform(flat(p));return [v[0],p[1],v[1]];};
 if(drill||mirror){
  for(const actor of plan.all){if(!plan.cast.includes(actor)&&actor!==plan.k)continue;for(const key of actor.track)if(key.at>0)key.p=transform(key.p);for(const f of actor.faces)f.p=transform(f.p);}
  for(const ball of plan.balls)for(const event of ball.events){event.from=transform3(event.from);event.to=transform3(event.to);}
  for(const sound of plan.sounds)sound.pos=transform3(sound.pos);if(plan.sole)plan.sole.center=transform(plan.sole.center);if(mirror)plan.netX=-plan.netX;
 }
 plan.variation={yaw,shift,mirror};return plan;
}
function advanceOrigins(plan){return new Map(plan.all.map(a=>[a.key,posAt(a,50)]));}
function compilePeriod(snapshot,epoch,origins){
 const plans=[];let previousBall=null;
 for(const slot of timeline(epoch)){
  const plan=varyDrillPlan(createDrillPlan(snapshot,slot.scene,slot.serial,origins));
  // Continue an owned ball with a visible pass and an actual kicking gesture.
  // An abandoned ball (net/roof/miss) is not magically rolled to a new drill.
  if(previousBall?.owner&&plan.balls[0]){
   const giver=plan.all.find(p=>p.key===previousBall.owner),first=plan.balls[0];
   if(giver&&first.initial){
    first.initialPoint=[...previousBall.pos];
    if(giver!==first.initial){const receiver=first.initial,target=sampleBall({...first,initialPoint:undefined},8.7).pos,origin=foot(giver,2,flat(target));first.initial=giver;first.events.unshift({start:2,end:8.7,from:origin,to:target,arc:Math.min(1,dist(flat(origin),flat(target))*.025),owner:receiver});gesture(giver,'kick',1.35,2.55,{contact:2});face(giver,flat(target),.5,3.5);plan.handoverKey=giver.key;plan.sounds.push({at:2,type:'kick',pos:origin});}
   }
  }
  plans.push(plan);origins=advanceOrigins(plan);const ending=plan.balls.at(-1),endBall=ending?sampleBall(ending,49.99):null;const owner=ending?.events.filter(e=>e.end<49.99).at(-1)?.owner||(!ending?.events.length?ending?.initial:null);previousBall=endBall?.visible&&owner?{pos:endBall.pos,owner:owner.key}:null;
 }
 return {plans,origins};
}
function worldPlan(snapshot,at){
 let cache=worlds.get(snapshot);if(!cache){cache=new Map();worlds.set(snapshot,cache);}const epoch=Math.floor(at.serial/36);
 if(!cache.has(epoch)){
  // One bounded warm-up period makes late joining independent of frame count.
  // Fair cast rotation visits every normal club member during that period.
  const warm=compilePeriod(snapshot,epoch-1,null),period=compilePeriod(snapshot,epoch,warm.origins);cache.set(epoch,period);if(cache.size>2)cache.delete(cache.keys().next().value);
 }
 return cache.get(epoch).plans[mod(at.serial,36)];
}

export function sampleArena(snapshot,time,override){
 const at=override?{scene:override,serial:Math.floor(time/50),t:mod(time,50),elapsed:mod(time,50),duration:50,storyRate:1}:sceneAt(time);let plan;
 if(override){const key=snapshotId(snapshot)+':'+at.serial+':'+override.id;plan=forcedPlans.get(key);if(!plan){plan=createDrillPlan(snapshot,override,at.serial);forcedPlans.set(key,plan);if(forcedPlans.size>8)forcedPlans.delete(forcedPlans.keys().next().value);}}
 else plan=worldPlan(snapshot,at);
 if(!override){const longest=Math.max(0,...plan.cast.map(p=>{const end=p.track.find(k=>k.at>=8&&k.at<=9);return end?dist(p.track[0].p,end.p):0;})),arrival=Math.min(18,Math.max(at.arrival,1.5*longest/4.2)),actionDuration=Math.min(at.actionDuration,at.duration-arrival-4);Object.assign(at,storyClock({...at,arrival,actionDuration},at.elapsed));}
 const t=at.t,balls=plan.balls.map(b=>sampleBall(b,t));
 if(plan.juggle&&t>=plan.juggle.start&&t<=plan.juggle.end){const p=posAt(plan.juggle.actor,t),u=((t-plan.juggle.start)/1.25)%1,w=Math.min(smooth((t-plan.juggle.start)/.45),smooth((plan.juggle.end-t)/.65));balls[0]={pos:mix(balls[0].pos,[p[0]+.32,.21+4*1.08*u*(1-u),p[1]],w),visible:true};}
 if(plan.sole&&t>=plan.sole.start&&t<=plan.sole.end){const {center,duel,start,end}=plan.sole,w=Math.min(smooth((t-start)/.6),smooth((end-t)/.6));balls[0]={pos:mix(balls[0].pos,[center[0]+(duel?Math.sin((t-start)*1.7)*.26:-.25),.14,center[1]],w),visible:true};}
 for(const [holding,height,forward]of [[plan.inspect,.98,.34],[plan.hidden,.82,-.26],[plan.collected,.94,.30]])if(holding&&t>=holding.start&&t<=holding.end){const weight=Math.min(smooth((t-holding.start)/1.2),smooth((holding.end-t)/1.2));balls[0]={pos:mix(balls[0].pos,heldPoint(holding.actor,t,height,forward),weight),visible:true};}
 const actors=plan.all.map(p=>{const pos=posAt(p,t),motion=locomotion(p,t),speed=Math.hypot(...motion.velocity),g=[...p.gestures].reverse().find(g=>t>=g.start&&t<=g.end),facing=[...p.faces].reverse().find(g=>t>=g.start&&t<=g.end),look=facing?.p||flat(balls[0]?.pos||point(pos)),toward=angle(pos,look),moving=speed>.04?Math.atan2(motion.velocity[0],motion.velocity[1]):toward;return {key:p.key,name:p.name,appearance:p.appearance,pos,look,heading:angleMix(toward,moving,.88*(motion.turnWeight||0)),velocity:motion.velocity.map(v=>v*at.storyRate),actionTime:t,travel:motion.travel,stepCycle:motion.stepCycle,strideLength:motion.strideLength,gesture:g?.kind||(speed>.15?(speed>2?'run':'walk'):p===plan.k?'keeper':'idle'),phase:g?clamp((t-g.start)/(g.end-g.start)):0,contact:g?.contact,dirty:plan.stain?.key===p.key&&t>=plan.stain.at,personality:p.personality,foot:null,active:plan.cast.includes(p)||p===plan.k};});
 const waiting=plan.order.slice(plan.cast.length).filter(i=>t>=3.5||plan.all[i].key!==plan.handoverKey),pairs=[];while(waiting.length){const i=waiting.shift(),x=actors[i];let nearest=-1,distance=7;waiting.forEach((k,j)=>{const d=dist(x.pos,actors[k].pos);if(d<distance){nearest=j;distance=d;}});pairs.push([i,nearest>=0?waiting.splice(nearest,1)[0]:null]);}
 for(let pair=0;pair<pairs.length;pair++){const j=pair*2;const x=actors[pairs[pair][0]],y=pairs[pair][1]!=null?actors[pairs[pair][1]]:null;if(!x)continue;if(y){const u=((time+j*1.73)%5)/5,from=u<.5?x:y,to=u<.5?y:x,f=(u%.5)*2;from.look=to.pos;to.look=from.pos;from.heading=angle(from.pos,to.pos);to.heading=angle(to.pos,from.pos);from.contact=undefined;to.contact=undefined;from.gesture=f<.16?'kick':'idle';from.phase=clamp(f/.16);to.gesture=f>.82?'trap':'idle';to.phase=clamp((f-.82)/.18);balls.push({pos:mix(point(from.pos),point(to.pos),smooth(f)),visible:true});}else{x.gesture='juggle';balls.push({pos:[x.pos[0]+.3,.22+Math.abs(Math.sin(time*2.5))*.85,x.pos[1]],visible:true});}}
 let focus=plan.cast.length?plan.cast.map(p=>posAt(p,t)):[[0,-8]];
 if(plan.cast.length&&t>=9&&!['shot','rest','chain'].includes(plan.scene.kind)){
  const ball=flat(balls[0]?.pos||point(posAt(plan.cast[0],t))),near=plan.cast.map(p=>({pos:posAt(p,t),distance:dist(posAt(p,t),ball)})).sort((a,b)=>a.distance-b.distance).slice(0,3);if(near.length)focus=[ball,...near.map(p=>p.pos)];
 }
 if(plan.scene.kind==='rest')focus=plan.cast.slice(0,2).map(p=>posAt(p,t));
 if(plan.scene.kind==='shot')focus.push(posAt(plan.k,t),flat(balls[0]?.pos||[0,.14,FIELD.goalZ]));
 if(plan.roof&&t>13&&t<35){const subject=t<19?plan.cast[0]:(plan.cast[1]||plan.cast[0]);focus=[posAt(subject,t),[PAVILION.x,PAVILION.z]];}
 if(plan.scene.id==='netRecovery'&&t>19&&t<34)focus=[posAt(plan.cast[0],t),posAt(plan.k,t),flat(balls[0].pos)];
 const props={net:plan.netAt!=null&&t>=plan.netAt?Math.exp(-(t-plan.netAt)*1.8)*Math.sin((t-plan.netAt)*18)*.30:0,netX:plan.netX,bottle:plan.bottleAt!=null?smooth((t-plan.bottleAt)/.4):0,spare:plan.spareFrom!=null&&t>=plan.spareFrom,hidden:!!plan.hidden&&t>=plan.hidden.start&&t<=plan.hidden.end,tennis:plan.scene.kind==='tennis',stains:[]};
 return {actors,balls,scene:plan.scene,serial:at.serial,t,elapsed:at.elapsed,duration:at.duration,storyRate:at.storyRate,variation:plan.variation||null,props,sounds:plan.sounds,cast:plan.cast.map(p=>p.key),eventAt:plan.eventAt,beats:plan.beats,consequence:plan.consequence,focus};
}
