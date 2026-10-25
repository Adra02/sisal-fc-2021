import {rpc} from './supabase.js';
import {normalizePlayersFile} from './data-pipeline.js';
import {nameKey,validateStyle} from '../horse-style.js';
export function arenaRoster(source,accounts,excluded=[]){
 let raw=source?.parsed??source?.raw;try{if(typeof raw==='string')raw=JSON.parse(raw);}catch{raw=null}
 const banned=new Set(excluded),styles=new Map(accounts.map(a=>[a.key,a])),seen=new Map(),duplicates=new Set();
 for(const p of normalizePlayersFile(raw||[],'328794')){
  const key=nameKey(p.name);if(!key||key.length>120||/^giocatore \d+$/i.test(key)||banned.has(key))continue;
  if(seen.has(key)){duplicates.add(key);continue}
  let appearance;try{appearance=validateStyle(styles.get(key)?.appearance||{});}catch{appearance=validateStyle({});}
  seen.set(key,{key,name:p.name,appearance,registered:styles.has(key),games:p.games==null?null:Math.max(0,Math.trunc(p.games)),position:p.position||''});
 }
 return [...seen.values()].filter(p=>!duplicates.has(p.key)).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
}
export async function arenaState(session){
 let data=await rpc('sisal_arena',{p_action:'get',p_session:session});
 if(!data.snapshot){
  const players=arenaRoster(data.source,data.accounts,data.excluded);
  if(players.length>128)throw Error('ROSTER');
  const keeper=players.some(p=>p.key===data.keeper)&&data.accounts.some(a=>a.key===data.keeper)?data.keeper:null;
  data=await rpc('sisal_arena',{p_action:'publish',p_session:session,p:{epoch:data.epoch,version:2,players,keeper}});
 }
 return {ok:true,...data,sceneVersion:5};
}
