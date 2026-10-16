import {requireAccount,sessionHash,errorResponse} from '../lib/accounts.js';
import {rpc} from '../lib/supabase.js';
import {publishPaper} from '../lib/paper-job.js';
export const maxDuration=60;
const ok=data=>Response.json({ok:true,...data},{headers:{'Cache-Control':'private, no-store'}});
const errors={NO_MATCHES:'Servono partite con punteggi disponibili.',BUSY:'Un amministratore sta già preparando l’edizione. Riprova tra poco.',COOLDOWN:'Attendi un minuto prima di riprovare.',GEMINI_QUOTA:'Quota IA esaurita. L’ultima edizione resta disponibile. Riprova più tardi.',AI_UNAVAILABLE:'IA non disponibile. L’ultima edizione resta disponibile.',INVALID_EDITION:'Il testo ricevuto è incompleto o non valido: nessuna edizione pubblicata.',REPEATED_EDITION:'Il titolo è già stato usato: nessuna edizione pubblicata.',TimeoutError:'La generazione ha impiegato troppo tempo. L’ultima edizione è conservata.'};
function failure(e){const code=e.name==='TimeoutError'?'TimeoutError':e.code||e.message;return errors[code]?Response.json({ok:false,code,error:errors[code]},{status:['BUSY','COOLDOWN'].includes(code)?409:code==='GEMINI_QUOTA'?429:502,headers:{'Cache-Control':'no-store'}}):errorResponse(e)}
export async function GET(req){try{await requireAccount(req);const url=new URL(req.url),action=url.searchParams.get('action')||'latest';if(!['latest','notifications','edition'].includes(action))return Response.json({error:'Richiesta non valida'},{status:400});const id=url.searchParams.get('id');if(action==='edition'&&!/^[a-f0-9-]{36}$/.test(id||''))return Response.json({error:'Edizione non valida'},{status:400});const result=await rpc('sisal_editorial',{p_action:action,p:{id},p_session:sessionHash(req)});if(action==='latest')result.generation=await rpc('sisal_paper_status',{});return ok(result);}catch(e){return failure(e)}}
export async function POST(req){try{
 const token=req.headers.get('X-Sisal-Paper-Job');
 if(token){
  if(!/^[a-f0-9]{64}$/.test(token))return Response.json({error:'Accesso negato'},{status:403});
  const work=await rpc('sisal_paper_worker',{p_action:'take',p:{token}});
  if(work.skip)return ok({skipped:true});
  const result=await publishPaper({id:work.actor});
  await rpc('sisal_paper_worker',{p_action:'done',p:{version:work.version,ok:result.ok,code:result.code}});
  return ok({published:result.ok});
 }
 const actor=await requireAccount(req,{mutation:true});const raw=await req.text();if(raw.length>1000)throw Error('INVALID_ACTION');const p=JSON.parse(raw);
 if(['read','read_all'].includes(p.action)){const value=p.action==='read'?p.id:p.through;if(!Number.isSafeInteger(value)||value<0)throw Error('INVALID_ACTION');return ok(await rpc('sisal_editorial',{p_action:p.action,p,p_session:sessionHash(req)}));}
 if(p.action!=='generate')throw Error('INVALID_ACTION');await requireAccount(req,{admin:true});const result=await publishPaper(actor);return Response.json(result,{status:result.ok?200:result.code==='BUSY'?409:result.code==='GEMINI_QUOTA'?429:502,headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e)}}
