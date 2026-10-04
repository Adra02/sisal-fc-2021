import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = await fs.readFile(new URL('../api/assistente.js', import.meta.url), 'utf8');
const runnable = source
  .replace(/^import .*;\n/gm, '')
  .replace('export const maxDuration = 60;', 'const maxDuration = 60;')
  .replace('export async function POST', 'async function POST')
  + '\nglobalThis.__formationTest = { validateFormationRecommendation };\n';
const ctx = { console, Number, String, Boolean, Object, Array, Map, Set, Math, JSON, Error, Promise, Date }; 
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(runnable, ctx, { filename: 'api/assistente.js' });
const { validateFormationRecommendation } = ctx.__formationTest;

const formation = { name:'4-1-2-1-2 Narrow', roles:['GK','LB','CB','CB','RB','CDM','CM','CM','CAM','ST','ST'] };
const makePlayer = (id, position, rating=8) => ({ id, name:id, position, games:10, goals:2, assists:2, rating, recent5:{ appearances:3, goals:1, assists:1, rating:8 } });
const players7 = [
  makePlayer('p1','GK'), makePlayer('p2','CB'), makePlayer('p3','CB'), makePlayer('p4','LB'),
  makePlayer('p5','RB'), makePlayer('p6','CM'), makePlayer('p7','ST')
];
const prefsWithDuplicates = [
  { slot:0, playerId:'p1', role:'GK' },
  { slot:2, playerId:'p2', role:'CB' },
  { slot:3, playerId:'p2', role:'CB' },
  { slot:10, playerId:'p7', role:'ST' }
];
const result7 = validateFormationRecommendation({ formation:formation.name, placements:prefsWithDuplicates, rationale:'test', strengths:[], cautions:[] }, players7, [formation]);
assert.equal(result7.placements.length,7,'Con 7 giocatori devono essere assegnati 7 giocatori, non bloccati');
assert.equal(new Set(result7.placements.map(x=>x.playerId)).size,7,'Nessun giocatore deve essere duplicato');
assert.equal(new Set(result7.placements.map(x=>x.slot)).size,7,'Ogni giocatore deve occupare uno slot unico');
assert.ok(result7.adjustments.some(x=>x.includes('7/11')),'Deve essere dichiarato che il dataset ha meno di 11 giocatori');

const players12 = Array.from({length:12}, (_,i) => makePlayer(`p${i+1}`, i===0?'GK':i<5?'CB':i<7?'CM':i<9?'CAM':'ST', 7 + (i%3)*0.3));
const result12 = validateFormationRecommendation({ formation:formation.name, placements:[], rationale:'test', strengths:[], cautions:[] }, players12, [formation]);
assert.equal(result12.placements.length,11,'Con almeno 11 giocatori la formazione deve avere 11 titolari');
assert.equal(new Set(result12.placements.map(x=>x.playerId)).size,11,'Con almeno 11 giocatori non devono esserci duplicati');
assert.equal(new Set(result12.placements.map(x=>x.slot)).size,11,'Gli 11 slot devono essere unici');
console.log('test-formation: OK');
