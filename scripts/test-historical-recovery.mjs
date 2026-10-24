import assert from 'node:assert/strict';
import {buildTeam,detectDataFile,normalizePlayersFile,resolveStoredTotals} from '../lib/data-pipeline.js';
// Reproduction of the observed API mismatch; names are synthetic.
const season=[{clubId:'328794',clubName:'Sisal FC 2021',gamesPlayed:'2',wins:'2',ties:'0',losses:'0',goals:'7',goalsAgainst:'1',cleanSheets:'1',currentDivision:'6',points:'6'}];
const career=[{clubId:'328794',gamesPlayed:'132',wins:'59',ties:'12',losses:'61',goals:'301',goalsAgainst:'325',bestDivision:'3',promotions:'5',relegations:'2',gamesPlayedPlayoff:'5',skillRating:'1566'}];
const rec=(raw,fileName)=>({raw,parsed:raw,fileName,uploadedAt:'2026-10-23T03:45:49Z'});
const playerRaw={members:[{name:'Test player',gamesPlayed:132,goals:122,passesMade:1631,passSuccessRate:74,tacklesMade:91,tackleSuccessRate:31,shotSuccessRate:34,proPos:25,prevGoals:4,prevGoals1:3}]};
const files={totals:rec(season,'stagione-corrente.json'),season:rec(season,'stagione-corrente.json'),overallStats:rec(career,'overall-stats.json'),players:rec(playerRaw,'statistiche-giocatori.json')};
files.totals.aiRecognition={category:'totals',recognizedBy:'gemini',totals:{matches:2,wins:2,draws:0,losses:0,goals:7,against:1}};
const t=buildTeam({fileRecords:files,role:'own'});
assert.deepEqual(t.autoTotals.totals,{matches:132,wins:59,draws:12,losses:61,goals:301,against:325});
assert.equal(t.autoTotals.category,'overallStats');assert.equal(t.teamProfile.totals.bestDivision,3);
assert.equal(t.teamProfile.season.gamesPlayed,2);assert.equal(t.teamProfile.totals.cleanSheets,null,'season clean sheet must not become historical');
assert.equal(t.technical.historical.passes.matches,132);
assert(t.technical.historical.passes.estimated,'derived attempts remain estimates');
assert(t.dataQuality.warnings.some(x=>/stagione/i.test(x)),'wrong legacy slot is diagnosed');
assert.equal(resolveStoredTotals(t,{source:'dati-totali-ai',totals:{matches:2},updatedAt:'2099-01-01'}).totals.matches,132,'stale derived cache cannot override raw lifetime source');
for(const name of ['stagione-corrente.json','stagione_corrente.json','season-current.json','search (1).json']){
 const d=detectDataFile(season,name);assert.equal(d.category,'season',name);assert(!d.mirrorCategories?.length,'no season mirror into historical');
}
assert.equal(detectDataFile(career,'overall-stats.json').category,'overallStats');
const once=normalizePlayersFile(playerRaw),twice=normalizePlayersFile(once),thrice=normalizePlayersFile(twice);
assert.deepEqual(twice,once,'normalization must be idempotent, including estimates and physical metadata');assert.deepEqual(thrice,once);
for(const prefix of ['shots','passAttempts','tackleAttempts'])assert.equal(twice[0][prefix+'Estimated'],true);
const noOverall=buildTeam({fileRecords:{totals:files.totals,season:files.season},role:'own'});assert.equal(noOverall.autoTotals,null,'do not pretend a season is all time without evidence');
const foreign=buildTeam({fileRecords:{...files,overallStats:rec([{...career[0],clubId:'999'}],'overall-stats.json')},role:'own'});assert.equal(foreign.autoTotals,null,'wrong club cannot supply lifetime totals');
console.log('PASS: observed 2/132 mismatch recovery, scope isolation, cache priority, source identity, no mirroring and repeated normalization preserving estimates.');
