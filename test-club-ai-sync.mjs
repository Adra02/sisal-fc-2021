import assert from 'node:assert/strict';
import { POST } from '../api/club-ai-sync.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;
process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';

const clubUrl = 'https://proclubstracker.com/club/328794?platform=common-gen5&div=4';
const payload = {
  ok: true,
  club: {
    id: '328794', name: 'Sisal FC 2021', platform: 'common-gen5', division: 4,
    skillRating: 1234, gamesPlayed: 35, wins: 16, draws: 7, losses: 12,
    goals: 67, goalsAgainst: 64, goalDifference: 3, clubUrl
  },
  sections: {
    stats: { available: true, notes: [] },
    players: {
      available: true,
      notes: [],
      items: [{
        playerId: 'p1', name: 'AdraTheTrue02', position: 'CAM', ovr: 83,
        games: 94, goals: 97, assists: 33, rating: 7.5,
        passMade: 55, passAttempts: 66, passAccuracy: 83.3,
        tackleMade: 1, tackleAttempts: 3, tackleSuccess: 33.3,
        shots: 100, saves: 0, cleanSheets: 0, mom: 4, redcards: 0, minutes: 500
      }]
    },
    matches: {
      available: true,
      notes: [],
      items: [
        {id:'m1',timestamp:1790804666,homeTeam:'Sisal FC 2021',awayTeam:'HABIBI HOODLUMS',homeScore:3,awayScore:0,result:'W'},
        {id:'m2',timestamp:1790803928,homeTeam:'Sisal FC 2021',awayTeam:'Shark CF',homeScore:0,awayScore:1,result:'L'}
      ]
    },
    fun: {
      available: true,
      notes: [],
      items: [{title:'Top Scorer',player:'AdraTheTrue02',value:97,text:'97 goals'}]
    }
  },
  sourceUrls: [clubUrl],
  notes: []
};

let calls = 0;
globalThis.fetch = async (_url, options) => {
  calls++;
  assert.equal(_url, 'https://generativelanguage.googleapis.com/v1/interactions');
  const body = JSON.parse(options.body);
  assert.equal(body.model, 'gemini-3.5-flash-lite');
  assert.equal(typeof body.input, 'string');
  assert.match(body.input, /Stats/);
  assert.match(body.input, /Fun/);
  assert.match(body.input, /Players/);
  assert.match(body.input, /Matches/);
  assert.equal(body.tools.length, 2);
  assert.equal(body.tools[0].type, 'google_search');
  assert.equal(body.tools[1].type, 'url_context');
  return new Response(JSON.stringify({ output_text: JSON.stringify(payload), steps: [] }), {
    status: 200,
    headers: {'content-type': 'application/json'}
  });
};

const response = await POST(new Request('https://example.com/api/club-ai-sync', {
  method: 'POST',
  headers: {'content-type':'application/json'},
  body: JSON.stringify({name:'Sisal FC 2021', role:'own', platform:'common-gen5'})
}));
assert.equal(response.status, 200);
const data = await response.json();
assert.equal(data.ok, true);
assert.equal(data.geminiRequests, 1);
assert.equal(calls, 1, `Expected exactly 1 Gemini request, got ${calls}`);
assert.equal(data.club.id, '328794');
assert.equal(data.sections.players.items.length, 1);
assert.equal(data.sections.players.items[0].games, 94);
assert.equal(data.sections.matches.items.length, 2);
assert.equal(data.sections.fun.items.length, 1);

// A rate-limit error must not trigger an automatic fallback/retry.
calls = 0;
globalThis.fetch = async () => {
  calls++;
  return new Response(JSON.stringify({error:{message:'You exceeded your current quota. * Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 15, model: gemini-3.5-flash-lite\nPlease retry in 38s.',status:'RESOURCE_EXHAUSTED',details:[{'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaMetric:'generativelanguage.googleapis.com/generate_content_free_tier_requests',quotaId:'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',quotaValue:'15'}]},{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'38s'}]}}), {
    status: 429,
    headers: {'content-type':'application/json'}
  });
};
const response429 = await POST(new Request('https://example.com/api/club-ai-sync', {
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({name:'Sisal FC 2021'})
}));
assert.equal(response429.status, 429);
assert.equal(calls, 1, `429 path made ${calls} Gemini requests`);
const data429 = await response429.json();
assert.equal(data429.geminiRequests, 1);
assert.equal(data429.quota?.id, 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier');
assert.equal(data429.quota?.limit, '15');
assert.equal(data429.quota?.retryAfterSeconds, 38);
assert.match(data429.error, /rate limit temporaneo/i);
assert.equal(data429.detail.includes('retry in 38s'), true);

process.env.GEMINI_API_KEY = originalKey;
process.env.GEMINI_MODEL = originalModel;
globalThis.fetch = originalFetch;
console.log('club-ai-sync tests: OK — one Gemini request per successful sync; no automatic retry.');
