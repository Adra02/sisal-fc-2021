import { raceCollection, publicDatabaseError } from '../lib/horse-racing/store.js';
import { createRace, completeRace, publicRecord } from '../lib/horse-racing/service.js';
export const maxDuration = 30;
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function GET(request) {
  try {
    const url=new URL(request.url),collection=await raceCollection();
    if(url.searchParams.get('action')==='health') {
      await collection.findOne({}, {projection:{_id:1}});
      return json({ok:true,message:'MongoDB collegato'});
    }
    const raceId=url.searchParams.get('id');
    if(raceId){
      if(!/^[0-9a-f-]{36}$/.test(raceId))return json({error:'Gara non valida.'},400);
      const race=await collection.findOne({raceId,status:'completed'});
      return race?json({race:publicRecord(race)}):json({error:'Gara non trovata.'},404);
    }
    const before=url.searchParams.get('before'),filter={status:'completed'};
    if(before){if(!Number.isFinite(Date.parse(before)))return json({error:'Data non valida.'},400);filter.createdAt={$lt:new Date(before)};}
    const list=await collection.find(filter,{projection:{_id:0,tokenHash:0,ipHash:0,expiresAt:0}}).sort({createdAt:-1}).limit(20).toArray();
    return json({races:list,nextBefore:list.length===20?list.at(-1).createdAt:null});
  }catch(error){return json({ok:false,...publicDatabaseError(error)},error.status||503);}
}
export async function POST(request) {
  try {
    const origin=request.headers.get('origin');
    if(origin&&origin!==new URL(request.url).origin)return json({error:'Richiesta non autorizzata.'},403);
    if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Richiesta non valida.'},415);
    if(Number(request.headers.get('content-length')||0)>12000)return json({error:'Richiesta troppo grande.'},413);
    const text=await request.text();if(text.length>12000)return json({error:'Richiesta troppo grande.'},413);
    let body;try{body=JSON.parse(text)}catch{return json({error:'Richiesta non valida.'},400)}
    if(!body||!['create','complete'].includes(body.action))return json({error:'Operazione non valida.'},400);
    const collection=await raceCollection();
    if(body.action==='create'){
      try{return json(await createRace(collection,body,request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local'),201)}
      catch(e){if(!e.publicCode&&/partecipant|Nome/.test(e.message))return json({error:e.message},400);throw e;}
    }
    return json({race:await completeRace(collection,body)});
  }catch(error){return json({ok:false,...publicDatabaseError(error)},error.status||503);}
}
