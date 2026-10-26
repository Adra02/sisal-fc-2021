import {DT,clamp,movePlayers} from './arena-motion.js?v=arena-10';
import {createWorld,reconcileWorld,resetActivities,exportWorld,now,actor,restWeight,handPoint,WORLD_VERSION,SESSION_SECONDS} from './arena-world-state.js?v=arena-10';
import {stepBalls,stepKick,stepThrow} from './arena-world-ball.js?v=arena-10';
import {planWorld,reactToBalls,afterWorld} from './arena-world-play.js?v=arena-10';
import {converse} from './arena-conversation.js?v=arena-10';
import {stepTechniques} from './arena-techniques.js?v=arena-10';
import {TECHNIQUES,techniqueLabel} from './arena-technique-data.js?v=arena-10';
import {isKeeper} from './arena-roles.js?v=arena-10';
export {createWorld,reconcileWorld,exportWorld,WORLD_VERSION,SESSION_SECONDS};
export function worldContext(snapshot){return {snapshot,keeper:snapshot.keeper||null,meta:new Map([...snapshot.players.map(p=>[p.key,p]),['__keeper_bot',{key:'__keeper_bot',name:'BOT · Porta A',appearance:{silk:'gold',number:'1'}}],['__keeper_away_bot',{key:'__keeper_away_bot',name:'BOT · Porta B',appearance:{silk:'navy',number:'12'}}]])};}
export function stepWorld(w,context){
 w.tick++;w.newEvents=[];planWorld(w,context);
 movePlayers(w.players,w.players.map(p=>p.target),DT);
 stepBalls(w);
 for(const p of w.players)if(p.kick)stepKick(w,p,w.balls.find(b=>b.id===p.kick.ball));
 for(const p of w.players)if(p.throw)stepThrow(w,p,w.balls.find(b=>b.id===p.throw.ball));
 stepTechniques(w);
 reactToBalls(w,context);afterWorld(w,context);converse(w,context);
 const focus=w.newEvents.filter(e=>['goal','save','cross','shot','penalty','freeKick','volley','header','bicycle','scissor','outsideShot','chip'].includes(e.type)).at(-1);
 if(focus&&(now(w)-(w.focusAt||-100)>5||['goal','save'].includes(focus.type))){w.focusBall=focus.ball;w.focusAt=now(w);}
}
export function advanceWorld(w,targetTick,context){if(!Number.isSafeInteger(targetTick)||targetTick<w.tick)throw Error('INVALID_WORLD_TIME');while(w.tick<targetTick)stepWorld(w,context);return w;}
export function prepareWorldSnapshot(players,keeper,epoch,previous=null){
 const snapshot={players,keeper},context=worldContext(snapshot),start=reconcileWorld(previous?.end,players);
 if(previous&&previous.keeper!==keeper&&start.mode==='training')resetActivities(start);
 const end=exportWorld(start),checkpoints=[];for(let seconds=300;seconds<=SESSION_SECONDS;seconds+=300){advanceWorld(end,start.tick+seconds*24,context);if(seconds<SESSION_SECONDS)checkpoints.push({at:epoch*SESSION_SECONDS*1000+seconds*1000,state:exportWorld(end)});}
 return {players,keeper,world:{version:WORLD_VERSION,startAt:epoch*SESSION_SECONDS*1000,start:exportWorld(start)},checkpoints,end:exportWorld(end)};
}
export function captureWorld(w,context){
 const t=now(w),dialogue=w.dialogue.findLast(d=>t>=d.at&&t<d.until)||null,recentDialogue=w.dialogue.findLast(d=>d.at<=t&&t-d.until<14)||null;
 const actors=w.players.map(p=>{
  const meta=context.meta.get(p.key)||{key:p.key,name:p.key,appearance:{}},a=p.action&&t<=p.action.end?p.action:null,held=w.balls.find(b=>b.owner===p.key&&['hand','pickup','place'].includes(b.mode)),cone=w.equipment?.cones.find(c=>c.owner===p.key),seated=restWeight(w,p),v=Math.hypot(p.vx,p.vz);let gesture=a?.kind||(held?'carryBall':cone?'carryEquipment':v>.12?(v>2?'run':'walk'):p.bot?'keeper':'idle'),phase=a?clamp((t-a.start)/(a.end-a.start||1)):0;
  if(seated>0){gesture=p.rest?.phase==='rise'?'standFromSeat':'sit';phase=p.rest?.phase==='rise'?clamp(t-p.rest.riseAt):.5;}
  const currentBall=w.balls.find(b=>b.id===(w.match?.ball||w.focusBall))||w.balls[0],look=dialogue&&v<.3&&actor(w,dialogue.speaker)?actor(w,dialogue.speaker):held?{x:p.x+Math.sin(p.heading)*3,z:p.z+Math.cos(p.heading)*3}:currentBall;
  return {...meta,goalkeeper:w.match?isKeeper(p):p.bot||context.keeper===p.key,bot:p.bot,reserve:p.reserveKeeper||false,pos:[p.x,p.z],velocity:[p.vx,p.vz],acceleration:p.acceleration||[0,0],turnRate:p.turnRate||0,brace:p.brace||0,braceSide:p.braceSide||0,heading:p.heading,look:[look?.x||0,look?.z||0],stepCycle:p.cycle,travel:p.travel,strideLength:p.stride,elevation:p.elevation||0,gesture,phase,actionTime:t,gestureStart:a?.start,contact:a?.contact,foot:a?.foot??1,footTarget:a?.footTarget,headTarget:a?.headTarget,handTarget:held?[held.x,held.y,held.z]:a?.handOffset?[p.x+a.handOffset[0],a.handOffset[1],p.z+a.handOffset[2]]:a?.handTarget||(cone?[cone.x,cone.y+.15,cone.z]:undefined),diveSide:a?.side||0,jumpHeight:a?.jumpHeight||0,strength:a?.strength??1,seatBlend:seated,seated:seated>.9,preciseMotion:true,active:!p.rest&&!p.reserveKeeper,team:p.team,dirty:!!a?.dirty,personality:p.personality||0};
 });
 const balls=w.balls.map(b=>({id:b.id,pos:[b.x,b.y,b.z],spin:[b.spinX,b.spinY,b.spinZ],visible:true,owner:b.owner,mode:b.mode})),main=w.balls.find(b=>b.id===(w.match?.ball||w.focusBall))||w.balls.find(b=>b.mode!=='rack')||w.balls[0],near=actors.filter(p=>p.active).sort((a,b)=>Math.hypot(a.pos[0]-main.x,a.pos[1]-main.z)-Math.hypot(b.pos[0]-main.x,b.pos[1]-main.z)).slice(0,3);
 const performing=w.players.filter(p=>!p.rest&&p.action&&t<=p.action.end&&TECHNIQUES[p.action.technique||p.action.kind]).filter(p=>p.action.ball?p.action.ball===main.id:Math.hypot(p.x-main.x,p.z-main.z)<5).sort((a,b)=>b.action.start-a.action.start||(a.key<b.key?-1:1))[0];const action=performing?.action,type=action?.technique||action?.kind,technique=performing?{key:performing.key,name:context.meta.get(performing.key)?.appearance?.nickname||context.meta.get(performing.key)?.name||performing.key,label:techniqueLabel(type),at:action.start,contact:action.contact,until:action.end,position:[performing.x,performing.z],ball:main.id}:null;
 const match=w.match?{score:[...w.match.score],teams:w.match.teams,keepers:w.match.keepers||['__keeper_bot','__keeper_away_bot'],benchKey:w.match.benchKey,benchReason:w.match.benchReason,number:w.match.teams[0].length,canVary:w.match.canVary,phase:w.match.phase,restart:w.match.restart,setupRemaining:w.equipment?.cones.filter(c=>c.mode!=='stored').length||0}:null;
 return {actors,balls,technique,scene:{id:'continuous-field',kind:'live',event:'live',title:match?(w.mode==='gather'?(match.setupRemaining?'Si libera il campo':'Si prepara una partitella'):w.match.phase==='finish'?'Dopo la partitella':w.match.phase==='goal'?'Gol · Si torna a metà campo':w.match.phase==='foul'?'Fallo · Si prepara la ripresa':['restart','placeRestart','readyRestart','kickoff','throwing'].includes(w.match.phase)?({kickoff:'Calcio d’inizio',penalty:'Calcio di rigore',freeKick:'Calcio di punizione',corner:'Calcio d’angolo',throwIn:'Rimessa laterale',goalKick:'Rimessa dal fondo',indirect:'Punizione indiretta'}[w.match.restart]||'Ripresa del gioco'):'Partitella del club'):'Allenamento libero'},serial:0,t,elapsed:t,duration:null,props:{net:0,netSide:-1,netX:0,bottle:0,spare:false,tennis:false,stains:[],cones:w.equipment?.cones.map(c=>({...c}))||[]},sounds:w.events.filter(e=>t>=e.at&&t<e.at+.20&&['touch','receive','interception','outsidePass','heelPass','outsideShot','chip','bicycle','scissor','pass','cross','shot','penalty','freeKick','volley','goal','save','foul','post','throw','throwIn','header','kickoff','goalKick','indirect','restartSignal','offside','bounce'].includes(e.type)).map(e=>({id:e.id,at:e.at,type:e.type==='goal'?'net':e.type==='save'?'save':['foul','restartSignal','offside'].includes(e.type)?'whistle':e.type==='post'?'metal':['touch','receive','interception'].includes(e.type)?'touch':e.type==='bounce'?'bounce':['throw','throwIn'].includes(e.type)?'throw':'kick',profile:e.type==='header'?'header':['pass','outsidePass','heelPass','kickoff','goalKick','indirect'].includes(e.type)?'pass':['shot','outsideShot','penalty','freeKick','bicycle','scissor','volley','chip'].includes(e.type)?'strike':e.control==='chest'?'cloth':undefined,pos:e.pos,intensity:e.intensity??.55,surface:e.surface})),cast:actors.filter(p=>p.active).map(p=>p.key),focus:[[main.x,main.z],...near.map(p=>p.pos)],messages:w.dialogue,dialogue,recentDialogue,match,playing:main.mode==='free'&&Math.hypot(main.vx,main.vz)>.3,ballHeight:main.y,ballVelocity:[main.vx,main.vy,main.vz],live:true,events:w.events.slice(-12)};
}
