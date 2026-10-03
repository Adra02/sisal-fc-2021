import assert from 'node:assert/strict';
import { buildSearchUrl, chooseBestClubCandidate, scoreClubCandidate } from '../api/scrape-stats.js';

assert.equal(
  buildSearchUrl('Sisal FC 2021'),
  'https://proclubstracker.com/search?q=Sisal%20FC%202021'
);

const candidates = [
  { text: 'Sisal FC 2021', href: 'https://proclubstracker.com/club/328794' },
  { text: 'Sisal FC', href: 'https://proclubstracker.com/club/111111' },
  { text: 'Compare Clubs', href: 'https://proclubstracker.com/compare' }
];
const best = chooseBestClubCandidate(candidates, 'Sisal FC 2021');
assert.ok(best);
assert.equal(best.href, 'https://proclubstracker.com/club/328794');
assert.ok(scoreClubCandidate(best, 'Sisal FC 2021') > 1000);
assert.equal(chooseBestClubCandidate([], 'Sisal FC 2021'), null);

console.log('✓ scrape-stats core: URL, ranking e 404 path superati');
