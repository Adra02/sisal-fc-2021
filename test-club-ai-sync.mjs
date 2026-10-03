import assert from 'node:assert/strict';
import { POST } from '../api/club-ai-sync.js';

const originalFetch = globalThis.fetch;
let calls = [];
const searchPayload = [
  { clubId: 328794, clubName: 'Sisal FC 2021', division: 4, skillRating: 1234, wins: 16, draws: 7, losses: 12, goalsFor: 67, goalsAgainst: 64 }
];
const infoPayload = { '328794': { clubId: 328794, name: 'Sisal FC 2021' } };
const overallPayload = { '328794': { clubId: 328794, gamesPlayed: 35, wins: 16, ties: 7, losses: 12, goals: 67, goalsAgainst: 64, skillRating: 1234, division: 4 } };
const membersPayload = {
  p1: { playerId:'p1', playername:'AdraTheTrue02', position:'CAM', overall:83, games:94, goals:97, assists:33, averageRating:7.5, passesMade:55, passAttempts:66, tacklesMade:1, tackleAttempts:3 }
};
const matchPayload = [
  { matchId:'m1', timestamp:1790804666, homeTeam:{clubId:328794,name:'Sisal FC 2021'}, awayTeam:{clubId:999,name:'HABIBI HOODLUMS'}, homeScore:3, awayScore:0 },
  { matchId:'m2', date:'2026-10-03T15:00:00Z', clubs:[{clubId:777,name:'Shark CF',score:2},{clubId:328794,name:'Sisal FC 2021',score:1}] }
];

globalThis.fetch = async (url) => {
  calls.push(url);
  if (url.includes('/currentSeasonLeaderboard/search')) return new Response(JSON.stringify(searchPayload), {status:200,headers:{'content-type':'application/json'}});
  if (url.includes('/clubs/info')) return new Response(JSON.stringify(infoPayload), {status:200,headers:{'content-type':'application/json'}});
  if (url.includes('/clubs/overallStats')) return new Response(JSON.stringify(overallPayload), {status:200,headers:{'content-type':'application/json'}});
  if (url.includes('/members/stats')) return new Response(JSON.stringify(membersPayload), {status:200,headers:{'content-type':'application/json'}});
  if (url.includes('/clubs/matches')) return new Response(JSON.stringify(matchPayload), {status:200,headers:{'content-type':'application/json'}});
  throw new Error(`Unexpected URL ${url}`);
};

const response = await POST(new Request('https://example.com/api/club-ai-sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Sisal FC 2021',platform:'common-gen5'})}));
assert.equal(response.status,200);
const data=await response.json();
assert.equal(data.ok,true); assert.equal(data.club.id,'328794'); assert.equal(data.club.name,'Sisal FC 2021');
assert.equal(data.players.length,1); assert.equal(data.players[0].name,'AdraTheTrue02'); assert.equal(data.players[0].games,94);
assert.equal(data.matches.length,2); assert.equal(data.matches[0].result,'L'); assert.equal(data.matches[1].result,'W'); assert.ok(data.matches[0].timestamp>0); assert.ok(data.matches[1].timestamp>0);
assert.equal(data.geminiRequests,0); assert.equal(data.searchGrounding,false); assert.match(data.source,/EA Public Clubs API/);
assert.ok(calls.length >= 5, `Expected EA endpoints to be queried, got ${calls.length}`);

// 429 from EA is surfaced as EA-side error and does not call Gemini.
globalThis.fetch = async () => new Response(JSON.stringify({error:'rate limited'}),{status:429,headers:{'content-type':'application/json'}});
const response429 = await POST(new Request('https://example.com/api/club-ai-sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Sisal FC 2021',platform:'common-gen5'})}));
assert.equal(response429.status,429);
const data429=await response429.json(); assert.equal(data429.code,'EA_RATE_LIMIT'); assert.equal(data429.geminiRequests,0);

globalThis.fetch = originalFetch;
console.log('club-ai-sync tests: OK — direct EA lookup; no Gemini Search dependency.');
