import assert from 'node:assert/strict';
import { normalizeTrackerUrl, validateTotals, normalizeTotals, extractJson, importTrackerTotals } from '../lib/tracker-import.js';

const userUrl='https://proclubstracker.com/club/328794?platform=common-gen5&div=4';
const normalized=normalizeTrackerUrl(userUrl);
assert.equal(normalized.clubId,'328794');
assert.equal(normalized.parsed.hostname,'proclubstracker.com');
assert.equal(normalized.parsed.protocol,'https:');
assert.equal(normalized.parsed.pathname,'/club/328794');
assert.equal(normalized.parsed.search,'?platform=common-gen5&div=4');

assert.deepEqual(validateTotals({matches:10,wins:4,draws:2,losses:4,goals:23,against:19}),{ok:true,totals:{matches:10,wins:4,draws:2,losses:4,goals:23,against:19}});
assert.equal(validateTotals({matches:10,wins:4,draws:2,losses:3,goals:23,against:19}).ok,false);
assert.deepEqual(normalizeTotals({gamesPlayed:'30',wins:'17',draws:'5',losses:'8',goalsScored:'64',goalsAgainst:'42'}),{matches:30,wins:17,draws:5,losses:8,goals:64,against:42});
assert.deepEqual(extractJson('```json\n{"ok":true,"totals":{"matches":30,"wins":17,"draws":5,"losses":8,"goals":64,"against":42}}\n```').totals,{matches:30,wins:17,draws:5,losses:8,goals:64,against:42});
assert.throws(()=>normalizeTrackerUrl('https://proclubtracker.com/club/328794'),/proclubstracker/);
assert.throws(()=>normalizeTrackerUrl('https://proclubstracker.com/player/123'),/link deve essere quello di un club/i);

const originalFetch=globalThis.fetch;
let capturedRequest=null;
globalThis.fetch=async(url,options)=>{
  capturedRequest={url,options};
  return new Response(JSON.stringify({
    candidates:[{
      content:{parts:[{text:JSON.stringify({
        ok:true,
        clubId:'328794',
        clubName:'Sisal FC 2021',
        totals:{matches:123,wins:60,draws:12,losses:51,goals:301,against:265},
        sourceSection:'Club Overview',
        evidence:'Overall record',
        warnings:[]
      })}]},
      url_context_metadata:{url_metadata:[{retrieved_url:userUrl,url_retrieval_status:'URL_RETRIEVAL_STATUS_SUCCESS'}]}
    }]
  }),{status:200,headers:{'content-type':'application/json'}});
};
process.env.GEMINI_API_KEY='test-key';
const imported=await importTrackerTotals(userUrl);
assert.deepEqual(imported.totals,{matches:123,wins:60,draws:12,losses:51,goals:301,against:265});
assert.equal(imported.source,'proclubtracker-ai');
const requestBody=JSON.parse(capturedRequest.options.body);
assert.deepEqual(requestBody.tools,[{url_context:{}}]);
assert.match(requestBody.contents?.[0]?.parts?.[0]?.text||'',/CLUB ID ATTESO: 328794/);
assert.match(requestBody.contents?.[0]?.parts?.[0]?.text||'',/Non usare le ultime 5 partite per sostituire il totale storico/);

globalThis.fetch=async()=>new Response(JSON.stringify({
  candidates:[{content:{parts:[{text:JSON.stringify({ok:true,clubId:'328794',totals:{matches:1,wins:1,draws:0,losses:0,goals:2,against:0}})}]}}]
}),{status:200,headers:{'content-type':'application/json'}});
await assert.rejects(()=>importTrackerTotals(userUrl),error=>error?.code==='TRACKER_URL_NOT_RETRIEVED');

globalThis.fetch=originalFetch;
console.log('tracker-import tests passed');
