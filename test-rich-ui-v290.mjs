import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { detectDataFile, normalizePlayersFile, normalizeMatchesFile, buildTeam } from '../lib/data-pipeline.js';

const records={
  totals:{fileName:'search.json',uploadedAt:new Date().toISOString(),parsed:[{gamesPlayed:101,wins:43,ties:10,losses:48,goals:220,goalsAgainst:246,cleanSheets:16,points:56,promotions:4,relegations:2,bestDivision:4,currentDivision:4,gamesPlayedPlayoff:0,reputationtier:0,clubId:'328794',clubName:'Sisal FC 2021'}]},
  season:{fileName:'search (1).json',uploadedAt:new Date().toISOString(),parsed:[{gamesPlayed:101,wins:43,ties:10,losses:48,goals:220,goalsAgainst:246,currentDivision:4,leagueAppearances:101,clubId:'328794',clubName:'Sisal FC 2021'}]},
  clubInfo:{fileName:'info.json',uploadedAt:new Date().toISOString(),parsed:{name:'Sisal FC 2021',clubId:'328794'}},
  overallStats:{fileName:'overallStats.json',uploadedAt:new Date().toISOString(),parsed:{clubId:'328794',skillRating:120,bestDivision:4,gamesPlayed:101,wstreak:3,unbeatenstreak:4}},
  players:{fileName:'stats.json',uploadedAt:new Date().toISOString(),parsed:[{name:'AdraTheTrue02',games:5,goals:2,assists:1,ovr:90,position:'ST'}]},
  career:{fileName:'stats (1).json',uploadedAt:new Date().toISOString(),parsed:[{name:'AdraTheTrue02',games:5,goals:2,assists:1,position:'ST'}]},
  league:{fileName:'matches.json',uploadedAt:new Date().toISOString(),parsed:Array.from({length:5},(_,i)=>({id:`m${i+1}`,timestamp:1000-i,clubs:{'328794':{clubId:'328794',details:{name:'Sisal FC 2021'},goals:2},['900'+i]:{clubId:String('900'+i),details:{name:`Opp ${i+1}`},goals:i%2}},players:{}}))}
};
const baseTeam=buildTeam({role:'own',fileRecords:records});
const team={...baseTeam,manualTotals:baseTeam.autoTotals,trackerUrl:'https://proclubstracker.com/club/328794?platform=common-gen5&div=4'};
const source=await fs.readFile(new URL('../index-inline.js',import.meta.url),'utf8');

async function renderTab(tab){
  const elements=new Map();
  function element(id=''){return {id,innerHTML:'',textContent:'',value:'',disabled:false,files:[],className:'',style:{},dataset:{},children:[],addEventListener(){},click(){},focus(){},prepend(){},remove(){},appendChild(){},querySelector(){return null}};}
  const document={getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},querySelectorAll(){return[]},createElement(){return element()}};
  const localStore=new Map();
  const ctx={document,localStorage:{getItem(k){return localStore.get(k)??null},setItem(k,v){localStore.set(k,String(v))}},sessionStorage:{getItem(){return null}},navigator:{serviceWorker:{register:async()=>({})}},window:{addEventListener(){},scrollTo(){}},location:{protocol:'http:',href:'http://localhost/'},fetch:async()=>new Response(JSON.stringify({ok:false}),{status:503}),console,Intl,Date,Number,String,Boolean,Object,Array,Map,Set,Math,JSON,Error,Promise,encodeURIComponent,decodeURIComponent,URL,setTimeout,clearTimeout,confirm:()=>false,alert:()=>{}};
  ctx.globalThis=ctx;vm.createContext(ctx);
  const patched=source.replace('boot();',`state.own=${JSON.stringify(team)};state.opponent=${JSON.stringify(team)};state.tab=${JSON.stringify(tab)};render();`);
  vm.runInContext(patched,ctx,{filename:`index-inline-${tab}.js`});
  const html=elements.get('content')?.innerHTML||'';
  assert.ok(html.length>100,`${tab}: contenuto vuoto`);
  return html;
}
const teamHtml=await renderTab('team');
assert.match(teamHtml,/Dati totali/);assert.match(teamHtml,/Overall Stats/);assert.match(teamHtml,/Informazioni club/);assert.match(teamHtml,/Skill rating/);assert.doesNotMatch(teamHtml,/Evoluzione club nella memoria|Memoria aggiornamenti dataset/);assert.match(teamHtml,/Andamento storico/);assert.match(teamHtml,/Analisi dettagliata ultime 5/);
const playersHtml=await renderTab('players');
assert.match(playersHtml,/OVR/);assert.match(playersHtml,/Prestazioni principali/);assert.match(playersHtml,/Carriera giocatori/);assert.match(playersHtml,/Profilo Pro/);assert.match(playersHtml,/CS tot\./);assert.match(playersHtml,/Indice/);assert.match(playersHtml,/Rapporti per partita/);assert.match(playersHtml,/Forma gol export \(5\)/);
const opponentHtml=await renderTab('opponent');
assert.match(opponentHtml,/Overall Stats/);assert.match(opponentHtml,/TOTALE STORICO/);
assert.doesNotMatch(teamHtml,/data-edit-totals|Modifica totale storico|trackerUrl_|Link ProClubTracker/i);
assert.doesNotMatch(opponentHtml,/data-edit-totals|Modifica totale storico|trackerUrl_|Link ProClubTracker/i);

console.log('test-rich-ui: OK');
