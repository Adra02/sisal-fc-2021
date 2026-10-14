import {requireAccount,errorResponse,fail} from '../lib/accounts.js';
import {rpc,supabase,uploadImage,downloadImage} from '../lib/supabase.js';
import { createHash } from 'node:crypto';
import { normalizePlayerName, photoIdentity } from '../lib/player-identity.js';

export const maxDuration=30;
const MAX_DATA_URL_CHARS=420000;
// Verified against the stored owner metadata on 2026-10-11. These are lookup
// hints, never ownership overrides. Every legacy record is checked by name.
const VERIFIED_LEGACY={
  '328794':{'pinuzzuupazzu':['player-9'],'adrathetrue02':['player-4']}
};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function validImage(value){return typeof value==='string'&&value.length<=MAX_DATA_URL_CHARS&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value);}
async function readRecord(key){
 const rows=await supabase('/rest/v1/player_photos?player_key=eq.'+encodeURIComponent(key)+'&select=record,image_path,revision');
 const row=rows?.[0];if(!row)return null;
 return {...row.record,dataUrl:row.image_path?await downloadImage(row.image_path):'',_revision:row.revision};
}
function identity(input){
 const clubId=String(input.clubId||'').trim(),playerName=String(input.playerName||'').trim(),playerKey=photoIdentity(clubId,playerName);
 if(String(input.playerKey||'')!==playerKey)throw new Error('Identità foto non valida: aggiorna la pagina e riapri il giocatore.');
 return{clubId,playerName,playerKey};
}
function belongs(record,key,id,legacy=false){return record?.playerKey===key&&normalizePlayerName(record.playerName)===normalizePlayerName(id.playerName)&&(legacy?!record.clubId||String(record.clubId)===id.clubId:String(record.clubId)===id.clubId);}
export async function GET(request){
 try{
  await requireAccount(request);
  const query=new URL(request.url).searchParams,id=identity(Object.fromEntries(query));
  const current=await readRecord(id.playerKey);
  // Tombstones are authoritative: a removed photo must never reappear from legacy storage.
  if(current){if(!belongs(current,id.playerKey,id))return json({ok:false,error:'Proprietario della foto non coerente.'},409);return json({ok:true,found:!current.deleted&&validImage(current.dataUrl),dataUrl:!current.deleted&&validImage(current.dataUrl)?current.dataUrl:'',playerKey:id.playerKey,playerName:id.playerName,clubId:id.clubId,revision:current._revision,updatedAt:current.updatedAt||null});}
  let requested=[];try{requested=JSON.parse(query.get('legacyKeys')||'[]')}catch{}
  const hints=VERIFIED_LEGACY[id.clubId]?.[normalizePlayerName(id.playerName)]||[];
  const keys=[...new Set([...hints,...(Array.isArray(requested)?requested:[])])].filter(k=>typeof k==='string'&&k.length>0&&k.length<=180&&k!==id.playerKey).slice(0,8);
  // Old storage was not club-scoped. Only the club whose ownership was checked
  // during this repair may use the legacy namespace; other clubs start clean.
  if(id.clubId==='328794')for(const key of keys){const record=await readRecord(key);if(belongs(record,key,id,true)&&validImage(record.dataUrl))return json({ok:true,found:true,dataUrl:record.dataUrl,playerKey:id.playerKey,playerName:record.playerName,clubId:id.clubId,updatedAt:record.updatedAt||null,source:'verified-legacy',revision:0});}
  return json({ok:true,found:false,dataUrl:'',playerKey:id.playerKey,playerName:id.playerName,clubId:id.clubId,revision:0});
 }catch(e){return errorResponse(e);}
}
export async function POST(request){
 try{
  const user=await requireAccount(request,{mutation:true});
  const body=await request.json(),id=identity(body),action=String(body.action||'');
  if(id.clubId!=='328794'||normalizePlayerName(id.playerName)!==user.player_key)throw fail('FORBIDDEN',403);
  if(!['save','remove'].includes(action))return json({ok:false,error:'Azione foto non valida.'},400);
  if(action==='save'&&!validImage(body.dataUrl))return json({ok:false,error:'Formato o dimensione della foto non validi.'},400);
  const record={schemaVersion:2,...id,dataUrl:action==='save'?body.dataUrl:'',deleted:action==='remove',updatedAt:new Date().toISOString()};
  if(!Number.isInteger(body.revision)||body.revision<0)return json({ok:false,error:'Aggiorna la pagina e riapri la foto prima di salvarla.'},428);
  const expected=body.revision;
  const imagePath=action==='save'?`players/${createHash('sha256').update(id.playerKey).digest('hex')}/${createHash('sha256').update(body.dataUrl).digest('hex')}.jpg`:null;
  if(imagePath)await uploadImage(imagePath,body.dataUrl);
  const metadata={...record};delete metadata.dataUrl;
  const saved=await rpc('sisal_photo_write',{p_key:id.playerKey,p_record:metadata,p_path:imagePath,p_revision:expected});
  return json({ok:true,action,playerKey:id.playerKey,playerName:id.playerName,clubId:id.clubId,revision:saved.revision,updatedAt:record.updatedAt});
 }catch(e){return errorResponse(e);}
}
