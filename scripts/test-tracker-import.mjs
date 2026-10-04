import assert from 'node:assert/strict';
import { normalizeTrackerUrl, validateTotals, importTrackerTotals } from '../lib/tracker-import.js';

const userUrl='https://proclubstracker.com/club/328794?platform=common-gen5&div=4';
const normalized=normalizeTrackerUrl(userUrl);
assert.equal(normalized.clubId,'328794');
assert.equal(new URL(normalized.parsed.href).hostname,'proclubstracker.com');

assert.deepEqual(validateTotals({matches:10,wins:4,draws:2,losses:4,goals:23,against:19}),{ok:true});
assert.equal(validateTotals({matches:10,wins:4,draws:2,losses:3,goals:23,against:19}).ok,false);

const fixture=`<!doctype html><html><body><section><h2>Club Overview</h2><div>Wins</div><div>17</div><div>Draws</div><div>5</div><div>Losses</div><div>8</div><div>Games Played</div><div>30</div><div>Goals Scored</div><div>64</div><div>Goals Conceded</div><div>42</div></section></body></html>`;
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(fixture,{status:200,headers:{'content-type':'text/html'}});
const imported=await importTrackerTotals(userUrl);
assert.deepEqual(imported.totals,{wins:17,draws:5,losses:8,matches:30,goals:64,against:42});
globalThis.fetch=originalFetch;
console.log('tracker-import tests passed');
