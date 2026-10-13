import assert from 'node:assert/strict';
import { normalizeTrackerUrl, validateTotals, normalizeTotals, extractJson, extractLabeledTotals, importTrackerTotals, fetchTrackerPage } from '../lib/tracker-import.js';

const userUrl='https://proclubstracker.com/club/328794?platform=common-gen5&div=4';
const normalized=normalizeTrackerUrl(userUrl);
assert.equal(normalized.clubId,'328794');
assert.equal(normalized.parsed.hostname,'proclubstracker.com');
assert.equal(normalized.parsed.protocol,'https:');
assert.equal(normalized.parsed.pathname,'/club/328794');
assert.equal(normalized.parsed.search,'?platform=common-gen5&div=4');

assert.deepEqual(validateTotals({matches:10,wins:4,draws:2,losses:4,goals:23,against:19}),{ok:true,totals:{matches:10,wins:4,draws:2,losses:4,goals:23,against:19}});
assert.equal(validateTotals({matches:10,wins:4,draws:2,losses:3,goals:23,against:19}).ok,false);

const labeled = extractLabeledTotals(`MATCHES: 123\nWINS: 60\nDRAWS: 12\nLOSSES: 51\nGOALS: 301\nAGAINST: 265`);
assert.deepEqual(labeled,{matches:123,wins:60,draws:12,losses:51,goals:301,against:265});
const bulletLabeled = extractLabeledTotals('- MATCHES: 123, WINS: 60; DRAWS: 12 | LOSSES: 51\nGOALS: 301\nAGAINST: 265');
assert.deepEqual(bulletLabeled,{matches:123,wins:60,draws:12,losses:51,goals:301,against:265});
const prose = extractLabeledTotals('The club has 123 matches, 60 wins, 12 draws and 51 losses. Goals for: 301. Goals against: 265.');
assert.deepEqual(prose,{matches:123,wins:60,draws:12,losses:51,goals:301,against:265});
const markdownTable = extractLabeledTotals('| Matches | 123 | Wins | 60 | Draws | 12 | Losses | 51 | Goals For | 301 | Goals Against | 265 |');
assert.deepEqual(markdownTable,{matches:123,wins:60,draws:12,losses:51,goals:301,against:265});

assert.deepEqual(normalizeTotals({gamesPlayed:'30',wins:'17',draws:'5',losses:'8',goalsScored:'64',goalsAgainst:'42'}),{matches:30,wins:17,draws:5,losses:8,goals:64,against:42});
assert.deepEqual(extractJson('```json\n{"ok":true,"totals":{"matches":30,"wins":17,"draws":5,"losses":8,"goals":64,"against":42}}\n```').totals,{matches:30,wins:17,draws:5,losses:8,goals:64,against:42});
assert.throws(()=>normalizeTrackerUrl('https://proclubtracker.com/club/328794'),/proclubstracker/);
assert.throws(()=>normalizeTrackerUrl('https://proclubstracker.com/player/123'),/link deve essere quello di un club/i);

const originalFetch=globalThis.fetch;
let calls=[];
const trackerHtml=`<!doctype html><html><head><title>Sisal FC 2021</title></head><body><main data-club-id="328794"><h1>Sisal FC 2021</h1><section aria-label="Club Overview"><span>Played</span><b>123</b><span>Wins</span><b>60</b><span>Draws</span><b>12</b><span>Losses</span><b>51</b><span>Goals For</span><b>301</b><span>Goals Against</span><b>265</b></section></main></body></html>`;

globalThis.fetch=async(url,options={})=>{
  calls.push({url,options});
  if(String(url)===userUrl){
    return new Response(trackerHtml,{status:200,headers:{'content-type':'text/html'}});
  }
  return new Response(JSON.stringify({
    candidates:[{
      content:{parts:[{text:JSON.stringify({ok:true,clubId:'328794',clubName:'Sisal FC 2021',totals:{matches:123,wins:60,draws:12,losses:51,goals:301,against:265},sourceSection:'Club Overview',evidence:'Overall record',warnings:[]})}]},
      url_context_metadata:{url_metadata:[{retrieved_url:userUrl,url_retrieval_status:'URL_RETRIEVAL_STATUS_SUCCESS'}]}
    }]
  }),{status:200,headers:{'content-type':'application/json'}});
};
process.env.GEMINI_API_KEY='test-key';
const imported=await importTrackerTotals(userUrl);
assert.deepEqual(imported.totals,{matches:123,wins:60,draws:12,losses:51,goals:301,against:265});
assert.equal(imported.source,'proclubtracker-ai');
assert.equal(imported.ai.proof,'url-context');
assert.ok(calls.some(x=>String(x.url)===userUrl));
const geminiCall=calls.find(x=>String(x.url).includes('generativelanguage.googleapis.com'));
const requestBody=JSON.parse(geminiCall.options.body);
assert.deepEqual(requestBody.tools,[{url_context:{}}]);
assert.equal(requestBody.generationConfig?.responseMimeType,undefined);
assert.match(requestBody.contents?.[0]?.parts?.[0]?.text||'',/CLUB ID ATTESO: 328794/);
assert.match(requestBody.contents?.[0]?.parts?.[0]?.text||'',/FALLBACK: CONTENUTO DELLA STESSA PAGINA/);
assert.match(requestBody.contents?.[0]?.parts?.[0]?.text||'',/Sisal FC 2021/);

// Plain-text Gemini output must also work; JSON is not required anymore.
calls=[];
globalThis.fetch=async(url,options={})=>{
  calls.push({url,options});
  if(String(url)===userUrl) return new Response(trackerHtml,{status:200,headers:{'content-type':'text/html'}});
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'MATCHES: 123\nWINS: 60\nDRAWS: 12\nLOSSES: 51\nGOALS: 301\nAGAINST: 265\nCLUB_ID: 328794'}]},url_context_metadata:{url_metadata:[{retrieved_url:userUrl,url_retrieval_status:'URL_RETRIEVAL_STATUS_SUCCESS'}]}}]}),{status:200,headers:{'content-type':'application/json'}});
};
const importedPlain=await importTrackerTotals(userUrl);
assert.deepEqual(importedPlain.totals,{matches:123,wins:60,draws:12,losses:51,goals:301,against:265});
assert.equal(importedPlain.ai.parseMethod,'labeled-text');

// URL Context failure must no longer fail when the exact public page was fetched and sent to Gemini.
calls=[];
globalThis.fetch=async(url,options={})=>{
  calls.push({url,options});
  if(String(url)===userUrl){
    return new Response(trackerHtml,{status:200,headers:{'content-type':'text/html'}});
  }
  return new Response(JSON.stringify({
    candidates:[{
      content:{parts:[{text:JSON.stringify({ok:true,clubId:'328794',clubName:'Sisal FC 2021',totals:{matches:123,wins:60,draws:12,losses:51,goals:301,against:265},sourceSection:'Club Overview',evidence:'Letto dal contenuto HTML fornito al modello',warnings:['URL Context non ha recuperato la pagina; è stato usato il fallback server.']})}]},
      url_context_metadata:{url_metadata:[{retrieved_url:userUrl,url_retrieval_status:'URL_RETRIEVAL_STATUS_ERROR'}]}
    }]
  }),{status:200,headers:{'content-type':'application/json'}});
};
const importedFallback=await importTrackerTotals(userUrl);
assert.equal(importedFallback.ai.proof,'server-fetch-to-gemini');
assert.equal(importedFallback.totals.matches,123);

// If both URL Context and the server fetch fail, import must fail closed.
globalThis.fetch=async(url)=>{
  if(String(url)===userUrl)throw new Error('network blocked');
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({ok:true,clubId:'328794',totals:{matches:1,wins:1,draws:0,losses:0,goals:2,against:0}})}]},url_context_metadata:{url_metadata:[{retrieved_url:userUrl,url_retrieval_status:'URL_RETRIEVAL_STATUS_ERROR'}]}}]}),{status:200,headers:{'content-type':'application/json'}});
};
await assert.rejects(()=>importTrackerTotals(userUrl),error=>error?.code==='TRACKER_URL_NOT_RETRIEVED');

globalThis.fetch=originalFetch;
console.log('tracker-import tests passed');
