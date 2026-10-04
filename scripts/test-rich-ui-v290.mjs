import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { detectDataFile, normalizePlayersFile, normalizeMatchesFile, buildTeam } from '../lib/data-pipeline.js';

const files=[
 ['search.json','totals'],['search (1).json','season'],['info.json','clubInfo'],['overallStats.json','overallStats'],['stats.json','players'],['stats (1).json','career'],['matches.json','league']
];
const records={};
for(const [name,cat] of files){const raw=JSON.parse(await fs.readFile(`/mnt/data/${name}`,'utf8'));const d=detectDataFile(raw,name);let parsed=d.parsed;if(cat==='players'||cat==='career')parsed=normalizePlayersFile(raw,'328794');if(cat==='league')parsed=normalizeMatchesFile(raw,'league');records[cat]={fileName:name,uploadedAt:new Date().toISOString(),parsed,raw,detected:d};}
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
assert.match(teamHtml,/Dati totali/);assert.match(teamHtml,/Overall Stats/);assert.match(teamHtml,/Informazioni club/);assert.match(teamHtml,/Skill rating/);assert.match(teamHtml,/Andamento storico/);assert.match(teamHtml,/Analisi dettagliata ultime 5/);
const playersHtml=await renderTab('players');
assert.match(playersHtml,/OVR/);assert.match(playersHtml,/Prestazioni principali/);assert.match(playersHtml,/Carriera giocatori/);assert.match(playersHtml,/Profilo Pro/);assert.match(playersHtml,/CS tot\./);assert.match(playersHtml,/Indice/);assert.match(playersHtml,/Rapporti per partita/);assert.match(playersHtml,/Forma gol export \(5\)/);
const opponentHtml=await renderTab('opponent');
assert.match(opponentHtml,/Overall Stats/);assert.match(opponentHtml,/TOTALE STORICO/);
assert.doesNotMatch(teamHtml,/data-edit-totals|Modifica totale storico|trackerUrl_|Link ProClubTracker/i);
assert.doesNotMatch(opponentHtml,/data-edit-totals|Modifica totale storico|trackerUrl_|Link ProClubTracker/i);

console.log('test-rich-ui: OK');
