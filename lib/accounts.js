import {randomBytes,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {rpc} from './supabase.js';
import {normalizePlayersFile} from './data-pipeline.js';
import {nameKey} from '../horse-style.js';
const scrypt=promisify(scryptCallback);
export const COOKIE='__Host-sisal-session';
export const SESSION_SECONDS=30*24*60*60;
export const hashToken=v=>createHash('sha256').update(String(v)).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
export const fail=(code,status=400)=>Object.assign(new Error(code),{code,status});
export const accountRpc=(action,p={},session='')=>rpc('sisal_account',{p_action:action,p,p_session:session});
export function passwordValid(p){if(typeof p!=='string'||p.length<12||p.length>128)throw fail('PASSWORD_LENGTH');return p;}
export async function hashPassword(p){passwordValid(p);const salt=randomBytes(16).toString('hex');const out=await scrypt(p,salt,64,{N:131072,r:8,p:1,maxmem:192*1024*1024});return `scrypt1:${salt}:${out.toString('hex')}`;}
export async function verifyPassword(p,stored){
 if(typeof p!=='string'||p.length>128)return false;
 const good=/^scrypt1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored||'');
 const [,salt,key]=(good?stored:`scrypt1:${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
 const value=await scrypt(p,salt,64,{N:131072,r:8,p:1,maxmem:192*1024*1024});
 return timingSafeEqual(value,Buffer.from(key,'hex'))&&good;
}
export function header(req,name){return req.headers?.get?req.headers.get(name):req.headers?.[name.toLowerCase()];}
export function sessionHash(req){const c=String(header(req,'cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return /^[\w-]{43}$/.test(c||'')?hashToken(c):'';}
export function cookie(value='',maxAge=SESSION_SECONDS){return `${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${value?maxAge:0}`;}
export function sameOrigin(req){
 const origin=header(req,'origin');let base;try{base=req.url?.startsWith('http')?new URL(req.url).origin:`https://${header(req,'host')}`;}catch{throw fail('ORIGIN',403);}
 if(!origin||origin!==base)throw fail('ORIGIN',403);
 if(header(req,'sec-fetch-site')==='cross-site')throw fail('ORIGIN',403);
}
export async function requireAccount(req,{admin=false,mutation=false,importer=false}={}){
 if(importer){const b=String(header(req,'authorization')||'');if(/^Bearer [\w-]{43}$/.test(b))return accountRpc('import_auth',{},hashToken(b.slice(7)));}
 if(mutation)sameOrigin(req);
 const s=sessionHash(req);if(!s)throw fail('UNAUTHORIZED',401);
 const a=await accountRpc('session',{},s);if(admin&&!a.is_admin)throw fail('FORBIDDEN',403);return a;
}
export const MESSAGES={ARENA_SETUP:'Completa il passaggio Supabase 16-arena-football.sql per attivare questa versione dell’Arena.',UNAUTHORIZED:'Accedi per continuare.',FORBIDDEN:'Questa operazione è riservata agli amministratori.',ORIGIN:'Richiesta da una pagina non autorizzata.',INVALID_LOGIN:'Nome o password non corretti.',INACTIVE:'Account in attesa di approvazione o sospeso. Contatta un amministratore.',PASSWORD_LENGTH:'Usa una password da 12 a 128 caratteri.',INVALID_RESET:'Il codice è scaduto o già utilizzato. Chiedine uno nuovo.',RATE_LIMIT:'Troppi tentativi. Attendi 15 minuti.',ALREADY_SETUP:'Il primo amministratore è già configurato.',OWNER_PROTECTED:'Il proprietario del club non può essere sospeso o rimosso.',OWNER_ONLY:'Solo il proprietario può assegnare o rimuovere gli amministratori.',LAST_ADMIN:'Deve rimanere almeno un amministratore attivo.',CONFLICT:'I dati sono cambiati. Aggiorna e riprova.',NOT_FOUND:'Account non trovato.',INVALID_STYLE:'Personalizzazione non valida.',ROSTER:'Lista giocatori non disponibile. Un amministratore deve aggiornare i dati.',PLAYER:'Giocatore non disponibile per la registrazione.',BOOTSTRAP:'Codice iniziale non valido.',RECENT_LOGIN:'Inserisci la tua password per confermare.',DUPLICATE:'Questo giocatore ha già un account o una richiesta in attesa.'};
export function errorResponse(e){let code=e.code||e.message;if(/duplicate key|unique constraint/i.test(e.message||''))code='DUPLICATE';const status=code==='ARENA_SETUP'?503:code==='UNAUTHORIZED'||code==='INVALID_LOGIN'?401:['FORBIDDEN','ORIGIN','OWNER_ONLY','OWNER_PROTECTED','RECENT_LOGIN'].includes(code)?403:code==='RATE_LIMIT'?429:code==='CONFLICT'||code==='DUPLICATE'?409:MESSAGES[code]?400:503;return Response.json({ok:false,code:MESSAGES[code]?code:'CONNECTION',error:MESSAGES[code]||'Servizio account non disponibile. Riprova.'},{status,headers:{'Cache-Control':'no-store'}});}
export async function limit(req,action,key=''){
 // Vercel sets x-real-ip at its trusted ingress; never use a caller-supplied identity as sole limit.
 const ip=String(header(req,'x-real-ip')||'unknown');
 const checks=[[`ip:${ip}`,60],[`${action}:${ip}`,action==='directory'?60:15]];
 if(key)checks.push([`${action}:account:${key}`,30]);
 for(const [k,max]of checks)if(!await rpc('sisal_auth_limit',{p_key:hashToken(k),p_max:max,p_seconds:900}))throw fail('RATE_LIMIT',429);
}
export async function roster(){
 const team=await rpc('sisal_team_read',{p_role:'own'});const f=team?.files?.players;
 if(!f)return {players:[],updatedAt:null,available:false};
 let raw=f.parsed??f.raw;try{if(typeof raw==='string')raw=JSON.parse(raw);}catch{return {players:[],updatedAt:null,available:false};}
 const list=normalizePlayersFile(raw,'328794');const byKey=new Map();const duplicate=new Set();
 for(const p of list){const k=nameKey(p.name);if(!k||k.length>120||/^giocatore \d+$/i.test(k))continue;if(byKey.has(k))duplicate.add(k);byKey.set(k,{key:k,name:p.name});}
 const players=[...byKey.values()].filter(p=>!duplicate.has(p.key)).sort((a,b)=>a.name.localeCompare(b.name));
 return {players,updatedAt:f.uploadedAt||team.updated_at,available:players.length>0};
}
