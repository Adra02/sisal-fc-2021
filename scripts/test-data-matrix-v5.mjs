import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {buildTeam,normalizeMatchesFile,normalizePlayersFile,resolveStoredTotals} from '../lib/data-pipeline.js';

// Synthetic independent arithmetic oracle: lifetime, season and archive differ deliberately.
const clubId='328794',rec=(raw,fileName)=>({raw,parsed:raw,fileName,uploadedAt:'2026-10-24T00:00:00Z'});
const scores=[[3,1],[0,2],[1,1],[5,0],[0,1],[2,0],[4,2]];
const matches=scores.map(([gf,ga],i)=>({matchId:String(100+i),timestamp:1770000000-i*86400,
 clubs:{[clubId]:{clubId,details:{name:'Sisal FC 2021'},goals:gf,goalsAgainst:ga},['opp'+i]:{clubId:'opp'+i,details:{name:'Avversario '+i},goals:ga,goalsAgainst:gf}},
 players:{[clubId]:{a:{playername:'Alpha',goals:gf,assists:i%2,rating:7+i/10,passesmade:15+i,passattempts:25+i,tacklesmade:1,tackleattempts:4,shots:gf+4,secondsPlayed:5400},b:{playername:'Beta',goals:0,assists:1,rating:6,passesmade:10,passattempts:20,tacklesmade:2,tackleattempts:5,shots:2,secondsPlayed:5400}},['opp'+i]:{z:{playername:'Not our player',goals:ga,secondsPlayed:5400}}},
 aggregate:{[clubId]:{goals:gf,shots:gf+9,passesmade:30+i,passattempts:50+i,tacklesmade:5,tackleattempts:12}},
}));
const lifetime=[{clubId,gamesPlayed:132,wins:59,ties:12,losses:61,goals:301,goalsAgainst:325}];
const season=[{clubId,clubName:'Sisal FC 2021',gamesPlayed:2,wins:2,ties:0,losses:0,goals:7,goalsAgainst:1}];
const roster={members:[{name:'Alpha',gamesPlayed:132,goals:122,assists:50,passesMade:100,passSuccessRate:50,tacklesMade:12,tackleSuccessRate:25,shotSuccessRate:40},{name:'Beta',gamesPlayed:80,goals:40,assists:20,passesMade:100,tacklesMade:5}]};
const files={clubInfo:rec({clubId,name:'Sisal FC 2021'},'club-info.json'),totals:rec(season,'stagione-corrente.json'),season:rec(season,'stagione-corrente.json'),overallStats:rec(lifetime,'overall-stats.json'),players:rec(roster,'giocatori.json'),league:rec(matches,'campionato.json'),friendlies:rec([matches[0]],'amichevoli.json'),playoffAchievements:rec([{seasonId:'FC27-S1',bestDivision:3,bestFinishGroup:2}],'achievements.json')};
const rawTeam=buildTeam({fileRecords:files,role:'own'}),t={...rawTeam,manualTotals:resolveStoredTotals(rawTeam,null)};
assert.equal(t.matches.length,7,'copy of a stable EA match in another export must not double count');
assert.deepEqual([t.overall.matches,t.overall.wins,t.overall.draws,t.overall.losses,t.overall.goals,t.overall.against],[7,4,1,2,15,7]);
assert.deepEqual([t.recent5.team.matches,t.recent5.team.wins,t.recent5.team.draws,t.recent5.team.losses,t.recent5.team.goals,t.recent5.team.against],[5,2,1,2,9,5]);
assert.deepEqual(t.recent5.matches.map(m=>m.id),['100','101','102','103','104']);
assert.equal(t.byCompetition.league.matches,7);assert.equal(t.byCompetition.friendlies.matches,0);
assert.equal(t.matchTrend.at(-1).cumulativeGF,15);assert.equal(t.matchTrend.at(-1).cumulativeGA,7);
assert.equal(t.autoTotals.totals.matches,132);assert.equal(t.teamProfile.season.gamesPlayed,2);
assert.equal(t.players.find(p=>p.name==='Alpha').goals,122,'player file stays cumulative');
assert.equal(t.players.find(p=>p.name==='Alpha').recent5.goals,9);
assert(!t.players.some(p=>p.name==='Not our player'),'opponent player excluded');
assert.equal(t.recent5.team.shots,54,'EA team aggregate wins over player sums');
assert.equal(t.recent5.team.passRate,100*160/260,'weighted aggregate pass percentage');
assert.equal(t.technical.historical.passes.made,200);
assert.equal(t.technical.historical.passes.successRate,50,'rate only uses the known 100/200 subset, not all 200 made');
assert.equal(t.technical.historical.passes.coverage,50);

const norm=normalizeMatchesFile(matches,'league');
assert.deepEqual(normalizeMatchesFile(norm,'league'),norm,'normalizing stored matches twice preserves missing fields and scores');
const partial=structuredClone(matches[0]);delete partial.aggregate[clubId].shots;delete partial.aggregate[clubId].passattempts;delete partial.players[clubId].b.passattempts;delete partial.players[clubId].b.shots;
const once=normalizeMatchesFile([partial],'league'),twice=normalizeMatchesFile(once,'league');
assert.deepEqual(twice,once,'unknown aggregate fields must not become known zeroes');
assert.equal(twice[0].aggregate[clubId].shotsKnown,false);assert.equal(twice[0].aggregate[clubId].passStatsKnown,false);
const partialTeam=buildTeam({fileRecords:{...files,league:rec(twice,'league.json'),friendlies:null},role:'own'});
assert.equal(partialTeam.recent5.team.shots,null);assert.equal(partialTeam.recent5.team.passRate,null,'partial numerator/denominator does not masquerade as a team rate');
const dated=structuredClone(matches.slice(0,3));dated[0].timestamp='2026-10-23T00:00:00Z';dated[1].timestamp=Date.parse('2026-10-24T00:00:00Z');dated[2].timestamp=Date.parse('2026-10-22T00:00:00Z')/1000;
assert.deepEqual(buildTeam({fileRecords:{...files,league:rec(dated,'league.json'),friendlies:null},role:'own'}).matches.map(m=>m.id),['101','100','102'],'ISO, millisecond and second dates order chronologically');
const onlySeason=buildTeam({fileRecords:{season:files.season},role:'own'});assert.equal(onlySeason.players.length,0,'club summary is not a player');
const multi=buildTeam({fileRecords:{...files,overallStats:rec([{...lifetime[0],clubId:'999',gamesPlayed:8,wins:8,ties:0,losses:0},...lifetime],'overall-stats.json')},role:'own'});assert.equal(multi.autoTotals.totals.matches,132,'choose the right club from a multi-club array');
assert.deepEqual(normalizePlayersFile(normalizePlayersFile(roster)),normalizePlayersFile(roster));

// Execute actual page builders, with a simulated DOM and no network/GPU.
const dom=new JSDOM('<div id="content"></div><div id="modalRoot"></div>',{url:'https://test.invalid',pretendToBeVisual:true,runScripts:'outside-only'});
const w=dom.window;w.sisalAccountReady=Promise.resolve();w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};
w.SisalAccount={user:{display_name:'Alpha',player_key:'alpha',is_admin:true},isEligible:()=>true};
w.SisalEditorial={edition:{model:{schemaVersion:2,id:'edition-fixture',title:'Titolo di prova',stories:[{own:'Sisal FC 2021',opponent:'Avversario 0',goals:3,against:1,title:'Partita',text:'Testo della partita.'}]}}};
const source=await fs.readFile('index-inline.js','utf8');
await w.eval(source.replace('\nboot();','\nwindow.__dataTest={set(t){state.own=t;state.opponent=t;},teamPage,playersPage,topPage,matchesPage,funPage,opponentPage,dataPage,technicalAnalyticsCard,matchMetricRow};'));
const ui=w.__dataTest;ui.set(t);
const pages=Object.fromEntries(['teamPage','playersPage','topPage','matchesPage','funPage','opponentPage','dataPage'].map(k=>[k,ui[k]()]));
for(const [page,html]of Object.entries(pages)){assert(html.length>150,page+' renders');assert(!html.includes('[object Object]'),page+' has no object rendering error');assert(!/\b(?:NaN|Infinity|undefined)\b/.test(html),page+' has finite values');}
assert.match(pages.teamPage,/GAZZETTA/);assert(!pages.funPage.includes('GAZZETTA'));assert(!pages.funPage.includes('askFunAI'));
assert.match(pages.dataPage,/id="auditAI"/);assert.match(pages.teamPage,/Overall Stats · storico cumulativo verificato/);
assert(!ui.technicalAnalyticsCard(t,'Cumulativo','overall').includes('/ partita'),'unverified team lifetime averages are omitted');
const row=ui.matchMetricRow(partialTeam,partialTeam.matches[0]);assert.equal(row.pass,'—');assert.equal(row.shots,'—');
dom.window.close();
console.log('PASS numerical matrix + 7 actual page builders: historical/season/archive/U5 isolation; stable match dedupe; dates; goals/results/trend/player scopes; weighted and missing metrics; Gazzetta only Squadra; automatic Fun; audit control. DOM simulated, no GPU.');
