import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { detectDataFile, normalizePlayersFile, normalizeMatchesFile, extractHistoricalTotals } from '../lib/data-pipeline.js';
import { parseTotals, summarizeShape, recognizeDataFile } from '../lib/file-ai-recognizer.js';

const stats=JSON.parse(await fs.readFile('/mnt/data/stats.json','utf8'));
const matches=JSON.parse(await fs.readFile('/mnt/data/matches.json','utf8'));
assert.equal(detectDataFile(stats,'stats.json').category,'players');
assert.equal(detectDataFile(matches,'matches.json').category,'league');
assert.equal(normalizePlayersFile(stats,'').length,10);
assert.equal(normalizeMatchesFile(matches,'league').length,5);

const totalsRaw={club:{id:'328794',name:'Sisal FC 2021'},record:{gamesPlayed:'99',wins:'40',ties:'9',losses:'50',goals:'214',goalsAgainst:'201'}};
const totals=extractHistoricalTotals(totalsRaw);
assert.deepEqual(totals.totals,{matches:99,wins:40,draws:9,losses:50,goals:214,against:201});
assert.equal(detectDataFile(totalsRaw,'Dati totali JSON').category,'totals');
assert.equal(detectDataFile({seasonId:'0',seasonName:'2026'},'Stagione corrente JSON').category,'season');
assert.equal(detectDataFile({clubId:'328794',clubName:'Sisal FC 2021'},'Info club JSON').category,'clubInfo');
assert.equal(detectDataFile({overall:{goals:214,against:201}},'Overall Stats JSON').category,'overallStats');
assert.equal(detectDataFile({career:{members:[]}},'Statistiche carriera JSON').category,'career');
assert.equal(detectDataFile({achievements:[]},'Playoff Achievements JSON').category,'playoffAchievements');
assert.equal(parseTotals('MATCHES: 99\nWINS: 40\nDRAWS: 9\nLOSSES: 50\nGOALS: 214\nAGAINST: 201').matches,99);
assert.ok(summarizeShape(stats).keys.includes('members'));

const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'CATEGORY: totals\nCONFIDENCE: 0.99\nCLUB_ID: 328794\nCLUB_NAME: Sisal FC 2021\nSUMMARY: record storico generale\nMATCHES: 99\nWINS: 40\nDRAWS: 9\nLOSSES: 50\nGOALS: 214\nAGAINST: 201'}]}}]}),{status:200,headers:{'content-type':'application/json'}});
const ai=await recognizeDataFile('test-key',{fileName:'Dati totali JSON',raw:totalsRaw});
assert.equal(ai.category,'totals');
assert.deepEqual(ai.totals,{matches:99,wins:40,draws:9,losses:50,goals:214,against:201});
globalThis.fetch=originalFetch;
console.log('test-file-recognition: OK');
