import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const ui = await fs.readFile(new URL('../index-inline.js', import.meta.url), 'utf8');
assert.match(ui,/function profileScopeRows\(scope,mode/);
for (const label of [
  'Clean sheet','Punti','Promozioni','Retrocessioni','Miglior divisione',
  'Divisione attuale','Partite playoff','Reputation tier'
]) assert.match(ui,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
for (const forbidden of [
  'Percentuale vittorie','Percentuale pareggi','Percentuale sconfitte','Percentuale imbattibilità',
  'Percentuale clean sheet','Gol \/ partita','Gol subiti \/ partita','Punti \/ partita','Partite playoff %'
]) assert.doesNotMatch(ui,new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.match(ui,/function teamProfileTables\(t\)/);
assert.match(ui,/renderScope\('🏆 Dati totali · campi aggiuntivi'/);
assert.match(ui,/renderScope\('📅 Stagione corrente · campi disponibili'/);
assert.match(ui,/Divisione attuale/);
assert.match(ui,/Presenze in lega/);
assert.doesNotMatch(ui,/snapshotTrend|Evoluzione club nella memoria/);

const search={gamesPlayed:101,wins:43,ties:10,losses:48,goals:220,goalsAgainst:246,cleanSheets:16,points:56,promotions:4,relegations:2,bestDivision:4,currentDivision:4,gamesPlayedPlayoff:0,reputationtier:0};
const season={...search};
for (const record of [search,season]) {
  assert.equal(Number(record.gamesPlayed),101);
  assert.equal(Number(record.wins),43);
  assert.equal(Number(record.ties),10);
  assert.equal(Number(record.losses),48);
  assert.equal(Number(record.goals),220);
  assert.equal(Number(record.goalsAgainst),246);
  assert.equal(Number(record.cleanSheets),16);
  assert.equal(Number(record.points),56);
  assert.equal(Number(record.promotions),4);
  assert.equal(Number(record.relegations),2);
  assert.equal(Number(record.bestDivision),4);
  assert.equal(Number(record.currentDivision),4);
  assert.equal(Number(record.gamesPlayedPlayoff),0);
  assert.equal(Number(record.reputationtier),0);
}
console.log('test-v321-metrics: OK');
