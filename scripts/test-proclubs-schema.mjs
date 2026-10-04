import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { detectKnownProClubsFile } from '../lib/proclubs-schema.js';
import { detectDataFile, normalizeMatchesFile, normalizePlayersFile } from '../lib/data-pipeline.js';

const files = [
  ['info.json','clubInfo'],
  ['overallStats.json','overallStats'],
  ['stats.json','players'],
  ['stats (1).json','career'],
  ['search.json','totals'],
  ['search (1).json','season'],
  ['matches.json','league']
];
for (const [name, expected] of files) {
  const path = `/mnt/data/${name}`;
  try {
    const raw = JSON.parse(await fs.readFile(path,'utf8'));
    const exact = detectKnownProClubsFile(raw,name);
    assert.equal(exact?.confidence, 'exact', `${name} not exact`);
    assert.equal(exact.category, expected, `${name} => ${exact.category}`);
    const detected = detectDataFile(raw,name);
    assert.equal(detected.category, expected, `${name} pipeline => ${detected.category}`);
  } catch (error) {
    if (error?.code === 'ENOENT') continue;
    throw error;
  }
}

const matches = JSON.parse(await fs.readFile('/mnt/data/matches.json','utf8'));
assert.equal(normalizeMatchesFile(matches,'league').length, 10);
const players = JSON.parse(await fs.readFile('/mnt/data/stats.json','utf8'));
const career = JSON.parse(await fs.readFile('/mnt/data/stats (1).json','utf8'));
assert.equal(normalizePlayersFile(players,'').length, 10);
assert.equal(normalizePlayersFile(career,'').length, 10);
assert.equal(detectKnownProClubsFile(JSON.parse(await fs.readFile('/mnt/data/search.json','utf8')),'search.json').mirrorCategories.length,2);

console.log('test-proclubs-schema: OK');
