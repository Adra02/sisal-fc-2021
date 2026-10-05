import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const ui = await fs.readFile(new URL('../index-inline.js', import.meta.url), 'utf8');
assert.match(ui,/function profileScopeRows\(scope\)/);
for(const label of ['Percentuale vittorie','Percentuale pareggi','Percentuale sconfitte','Percentuale imbattibilità','Percentuale clean sheet','Differenza reti','Gol \/ partita','Gol subiti \/ partita','Punti \/ partita','Partite playoff %']) assert.match(ui,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.match(ui,/teamProfileTables\(t\)/);
assert.match(ui,/profileRows\(totRich\)/);
assert.match(ui,/profileRows\(seaRich\)/);

const search=JSON.parse(await fs.readFile('/mnt/data/search.json','utf8'));
const record=search[0];
const m=Number(record.gamesPlayed), w=Number(record.wins), d=Number(record.ties), l=Number(record.losses), gf=Number(record.goals), ga=Number(record.goalsAgainst), cs=Number(record.cleanSheets), points=Number(record.points), playoff=Number(record.gamesPlayedPlayoff);
assert.equal(m,99); assert.equal(w,42); assert.equal(d,10); assert.equal(l,47); assert.equal(gf,214); assert.equal(ga,241);
assert.equal(Number((100*w/m).toFixed(1)),42.4);
assert.equal(Number((100*d/m).toFixed(1)),10.1);
assert.equal(Number((100*l/m).toFixed(1)),47.5);
assert.equal(Number((100*(w+d)/m).toFixed(1)),52.5);
assert.equal(Number((100*cs/m).toFixed(1)),15.2);
assert.equal(gf-ga,-27);
assert.equal(Number((gf/m).toFixed(2)),2.16);
assert.equal(Number((ga/m).toFixed(2)),2.43);
assert.equal(Number((points/m).toFixed(2)),0.54);
assert.equal(Number((100*playoff/m).toFixed(1)),0);

const season=JSON.parse(await fs.readFile('/mnt/data/search (1).json','utf8'))[0];
assert.equal(Number(season.gamesPlayed),m);
assert.equal(Number(season.wins),w);
assert.equal(Number(season.ties),d);
console.log('test-v321-metrics: OK');
