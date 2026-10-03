import assert from 'node:assert/strict';
import { POST } from '../api/assistente.js';
const originalFetch = globalThis.fetch;
const originalKey = process.env.GROQ_API_KEY;
const originalModel = process.env.GROQ_MODEL;
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.GROQ_MODEL = 'openai/gpt-oss-20b';
let calls = 0;
globalThis.fetch = async (url, options) => {
  calls++;
  assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
  const body = JSON.parse(options.body);
  assert.equal(body.model, 'openai/gpt-oss-20b');
  assert.equal(body.stream, false);
  assert.equal(body.max_tokens, 800);
  assert.equal(options.headers.authorization, 'Bearer test-groq-key');
  return new Response(JSON.stringify({choices:[{message:{content:'Usa il CDM come schermo davanti alla difesa.'}}]}), {status:200,headers:{'content-type':'application/json'}});
};
const response = await POST(new Request('https://example.com/api/assistente',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Come difendere meglio?',team:{dataStatus:{available:true,players:0,matches:0},team:{name:'Sisal FC 2021'},summary:{recent5:{},cumulative:{}},players:[]}})}));
assert.equal(response.status,200);
let data=await response.json();
assert.equal(data.source,'groq'); assert.equal(data.groqRequest,1); assert.equal(calls,1); assert.match(data.answer,/CDM/);

// Missing data must be rejected before Groq is called.
calls = 0;
const noData = await POST(new Request('https://example.com/api/assistente',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Che problemi ha il club?',team:{dataStatus:{available:false,players:0,matches:0},team:{name:'Sisal FC 2021'},summary:{recent5:{},cumulative:{}},players:[]}})}));
assert.equal(noData.status,422); const noDataBody=await noData.json(); assert.equal(noDataBody.code,'TEAM_DATA_UNAVAILABLE'); assert.equal(calls,0);
calls=0;
globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({error:{message:'rate limit'}}),{status:429,headers:{'content-type':'application/json'}})};
const response429=await POST(new Request('https://example.com/api/assistente',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Test',team:{dataStatus:{available:true,players:0,matches:0},team:{name:'Sisal FC 2021'},summary:{recent5:{},cumulative:{}},players:[]}})}));
assert.equal(response429.status,200); data=await response429.json(); assert.equal(data.source,'local-fallback'); assert.equal(calls,1);
process.env.GROQ_API_KEY=originalKey; process.env.GROQ_MODEL=originalModel; globalThis.fetch=originalFetch;
console.log('assistente tests: OK — Groq primary, one request, no Gemini fallback/retry.');
