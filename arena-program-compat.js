import {SCENES} from './arena-scenes.js?v=arena-11';
import {sampleArena as legacySample,inspectArenaScene,home,flight} from './arena-drills.js?v=arena-11';
import {DT,clamp,mix,hash,random,shuffle} from './arena-motion.js?v=arena-11';
import {motionAt,stateActors,frameAt} from './arena-clip.js?v=arena-11';
import {initialStates,buildTraining,trainingBalls} from './arena-training.js?v=arena-11';
import {buildFriendly} from './arena-football.js?v=arena-11';
import {buildSetPiece} from './arena-setpieces.js?v=arena-11';
import {banterForClip} from './arena-banter.js?v=arena-11';
export {clamp,hash,random,shuffle,home,flight,inspectArenaScene};
export const EPOCH_MS=1800000,SLOT_SECONDS=50,VERSION=2;
const mod=(x,n)=>((x%n)+n)%n,timelines=new Map(),worlds=new WeakMap();
const active=SCENES.filter(s=>!['breath','laces','closing','five','hiddenLaugh','giveWay'].includes(s.event));
export const FOOTBALL_SCENES=[{id:'crossVolley',kind:'cross',event:'cross',title:'Cross e chiusura al volo'},{id:'penaltyPractice',kind:'penalty',event:'penalty',title:'Rigori · tiratore e portiere'},{id:'freeKickPractice',kind:'freeKick',event:'freeKick',title:'Punizioni · barriera e porta'},{id:'foulRestart',kind:'foul',event:'foul',title:'Contrasto, fallo e ripresa'},{id:'friendly',kind:'friendly',event:'kickoff',title:'Partitella del club'}];
function timeline(epoch){
 if(timelines.has(epoch))return timelines.get(epoch);const rng=random(hash('arena5-session:'+epoch)),order=shuffle(active,hash('arena5-drills:'+Math.floor(epoch*24/active.length))),raw=[];let cursor=epoch*1800,sum=0;
 for(let i=0;i<36;i++){const group=Math.floor(i/6),kind=i%6,scene=kind===5?FOOTBALL_SCENES[4]:kind===0?FOOTBALL_SCENES[0]:kind===2?FOOTBALL_SCENES[group%2?3:2]:kind===4?FOOTBALL_SCENES[1]:order[mod(epoch*12+group*2+(kind===3?1:0),order.length)],duration=kind===5?112+rng()*12:32+rng()*7;raw.push({serial:epoch*36+i,scene,duration,matchIndex:epoch*6+group});sum+=duration;}
 const factor=1800/sum,slots=raw.map((s,i)=>{const duration=i===35?(epoch+1)*1800-cursor:s.duration*factor;const out={...s,start:cursor,duration};cursor+=duration;return out;});timelines.set(epoch,slots);if(timelines.size>4)timelines.delete(timelines.keys().next().value);return slots;
}
export function episodeAt(serial){return {...timeline(Math.floor(serial/36))[mod(serial,36)]};}
export function sceneAt(time){const slots=timeline(Math.floor(time/1800)),slot=slots.find(s=>time<s.start+s.duration)||slots.at(-1);return {...slot,t:clamp(time-slot.start,0,slot.duration),elapsed:clamp(time-slot.start,0,slot.duration),storyRate:1};}
function periodFor(snapshot,epoch){let periods=worlds.get(snapshot);if(!periods){periods=new Map();worlds.set(snapshot,periods);}if(!periods.has(epoch)){periods.set(epoch,{checkpoints:[initialStates(snapshot)],histories:[[]],clips:new Map()});if(periods.size>2)periods.delete(periods.keys().next().value);}return periods.get(epoch);}
export function inspectSessionClip(snapshot,serial){
 const epoch=Math.floor(serial/36),index=mod(serial,36),period=periodFor(snapshot,epoch);if(period.clips.has(index))return period.clips.get(index);
 let first=index;while(!period.checkpoints[first])first--;
 for(let i=first;i<=index;i++){
  if(period.clips.has(i))continue;const slot=episodeAt(epoch*36+i),start=period.checkpoints[i];let clip;
  if(slot.scene.kind==='friendly'&&(snapshot.players||[]).length>=2)clip=buildFriendly(snapshot,slot,start);
  else if(['cross','penalty','freeKick','foul'].includes(slot.scene.kind))clip=buildSetPiece(snapshot,slot,start);
  else clip=buildTraining(snapshot,{...slot,scene:slot.scene.kind==='friendly'?SCENES.find(s=>s.id==='contact'):slot.scene},start);
  clip.serial=slot.serial;const dialogue=banterForClip(clip,slot.serial,period.histories[i]||[]);clip.messages=dialogue.messages;period.histories[i+1]=dialogue.history;period.checkpoints[i+1]=clip.end.map(p=>({...p}));period.clips.set(i,clip);if(period.clips.size>3)period.clips.delete(period.clips.keys().next().value);
 }
 return period.clips.get(index);
}
function ballPositions(clip,t){if(clip.positions){const {index,next,u}=frameAt(clip,t);return [{pos:[0,1,2].map(k=>mix(clip.positions[index*3+k],clip.positions[next*3+k],u)),visible:true},...(clip.spareBalls||[]).filter(b=>b.at<t).map(b=>({pos:b.pos,visible:true}))];}return trainingBalls(clip,t);}
export function sampleArena(snapshot,time,override){
 if(override)return legacySample(snapshot,time,override);
 const at=sceneAt(time),clip=inspectSessionClip(snapshot,at.serial),t=at.elapsed,actors=stateActors(clip,t),balls=ballPositions(clip,t),ball=balls[0]?.pos||[0,.14,0],near=actors.filter(p=>p.active&&!p.seated).sort((a,b)=>Math.hypot(a.pos[0]-ball[0],a.pos[1]-ball[2])-Math.hypot(b.pos[0]-ball[0],b.pos[1]-ball[2])).slice(0,3),last=clip.events.findLast(e=>e.at<=t),goal=clip.events.findLast(e=>e.type==='goal'&&e.at<=t),{index}=frameAt(clip,t),score=clip.scores?[clip.scores[index*2],clip.scores[index*2+1]]:null;
 const focus=[[ball[0],ball[2]],...near.map(p=>p.pos)];if(!Number.isFinite(focus[0][0]))focus[0]=[0,0];
 const own=clip.lineup,match=own?{score,teams:own.teams,benchKey:own.benchKey,benchReason:own.reason,number:own.a.length,canVary:own.canVary,phase:clip.phases[index],event:last?.type||'kickoff'}:null;
 const props={net:goal?Math.exp(-(t-goal.at)*2)*Math.sin((t-goal.at)*18)*.26:0,netX:goal?.pos?.[0]||0,netSide:(goal?.pos?.[2]||-1)<0?-1:1,bottle:0,spare:false,tennis:clip.scene.kind==='tennis',stains:[]};
 const sounds=clip.events.filter(e=>['pass','cross','shot','volley','penalty','freeKick','goal','save','receive','foul'].includes(e.type)).map(e=>({at:e.at,type:e.type==='goal'?'net':e.type==='save'?'save':e.type==='foul'?'whistle':e.type==='receive'?'touch':'kick',pos:e.pos||ball}));
 return {actors,balls,scene:clip.scene,serial:at.serial,t,elapsed:t,duration:at.duration,storyRate:1,props,sounds,cast:actors.filter(p=>p.active).map(p=>p.key),eventAt:clip.eventAt||last?.at||8,beats:clip.events,focus,messages:clip.messages,match,playing:!!clip.positions,ballHeight:ball[1]};
}

export async function prewarmArena(snapshot,time,{signal,onProgress}={}){const index=mod(sceneAt(time).serial,36),epoch=Math.floor(time/1800);for(let i=0;i<=index;i++){if(signal?.aborted)throw new DOMException('Apertura annullata','AbortError');inspectSessionClip(snapshot,epoch*36+i);onProgress?.((i+1)/(index+1));if(i<index)await new Promise(resolve=>setTimeout(resolve,0));}}
