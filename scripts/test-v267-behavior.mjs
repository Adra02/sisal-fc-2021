import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const js=await fs.readFile(new URL('../index-inline.js',import.meta.url),'utf8');
const api=await fs.readFile(new URL('../api/club-data.js',import.meta.url),'utf8');
const ai=await fs.readFile(new URL('../api/assistente.js',import.meta.url),'utf8');
assert.match(js,/data-edit-totals/);assert.match(js,/data-update-tracker/);assert.match(js,/Ultime 5/);assert.doesNotMatch(js,/U10|Ultime 10|askFormationAI/);assert.match(js,/data-save-and-import-tracker/);assert.match(js,/data-update-tracker/);assert.match(js,/data-remove-tracker/);assert.match(js,/Gemini sta leggendo/);assert.match(js,/Link salvato nel database centrale/);
assert.match(api,/importTracker/);assert.match(api,/saveTotals/);assert.match(api,/saveTrackerUrl/);assert.match(api,/removeTrackerUrl/);assert.match(api,/writeRoleTotals/);assert.match(api,/updateMemory/);assert.match(api,/importTracker/);
assert.match(ai,/manualTotals/);assert.match(ai,/historicalMemory/);assert.match(ai,/PER LE FORMAZIONI/);assert.doesNotMatch(ai,/recent10|ULTIME 10/);
console.log('test-v267-behavior: OK');
