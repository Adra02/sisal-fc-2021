// Cones are collected and carried off the pitch before a friendly can start.
import {TRAINING_CONES} from './arena-layout.js?v=arena-12';
import {actor,now,pose,handPoint,emit} from './arena-world-state.js?v=arena-12';
export const createEquipment=()=>({cones:TRAINING_CONES.map(([x,z],i)=>({id:'cone-'+i,x,z,y:0,mode:'field',owner:null,tilt:0}))});
export const equipmentClear=w=>!w.equipment?.cones.some(c=>c.mode!=='stored');
export function planEquipment(w){
 if(!w.match||w.match.phase!=='gather'||equipmentClear(w))return;
 w.equipment ||= createEquipment();const m=w.match,t=now(w);
 const available=w.players.filter(p=>!p.bot&&!p.rest&&p.key!==m.carrier&&!w.groups.some(g=>g.stage!=='done'&&g.members.includes(p.key))&&!w.balls.some(b=>b.owner===p.key));
 if(!m.collectors?.length)m.collectors = available.slice().sort((a,b)=>a.key<b.key?-1:1).slice(0,Math.min(2,available.length)).map(p=>p.key);
 for(const [index,key]of m.collectors.entries()){
  const p=actor(w,key);if(!p||p.rest)continue;
  const held=w.equipment.cones.filter(c=>c.owner===key),claimed=w.equipment.cones.find(c=>c.claim===key&&c.mode==='field');
  let job=p.equipmentJob;
  if(!job){
   const remaining=w.equipment.cones.filter(c=>c.mode==='field'&&!c.claim).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
   if(held.length>=3||held.length&&!remaining.length&&!claimed)job=p.equipmentJob={phase:'deliver',at:t};
   else if(claimed||remaining[0]){const c=claimed||remaining[0];c.claim=key;job=p.equipmentJob={phase:'approach',cone:c.id,at:t};}
   else continue;
  }
  p.priority=.2;p.maxSpeed=4.8;
  const cone=w.equipment.cones.find(c=>c.id===job.cone);
  if(job.phase==='approach'){
   p.target=[cone.x-.35,cone.z];p.aim=Math.PI/2;
   if(Math.hypot(p.x-p.target[0],p.z-p.target[1])<.16&&Math.hypot(p.vx,p.vz)<.9){job.phase='collect';job.at=t;pose(w,p,'collect',.65,{contact:t+.28,handTarget:[cone.x,.22,cone.z]});}
  }else if(job.phase==='collect'){
   p.target=[p.x,p.z];p.maxSpeed=0;
   if(t-job.at>.60){cone.mode='hand';cone.owner=key;cone.claim=null;p.equipmentJob=null;emit(w,'equipmentCollect',p,null,null,{cone:cone.id});}
  }else if(job.phase==='deliver'){
   p.target=[18.25+index*.9,19.3];p.aim=Math.PI/2;
   if(Math.hypot(p.x-p.target[0],p.z-p.target[1])<.14&&Math.hypot(p.vx,p.vz)<.8){job.phase='store';job.at=t;pose(w,p,'placeBall',.65,{contact:t+.3,handTarget:[18.7+index*.9,.22,19.3]});}
  }else if(job.phase==='store'){
   p.target=[p.x,p.z];p.maxSpeed=0;
   if(t-job.at>.60){for(const [i,c]of held.entries()){c.mode='stored';c.owner=null;c.x=18.7+index*.9;c.z=19.3;c.y=i*.065;c.tilt=0;}p.equipmentJob=null;emit(w,'equipmentStore',p,null,null);}
  }
 }
}
export function stepEquipment(w){
 for(const c of w.equipment?.cones||[])if(c.owner){const p=actor(w,c.owner);if(p){const h=handPoint(p),i=w.equipment.cones.filter(x=>x.owner===c.owner).indexOf(c);c.x=h[0];c.y=h[1]-.15+i*.065;c.z=h[2];}}
}
