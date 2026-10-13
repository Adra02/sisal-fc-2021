// Offline backup -> Supabase. Never contacts the old provider and never deletes source data.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {supabase,uploadImage,downloadImage} from '../lib/supabase.js';
const [mode,folder]=process.argv.slice(2);
if(!['import','verify'].includes(mode)||!folder)throw Error('Uso: node --env-file=.env.local migration/import.mjs import|verify PERCORSO_BACKUP');
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json')));
assert(manifest.complete,'Backup incompleto: interrompo.');
const items=new Map();
for(const m of manifest.files){const b=await fs.readFile(path.join(folder,m.file));assert.equal(hash(b),m.sha256,'Backup corrotto: '+m.pathname);items.set(m.pathname,b);}
const used=new Set();
function read(key){const b=items.get(key);if(!b)return null;used.add(key);return JSON.parse(b.toString());}
const root='sisal-fc/fc27/shared/';
const categories=['totals','season','clubInfo','overallStats','players','career','league','playoffs','friendlies','playoffAchievements'];
const expected={team_state:[],communications:[],communication_reactions:[],player_photos:[]},images=[];
for(const role of ['own','opponent']){
 const prefix=root+role+'/';const bundle=read(prefix+'_meta/team-bundle-v1.json');
 const files={};for(const cat of categories)files[cat]=read(prefix+cat+'.json');
 const totals=read(prefix+'_meta/totals.json')||files.totals,memory=read(prefix+'_meta/memory.json')||{schemaVersion:1,snapshots:[]};
 expected.team_state.push({role,files:bundle?.files||files,totals:bundle?bundle.totals:totals,memory:bundle?.memory||memory});
}
for(const [key] of items){if(!key.startsWith(root+'own/_meta/player-photos/'))continue;
 const r=read(key);assert(r.playerKey&&r.playerName,'Foto priva di identità: '+key);
 const image_path=r.dataUrl&&!r.deleted?`players/${hash(r.playerKey)}/${hash(r.dataUrl)}.jpg`:null;
 if(image_path)images.push([image_path,r.dataUrl]);const record={...r};delete record.dataUrl;
 assert(!expected.player_photos.some(x=>x.player_key===r.playerKey),'Foto duplicata da verificare: '+r.playerKey);
 expected.player_photos.push({player_key:r.playerKey,record,image_path});
}
const index=read('sisal-fc/fc27/comunicati-v1/index.json');
for(const p of index?.posts||[]){
 let image_path=null;if(p.imageKey){const bytes=items.get(p.imageKey);assert(bytes,'Immagine assente: '+p.imageKey);used.add(p.imageKey);const data=bytes.toString();image_path=`news/${p.id}/${hash(data)}.jpg`;images.push([image_path,data]);}
 expected.communications.push({id:p.id,title:p.title,body:p.body,pinned:!!p.pinned,archived:!!p.archived,revision:p.revision,created_at:p.created_at,updated_at:p.updated_at,image_path});
 for(const device_id of new Set(p.voters||[]))expected.communication_reactions.push({communication_id:p.id,device_id});
}
const unused=[...items.keys()].filter(k=>!used.has(k));
// Unreferenced historical news images are backed up but not copied into active Storage.
const unknown=unused.filter(k=>!k.startsWith('sisal-fc/fc27/comunicati-v1/photos/'));
await fs.writeFile(path.join(folder,'inventory-review.json'),JSON.stringify({unknown,unusedImages:unused.filter(k=>!unknown.includes(k)),counts:Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,v.length])),images:images.length},null,2));
assert.equal(unknown.length,0,'Percorsi non riconosciuti: leggi inventory-review.json. Nessun caricamento eseguito.');
async function rows(table){let all=[],offset=0;for(;;){const r=await supabase(`/rest/v1/${table}?select=*&order=${table==='team_state'?'role':table==='player_photos'?'player_key':table==='communication_reactions'?'communication_id,device_id':'id'}&limit=500&offset=${offset}`);all.push(...r);if(r.length<500)return all;offset+=500;}}
if(mode==='import'){
 // Intended only for a new, unused target. Never overwrite a live destination.
 for(const table of ['communications','communication_reactions','player_photos'])assert.equal((await rows(table)).length,0,'Destinazione già usata: '+table);
 for(const r of await rows('team_state'))assert(Object.keys(r.files).length===0&&r.totals===null&&(r.memory.snapshots||[]).length===0,'Squadra già presente in destinazione.');
 for(const [name,data] of images)await uploadImage(name,data);
 // One transaction for all DB rows. Retry safe if uploads succeeded but commit did not.
 await supabase('/rest/v1/rpc/sisal_import',{method:'POST',body:{p:expected}});
 console.log('Dati importati. Avvio confronto completo.');
}
for(const [table,wanted] of Object.entries(expected)){
 const actual=await rows(table);assert.equal(actual.length,wanted.length,'Conteggio diverso: '+table);
 const key=r=>table==='team_state'?r.role:table==='player_photos'?r.player_key:table==='communication_reactions'?r.communication_id+'/'+r.device_id:r.id;
 for(const want of wanted){const got=actual.find(r=>key(r)===key(want));assert(got,'Record mancante: '+key(want));for(const [k,v] of Object.entries(want)){
  if(['created_at','updated_at'].includes(k))assert.equal(Date.parse(got[k]),Date.parse(v));else assert.deepEqual(got[k],v,table+'/'+key(want)+'/'+k);
 }}
}
for(const [name,data] of images)assert.equal(hash(Buffer.from((await downloadImage(name)).split(',')[1],'base64')),hash(Buffer.from(data.split(',')[1],'base64')),'Immagine diversa: '+name);
await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify({verified:true,at:new Date().toISOString(),sourceManifestHash:hash(JSON.stringify(manifest)),counts:Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,v.length])),images:images.length},null,2));
console.log('VERIFICA COMPLETA: dati, memoria, reazioni e byte delle immagini coincidono. Blob NON è stato eliminato.');
