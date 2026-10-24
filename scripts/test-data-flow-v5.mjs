/* Real API handlers and local PostgreSQL; hosted Supabase/Gemini transports simulated. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {hashToken,COOKIE} from '../lib/accounts.js';
import {GET,POST as upload} from '../api/club-data.js';
import {POST as assist} from '../api/assistente.js';
const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');
for(const f of ['setup/01-database.sql','setup/accounts/01-accounts.sql','setup/08-club-editorial.sql','scripts/fixtures/accounts-v12.sql','setup/13-sisal-arena.sql'])await db.exec(await fs.readFile(f,'utf8'));
const session='x'.repeat(43),origin='https://fixture.test',headers={Origin:origin,Cookie:COOKIE+'='+session};
await db.query("insert into club_accounts(player_key,display_name,password_hash,status,is_admin,is_owner) values('fixture','Fixture','test-only','active',true,true)");
await db.query('insert into club_sessions(token_hash,account_id) select $1,id from club_accounts',[hashToken(session)]);
const season=[{clubId:'328794',clubName:'Sisal FC 2021',gamesPlayed:'2',wins:'2',ties:'0',losses:'0',goals:'7',goalsAgainst:'1',currentDivision:'6',points:'6'}];
const overall=[{clubId:'328794',gamesPlayed:'132',wins:'59',ties:'12',losses:'61',goals:'301',goalsAgainst:'325',skillRating:1566,gamesPlayedPlayoff:5}];
const rec=(raw,fileName)=>({raw,parsed:raw,fileName,uploadedAt:'2026-10-23T03:45:49Z'});
const files={totals:rec(season,'stagione-corrente.json'),season:rec(season,'stagione-corrente.json'),overallStats:rec(overall,'overall-stats.json'),players:rec({members:[{name:'Fixture',gamesPlayed:132,goals:122,passesMade:1631,passSuccessRate:74,tacklesMade:91,tackleSuccessRate:31,shotSuccessRate:34}]},'statistiche-giocatori.json')};
// Deliberately large raw source: it must not be duplicated in an AI prompt.
files.players.raw.unusedRawData='RAW_SENTINEL_'.repeat(35000);
await db.query("update team_state set files=$1,totals=$2 where role='own'",[files,{source:'dati-totali-ai',updatedAt:'2099-01-01',totals:{matches:2,wins:2,draws:0,losses:0,goals:7,against:1}}]);
await db.query("update team_state set files=$1 where role='opponent'",[{clubInfo:rec({clubId:'999',name:'Opponent fixture'},'club-info.json'),overallStats:rec([{clubId:'999',gamesPlayed:38,wins:14,ties:9,losses:15,goals:56,goalsAgainst:60}],'overall-stats.json')}]);
process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SECRET_KEY='test-only';process.env.GEMINI_API_KEY='test-only';
let prompts=[],geminiCalls=0,quota=true,failure='',sqlCalls=0,sqlWrites=0;
globalThis.fetch=async(url,opts={})=>{
 if(url.startsWith('https://generativelanguage.googleapis.com/')){
  geminiCalls++;const body=JSON.parse(opts.body),prompt=body.contents[0].parts[0].text;prompts.push(prompt);
  assert(prompt.length<60000,'bounded context without raw EA duplicates');assert(!prompt.includes('RAW_SENTINEL'));
  if(failure==='timeout')throw new DOMException('Test timeout','TimeoutError');
  if(failure==='empty')return Response.json({candidates:[{content:{parts:[]}}]});
  if(quota)return Response.json({error:{message:'Quota exceeded for input tokens per minute. Please retry in 40s.'}},{status:429});
  return Response.json({candidates:[{content:{parts:[{text:'Storico: 132 partite; la stagione attuale è separata.'}]}}]});
 }
 assert(url.startsWith('https://test.supabase.co/rest/v1/rpc/'),url);sqlCalls++;
 const name=new URL(url).pathname.split('/').at(-1),p=JSON.parse(opts.body);
 if(!['sisal_team_read','sisal_account'].includes(name))sqlWrites++;
 try{const out=await db.query(`select ${name}(${Object.keys(p).map((k,i)=>k+' => $'+(i+1)).join(',')}) v`,Object.values(p));return Response.json(out.rows[0].v);}catch(e){return Response.json({message:e.message},{status:400});}
};
const getReq=()=>new Request(origin+'/api/club-data',{headers});
const aiReq=(mode,question='Controlla il dataset')=>new Request(origin+'/api/assistente',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({mode,question})});
let r=await GET(getReq());assert.equal(r.status,200);let d=await r.json();assert.equal(d.teams.own.manualTotals.totals.matches,132);assert.equal(d.teams.own.teamProfile.season.gamesPlayed,2);assert.equal(geminiCalls,0,'opening data never calls Gemini or repairs via AI');assert.equal(sqlWrites,0);
r=await assist(aiReq('audit'));assert.equal(r.status,200);d=await r.json();assert(d.fallback&&d.aiAvailable===false);assert.match(d.answer,/132 partite/);assert.match(d.answer,/Quota IA/);assert.equal(geminiCalls,1);
assert.match(d.answer,/AVVERSARIO/);assert.match(d.answer,/38 partite/,'fallback audits both teams');
quota=false;r=await assist(aiReq('audit'));assert.equal(r.status,200);d=await r.json();assert(!d.fallback);assert.match(d.answer,/132/);
for(const mode of ['timeout','empty']){failure=mode;r=await assist(aiReq('audit'));d=await r.json();assert(r.ok&&d.fallback,mode+' yields explicit factual fallback');assert.match(d.answer,/132 partite/);}failure='';
r=await assist(aiReq('normal','Confronta con l’avversario'));assert(r.ok);assert(prompts.at(-1).includes('Opponent fixture'),'normal comparison also includes opponent context');
assert(prompts.every(p=>p.includes('"matches":132')),'assistant sees reconciled lifetime values');
// Multipart format used by Termux remains role + file. No changes to the device script.
const file=new File([JSON.stringify(season)],'stagione-corrente.json',{type:'application/json'}),form=new FormData();form.set('role','own');form.set('file',file);
const before=geminiCalls;r=await upload(new Request(origin+'/api/club-data',{method:'POST',headers,body:form}));assert.equal(r.status,200,JSON.stringify(await r.clone().json()));assert.equal(geminiCalls,before,'exact file recognizer avoids unnecessary IA calls');
const saved=(await db.query("select files from team_state where role='own'")).rows[0].files;
assert.equal(saved.overallStats.raw[0].gamesPlayed,'132');assert.equal(saved.season.category,'season');assert.equal(saved.totals.category,undefined,'season does not overwrite the legacy historical slot');
d=await (await GET(getReq())).json();assert.equal(d.teams.own.manualTotals.totals.matches,132);
assert.equal((await assist(new Request(origin+'/api/assistente',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}))).status,401);
assert.equal((await assist(new Request(origin+'/api/assistente',{method:'POST',headers:{...headers,Origin:'https://other.test','Content-Type':'application/json'},body:'{}'}))).status,403);
delete process.env.GEMINI_API_KEY;r=await assist(aiReq('audit'));d=await r.json();assert(r.ok&&d.fallback);assert.match(d.answer,/132 partite/);
console.log(JSON.stringify({test:'API → PostgreSQL → UI/AI contract',requests:sqlCalls,gemini:'simulated quota + successful response',promptCharacters:prompts.map(p=>p.length),historical:132,season:2,openingAiCalls:0,csrf:'denied',multipart:'unchanged, no mirror'}));await db.close();
