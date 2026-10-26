// A bounded, device-local replay buffer. It only records already sampled past
// frames. It never rewinds the shared simulation or sends data to the server.
const highlights=new Set(['goal','save','post','bicycle','scissor','volley','header','heelPass','outsideShot','chip','nutmeg','foul','matchEnd']);
const labels={goal:'Gol',save:'Parata',post:'Palo',bicycle:'Rovesciata',scissor:'Sforbiciata',volley:'Tiro al volo',header:'Colpo di testa',heelPass:'Tacco',outsideShot:'Esterno',chip:'Pallonetto',nutmeg:'Tunnel',foul:'Fallo',matchEnd:'Fine partitella'};
const mix=(a,b,u)=>a+(b-a)*u,turn=(a,b,u)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*u;
export function interpolateReplay(a,b,u){
 const actors=new Map(a.actors.map(p=>[p.key,p])),balls=new Map(a.balls.map(p=>[p.id,p]));
 return {...b,t:mix(a.t,b.t,u),actors:b.actors.map(p=>{const q=actors.get(p.key)||p,same=q.gesture===p.gesture&&q.gestureStart===p.gestureStart;return {...p,pos:p.pos.map((v,i)=>mix(q.pos[i],v,u)),heading:turn(q.heading,p.heading,u),stepCycle:mix(q.stepCycle,p.stepCycle,u),phase:same?mix(q.phase,p.phase,u):p.phase,actionTime:mix(q.actionTime,p.actionTime,u)};}),balls:b.balls.map(p=>{const q=balls.get(p.id)||p;return {...p,pos:p.pos.map((v,i)=>mix(q.pos[i],v,u)),spin:p.spin.map((v,i)=>mix(q.spin[i],v,u))};})};
}
export function createArenaTimeline({seconds=12,sampleRate=24,maxHighlights=24}={}){
 let frames=[],events=[],seen=new Set(),last=-Infinity,replay=null;
 function reset(){frames=[];events=[];seen.clear();last=-Infinity;replay=null;}
 function record(frame){
  if(frame.t<last-.1)reset();if(frame.t-last<1/sampleRate-.002)return;
  last=frame.t;frames.push(frame);while(frames.length>Math.ceil(seconds*sampleRate)+2||frames[0].t<last-seconds)frames.shift();
  const names=new Map(frame.actors.map(p=>[p.key,p.appearance?.nickname||p.name]));
  for(const e of frame.events||[]){if(e.at>frame.t||seen.has(e.id)||!highlights.has(e.type))continue;seen.add(e.id);events.push({...e,label:labels[e.type],actorName:names.get(e.actor)||'',targetName:names.get(e.target)||''});}
  if(events.length>maxHighlights)events.splice(0,events.length-maxHighlights);if(seen.size>192)seen=new Set(events.map(e=>e.id));
 }
 function start(id){
  const event=id==null?[...events].reverse().find(e=>e.at>=frames[0]?.t+.4):events.find(e=>e.id===id);
  if(!event||frames.length<4||event.at<frames[0].t)return false;
  const from=Math.max(frames[0].t,event.at-3.5),to=Math.min(last,event.at+3.5),clip=frames.filter(f=>f.t>=from&&f.t<=to);
  if(clip.length<3||clip.at(-1).t-clip[0].t<.25)return false;
  replay={clip,time:clip[0].t,from:clip[0].t,to:clip.at(-1).t,event};return true;
 }
 function tick(delta){if(!replay)return null;replay.time+=Math.max(0,Math.min(.2,delta));if(replay.time>replay.to+.10){replay=null;return null;}
  const t=Math.min(replay.to,replay.time),i=replay.clip.findIndex(f=>f.t>=t),b=replay.clip[i<0?replay.clip.length-1:i],a=replay.clip[Math.max(0,i-1)]||b,u=b.t===a.t?1:Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t)));
  return {frame:interpolateReplay(a,b,u),progress:(t-replay.from)/Math.max(.01,replay.to-replay.from),event:replay.event};
 }
 return {record,start,tick,stop(){replay=null;},reset,get active(){return !!replay;},get available(){return frames.length>3&&events.some(e=>e.at>=frames[0].t+.4);},get events(){return events.map(e=>({...e,replayable:frames.length>3&&e.at>=frames[0].t+.4}));}};
}
