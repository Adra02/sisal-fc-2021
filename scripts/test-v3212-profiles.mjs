import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { buildTeam } from '../lib/data-pipeline.js';

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

const totalsExpected = [
  ['Clean sheet',16],['Punti',56],['Promozioni',4],['Retrocessioni',2],
  ['Miglior divisione',4],['Partite playoff',0],['Reputation tier',0]
];
const seasonExpected = [
  ['Divisione attuale',4],['Presenze in lega',101]
];
assert.deepEqual(profileScopeRows({
  cleanSheets:16, points:56, promotions:4, relegations:2,
  bestDivision:4, currentDivision:'4', gamesPlayedPlayoff:'0', reputationtier:'0'
},'totals'), totalsExpected);
assert.deepEqual(profileScopeRows({
  gamesPlayed:101, wins:43, draws:10, losses:48, goals:220, goalsAgainst:246,
  currentDivision:'4', leagueAppearances:101, cleanSheets:16, points:56, promotions:4,
  relegations:2, bestDivision:4, gamesPlayedPlayoff:0, reputationtier:0
},'season'), seasonExpected);
assert.equal(profileScopeRows({gamesPlayed:101,wins:43},'totals').length,0);
assert.equal(profileScopeRows({cleanSheets:16,points:56},'season').length,0);
async function fixtureRecords() {
  const totals = { gamesPlayed:101, wins:43, ties:10, losses:48, goals:220, goalsAgainst:246, cleanSheets:16, points:56, promotions:4, relegations:2, bestDivision:4, currentDivision:4, gamesPlayedPlayoff:0, reputationtier:0, clubId:'328794', clubName:'Sisal FC 2021' };
  const season = { gamesPlayed:101, wins:43, ties:10, losses:48, goals:220, goalsAgainst:246, cleanSheets:16, points:56, promotions:4, relegations:2, bestDivision:4, currentDivision:4, gamesPlayedPlayoff:0, reputationtier:0, leagueAppearances:101, clubId:'328794', clubName:'Sisal FC 2021' };
  return {
    totals: { raw:[totals], parsed:[totals], fileName:'search.json', uploadedAt:'2026-10-05T00:00:00.000Z', aiRecognition:{category:'totals', profileFields:{gamesPlayed:101,wins:43,draws:10,losses:48,goals:220,goalsAgainst:246,cleanSheets:16,points:56,promotions:4,relegations:2,bestDivision:4,currentDivision:'4',gamesPlayedPlayoff:0,reputationtier:0}} },
    season: { raw:[season], parsed:[season], fileName:'search (1).json', uploadedAt:'2026-10-05T00:00:00.000Z', aiRecognition:{category:'season', profileFields:{gamesPlayed:101,wins:43,draws:10,losses:48,goals:220,goalsAgainst:246,cleanSheets:16,points:56,promotions:4,relegations:2,bestDivision:4,currentDivision:'4',gamesPlayedPlayoff:0,reputationtier:0,leagueAppearances:101}} },
    clubInfo: { raw:{name:'Sisal FC 2021',clubId:'328794'}, parsed:{name:'Sisal FC 2021',clubId:'328794'}, fileName:'info.json' },
    overallStats: { raw:{clubId:'328794',skillRating:120,bestDivision:4,gamesPlayed:101,wstreak:3,unbeatenstreak:4}, parsed:{clubId:'328794',skillRating:120,bestDivision:4,gamesPlayed:101,wstreak:3,unbeatenstreak:4}, fileName:'overallStats.json' }
  };
}

const records = await fixtureRecords();
for (const role of ['own','opponent']) {
  const team = buildTeam({fileRecords:records,role});
  assert.equal(team.teamProfile.totals.gamesPlayed,101,`${role}: totals.gamesPlayed`);
  assert.equal(team.teamProfile.totals.cleanSheets,16,`${role}: totals.cleanSheets`);
  assert.equal(team.teamProfile.season.gamesPlayed,101,`${role}: season.gamesPlayed`);
  assert.equal(team.teamProfile.season.currentDivision,'4',`${role}: season.currentDivision`);
  const totalsRows = profileScopeRows(team.teamProfile.totals,'totals');
  const seasonRows = profileScopeRows(team.teamProfile.season,'season');
  assert.deepEqual(totalsRows,totalsExpected,`${role}: totals panel`);
  assert.deepEqual(seasonRows,seasonExpected,`${role}: season panel`);
  assert.equal(totalsRows.some(([label])=>seasonRows.some(([label2])=>label===label2)),false,`${role}: pannelli devono avere campi distinti`);
  const html = teamProfileTables(team);
  for (const [label,value] of [...totalsExpected,...seasonExpected]) {
    assert.match(html,new RegExp(`${label}.*${value}`),`${role}: ${label}`);
  }
  assert.doesNotMatch(html,/Percentuale|per partita|Partite playoff %/i,`${role}: non devono comparire percentuali/medie nei due pannelli`);
  assert.doesNotMatch(html,/🧠 Evoluzione club nella memoria/,`${role}: il pannello memoria non deve essere mostrato`);
}

console.log('test-v3212-profiles: OK');
