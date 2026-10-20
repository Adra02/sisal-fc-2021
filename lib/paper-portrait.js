import {nameKey,validateStyle,DEFAULT} from '../horse-style.js';
const number=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const score=p=>[number(p.goals)??0,number(p.assists)??0,number(p.saves)??0];
const compare=(a,b)=>{
 const rating=(number(b.rating)??-1)-(number(a.rating)??-1);if(rating)return rating;
 const x=score(a),y=score(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return y[i]-x[i];
 const xKey=nameKey(a.name),yKey=nameKey(b.name);return xKey<yKey?-1:xKey>yKey?1:0;
};
// The match rating decides the subject. Account ownership and article mentions never do.
export function selectPortrait(_story,players,styles={}){
 const eligible=(Array.isArray(players)?players:[]).filter(p=>typeof p?.name==='string'&&p.name.trim()&&!/^giocatore \d+$/i.test(p.name.trim()));
 const rated=eligible.filter(p=>(number(p.rating)??0)>0).sort(compare);
 if(!rated.length)return null; // Missing votes are not evidence for an MVP.
 const selected=rated[0],key=nameKey(selected.name),rating=number(selected.rating);
 let appearance;try{appearance=validateStyle(styles?.[key]||{});}catch{appearance=validateStyle({});}
 return {name:selected.name.trim(),key,appearance,selection:'rating',selectionVersion:2,rating,
  tied:rated.filter(p=>number(p.rating)===rating).map(p=>p.name.trim()),
  votesComplete:rated.length===eligible.length,defaultAppearance:Object.keys(DEFAULT).every(k=>appearance[k]===DEFAULT[k])};
}
