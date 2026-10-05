import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { detectDataFile, buildTeam } from '../lib/data-pipeline.js';

const root = process.cwd();
const ui = await fs.readFile(`${root}/index-inline.js`, 'utf8');
const start = ui.indexOf('function profileScopeRows');
const end = ui.indexOf('function teamPage', start);
assert.ok(start >= 0 && end > start, 'blocco profili non trovato');
const block = ui.slice(start, end);
const factory = new Function('num','esc','profileRows', `${block}; return {profileScopeRows, teamProfileTables};`);
const esc = value => String(value ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const profileRows = items => items.map(([k,v]) => `<div>${k}:${v}</div>`).join('');
const { profileScopeRows, teamProfileTables } = factory((v, fallback=0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}, esc, profileRows);

const expected = [
  ['Clean sheet',16],['Punti',56],['Promozioni',4],['Retrocessioni',2],
  ['Miglior divisione',4],['Divisione attuale',4],['Partite playoff',0],['Reputation tier',0]
];
assert.deepEqual(profileScopeRows({
  cleanSheets:16, points:56, promotions:4, relegations:2,
  bestDivision:4, currentDivision:'4', gamesPlayedPlayoff:'0', reputationtier:'0'
}), expected);
assert.equal(profileScopeRows({gamesPlayed:101,wins:43}).some(([k]) => /Percentuale|\/ partita|Diff/.test(k)), false);

async function fixtureRecords() {
  const names=['search.json','search (1).json','info.json','overallStats.json','stats.json','stats (1).json','matches.json'];
  const records={};
  for(const name of names){
    const raw=JSON.parse(await fs.readFile(`/mnt/data/${name}`,'utf8'));
    const d=detectDataFile(raw,name);
    const payload={...d,raw,parsed:d.parsed,fileName:name,uploadedAt:'2026-10-05T00:00:00.000Z',detected:{confidence:d.confidence,reason:d.reason}};
    records[d.category]=payload;
    for(const mirror of (d.mirrorCategories||[])) if(mirror!==d.category) records[mirror]={...payload,category:mirror,autoMirror:true};
  }
  return records;
}
const records = await fixtureRecords();
for (const role of ['own','opponent']) {
  const team = buildTeam({fileRecords:records,role});
  assert.equal(team.teamProfile.totals.gamesPlayed,101,`${role}: totals.gamesPlayed`);
  assert.equal(team.teamProfile.totals.cleanSheets,16,`${role}: totals.cleanSheets`);
  assert.equal(team.teamProfile.season.points,56,`${role}: season.points`);
  assert.equal(team.teamProfile.season.reputationtier,0,`${role}: season.reputationtier`);
  const html = teamProfileTables(team);
  for (const [label,value] of expected) {
    assert.match(html,new RegExp(`${label}.*${value}`),`${role}: ${label}`);
  }
  assert.doesNotMatch(html,/Percentuale|per partita|Partite playoff %/i,`${role}: non devono comparire percentuali/medie nei due pannelli`);
}

console.log('test-v3212-profiles: OK');
