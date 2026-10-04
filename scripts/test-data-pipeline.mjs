import assert from 'node:assert/strict';
import { normalizePlayersFile, normalizeMatchesFile, buildTeam } from '../lib/data-pipeline.js';

const raw = [
  { matchId:'m1', timestamp:'2026-10-03T21:00:00Z', clubs:{'328794':{details:{name:'Sisal FC 2021'},goals:3},'opp1':{details:{name:'Avversario A'},goals:1}}, players:{'328794':{p1:{playername:'AdraTheTrue02',secondsPlayed:1200,goals:2,ratingAve:8.5}}} },
  { matchId:'m2', timestamp:'2026-10-02T21:00:00Z', clubs:{'328794':{details:{name:'Sisal FC 2021'},goals:0},'opp2':{details:{name:'Avversario B'},goals:0}} },
  { matchId:'m3', timestamp:'2026-10-01T21:00:00Z', clubs:{'328794':{details:{name:'Sisal FC 2021'},goals:2},'opp3':{details:{name:'Avversario C'},goals:4}} },
  { matchId:'m4', timestamp:'2026-09-30T21:00:00Z', clubs:{'328794':{details:{name:'Sisal FC 2021'},goals:5},'opp4':{details:{name:'Avversario D'},goals:2}} },
  { matchId:'m5', timestamp:'2026-09-29T21:00:00Z', clubs:{'328794':{details:{name:'Sisal FC 2021'},goals:1},'opp5':{details:{name:'Avversario E'},goals:2}} },
  { matchId:'m6', timestamp:'2026-09-28T21:00:00Z', clubs:{'328794':{details:{name:'Sisal FC 2021'},goals:4},'opp6':{details:{name:'Avversario F'},goals:0}} }
];
const league=normalizeMatchesFile(raw,'league');
assert.equal(league.length,6);
assert.equal(league[0].clubs.some(c=>c.name==='Sisal FC 2021'),true);
assert.equal(league[0].timestamp,'2026-10-03T21:00:00Z');
assert.equal(league[0].players.some(p=>p.name==='AdraTheTrue02'),true);
const players=normalizePlayersFile([{playername:'AdraTheTrue02',clubId:'328794',goals:20,assists:9,games:10,rating:9.1}], '');
const records={players:{fileName:'players.txt',uploadedAt:new Date().toISOString(),parsed:players},league:{fileName:'league.txt',uploadedAt:new Date().toISOString(),parsed:league},playoffs:null,friendlies:null};
const team=buildTeam({role:'own',fileRecords:records});
assert.equal(team.club.name,'Sisal FC 2021');
assert.equal(team.club.id,'328794');
assert.equal(team.matches.length,6);
assert.equal(team.overall.matches,6);
assert.equal(team.overall.wins,3);
assert.equal(team.overall.draws,1);
assert.equal(team.overall.losses,2);
assert.equal(team.overall.goals,15);
assert.equal(team.overall.against,9);
assert.equal(team.recent5.matches.length,5);
assert.equal(team.recent5.matches[0].id,'m1');
assert.equal(team.recent5.matches[4].id,'m5');
assert.equal(team.players.some(p=>p.name==='AdraTheTrue02'),true);
assert.equal(team.byCompetition.league.matches,6);
assert.equal(team.complete,false);
assert.equal(team.ready,true);
assert.equal(team.fileStatus.playoffs.present,false);
assert.equal(team.fileStatus.friendlies.present,false);
const playersOnly=buildTeam({role:'own',fileRecords:{players:records.players,league:null,playoffs:null,friendlies:null}});
assert.equal(playersOnly.ready,true);
assert.equal(playersOnly.overall.matches,0);
const matchesOnly=buildTeam({role:'own',fileRecords:{players:null,league:records.league,playoffs:null,friendlies:null}});
assert.equal(matchesOnly.ready,true);
assert.equal(matchesOnly.overall.matches,6);
assert.equal(matchesOnly.recent5.matches.length,5);
assert.equal(Object.prototype.hasOwnProperty.call(matchesOnly,'recent' + '10'),false,'Non deve esistere più una finestra oltre U5');
console.log('test-data-pipeline: OK');
