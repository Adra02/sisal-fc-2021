import assert from 'node:assert/strict';
import { POST } from '../api/assistente.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = 'test-gemini-key';
let calls = 0;

globalThis.fetch = async (url, options) => {
  calls++;
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
  assert.equal(options.headers['x-goog-api-key'], 'test-gemini-key');
  const body = JSON.parse(options.body);
  assert.equal(body.contents[0].role, 'user');
  assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'low');
  assert.equal(body.generationConfig.maxOutputTokens, 1600);
  assert.equal('temperature' in body.generationConfig, false);
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'Usa il CDM come schermo davanti alla difesa.'}]}}]}), {status:200,headers:{'content-type':'application/json'}});
};

const response = await POST(new Request('https://example.com/api/assistente',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Come difendere meglio?',team:{dataStatus:{available:true,players:1,matches:5},team:{name:'Sisal FC 2021'},summary:{recent5:{},cumulative:{}},players:[{name:'AdraTheTrue02',games:10,goals:5}]}})}));
assert.equal(response.status,200);
let data=await response.json();
assert.equal(data.ok,true); assert.equal(data.source,'gemini'); assert.equal(data.model,'gemini-3.5-flash-lite'); assert.equal(data.geminiRequests,1); assert.equal(calls,1); assert.match(data.answer,/CDM/);

calls = 0;
const noData = await POST(new Request('https://example.com/api/assistente',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Che problemi ha il club?',team:{dataStatus:{available:false,players:0,matches:0},team:{name:'Sisal FC 2021'},summary:{recent5:{},cumulative:{}},players:[]}})}));
assert.equal(noData.status,200, 'The assistant itself can answer a non-numeric question without live data, but should remain explicit about unavailable data.');
assert.equal(calls,1);

calls=0;
globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({error:{message:'You exceeded your current quota'}}),{status:429,headers:{'content-type':'application/json'}})};
const response429=await POST(new Request('https://example.com/api/assistente',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Test',team:{dataStatus:{available:true,players:1,matches:5},team:{name:'Sisal FC 2021'},summary:{recent5:{},cumulative:{}},players:[{name:'x'}]}})}));
assert.equal(response429.status,429); data=await response429.json(); assert.equal(data.code,'GEMINI_QUOTA'); assert.equal(calls,1);

process.env.GEMINI_API_KEY=originalKey;
globalThis.fetch=originalFetch;
console.log('assistente tests: OK — Gemini 3.5 Flash-Lite, no Search grounding, one request.');
