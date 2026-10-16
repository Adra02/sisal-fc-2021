import {nameKey,validateStyle} from '../horse-style.js';
export function selectPortrait(story,players,styles){
 const eligible=players.filter(p=>Object.hasOwn(styles,nameKey(p.name)));
 const mentions=p=>{const escaped=p.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(?<![\\p{L}\\p{N}_])'+escaped+'(?![\\p{L}\\p{N}_])','iu').test(story.title+' '+story.text)};
 const selected=eligible.filter(mentions).sort((a,b)=>b.name.length-a.name.length)[0]||eligible.slice().sort((a,b)=>(b.rating??-1)-(a.rating??-1)||a.name.localeCompare(b.name))[0];
 if(!selected)return null;
 try{return {name:selected.name,key:nameKey(selected.name),appearance:validateStyle(styles[nameKey(selected.name)])};}catch{return null;}
}
