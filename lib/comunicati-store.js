import {get,put,del} from '@vercel/blob';
import {createHash} from 'node:crypto';
const ROOT='sisal-fc/fc27/comunicati-v1/';
const INDEX=ROOT+'index.json';
const fail=(code,status=409)=>Object.assign(new Error(code),{code,status});
const conflict=e=>e?.name==='BlobPreconditionFailedError'||/precondition|already exists|already_exists|409|412/i.test(e?.message||'');
const missing=e=>e?.name==='BlobNotFoundError'||/blob not found|does not exist|404/i.test(e?.message||'');
function auth(){
 const token=String(process.env.BLOB_READ_WRITE_TOKEN||'').trim();if(token)return {token};
 const storeId=String(process.env.BLOB_STORE_ID||'').trim();if(storeId)return {...(process.env.VERCEL_OIDC_TOKEN?{oidcToken:process.env.VERCEL_OIDC_TOKEN}:{}),storeId};
 throw fail('SETUP',503);
}
function summary(p,device){const {body,imageKey,imageHash,voters,createRequest,createDevice,...rest}=p;return {...rest,excerpt:body.slice(0,240),has_image:!!imageKey,likes:voters.length,liked:voters.includes(device)};}
const empty=()=>({schema:1,posts:[],requests:[],garbage:[],day:'',writes:0});
// Factory per verificare conflitti tra istanze indipendenti. Nessun lock solo in memoria.
export function createNewsStore(io={get,put,del},credentials=auth){
 let memo=null,pending=null;const images=new Map();
 async function read(fresh=false){
  if(!fresh&&memo&&memo.expires>Date.now())return memo;
  if(!fresh&&pending)return pending;
  const work=(async()=>{let r;try{r=await io.get(INDEX,{access:'private',useCache:!fresh,...credentials()});}catch(e){if(!missing(e))throw e;}
   const value=r?.statusCode===200?JSON.parse(await new Response(r.stream).text()):empty();
   if(value.schema!==1||!Array.isArray(value.posts)||!Array.isArray(value.requests))throw fail('INVALID_STORE',503);
   const result={value,etag:r?.blob?.etag||null,expires:Date.now()+60000};
   if(r&&!result.etag)throw fail('NO_ETAG',503);
   memo=result;return result;
  })();
  if(!fresh)pending=work;
  try{return await work;}finally{if(pending===work)pending=null;}
 }
 async function photo(path){
  if(!path)return null;if(!path.startsWith(ROOT+'photos/'))throw fail('INVALID_STORE',503);
  if(images.has(path))return images.get(path);
  const r=await io.get(path,{access:'private',useCache:true,...credentials()});if(!r||r.statusCode!==200)throw fail('PHOTO_MISSING',503);
  const data=await new Response(r.stream).text();
  if(!data.startsWith('data:image/jpeg;base64,')||data.length>262167)throw fail('INVALID_STORE',503);
  if(images.size>=20)images.delete(images.keys().next().value);images.set(path,data);return data;
 }
 async function operate(q,device){
  if(q.action==='list'||q.action==='get'){
   const {value}=await read(q.fresh===true);
   if(q.action==='list'){
    const all=value.posts.filter(p=>p.archived===!!q.archived).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
    return {posts:all.slice(q.offset||0,(q.offset||0)+20).map(p=>summary(p,device)),total:all.length,fetched_at:new Date().toISOString()};
   }
   const p=value.posts.find(p=>p.id===q.id);if(!p)throw fail('NOT_FOUND',404);
   return {...summary(p,device),body:p.body,image:await photo(p.imageKey)};
  }
  let uploaded=null;
  for(let attempt=0;attempt<4;attempt++){
   // Fresh su scritture: nessuna modifica basata sulla cache CDN.
   const base=await read(true),d=structuredClone(base.value),now=new Date().toISOString();
   const receipt=d.requests.find(r=>r.id===q.request_id&&r.device===device);if(receipt)return receipt.result;
   let p=d.posts.find(p=>p.id===q.id),result;
   if(q.action==='create'&&p){if(p.createRequest===q.request_id&&p.createDevice===device)return summary(p,device);throw fail('CONFLICT');}
   if(q.action!=='create'&&!p){if(q.action==='delete')return {deleted:q.id};throw fail('NOT_FOUND',404);}
   if(['edit','pin','archive','delete'].includes(q.action)&&q.revision!==p.revision)throw fail('CONFLICT');
   const desiredHash=q.image?createHash('sha256').update(q.image).digest('hex'):null;
   const imageKey=desiredHash?(p?.imageHash===desiredHash?p.imageKey:ROOT+'photos/'+q.id+'/'+q.request_id+'-'+desiredHash+'.txt'):null;
   if(q.action==='like'&&p.voters.includes(device)===q.value)return summary(p,device);
   if(q.action==='pin'&&p.pinned===q.value)return summary(p,device);
   if(q.action==='archive'&&p.archived===q.value)return summary(p,device);
   if(q.action==='edit'&&p.title===q.title&&p.body===q.body&&p.imageKey===imageKey&&p.pinned===(q.pinned&&!p.archived))return summary(p,device);
   // Pulizia di vecchie foto già scollegate: chiavi immutabili, mai riutilizzate.
   if(d.garbage.length){try{await io.del(d.garbage,credentials());for(const k of d.garbage)images.delete(k);d.garbage=[];}catch{/* ritenta alla prossima modifica */}}
   const today=now.slice(0,10);if(d.day!==today){d.day=today;d.writes=0;}
   // Contiene abusi senza aggiungere scritture di contatori per le letture.
   if(d.writes>=100)throw fail('DAILY_LIMIT',429);
   if(d.requests.filter(r=>r.device===device&&Date.parse(r.at)>Date.now()-60000).length>=15)throw fail('RATE_LIMIT',429);
   if(q.action==='create'&&d.posts.length>=100)throw fail('POST_LIMIT');
   if(q.action==='like'&&q.value&&p.voters.length>=1000)throw fail('LIKE_LIMIT');
   if(q.action==='pin'&&q.value&&p.archived)throw fail('ARCHIVED');
   if(['create','edit'].includes(q.action)&&imageKey&&p?.imageKey!==imageKey&&uploaded!==imageKey){
    try{await io.put(imageKey,q.image,{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'text/plain',cacheControlMaxAge:31536000,...credentials()});}catch(e){if(!conflict(e))throw e;}
    uploaded=imageKey;images.set(imageKey,q.image);
   }
   if(['create','edit'].includes(q.action)){
    if(q.action==='create'){p={id:q.id,created_at:now,updated_at:now,revision:1,archived:false,voters:[],createRequest:q.request_id,createDevice:device};d.posts.push(p);}
    else{if(p.imageKey&&p.imageKey!==imageKey)d.garbage.push(p.imageKey);p.updated_at=now;p.revision++;}
    Object.assign(p,{title:q.title,body:q.body,imageKey,imageHash:desiredHash,pinned:!!q.pinned&&!p.archived});
   }else if(q.action==='like'){p.voters=q.value?[...p.voters,device]:p.voters.filter(x=>x!==device);}
   else if(q.action==='delete'){if(p.imageKey)d.garbage.push(p.imageKey);d.posts=d.posts.filter(x=>x.id!==p.id);result={deleted:p.id};}
   else if(q.action==='pin'){p.pinned=q.value;p.revision++;}
   else if(q.action==='archive'){p.archived=q.value;p.pinned=false;p.revision++;}
   if(p?.pinned&&q.action!=='delete')for(const other of d.posts){if(other.id!==p.id&&other.pinned){other.pinned=false;other.revision++;}}
   result??=summary(p,device);
   // Coda piccola per ritentare le cancellazioni fallite, senza list()/head().
   d.garbage=[...new Set(d.garbage)].filter(k=>!d.posts.some(x=>x.imageKey===k)).slice(-1000);
   d.requests=d.requests.filter(r=>Date.parse(r.at)>Date.now()-2*86400000).slice(-255);
   d.requests.push({id:q.request_id,device,at:now,result});d.writes++;
   const json=JSON.stringify(d);if(Buffer.byteLength(json)>4*1024*1024)throw fail('STORE_LIMIT');
   try{
    const written=await io.put(INDEX,json,{access:'private',addRandomSuffix:false,allowOverwrite:!!base.etag,...(base.etag?{ifMatch:base.etag}:{}),contentType:'application/json',cacheControlMaxAge:60,...credentials()});
    memo={value:d,etag:written.etag,expires:Date.now()+60000};
    if(d.garbage.length){try{await io.del(d.garbage,credentials());for(const k of d.garbage)images.delete(k);}catch{/* il prossimo salvataggio riprova */}}
    return result;
   }catch(e){memo=null;if(!conflict(e))throw e;if(attempt===3)throw fail('BUSY',409);}
  }
 }
 return {operate};
}
export const newsStore=createNewsStore();
