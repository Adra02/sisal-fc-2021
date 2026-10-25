import {hash,shuffle} from './arena-motion.js?v=arena-6';
// A fair, reproducible rotation. Unknown real appearances are never zero.
const schedules=new WeakMap();
const signature=team=>team.map(p=>p.key).sort().join('|');
export function friendlyLineup(snapshot,index){
 let schedule=schedules.get(snapshot);if(!schedule){
  const roster=[...(snapshot.players||[])].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0),zero=roster.filter(p=>p.games===0),eligible=zero.length?zero:roster,seed=hash('teams5:'+roster.map(p=>p.key).join('|')),odd=roster.length%2;
  const candidates=shuffle(eligible,seed),count=odd?Math.max(24,Math.ceil(24/Math.max(1,candidates.length))*candidates.length):24,list=[];
  for(let i=0;i<count;i++){
   const bench=odd?candidates[i%candidates.length]:null,available=roster.filter(p=>p.key!==bench?.key),half=available.length/2;let split;
   for(let attempt=0;attempt<100;attempt++){
    const shuffled=shuffle(available,hash(seed+':'+i+':'+attempt)),a=shuffled.slice(0,half),b=shuffled.slice(half),sa=signature(a),sb=signature(b),prev=list.at(-1),first=i===count-1?list[0]:null;
    const differs=x=>!x||(sa!==x.sa&&sa!==x.sb&&sb!==x.sa&&sb!==x.sb);
    split={a,b,sa,sb};if(half<2||(differs(prev)&&differs(first)))break;
   }
   // A deterministic swap search closes the rare random-search failure case.
   const acceptable=c=>{const prev=list.at(-1),first=i===count-1?list[0]:null;return [prev,first].every(x=>!x||(c.sa!==x.sa&&c.sa!==x.sb&&c.sb!==x.sa&&c.sb!==x.sb));};
   if(half>=2&&!acceptable(split)){const original=split;let found=false;for(let a=0;a<half&&!found;a++)for(let b=0;b<half&&!found;b++){const left=[...original.a],right=[...original.b];[left[a],right[b]]=[right[b],left[a]];const candidate={a:left,b:right,sa:signature(left),sb:signature(right)};if(acceptable(candidate)){split=candidate;found=true;}}if(!found)throw Error('Impossibile comporre squadre diverse: controllare la rosa.');}
   list.push({...split,bench,reason:bench?(zero.length?'zero-appearances':'rotation'):null});
  }
  schedule=list;schedules.set(snapshot,schedule);
 }
 const x=schedule[((index%schedule.length)+schedule.length)%schedule.length];return {...x,index,teams:[x.a.map(p=>p.key),x.b.map(p=>p.key)],benchKey:x.bench?.key||null,canVary:Math.min(x.a.length,x.b.length)>=2};
}
