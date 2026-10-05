import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { detectDataFile, buildTeam } from '../lib/data-pipeline.js';

const matches=[0,1,2,3,4].map((i)=>({
  id:`m${i+1}`, timestamp:1000-i, competition:'league',
  clubs:[{id:'328794',name:'Sisal FC 2021',goals:i===0?3:i===1?2:i===2?1:0,against:i===4?1:0},{id:String(900+i),name:`Opp ${i+1}`,goals:i===4?1:0,against:i===0?3:i===1?2:i===2?1:0}],
  players:[
    {id:'a',name:'AdraTheTrue02',position:'forward',clubId:'328794',shots:[2,4,2,6,4][i],goals:[2,3,1,1,1][i],passesMade:[16,26,12,15,19][i],passAttempts:[18,27,18,18,24][i],tacklesMade:[0,1,1,2,0][i],tackleAttempts:[3,3,5,3,0][i],saves:0,cleanSheetsDef:0,cleanSheetsGK:0,mom:[1,0,0,1,0][i],redcards:0,secondsPlayed:5000,rating:7},
    {id:'b',name:'OnlyOne',position:'forward',clubId:'328794',shots:i===0?3:0,goals:i===0?1:0,passesMade:5,passAttempts:10,tacklesMade:1,tackleAttempts:2,saves:0,cleanSheetsDef:0,cleanSheetsGK:0,mom:0,redcards:0,secondsPlayed:5000,rating:6}
  ], aggregate:{}
}));
const records={league:{raw:matches,parsed:matches,fileName:'matches.json',uploadedAt:'2026-10-06T00:00:00.000Z'}};
const team=buildTeam({fileRecords:records,role:'own'});
const recent=new Map((team.recent5?.players||[]).map(p=>[p.name,p]));
const adra=recent.get('AdraTheTrue02');
assert.ok(adra,'AdraTheTrue02 must exist in recent5 when present in matches');
assert.equal(adra.appearances,5);
assert.equal(adra.shots,18);
assert.equal(adra.goals,8);
assert.equal(adra.passesMade,88);
assert.equal(adra.passAttempts,105);
assert.equal(adra.tacklesMade,4);
assert.equal(adra.tackleAttempts,14);
assert.equal(adra.passAccuracy,100*88/105);
assert.equal(adra.tackleSuccess,100*4/14);
assert.ok(team.recent5.matches.length===5);

const ui=await fs.readFile(new URL('../index-inline.js',import.meta.url),'utf8');
assert.match(ui,/Tecnica e difesa · ultime 5 partite/);
assert.match(ui,/p\.recent5/);
assert.match(ui,/Gol\/Tiri %/);
const techStart=ui.indexOf('const techRows=');
const techEnd=ui.indexOf('const profileRowsData=',techStart);
assert.ok(techStart>=0&&techEnd>techStart);
const techBlock=ui.slice(techStart,techEnd);
assert.doesNotMatch(techBlock,/shotPct:p\.shotAccuracy/);
assert.match(ui,/Quando un giocatore non compare nelle U5 viene mostrato “—”, non “0”/);

const pipeline=await fs.readFile(new URL('../lib/data-pipeline.js',import.meta.url),'utf8');
assert.match(pipeline,/cleanSheetsDef: 0/);
assert.match(pipeline,/existing\.cleanSheetsDef \+=/);
assert.match(pipeline,/existing\.cleanSheetsGK \+=/);

console.log('test-v3215-recent-tech: OK');
