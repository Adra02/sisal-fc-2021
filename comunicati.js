// Server-side PostgreSQL transactions and private Storage.
import { newsStore } from '../lib/comunicati-store.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validate(p) {
 if (!p || typeof p!=='object' || Array.isArray(p)) throw Error('Richiesta non valida.');
 const actions=['list','get','create','edit','pin','archive','delete','like'];
 if(!actions.includes(p.action)) throw Error('Operazione non valida.');
 const q={action:p.action};if(['list','get'].includes(p.action))q.fresh=p.fresh===true;
 if(p.action==='list') {q.archived=p.archived===true;q.offset=Number.isInteger(p.offset)?Math.max(0,Math.min(300,p.offset)):0;return q;}
 if(!uuid.test(p.id||'')) throw Error('Identificativo non valido.');q.id=p.id;
 if(p.action==='get')return q;
 if(!uuid.test(p.request_id||''))throw Error('Identificativo richiesta non valido.');q.request_id=p.request_id;
 if(['edit','pin','archive','delete'].includes(p.action)) {if(!Number.isInteger(p.revision)||p.revision<1)throw Error('Versione non valida.');q.revision=p.revision;}
 if(['like','pin','archive'].includes(p.action)){if(typeof p.value!=='boolean')throw Error('Valore non valido.');q.value=p.value;}
 if(['create','edit'].includes(p.action)) {
  for(const [key,max] of [['title',160],['body',18000]]){if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(p[key]))throw Error('Titolo o testo non valido o troppo lungo.');q[key]=p[key].trim();}
  if((p.body.match(/\n/g)||[]).length>300)throw Error('Il testo contiene troppi a capo: massimo 300.');
  q.pinned=p.pinned===true;q.image=null;
  if(p.image){
   if(typeof p.image!=='string'||p.image.length>262167||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.image))throw Error('Foto non valida: usa JPEG compresso, massimo 192 KB.');
   const data=Buffer.from(p.image.split(',')[1],'base64');
   if(data.length>196608||data.length<4||data[0]!==255||data[1]!==216||data.at(-2)!==255||data.at(-1)!==217)throw Error('Foto JPEG non valida.');q.image=p.image;
  }
 }
 return q;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Metodo non consentito.'});}
 const host=req.headers['x-forwarded-host']||req.headers.host;
 if(req.headers.origin){try{if(new URL(req.headers.origin).host!==host)return res.status(403).json({error:'Origine non consentita.'});}catch{return res.status(403).json({error:'Origine non valida.'});}}
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Formato non valido.'});
 const device=req.headers['x-sisal-device'];if(!uuid.test(device||''))return res.status(400).json({error:'Identificativo del dispositivo non valido.'});
 let p;try {if(Number(req.headers['content-length']||0)>400000)throw Error('Richiesta troppo grande.');const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(Buffer.byteLength(raw)>400000)throw Error('Richiesta troppo grande.');p=validate(JSON.parse(raw));}catch(e){return res.status(400).json({error:e.message});}
 try{
  const ip=String(req.headers['x-real-ip']||req.headers['x-forwarded-for']||'unknown').split(',')[0];
  if(!allowRequest(ip))return res.status(429).json({error:'Troppe richieste. Attendi un minuto.',code:'RATE_LIMIT'});
  return res.status(200).json(await newsStore.operate(p,device));
 }catch(e){
  const messages={SETUP:'Configura il collegamento Supabase del progetto.',CONFLICT:'Il comunicato è cambiato. Salva la bozza e aggiorna la bacheca prima di modificarlo.',NOT_FOUND:'Questo comunicato è stato eliminato.',RATE_LIMIT:'Troppe modifiche ravvicinate. Attendi un minuto.',DAILY_LIMIT:'Raggiunti 1000 salvataggi nella giornata UTC. Riprova domani.',POST_LIMIT:'Limite di 100 comunicati raggiunto. Elimina quelli non necessari.',LIKE_LIMIT:'Limite dei like raggiunto.',ARCHIVED:'Ripristina il comunicato prima di fissarlo in alto.',STORE_LIMIT:'Archivio dei comunicati pieno. Elimina alcuni testi non necessari.',BUSY:'Altri compagni stanno salvando. Aggiorna e riprova.',PHOTO_MISSING:'Foto temporaneamente non disponibile. Riprova.',NO_ETAG:'Salvataggio non eseguito: manca la protezione contro modifiche contemporanee.',INVALID_STORE:'Archivio non leggibile. Nessun dato è stato sovrascritto.'};
  return res.status(e.status||503).json({error:messages[e.code]||'Connessione ai comunicati non riuscita. I contenuti già scaricati restano disponibili.',code:e.code||'CONNECTION'});
 }
}
// Filtro per istanza prima del database. Non è un limite distribuito né una garanzia antiabuso assoluta.
const traffic=new Map();
function allowRequest(ip){const now=Date.now();for(const[k,v]of traffic)if(v.until<now)traffic.delete(k);if(traffic.size>=2000&&!traffic.has(ip))return false;let bucket=traffic.get(ip);if(!bucket){bucket={n:0,until:now+60000};traffic.set(ip,bucket);}return ++bucket.n<=60;}
