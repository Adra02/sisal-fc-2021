import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseProfileFields } from '../lib/file-ai-recognizer.js';
import { buildTeam } from '../lib/data-pipeline.js';

const response = `CATEGORY: totals
CONFIDENCE: 0.99
CLUB_ID: 328794
CLUB_NAME: Sisal FC 2021
MATCHES: 99
WINS: 42
DRAWS: 10
LOSSES: 47
GOALS: 214
AGAINST: 241
GAMES_PLAYED_PLAYOFF: 0
CLEAN_SHEETS: 15
POINTS: 53
PROMOTIONS: 4
RELEGATIONS: 2
BEST_DIVISION: 4
CURRENT_DIVISION: 4
REPUTATION_TIER: 0
PLATFORM: common-gen5`;
const parsed = parseProfileFields(response);
assert.equal(parsed.gamesPlayed, 99);
assert.equal(parsed.gamesPlayedPlayoff, 0);
assert.equal(parsed.cleanSheets, 15);
assert.equal(parsed.points, 53);
assert.equal(parsed.promotions, 4);
assert.equal(parsed.relegations, 2);
assert.equal(parsed.bestDivision, 4);
assert.equal(parsed.currentDivision, '4');
assert.equal(parsed.reputationtier, 0);
assert.equal(parsed.platform, 'common-gen5');

const rawWithoutReadableProfile = [{ anything: 'non strutturato' }];
const records = {
  totals: { raw: rawWithoutReadableProfile, parsed: rawWithoutReadableProfile, fileName: 'search.json', uploadedAt: '2026-10-05T00:00:00.000Z', aiRecognition: { profileFields: parsed } },
  season: { raw: rawWithoutReadableProfile, parsed: rawWithoutReadableProfile, fileName: 'search (1).json', uploadedAt: '2026-10-05T00:00:00.000Z', aiRecognition: { profileFields: parsed } }
};
const team = buildTeam({ fileRecords: records, role: 'own' });
assert.equal(team.teamProfile.totals.cleanSheets, 15);
assert.equal(team.teamProfile.totals.points, 53);
assert.equal(team.teamProfile.totals.bestDivision, 4);
assert.equal(team.teamProfile.season.gamesPlayed, 99);
assert.equal(team.teamProfile.season.currentDivision, '4');

const ui = await fs.readFile(new URL('../index-inline.js', import.meta.url), 'utf8');
const api = await fs.readFile(new URL('../api/club-data.js', import.meta.url), 'utf8');
assert.match(ui, /Campi aggiuntivi esclusivi del profilo storico/);
assert.match(api, /repairMissingClubProfiles/);
assert.match(api, /aiRecognition.*profileFields/);
assert.doesNotMatch(ui, /Pantheon|PANTHEON/);
console.log('test-v3213-profile-ai: OK');
