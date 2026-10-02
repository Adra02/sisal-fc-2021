import assert from 'node:assert/strict';
import { POST } from '../api/club-ai-sync.js';

const originalFetch = globalThis.fetch;
const originalEnv = process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = 'test-key';

function modelResponse(payload) {
  return new Response(JSON.stringify({ output_text: JSON.stringify(payload), steps: [] }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}

const baseClub = {
  id: '328794', name: 'Sisal FC 2021', platform: 'common-gen5', division: 4,
  skillRating: 1234, gamesPlayed: 35, wins: 16, draws: 7, losses: 12,
  goals: 67, goalsAgainst: 64, goalDifference: 3,
  clubUrl: 'https://proclubstracker.com/club/328794?platform=common-gen5&div=4'
};

let calls = [];
globalThis.fetch = async (_url, options) => {
  calls.push(JSON.parse(options.body));
  const input = JSON.parse(options.body).input;
  if (input.includes('SEI IL MOTORE LIVE PER UN DASHBOARD')) {
    return modelResponse({ ok:true, club:baseClub, sourceUrls:[baseClub.clubUrl], notes:[] });
  }
  if (input.includes('SEI IL MOTORE LIVE DELLA SEZIONE PLAYERS')) {
    return modelResponse({ ok:true, clubId:'328794', items:[{
      playerId:'p1', name:'AdraTheTrue02', position:'CAM', ovr:83, games:94, goals:97, assists:33, rating:7.5,
      passMade:55, passAttempts:66, passAccuracy:83.3, tackleMade:1, tackleAttempts:3, tackleSuccess:33.3,
      shots:100, saves:0, cleanSheets:0, mom:4, redcards:0, minutes:500
    }], sourceUrls:[baseClub.clubUrl], notes:[] });
  }
  if (input.includes('SEI IL MOTORE LIVE DELLA SEZIONE MATCHES')) {
    return modelResponse({ ok:true, clubId:'328794', items:[
      {id:'m1',timestamp:1790804666,homeTeam:'Sisal FC 2021',awayTeam:'HABIBI HOODLUMS',homeScore:3,awayScore:0,result:'W'},
      {id:'m2',timestamp:1790803928,homeTeam:'Sisal FC 2021',awayTeam:'Shark CF',homeScore:0,awayScore:1,result:'L'}
    ], sourceUrls:[baseClub.clubUrl], notes:[] });
  }
  if (input.includes('SEI IL MOTORE LIVE DELLA SEZIONE FUN')) {
    return modelResponse({ ok:true, clubId:'328794', items:[{title:'Top Scorer',player:'AdraTheTrue02',value:97,text:'97 goals'}], sourceUrls:[baseClub.clubUrl], notes:[] });
  }
  throw new Error('Unexpected prompt');
};

const request = new Request('https://example.com/api/club-ai-sync', {
  method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({name:'Sisal FC 2021',role:'own'})
});
const response = await POST(request);
assert.equal(response.status, 200);
const data = await response.json();
assert.equal(data.ok, true);
assert.equal(data.club.id, '328794');
assert.equal(data.players.length, 1);
assert.equal(data.players[0].name, 'AdraTheTrue02');
assert.equal(data.matches.length, 2);
assert.equal(data.fun.items.length, 1);
assert.equal(data.sections.players.available, true);
assert.ok(calls.length === 4, `Expected 4 model calls, got ${calls.length}`);

// Check that a high-demand model is skipped in favour of a working fallback.
calls = [];
globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body); calls.push(body);
  const input = body.input;
  if (body.model === 'gemini-3.8-flash' && input.includes('SEI IL MOTORE LIVE DELLA SEZIONE PLAYERS')) {
    return new Response(JSON.stringify({error:{message:'gemini-3.8-flash is currently experiencing high demand.', status:'UNAVAILABLE'}}), {status:503});
  }
  if (input.includes('SEI IL MOTORE LIVE PER UN DASHBOARD')) return modelResponse({ok:true,club:baseClub,sourceUrls:[baseClub.clubUrl],notes:[]});
  if (input.includes('SEI IL MOTORE LIVE DELLA SEZIONE PLAYERS')) return modelResponse({ok:true,clubId:'328794',items:[{playerId:'p1',name:'Player 1',position:'ST',ovr:80,games:10,goals:5,assists:2,rating:7.1,passMade:1,passAttempts:2,passAccuracy:50,tackleMade:null,tackleAttempts:null,tackleSuccess:20,shots:10,saves:0,cleanSheets:0,mom:0,redcards:0,minutes:100,}],sourceUrls:[baseClub.clubUrl],notes:[]});
  if (input.includes('SEZIONE MATCHES')) return modelResponse({ok:true,clubId:'328794',items:[],sourceUrls:[baseClub.clubUrl],notes:[]});
  if (input.includes('SEZIONE FUN')) return modelResponse({ok:true,clubId:'328794',items:[],sourceUrls:[baseClub.clubUrl],notes:[]});
};

const response2 = await POST(new Request('https://example.com/api/club-ai-sync', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Sisal FC 2021'})}));
assert.equal(response2.status, 200);
const data2 = await response2.json();
assert.equal(data2.ok, true);
assert.equal(data2.players[0].name, 'Player 1');
assert.ok(calls.some(c => c.model === 'gemini-3.7-flash'));

process.env.GEMINI_API_KEY = originalEnv;
globalThis.fetch = originalFetch;
console.log('club-ai-sync tests: OK');
