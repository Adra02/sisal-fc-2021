import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { detectDataFile, normalizePlayersFile, normalizeMatchesFile, buildTeam } from '../lib/data-pipeline.js';

const base='/mnt/data';
const cases=[
 ['search.json','totals'],
 ['search (1).json','season'],
 ['info.json','clubInfo'],
 ['overallStats.json','overallStats'],
 ['stats.json','players'],
 ['stats (1).json','career'],
 ['matches.json','league']
];
const records={};
for(const [file,expected] of cases){
  const raw=JSON.parse(await fs.readFile(`${base}/${file}`,'utf8'));
  const d=detectDataFile(raw,file);
  assert.equal(d.category,expected,`${file}: categoria attesa ${expected}, ottenuta ${d.category}`);
  assert.equal(d.confidence,'exact',`${file}: riconoscimento non exact`);
  records[expected]={fileName:file,uploadedAt:new Date().toISOString(),parsed:d.parsed,raw,detected:d};
}
assert.deepEqual(records.totals.parsed,JSON.parse(await fs.readFile(`${base}/search.json`,'utf8')));
assert.deepEqual(records.season.parsed,JSON.parse(await fs.readFile(`${base}/search (1).json`,'utf8')));
assert.equal(records.totals.parsed[0].gamesPlayed,'101');
assert.equal(records.totals.parsed[0].wins,'43');
assert.equal(records.totals.parsed[0].ties,'10');
assert.equal(records.totals.parsed[0].losses,'48');
assert.equal(records.totals.parsed[0].goals,'220');
assert.equal(records.totals.parsed[0].goalsAgainst,'246');
const players=normalizePlayersFile(records.players.parsed,'328794');
const career=normalizePlayersFile(records.career.parsed,'328794');
const matches=normalizeMatchesFile(records.league.parsed,'league');
assert.equal(players.length,10);
assert.equal(career.length,10);
assert.equal(matches.length,10);
records.players.parsed=players;
records.career.parsed=career;
records.league.parsed=matches;
const team=buildTeam({role:'own',fileRecords:records});
assert.equal(team.club.id,'328794');
assert.equal(team.club.name,'Sisal FC 2021');
assert.equal(team.matches.length,10);
assert.equal(team.autoTotals.totals.matches,101);
assert.equal(team.autoTotals.totals.wins,43);
assert.equal(team.autoTotals.totals.draws,10);
assert.equal(team.autoTotals.totals.losses,48);
assert.equal(team.autoTotals.totals.goals,220);
assert.equal(team.autoTotals.totals.against,246);
assert.equal(team.teamProfile.totals.points,56);
assert.equal(team.teamProfile.totals.cleanSheets,16);
assert.equal(team.teamProfile.totals.promotions,4);
assert.equal(team.teamProfile.totals.relegations,2);
assert.equal(team.teamProfile.overallStats.skillRating,1459);
assert.equal(team.teamProfile.clubInfo.stadium,'Stadio livello');
assert.equal(team.teamProfile.clubInfo.kitId,'1078738944');
assert.deepEqual(team.teamProfile.playerPositionCount,{midfielder:2,goalkeeper:0,forward:6,defender:1});
const adra=team.players.find(p=>p.name==='AdraTheTrue02');
assert.ok(adra,'AdraTheTrue02 non trovato');
assert.equal(adra.ovr,83);
assert.equal(adra.proHeight,177);
assert.equal(adra.proPosCode,25);
assert.equal(adra.proStyle,0);
assert.equal(adra.proNationality,27);
assert.ok(adra.career,'career mancante sul giocatore');
assert.equal(adra.career.games,101);
assert.equal(adra.career.goals,107);
assert.equal(adra.career.assists,36);
assert.equal(adra.career.mom,22);
assert.ok(team.sourceFields.players.fieldShape);
assert.ok(team.sourceData.playersMeta?.positionCount);
assert.equal(team.sourceData.totals[0].points,'56');

console.log('test-rich-data: OK');
