import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {POST,GET,DELETE} from '../api/club-data.js';import {POST as photoPost,GET as photoGet} from '../api/player-photo.js';import {photoIdentity} from '../lib/player-identity.js';
const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');await db.exec(await fs.readFile(new URL('../setup/01-database.sql',import.meta.url),'utf8'));
process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_fixture';delete process.env.GEMINI_API_KEY;
const original=globalThis.fetch,network=[],images=new Map();globalThis.fetch=async(url,opts={})=>{
 network.push(url);assert(url.startsWith('https://test.supabase.co/'));assert.equal(opts.headers.apikey,'sb_secret_fixture');
 const u=new URL(url);try{
 if(u.pathname.startsWith('/rest/v1/rpc/')){const name=u.pathname.split('/').at(-1),args=JSON.parse(opts.body);const q=await db.query(`select ${name}(${Object.keys(args).map((k,i)=>k+' => $'+(i+1)).join(',')}) v`,Object.values(args));return Response.json(q.rows[0].v);}
 if(u.pathname==='/rest/v1/player_photos'){const key=u.searchParams.get('player_key').slice(3);return Response.json((await db.query('select * from player_photos where player_key=$1',[key])).rows);}
 if(u.pathname.startsWith('/storage/')){const key=u.pathname.replace('/authenticated','');if(opts.method==='POST'){images.set(key,opts.body);return Response.json({Key:key});}return new Response(images.get(key)||'',{status:images.has(key)?200:404});}
 throw Error('Unexpected path '+u.pathname);
 }catch(e){return Response.json({message:e.message},{status:400});}
};
const req=(body)=>new Request('https://sisal.test/api/club-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
for(const role of ['own','opponent']){
 const form=new FormData();form.set('role',role);form.set('category','clubInfo');form.set('file',new File([JSON.stringify({clubId:role==='own'?'328794':'999',name:'Sisal fixture'})],'info.json',{type:'application/json'}));
 const response=await POST(new Request('https://sisal.test/api/club-data',{method:'POST',body:form}));const d=await response.json();assert.equal(response.status,200,JSON.stringify(d));assert(d.ok);
 const totals=await POST(req({role,action:'saveTotals',totals:{matches:10,wins:5,draws:2,losses:3,goals:20,against:12}}));assert.equal(totals.status,200,JSON.stringify(await totals.json()));
}
const read=await GET();assert.equal(read.status,200);const data=await read.json();assert.equal(data.teams.own.manualTotals.totals.matches,10);assert.equal(data.teams.opponent.manualTotals.totals.matches,10);assert(data.teams.own.memory.snapshots.length>0);
const id={clubId:'328794',playerName:'Test player',playerKey:photoIdentity('328794','Test player')},dataUrl='data:image/jpeg;base64,/9j/2Q==';
const change=(revision,action)=>photoPost(new Request('https://test/api/player-photo',{method:'POST',body:JSON.stringify({...id,revision,action,dataUrl})}));
assert.equal((await change(0,'save')).status,200);const photo=await photoGet(new Request('https://test/api/player-photo?'+new URLSearchParams(id)));const body=await photo.json();assert.equal(body.dataUrl,dataUrl);assert.equal(body.revision,1);
assert.equal((await change(0,'save')).status,409);assert.equal((await change(1,'remove')).status,200);
const removed=await photoGet(new Request('https://test/api/player-photo?'+new URLSearchParams(id)));assert.equal((await removed.json()).found,false);
assert.equal((await DELETE(new Request('https://test/api/club-data?role=opponent'))).status,200);
const final=await (await GET()).json();assert.equal(final.teams.opponent.memory.snapshots.length,0);assert(final.teams.own.memory.snapshots.length>0);
assert(network.every(url=>!url.includes('vercel-storage')));globalThis.fetch=original;await db.close();console.log('PASS: real API handlers + local PostgreSQL, multipart Termux contract, roles/totals/memory, photo revision/storage, deletion; '+network.length+' Supabase-only requests. Not real Termux or hosted storage.');
