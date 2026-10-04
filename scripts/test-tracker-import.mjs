import assert from 'node:assert/strict';
import { importTrackerTotals, validateTotals } from '../lib/tracker-import.js';
const valid={matches:100,wins:40,draws:20,losses:40,goals:180,against:170};
assert.equal(validateTotals(valid).ok,true);
assert.equal(validateTotals({...valid, losses:41}).ok,false);
const originalFetch=global.fetch;
try {
  global.fetch=async()=>new Response('<html><body><table><tr><th>Matches</th><td>100</td></tr><tr><th>Wins</th><td>40</td></tr><tr><th>Draws</th><td>20</td></tr><tr><th>Losses</th><td>40</td></tr><tr><th>Goals For</th><td>180</td></tr><tr><th>Goals Against</th><td>170</td></tr></table></body></html>',{status:200,headers:{'content-type':'text/html'}});
  const imported=await importTrackerTotals('https://proclubtracker.com/clubs/test');
  assert.deepEqual(imported.totals,valid);
  assert.equal(imported.derived.goalDifference,10);
  global.fetch=async()=>new Response('<html><script type="application/json">{"gamesPlayed":50,"wins":20,"draws":10,"losses":20,"goalsFor":90,"goalsAgainst":80}</script></html>',{status:200,headers:{'content-type':'text/html'}});
  const embedded=await importTrackerTotals('https://www.proclubtracker.com/clubs/test');
  assert.deepEqual(embedded.totals,{matches:50,wins:20,draws:10,losses:20,goals:90,against:80});
} finally { global.fetch=originalFetch; }
console.log('test-tracker-import: OK');
