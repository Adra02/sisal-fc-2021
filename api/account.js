import {rpc} from '../lib/supabase.js';
import {timingSafeEqual} from 'node:crypto';
import {accountRpc,hashPassword,verifyPassword,hashToken,token,cookie,sessionHash,requireAccount,sameOrigin,limit,roster,fail,errorResponse} from '../lib/accounts.js';
import {validateStyle,nameKey} from '../horse-style.js';
export const maxDuration=60;
const ok=(body,session)=>Response.json(body,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(session!==undefined?{'Set-Cookie':cookie(session)}:{})}});
export async function GET(req){try{
 const action=new URL(req.url).searchParams.get('action')||'me';
 if(action==='directory'){
  await limit(req,'directory');const [r,d]=await Promise.all([roster(),accountRpc('directory')]);
  const taken=new Set([...d.accounts.map(x=>x.key),...await rpc('sisal_excluded_keys',{})]);
  return ok({ok:true,hasOwner:d.hasOwner,register:r.players.filter(x=>!taken.has(x.key)),login:d.accounts.filter(x=>x.status==='active'),rosterAvailable:r.available});
 }
 if(action==='arena'){if(new URL(req.url).searchParams.get('scene')!=='8'){await requireAccount(req);return Response.json({ok:false,code:'ARENA_UPDATE_REQUIRED',error:'L’Arena è stata aggiornata. Ricarica completamente la web app per entrare nella stessa versione dei compagni.'},{status:409,headers:{'Cache-Control':'private, no-store'}});}const {arenaState}=await import('../lib/arena.js');const state=await arenaState(sessionHash(req));return Response.json(state,{status:state.pending?202:200,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(state.pending?{'Retry-After':'3'}:{})}});}
 const user=await requireAccount(req);
 if(action==='me')return ok({ok:true,user});
 if(action==='appearances')return ok({ok:true,styles:await accountRpc('appearances',{},sessionHash(req)),excluded:await accountRpc('lineup_exclusions',{},sessionHash(req))});
 if(action==='admin'){if(!user.is_admin)throw fail('FORBIDDEN');return ok({ok:true,...await accountRpc('admin_list',{},sessionHash(req)),roster:await roster()});}
 throw fail('INVALID_ACTION');
 }catch(e){return errorResponse(e);}}
export async function POST(req){try{
 sameOrigin(req);
 if(!String(req.headers.get('content-type')||'').startsWith('application/json'))throw fail('INVALID_ACTION');
 if(Number(req.headers.get('content-length')||0)>8000)throw fail('INVALID_ACTION');
 const raw=await req.text();if(Buffer.byteLength(raw)>8000)throw fail('INVALID_ACTION');const p=JSON.parse(raw),action=String(p.action||'');
 if(['register','bootstrap','login','reset'].includes(action)){
  const key=nameKey(p.key);await limit(req,action,key);
  if(action==='register'||action==='bootstrap'){
   const r=await roster();if(!r.available)throw fail('ROSTER');const player=r.players.find(x=>x.key===key);if(!player)throw fail('PLAYER');
   if(action==='bootstrap'){
    const expected=String(process.env.SISAL_BOOTSTRAP_SECRET||'');const supplied=String(p.setupCode||'');
    if(expected.length<32||!timingSafeEqual(Buffer.from(hashToken(expected)),Buffer.from(hashToken(supplied)))||key!=='adrathetrue02')throw fail('BOOTSTRAP');
   }else if(key==='adrathetrue02')throw fail('PLAYER');
   const saved=await accountRpc(action,{key,name:player.name,hash:await hashPassword(p.password)});return ok(saved);
  }
  if(action==='reset'){if(!/^[\w-]{43}$/.test(p.token||''))throw fail('INVALID_RESET');await accountRpc('reset',{token:hashToken(p.token),hash:await hashPassword(p.password)});return ok({ok:true},'');}
  const c=await accountRpc('credentials',{key});if(!await verifyPassword(p.password,c?.hash))throw fail('INVALID_LOGIN');
  const s=token();const user=await accountRpc('login',{id:c.id,version:c.version,hash:c.hash,token:hashToken(s),label:req.headers.get('user-agent')||'Dispositivo'});return ok({ok:true,user},s);
 }
 const user=await requireAccount(req);const session=sessionHash(req);
 if(action==='logout'||action==='logout_all'){await accountRpc(action,{},session);return ok({ok:true},'');}
 if(action==='appearance'){const appearance=validateStyle({...user.appearance,...p.appearance});if(!Number.isInteger(p.revision))throw fail('CONFLICT');return ok({ok:true,user:await accountRpc(action,{appearance,revision:p.revision},session)});}
 // All credential/role changes need the acting user's password, not a remembered cookie alone.
 if(['password','approve','reject','suspend','reactivate','promote','demote','reset_token','import_token','revoke_import','delete_account','allow_registration','arena_keeper'].includes(action)){
  await limit(req,'sensitive',user.id);
  const c=await accountRpc('credentials',{key:user.player_key});if(!await verifyPassword(p.currentPassword,c?.hash))throw fail('RECENT_LOGIN');
  if(action==='password'){await accountRpc('password',{version:c.version,hash:await hashPassword(p.password)},session);return ok({ok:true},'');}
  if(!user.is_admin)throw fail('FORBIDDEN');
  if(action==='arena_keeper')return ok(await rpc('sisal_arena',{p_action:'keeper',p_session:session,p:{key:nameKey(p.key)}}));
  const value=token();const params={id:p.id,key:nameKey(p.key),token:hashToken(value)};
  const result=await accountRpc(action,params,session);
  return ok({...result,...(['reset_token','import_token'].includes(action)?{token:value}:{})});
 }
 throw fail('INVALID_ACTION');
 }catch(e){return errorResponse(e);}}
