import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const ui = await fs.readFile(new URL('../index-inline.js', import.meta.url), 'utf8');
assert.match(ui,/function profileScopeRows\(scope\)/);
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

const search=JSON.parse(await fs.readFile('/mnt/data/search.json','utf8'))[0];
const season=JSON.parse(await fs.readFile('/mnt/data/search (1).json','utf8'))[0];
for (const record of [search,season]) {
  assert.equal(Number(record.gamesPlayed),99);
  assert.equal(Number(record.wins),42);
  assert.equal(Number(record.ties),10);
  assert.equal(Number(record.losses),47);
  assert.equal(Number(record.goals),214);
  assert.equal(Number(record.goalsAgainst),241);
  assert.equal(Number(record.cleanSheets),15);
  assert.equal(Number(record.points),53);
  assert.equal(Number(record.promotions),4);
  assert.equal(Number(record.relegations),2);
  assert.equal(Number(record.bestDivision),4);
  assert.equal(Number(record.currentDivision),4);
  assert.equal(Number(record.gamesPlayedPlayoff),0);
  assert.equal(Number(record.reputationtier),0);
}
console.log('test-v321-metrics: OK');
