import assert from 'node:assert/strict';
import { parseJsonText, normalizePlayersFile, normalizeMatchesFile, buildTeam } from '../lib/data-pipeline.js';
import fs from 'node:fs/promises';

let sampleText;
for (const candidate of ['/mnt/data/testdata/matches.json','/mnt/data/matches.json']) { try { sampleText=await fs.readFile(candidate,'utf8'); break; } catch {} }
if (!sampleText) throw new Error('Nessun matches.json di fixture disponibile.');
const raw=JSON.parse(sampleText);
const league=normalizeMatchesFile(raw,'league');
assert.equal(league.length,10,'Il file reale matches.json deve produrre 10 match');
assert.equal(league[0].clubs.some(c=>c.name==='Sisal FC 2021'),true,'Sisal FC 2021 deve essere riconosciuta');
assert.equal(league[0].players.some(p=>p.name==='AdraTheTrue02'),true,'AdraTheTrue02 deve essere riconosciuto nei giocatori partita');
const players=normalizePlayersFile([{playername:'AdraTheTrue02',clubId:'328794',goals:2,assists:1,games:1,rating:9.1}], '');
const team=buildTeam({role:'own',fileRecords:{players:{fileName:'players.txt',uploadedAt:new Date().toISOString(),parsed:players},league:{fileName:'league.txt',uploadedAt:new Date().toISOString(),parsed:league},playoffs:{fileName:'playoffs.txt',uploadedAt:new Date().toISOString(),parsed:[]},friendlies:{fileName:'friendlies.txt',uploadedAt:new Date().toISOString(),parsed:[]}}});
assert.equal(team.club.name,'Sisal FC 2021');
assert.equal(team.club.id,'328794');
assert.equal(team.matches.length,10);
assert.equal(team.players.some(p=>p.name==='AdraTheTrue02'),true);
assert.equal(team.byCompetition.league.matches,10);
assert.equal(team.complete,false,'Senza le categorie obbligatorie il dataset non deve risultare completo');
assert.equal(team.ready,true,'Con giocatori + almeno una partita il dataset deve essere utilizzabile');
assert.equal(team.fileStatus.playoffs.present,false);
assert.equal(team.fileStatus.friendlies.present,false);
assert.equal(parseJsonText(sampleText).length,10);

const allTen={
  totals:{fileName:'Dati totali JSON',uploadedAt:new Date().toISOString(),parsed:{matches:99,wins:40,draws:9,losses:50,goals:214,against:201}},
  season:{fileName:'Stagione corrente JSON',uploadedAt:new Date().toISOString(),parsed:{seasonId:'0',seasonName:'2026'}},
  clubInfo:{fileName:'Info club JSON',uploadedAt:new Date().toISOString(),parsed:{clubId:'328794',clubName:'Sisal FC 2021'}},
  overallStats:{fileName:'Overall Stats JSON',uploadedAt:new Date().toISOString(),parsed:{overall:{goals:214,against:201}}},
  players:{fileName:'Statistiche giocatori JSON',uploadedAt:new Date().toISOString(),parsed:players},
  career:{fileName:'Statistiche carriera JSON',uploadedAt:new Date().toISOString(),parsed:[{name:'AdraTheTrue02',gamesPlayed:100,goals:105,assists:37}]},
  league:{fileName:'Campionato JSON',uploadedAt:new Date().toISOString(),parsed:league},
  playoffs:{fileName:'Playoff JSON',uploadedAt:new Date().toISOString(),parsed:normalizeMatchesFile(raw,'playoffs').slice(0,2)},
  friendlies:{fileName:'Amichevoli JSON',uploadedAt:new Date().toISOString(),parsed:normalizeMatchesFile(raw,'friendlies').slice(0,1)},
  playoffAchievements:{fileName:'Playoff Achievements JSON',uploadedAt:new Date().toISOString(),parsed:{achievements:[{name:'Test'}]}}
};
const allTenTeam=buildTeam({role:'own',fileRecords:allTen});
assert.equal(allTenTeam.complete,true,'Con tutte le categorie obbligatorie presenti il dataset deve risultare completo');
assert.equal(allTenTeam.autoTotals.totals.matches,99);
assert.equal(allTenTeam.fileStatus.totals.present,true);
assert.equal(allTenTeam.fileStatus.playoffAchievements.present,true);

const playersOnly=buildTeam({role:'own',fileRecords:{players:{fileName:'players.txt',uploadedAt:new Date().toISOString(),parsed:players},league:null,playoffs:null,friendlies:null}});
assert.equal(playersOnly.ready,true,'Anche il solo file giocatori deve essere utilizzabile');
assert.equal(playersOnly.overall.matches,0);
const matchesOnly=buildTeam({role:'own',fileRecords:{players:null,league:{fileName:'league.txt',uploadedAt:new Date().toISOString(),parsed:league},playoffs:null,friendlies:null}});
assert.equal(matchesOnly.ready,true,'Anche un solo file partite deve essere utilizzabile');
assert.equal(matchesOnly.overall.matches,10);
const fullTeam=buildTeam({role:'own',fileRecords:{players:{fileName:'players.txt',uploadedAt:new Date().toISOString(),parsed:players},league:{fileName:'league.txt',uploadedAt:new Date().toISOString(),parsed:league},playoffs:{fileName:'playoffs.txt',uploadedAt:new Date().toISOString(),parsed:normalizeMatchesFile(raw,'playoffs').slice(0,2)},friendlies:{fileName:'friendlies.txt',uploadedAt:new Date().toISOString(),parsed:normalizeMatchesFile(raw,'friendlies').slice(0,1)}}});
assert.equal(fullTeam.complete,false,'Con sole 4 categorie il dataset non deve risultare completo');
assert.ok(fullTeam.byCompetition.playoffs.matches>0);
assert.ok(fullTeam.byCompetition.friendlies.matches>0);
assert.equal(fullTeam.fun.available,true);
assert.equal(Array.isArray(fullTeam.fun.form),true);
assert.equal(Array.isArray(fullTeam.fun.redFlags),true);
console.log('test-data-pipeline: OK');
