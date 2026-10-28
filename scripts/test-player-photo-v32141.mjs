import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {normalizePlayerName,photoIdentity} from '../lib/player-identity.js';
import {errorResponse,fail} from '../lib/accounts.js';
let actor={player_key:'pinuzzuupazzu',is_admin:false},signed=true;
const records=new Map(),reads=[],writes=[];
const path=key=>'sisal-fc/fc27/shared/own/_meta/player-photos/'+createHash('sha256').update(key).digest('hex').slice(0,32)+'.json';
for(const [key,name] of [['player-9','pinuzzuupazzu'],['player-4','AdraTheTrue02']])records.set(path(key),{schemaVersion:1,playerKey:key,playerName:name,dataUrl:'data:image/jpeg;base64,YQ==',updatedAt:'2026-10-09T00:00:00Z'});
const ctx={console,Response,URL,Date,Map,Set,JSON,String,Array,Object,Error,Buffer,Number,createHash,normalizePlayerName,photoIdentity,errorResponse,fail,
 requireAccount:async()=>{if(!signed)throw fail('UNAUTHORIZED',401);return actor;},
 supabase:async(url)=>{const key=decodeURIComponent(url.split('player_key=eq.')[1].split('&')[0]);reads.push(key);const r=records.get(path(key));return r?[{record:r,revision:r.revision||1,image_path:r.dataUrl?key:null}]:[];},
 downloadImage:async(key)=>records.get(path(key))?.dataUrl||null,
 uploadImage:async()=>{},
 rpc:async(name,p)=>{const old=records.get(path(p.p_key));if((old?.revision||0)!==p.p_revision)throw Object.assign(Error('CONFLICT'),{status:409});writes.push(p.p_key);const r={...p.p_record,dataUrl:p.p_path?'data:image/jpeg;base64,YQ==':'',revision:(old?.revision||0)+1};records.set(path(p.p_key),r);return r;}
};
const source=fs.readFileSync(new URL('../api/player-photo.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'')+'\nglobalThis.testAPI={GET,POST};';vm.runInNewContext(source,ctx);const {GET,POST}=ctx.testAPI;
const ident=(name,clubId='328794')=>({clubId,playerName:name,playerKey:photoIdentity(clubId,name)});
const get=async(name,keys=[],club)=>{const query=new URLSearchParams({...ident(name,club),legacyKeys:JSON.stringify(keys)});const r=await GET(new Request('https://test/api/player-photo?'+query));return {status:r.status,...await r.json()};};
const post=async(name,action,dataUrl='')=>{const r=await POST(new Request('https://test/api/player-photo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...ident(name),action,dataUrl,revision:records.get(path(ident(name).playerKey))?.revision||0})}));return {status:r.status,...await r.json()};};
let pin=await get('pinuzzuupazzu',['player-10']);assert(pin.found);assert.equal(pin.playerName,'pinuzzuupazzu');assert.equal(pin.dataUrl,records.get(path('player-9')).dataUrl);
let lym=await get('lym1t adriqx551',['player-9']);assert.equal(lym.found,false,'live swapped photo must never be served to Lym');
assert((await get('AdraTheTrue02',['player-4'])).found);assert.equal((await get('pinuzzuupazzu',['player-9'],'another-club')).found,false);
const readCount=reads.length;await get('pinuzzuupazzu',['player-10']);assert(reads.length>readCount,'fresh metadata prevents stale photos across instances');assert.equal(writes.length,0,'reads and recovery do not write database');
assert.equal((await post('pinuzzuupazzu','remove')).status,200);assert.equal((await get('pinuzzuupazzu',['player-9'])).found,false,'tombstone prevents resurrection');assert(records.has(path('player-9')),'legacy original retained');
const newPhoto='data:image/jpeg;base64,YQ==';assert.equal((await post('pinuzzuupazzu','save',newPhoto)).status,200);assert.equal((await get('pinuzzuupazzu')).dataUrl,newPhoto);
const bad=await POST(new Request('https://test/api/player-photo',{method:'POST',body:JSON.stringify({action:'save',playerKey:'player-9',playerName:'lym1t adriqx551',dataUrl:newPhoto})}));assert.equal(bad.status,400);
const foreign=await GET(new Request('https://test/api/player-photo?'+new URLSearchParams({...ident('pinuzzuupazzu'),playerKey:photoIdentity('328794','lym1t adriqx551')})));assert.equal(foreign.status,400);
signed=false;assert.equal((await get('pinuzzuupazzu')).status,401);signed=true;
actor={player_key:'adrathetrue02',is_admin:true};assert.equal((await post('pinuzzuupazzu','remove')).status,403,'admin cannot remove another account photo');assert.equal((await post('pinuzzuupazzu','save',newPhoto)).status,403,'admin cannot replace another account photo');
actor={player_key:'other',is_admin:false};assert.equal((await post('pinuzzuupazzu','save',newPhoto)).status,403,'member cannot replace another photo');
console.log('PASS (unit harness, account authentication simulated): stored-photo recovery for Pinuzzu and Adra, foreign-owner rejection, club isolation, zero-write recovery, fresh reads, stale-client rejection, save/delete tombstones; '+writes.length+' writes for two explicit mutations.');
