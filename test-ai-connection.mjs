import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const s=await fs.readFile(new URL('../api/assistente.js',import.meta.url),'utf8');
assert.match(s,/GEMINI_API_KEY/);assert.match(s,/GEMINI_ENDPOINT/);assert.match(s,/searchGrounding:\s*false/);assert.match(s,/BLOB_NOT_CONFIGURED/);
console.log('test-ai-connection: OK');
