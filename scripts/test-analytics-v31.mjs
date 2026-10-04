import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildTeam, calculatePlayerPerformanceIndex } from '../lib/data-pipeline.js';

const base='/mnt/data';
const specs=[['search.json','totals'],['search (1).json','season'],['info.json','clubInfo'],['overallStats.json','overallStats'],['stats.json','players'],['stats (1).json','career'],['matches.json','league']];
const records={};
for(const [file,category] of specs){
  const raw=JSON.parse(await fs.readFile(`${base}/${file}`,'utf8'));
  const mod=await import('../lib/data-pipeline.js');
  const detected=mod.detectDataFile(raw,file);
  let parsed=detected.parsed;
  if(category==='players'||category==='career') parsed=mod.normalizePlayersFile(raw,'328794');
  if(category==='league') parsed=mod.normalizeMatchesFile(raw,'league');
  records[category]={fileName:file,uploadedAt:new Date().toISOString(),parsed,raw,detected};
}
const team=buildTeam({role:'own',fileRecords:records});
assert.equal(team.autoTotals.totals.matches,99);
assert.equal(team.autoTotals.totals.wins,42);
assert.equal(team.autoTotals.totals.draws,10);
assert.equal(team.autoTotals.totals.losses,47);
assert.equal(team.autoTotals.totals.goals,214);
assert.equal(team.autoTotals.totals.against,241);
assert.equal(team.recent5.matches.length,5);
assert.equal(team.matchTrend.length,10);
const adra=team.players.find(p=>p.name==='AdraTheTrue02');
assert.ok(adra);
assert.equal(adra.ovr,83);
assert.equal(adra.goalsPerGame,104/99);
assert.equal(adra.assistsPerGame,36/99);
assert.equal(adra.goalInvolvementPerGame,140/99);
assert.equal(adra.previousGoals.length,11);
assert.ok(Number.isFinite(adra.performanceIndex));
assert.ok(adra.performanceIndex>=0 && adra.performanceIndex<=100);
assert.ok(adra.recent5Index==null || (adra.recent5Index>=0 && adra.recent5Index<=100));
const baseIndex=calculatePlayerPerformanceIndex(adra);
assert.ok(baseIndex>=0 && baseIndex<=100);
assert.ok(Math.abs(adra.performanceIndex-baseIndex)<=40);
assert.equal(team.teamProfile.overallStats.skillRating,1454);
assert.equal(team.teamProfile.playerPositionCount.forward,6);
const last=team.matchTrend.at(-1);
assert.equal(last.cumulativeGF,team.overall.goals);
assert.equal(last.cumulativeGA,team.overall.against);
assert.equal(last.cumulativePoints,team.overall.wins*3+team.overall.draws);

console.log('test-analytics-v31: OK');
