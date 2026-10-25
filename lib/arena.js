import {rpc} from './supabase.js';
import {normalizePlayersFile} from './data-pipeline.js';
import {nameKey,validateStyle} from '../horse-style.js';
import {randomUUID} from 'node:crypto';
import {prepareWorldSnapshot} from '../arena-world.js';
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
 const started=performance.now(),claim=randomUUID();let data;
 try{data=await rpc('sisal_arena_live',{p_action:'get',p_session:session,p:{claim,simulationVersion:8}});}
 catch(e){if(/sisal_arena_live|schema cache|could not find.*function/i.test(e.message||''))throw Object.assign(Error('Completa prima il passaggio SQL 16-arena-football.sql su Supabase.'),{code:'ARENA_SETUP',status:503});throw e;}
 if(data.simulationVersion!==8)throw Object.assign(Error('Esegui il passaggio SQL 16-arena-football.sql su Supabase per attivare i movimenti corretti.'),{code:'ARENA_SETUP',status:503});
 if(data.pending)return {ok:true,pending:true,version:3,sceneVersion:8,epoch:data.epoch,retryAfterMs:data.retryAfterMs||2400,serverNow:Date.now(),processingMs:performance.now()-started};
 if(!data.snapshot){
  try{
   const players=arenaRoster(data.source,data.accounts,data.excluded);if(players.length>128)throw Error('ROSTER');
   const keeper=players.some(p=>p.key===data.keeper)&&data.accounts.some(a=>a.key===data.keeper)?data.keeper:null;
   const snapshot=prepareWorldSnapshot(players,keeper,data.epoch,data.previous);
   data=await rpc('sisal_arena_live',{p_action:'publish',p_session:session,p:{epoch:data.epoch,claim,snapshot,simulationVersion:8}});
  }catch(e){await rpc('sisal_arena_live',{p_action:'release',p_session:session,p:{claim,simulationVersion:8}}).catch(()=>{});throw e;}
 }
 // Future checkpoints are only for the next server handoff, never UI data.
 const {players,keeper}=data.snapshot;let world=data.snapshot.world;const checkpoint=data.snapshot.checkpoints?.findLast(c=>c.at<=Date.now());if(checkpoint)world={version:8,startAt:checkpoint.at,start:checkpoint.state};
 return {ok:true,version:3,sceneVersion:8,epoch:data.epoch,serverNow:Date.now(),processingMs:performance.now()-started,snapshot:{players,keeper,world}};
}
