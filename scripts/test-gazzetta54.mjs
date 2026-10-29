import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {GET,POST} from '../api/editorial.js';
import {hashToken,COOKIE} from '../lib/accounts.js';
import {validateStyle} from '../horse-style.js';
import {editionFacts,validateEdition,generateEdition} from '../lib/editorial.js';
import {publishPaper} from '../lib/paper-job.js';
import {runPaperTask,schedulePaper} from '../lib/paper-auto.js';
import {POST as uploadPOST} from '../api/club-data.js';
import {GET as accountGET,POST as accountPOST} from '../api/account.js';
import {signaturePose} from '../race-signature.js';
const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');
for(const file of ['setup/01-database.sql','setup/accounts/01-accounts.sql'])await db.exec(await fs.readFile(file,'utf8'));
const legacy=randomUUID(),postId=randomUUID();await db.query('insert into communications(id,title,body) values($1,$2,$3)',[postId,'Prima della migrazione','Testo storico']);await db.query('insert into communication_reactions values($1,$2,now())',[postId,legacy]);
const migration=await fs.readFile('setup/08-club-editorial.sql','utf8');await db.exec(migration);await db.exec(migration);
const call=async(name,args)=>{const keys=Object.keys(args);return (await db.query(`select ${name}(${keys.map((k,i)=>k+' => $'+(i+1)).join(',')}) as v`,Object.values(args))).rows[0].v;};
const actor=async(name,admin)=>{const id=randomUUID(),token=Buffer.from(name.padEnd(32,'_')).toString('base64url'),hash=hashToken(token);await db.query('insert into club_accounts(id,player_key,display_name,password_hash,status,is_admin) values($1,$2,$2,$3,$4,$5)',[id,name,'fixture-hash','active',admin]);await db.query('insert into club_sessions(token_hash,account_id) values($1,$2)',[hash,id]);return {id,hash,token};};
const admin=await actor('Adra',true),member=await actor('Socio',false),other=await actor('Altro',false);
const alpha=await actor('alpha',false);await db.query('update club_accounts set appearance=$1 where id=$2',[{eyes:'blue',helmetVisible:'off'},alpha.id]);
const rpc=(action,p={},a=admin)=>call('sisal_editorial',{p_action:action,p,p_session:a.hash});
const news=(p,a=admin)=>call('sisal_news_actor',{p,p_device:a.id});
assert.equal((await news({action:'get',id:postId})).likes,1,'legacy reactions preserved');
const id=randomUUID(),create={action:'create',id,title:'Nuovo comunicato',body:'Testo completo',request_id:randomUUID()};
await news(create);await news(create);assert.equal((await rpc('notifications')).items.length,1,'exactly one event per create receipt');
assert.equal((await news({action:'get',id})).author_name,'Adra');
const pending=randomUUID();await db.query('insert into club_accounts(id,player_key,display_name,password_hash) values($1,$2,$2,$3)',[pending,'Nuovo','fixture']);
assert.equal((await rpc('notifications')).items.length,2);assert.equal((await rpc('notifications',{},member)).items.length,1,'member cannot see signup');
const read=(await rpc('notifications',{},member)).items[0].id;
await Promise.all([rpc('read',{id:read},member),rpc('read',{id:read},member)]);assert.equal((await rpc('notifications',{},member)).unread,0,'shared read state / concurrent retry');assert.equal((await rpc('notifications',{},other)).unread,1,'other account independent');
const through=(await rpc('notifications')).through;
await news({action:'create',id:randomUUID(),title:'Dopo snapshot',body:'Testo',request_id:randomUUID()});
assert.equal((await rpc('read_all',{through})).unread,1,'new arrival not swallowed by mark all');
await db.query("update club_accounts set status='active' where id=$1",[pending]);assert(!(await rpc('notifications')).items.some(e=>e.kind==='signup'),'resolved signup hidden');
const like={action:'like',id,value:true,request_id:randomUUID()};await Promise.all([news(like,member),news(like,member),news({...like,request_id:randomUUID()},member),news({...like,request_id:randomUUID()},other)]);assert.equal((await news({action:'get',id},member)).likes,2);
await Promise.all([news({...like,value:false,request_id:randomUUID()},member),news({...like,value:true,request_id:randomUUID()},member)]);assert.equal((await news({action:'get',id},member)).likes,2,'last serialized choice wins, one row/account');
await assert.rejects(news({...create,id:randomUUID(),request_id:randomUUID()},member),/FORBIDDEN/);
await assert.rejects(rpc('claim',{lease:randomUUID(),fingerprint:'x'},member),/FORBIDDEN/);
await assert.rejects(call('sisal_editorial',{p_action:'notifications',p_session:'wrong'}),/UNAUTHORIZED/);
const existing=await db.query('select role,files,totals,memory,revision from team_state order by role');
for(const file of ['setup/20-gazzetta-automatica.sql','setup/21-gazzetta-cinque-partite.sql']){const sql=await fs.readFile(file,'utf8');await db.exec(sql);await db.exec(sql);}
assert.deepEqual(await db.query('select role,files,totals,memory,revision from team_state order by role'),existing,'additive migration leaves all source state unchanged');
const opponents=['Club Esempio','Vecchio Club','Union Club','Real Nord','Aurora FC','Sesto Club'];
const rawMatches=goals=>Array.from({length:6},(_,i)=>({matchId:String(95476907420210-i),timestamp:1792000300-i*86400,clubs:{'328794':{details:{name:'Sisal FC 2021'},goals:i?i:goals},['op'+i]:{details:{name:opponents[i]},goals:i===0?1:i%3}},players:{'328794':{a:{playername:'Alpha',goals:1,assists:0,rating:i===1?6:8.5},b:{playername:'Beta',goals:2,assists:1,rating:i===1?9:7},c:{playername:'SenzaAccount',goals:1,rating:i===2?9.5:6}}}}));
let serial=0,aiCalls=0,mode='ok',holdAI,releaseAI;
const content=()=>({title:'Una serata da mandare in stampa '+(++serial),teamLine:'La Sisal contro cinque avversari: il tabellone racconta le prestazioni di un gruppo che può sorridere.',stories:opponents.slice(0,5).map((name,i)=>({ref:i+1,title:'IL PROCESSO A '+name.toUpperCase(),text:'Contro '+name+' il tabellone parla chiaro. La redazione registra i numeri disponibili, senza inventare azioni mai viste. Il bersaglio della satira sono solo le prestazioni nel gioco.'}))});
let lastRaw;
process.env.SUPABASE_URL='https://fixture.supabase.co';process.env.SUPABASE_SECRET_KEY='fixture';process.env.GEMINI_API_KEY='fixture';
globalThis.fetch=async(url,opts={})=>{
 if(String(url).includes('supabase.co')){try{return Response.json(await call(String(url).split('/').at(-1),JSON.parse(opts.body)))}catch(e){return Response.json({message:e.message},{status:400});}}
 assert(String(url).startsWith('https://generativelanguage.googleapis.com/'));aiCalls++;
 const prompt=JSON.parse(opts.body).contents[0].parts[0].text;
 assert(!prompt.includes('95476907420210'),'technical match id never sent to the writer');for(const name of opponents.slice(0,5))assert(prompt.includes(name),'each of five matches sent');assert(!prompt.includes('Sesto Club'),'sixth match omitted');
 if(mode==='quota')return Response.json({},{status:429});if(mode==='timeout')throw new DOMException('timeout','TimeoutError');
 if(mode==='partial')return Response.json({candidates:[{finishReason:'MAX_TOKENS'}]});
 if(mode==='unavailable')return Response.json({},{status:503});
 if(mode==='hold')await new Promise(r=>releaseAI=r);
 const value=mode==='repeat'?lastRaw:content();if(mode==='forbidden')value.title='Il mister al comando';else lastRaw=value;
 return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]});
};
const job=(action,p={},a=admin)=>call('sisal_paper54',{p_action:action,p_actor:a.id,p});
const setFiles=async(goals,metadata='one')=>db.query("update team_state set files=$1,revision=revision+1 where role='own'",[{league:{raw:rawMatches(goals),uploadedAt:metadata,fileName:metadata+'.json'}}]);
const settle=()=>db.exec("update club_paper_queue53 set due_at=clock_timestamp()-interval '1 second'");
const cooldown=()=>db.exec("update club_editorial_lock set attempted_at=clock_timestamp()-interval '2 minutes'");
const req=(action,a=member,method='GET',origin='https://sisal.test')=>new Request('https://sisal.test/api/editorial?action='+action,{method,headers:{Cookie:COOKIE+'='+a.token,Origin:origin,'Content-Type':'application/json'},body:method==='POST'?JSON.stringify({action}):undefined});
assert.equal((await GET(new Request('https://sisal.test/api/editorial'))).status,401);
assert.equal((await POST(req('generate',member,'POST'))).status,403);
assert.equal((await POST(req('generate',admin,'POST','https://evil.test'))).status,403);
assert.equal((await POST(new Request('https://sisal.test/api/editorial',{method:'POST',headers:{Origin:'https://sisal.test','X-Sisal-Paper-Job':'a'.repeat(64)}}))).status,401,'old bearer job header cannot bypass sessions');
assert.equal((await accountGET(new Request('https://sisal.test/api/account?action=arena',{headers:{Cookie:COOKIE+'='+admin.token}}))).status,410,'retired action performs no Arena work');
assert.equal((await accountPOST(new Request('https://sisal.test/api/account',{method:'POST',headers:{Cookie:COOKIE+'='+admin.token,Origin:'https://sisal.test','Content-Type':'application/json'},body:JSON.stringify({action:'arena_keeper',key:'alpha'})}))).status,410,'retired keeper action never calls Arena SQL');
await assert.rejects(job('claim',{lease:randomUUID()},member),/FORBIDDEN/);
await setFiles(3);const first=await job('enqueue');assert(first.queued);assert((await job('claim',{automatic:true,generation:first.generation,lease:randomUUID()})).pending,'quiet window respected');
await setFiles(4);const second=await job('enqueue');assert(second.generation>first.generation);await settle();
assert((await publishPaper(admin,{automatic:true,generation:first.generation})).skipped,'superseded upload cannot generate');assert.equal(aiCalls,0);
// Two independent worker calls: one lease, one call to the (mocked) writer.
mode='hold';const writing=publishPaper(admin,{automatic:true,generation:second.generation});while(!releaseAI)await new Promise(r=>setTimeout(r,5));
const otherWorker=await publishPaper(admin,{automatic:true,generation:second.generation});assert(otherWorker.pending);releaseAI();const issued=await writing;mode='ok';assert(issued.ok&&issued.edition);assert.equal(aiCalls,1);
assert.equal(issued.edition.model.schemaVersion,4);assert.equal(issued.edition.model.stories[0].goals,4);assert.equal(issued.edition.model.stories[0].against,1);assert.equal(issued.edition.model.stories[0].opponent,'Club Esempio');assert.equal(issued.edition.model.stories.length,5);
assert.equal(issued.edition.model.stories[0].portrait.name,'Alpha');assert.equal(issued.edition.model.stories[0].portrait.appearance.eyes,'blue');assert.equal(issued.edition.model.stories[0].portrait.appearance.helmetVisible,'off');assert.equal(issued.edition.model.stories[1].portrait.name,'Beta');assert.equal(issued.edition.model.stories[2].portrait.name,'SenzaAccount');assert(issued.edition.model.stories[2].portrait.defaultAppearance,'unregistered MVP gets default jockey, never viewer');

assert.equal((await rpc('notifications',{},member)).items.filter(x=>x.kind==='paper').length,1);
assert((await publishPaper(admin)).existing);assert.equal(aiCalls,1,'same JSON never regenerated');
await setFiles(4,'metadata changed');assert((await job('enqueue')).unchanged);assert((await publishPaper(admin)).existing);assert.equal(aiCalls,1,'file name and timestamp do not spend quota');
await db.query("update team_state set files=$1 where role='own'",[{league:{raw:'  '+JSON.stringify(rawMatches(4))+'  ',uploadedAt:'different'}}]);assert((await job('enqueue')).unchanged,'JSON text whitespace is ignored');
const seen=await GET(req('latest'));assert.equal(seen.status,200);assert.equal((await seen.json()).edition.id,issued.edition.id);assert.equal(aiCalls,1,'page read is passive');
// A change while the writer is running cannot publish an obsolete article.
await setFiles(5);const third=await job('enqueue');await settle();mode='hold';releaseAI=null;const obsolete=publishPaper(admin,{automatic:true,generation:third.generation});while(!releaseAI)await new Promise(r=>setTimeout(r,5));
await setFiles(6);const fourth=await job('enqueue');releaseAI();assert.equal((await obsolete).code,'DATA_CHANGED');mode='ok';assert.equal((await rpc('latest')).edition.id,issued.edition.id);assert.equal((await job('status')).error,null,'old job cannot poison new data');
await settle();assert((await runPaperTask(admin,fourth,{pause:async()=>{}})).edition);let latest=(await rpc('latest')).edition;
let errorIndex=0;
for(const error of ['quota','timeout','partial','unavailable','forbidden','repeat']){
 await setFiles(10+errorIndex++);const queued=await job('enqueue');await settle();mode=error;
 const result=await publishPaper(admin,{automatic:true,generation:queued.generation});assert(!result.ok,error+' does not publish');assert.equal(result.code,({quota:'GEMINI_QUOTA',timeout:'TimeoutError',partial:'INVALID_EDITION',unavailable:'AI_UNAVAILABLE',forbidden:'INVALID_EDITION',repeat:'REPEATED_EDITION'})[error]);assert.equal((await rpc('latest')).edition.id,latest.id,error+' conserves last edition');assert.equal((await db.query('select lease from club_editorial_lock')).rows[0].lease,null);
 const before=aiCalls;assert((await job('enqueue')).unchanged);assert.equal(aiCalls,before,'duplicate failed upload does not loop on quota');
}
mode='ok';await cooldown();const generated=await POST(req('generate',admin,'POST'));assert.equal(generated.status,200);latest=(await generated.json()).edition;assert(latest);
assert.equal((await POST(req('generate',member,'POST'))).status,403);
// A fresh database queue survives function restarts: a new task can take the saved generation.
await setFiles(30);const queued=await job('enqueue');await settle();const count=aiCalls;const result=await runPaperTask(admin,queued,{pause:async()=>{}});assert(result.edition);assert.equal(aiCalls,count+1);
// Real upload handler, personal Termux bearer token, Vercel waitUntil SDK, source -> queue -> AI.
const bearer=Buffer.alloc(32,7).toString('base64url');await db.query('insert into club_import_tokens(token_hash,account_id) values($1,$2)',[hashToken(bearer),admin.id]);
let tasks=[];globalThis[Symbol.for('@vercel/request-context')]={get:()=>({waitUntil:p=>tasks.push(p)})};
process.env.GEMINI_API_KEY='';const form=new FormData();form.set('role','own');form.set('category','league');form.set('file',new File([JSON.stringify(rawMatches(31))],'Campionato.json',{type:'application/json'}));
const upload=await uploadPOST(new Request('https://sisal.test/api/club-data',{method:'POST',headers:{Authorization:'Bearer '+bearer},body:form}));assert.equal(upload.status,200);const uploaded=await upload.json();assert(uploaded.ok&&uploaded.gazzetta.queued);assert.equal(tasks.length,1,'background task registered on actual Vercel SDK');
process.env.GEMINI_API_KEY='fixture';await settle();await Promise.all(tasks);assert.equal((await rpc('latest')).edition.model.stories[0].goals,31);assert.equal((await rpc('latest')).edition.model.stories[0].matchId,'95476907420210');
const beforeOpponent=aiCalls;const opponentForm=new FormData();opponentForm.set('role','opponent');opponentForm.set('category','league');opponentForm.set('file',new File([JSON.stringify(rawMatches(32))],'Campionato.json'));process.env.GEMINI_API_KEY='';
assert.equal((await uploadPOST(new Request('https://sisal.test/api/club-data',{method:'POST',headers:{Authorization:'Bearer '+bearer},body:opponentForm}))).status,200);assert.equal(tasks.length,1,'opponent upload never generates team paper');assert.equal(aiCalls,beforeOpponent);
const invalidMatches=rawMatches(1);for(const m of invalidMatches)for(const c of Object.values(m.clubs))delete c.goals;
await db.query("update team_state set files=$1 where role='own'",[{league:{raw:invalidMatches}}]);const noScores=await job('enqueue');await settle();const beforeNoScores=aiCalls;const failedScores=await publishPaper(admin,{automatic:true,generation:noScores.generation});assert.equal(failedScores.code,'NO_MATCHES');assert.equal(aiCalls,beforeNoScores,'missing scores never spend AI quota');assert.equal((await rpc('latest')).edition.model.stories[0].goals,31);
for(const role of ['anon','authenticated']){assert.equal((await db.query('select has_function_privilege($1,$2,$3) as ok',[role,'sisal_paper54(text,uuid,jsonb)','execute'])).rows[0].ok,false);assert.equal((await db.query('select has_table_privilege($1,$2,$3) as ok',[role,'club_paper_queue53','select'])).rows[0].ok,false);}
assert.equal((await news({action:'get',id:postId})).likes,1,'legacy reactions still present');
await db.close();delete globalThis[Symbol.for('@vercel/request-context')];
console.log('PASS Gazzetta 54: five real matches; correct MVP per match including no account; additive migration twice; preserved reactions/accounts/sources; upload batching; stable content identity; concurrent/restarted workers; stale jobs; admin/member/anonymous/CSRF; quota/timeout/incomplete/repeated AI; one shared notification; actual Termux upload handler and waitUntil SDK. PostgreSQL via local PGlite, external services mocked.');
