import {DT,clamp,mix} from './arena-motion.js?v=arena-6';
import {worldContext,advanceWorld,captureWorld,exportWorld} from './arena-world.js?v=arena-6';
const caches=new WeakMap();
function cache(snapshot){let c=caches.get(snapshot);if(!c){if(snapshot.world?.version!==6||!snapshot.world.start)throw Error('ARENA_WORLD_REQUIRED');const state=structuredClone(snapshot.world.start);c={state,context:worldContext(snapshot),previous:null,current:null,checkpoints:[exportWorld(state)]};caches.set(snapshot,c);}return c;}
function targetTick(snapshot,seconds){return snapshot.world.start.tick+Math.max(0,Math.floor((seconds*1000-snapshot.world.startAt)/1000/DT));}
function advance(c,target){
 if(target<c.state.tick){const start=[...c.checkpoints].reverse().find(s=>s.tick<=target)||c.checkpoints[0];c.state=structuredClone(start);c.current=c.previous=null;}
 if(target>c.state.tick){if(target-c.state.tick>1)advanceWorld(c.state,target-1,c.context);c.previous=captureWorld(c.state,c.context);advanceWorld(c.state,target,c.context);c.current=captureWorld(c.state,c.context);}else c.current||=(captureWorld(c.state,c.context));
 if(c.state.tick-c.checkpoints.at(-1).tick>1200){c.checkpoints.push(exportWorld(c.state));if(c.checkpoints.length>12)c.checkpoints.splice(1,1);}
 return c;
}
export function sampleContinuous(snapshot,seconds){
 const c=advance(cache(snapshot),targetTick(snapshot,seconds)),a=c.previous,b=c.current;
 if(!a||a.t===b.t)return b;
 const liveTick=snapshot.world.start.tick+(seconds*1000-snapshot.world.startAt)/1000/DT,u=clamp(liveTick-Math.floor(liveTick));
 // One fixed step of visual latency permits interpolation without guessing
 // future contacts, scores or winners. Events remain those of the current step.
 return {...b,actors:b.actors.map(p=>{const q=a.actors.find(q=>q.key===p.key)||p;return {...p,pos:p.pos.map((v,i)=>mix(q.pos[i],v,u)),velocity:p.velocity.map((v,i)=>mix(q.velocity[i],v,u)),heading:q.heading+Math.atan2(Math.sin(p.heading-q.heading),Math.cos(p.heading-q.heading))*u,stepCycle:mix(q.stepCycle,p.stepCycle,u),elevation:mix(q.elevation,p.elevation,u)};}),balls:b.balls.map(p=>{const q=a.balls.find(q=>q.id===p.id)||p;return {...p,pos:p.pos.map((v,i)=>mix(q.pos[i],v,u)),spin:p.spin.map((v,i)=>mix(q.spin[i],v,u))};})};
}
export async function prewarmContinuous(snapshot,seconds,{signal,onProgress}={}){
 const c=cache(snapshot),target=targetTick(snapshot,seconds),start=c.state.tick;if(target<start){advance(c,target);onProgress?.(1);return;}
 while(c.state.tick<target){if(signal?.aborted)throw new DOMException('Apertura annullata','AbortError');advance(c,Math.min(target,c.state.tick+192));onProgress?.((c.state.tick-start)/Math.max(1,target-start));if(c.state.tick<target)await new Promise(r=>setTimeout(r,0));}
 onProgress?.(1);
}
