import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createHash,randomUUID} from 'node:crypto';import {PGlite} from '@electric-sql/pglite';import {createCanvas} from '@napi-rs/canvas';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sisal-migration-')),db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');for(const name of ['01-database.sql','03-import-temporary.sql'])await db.exec(await fs.readFile(new URL('../setup/'+name,import.meta.url),'utf8'));
const image=createCanvas(5,5).toDataURL('image/jpeg'),id=randomUUID(),device=randomUUID(),photoKey='legacy-test';const files=[];
const add=async(pathname,value,raw=false)=>{const bytes=Buffer.from(raw?value:JSON.stringify(value)),sha256=createHash('sha256').update(bytes).digest('hex'),file=files.length+'.bin';await fs.writeFile(path.join(dir,file),bytes);files.push({pathname,file,sha256});};
await add('sisal-fc/fc27/shared/own/_meta/team-bundle-v1.json',{files:{players:{raw:[{name:'A'}]}},totals:null,memory:{schemaVersion:1,snapshots:[{fingerprint:'preserve'}]}});
await add('sisal-fc/fc27/shared/own/_meta/totals.json',{old:'must not resurrect'});
await add('sisal-fc/fc27/shared/own/_meta/player-photos/example.json',{playerKey:photoKey,playerName:'A',dataUrl:image});
await add('sisal-fc/fc27/comunicati-v1/index.json',{posts:[{id,title:'Migrazione',body:'Preservami',revision:3,pinned:true,archived:false,created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-02T00:00:00Z',voters:[device],imageKey:'sisal-fc/fc27/comunicati-v1/photos/a.txt'}]});
await add('sisal-fc/fc27/comunicati-v1/photos/a.txt',image,true);await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({complete:true,files}));
process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_test';const original=fetch,objects=new Map();globalThis.fetch=async(url,opts={})=>{const u=new URL(url);try{
 if(u.pathname.includes('/rpc/')){const r=await db.query('select sisal_import($1)',[JSON.parse(opts.body).p]);return new Response('null');}
 if(u.pathname.startsWith('/rest/v1/')){const table=u.pathname.split('/').at(-1);assert(['communications','communication_reactions','player_photos','team_state'].includes(table));return Response.json((await db.query('select * from '+table)).rows);}
 const key=u.pathname.replace('/authenticated','');if(opts.method==='POST'){objects.set(key,opts.body);return Response.json({});}return new Response(objects.get(key));
 }catch(e){return Response.json({message:e.message},{status:400});}};
process.argv=['node','import.mjs','import',dir];await import('../migration/import.mjs?test=1');
assert.equal((await db.query("select totals from team_state where role='own'")).rows[0].totals,null);
assert(JSON.parse(await fs.readFile(path.join(dir,'verification.json'))).verified);
process.argv=['node','import.mjs','verify',dir];await import('../migration/import.mjs?test=2');
process.argv=['node','import.mjs','import',dir];await assert.rejects(import('../migration/import.mjs?test=3'),/Destinazione già usata/);
await fs.writeFile(path.join(dir,files[0].file),'corrupt');process.argv=['node','import.mjs','verify',dir];await assert.rejects(import('../migration/import.mjs?test=4'),/Backup corrotto/);
globalThis.fetch=original;await db.close();await fs.rm(dir,{recursive:true});console.log('PASS: import transaction, exact comparison, image bytes, existing target and corrupt backup protection (fixtures only).');
