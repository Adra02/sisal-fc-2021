import assert from 'node:assert/strict';
import {
  collectSearchCandidates,
  chooseClub,
  extractMembers,
  normalizeMatches,
  normalizeOverall
} from '../lib/ea-client-core.js';

const searchFixture = {
  '328794': {
    details: { name: 'Sisal FC 2021', clubId: 328794 },
    clubId: 328794
  },
  '999999': {
    details: { name: 'Sisal FC', clubId: 999999 },
    clubId: 999999
  }
};
const candidates = collectSearchCandidates(searchFixture);
assert.equal(candidates.length, 2);
assert.equal(chooseClub(candidates, 'Sisal FC 2021')?.id, '328794');

const members = extractMembers({
  members: {
    '100': { playername: 'AdraTheTrue02', games: '12', goals: '8', assists: '5', rating: '7.21', passattempts: '40', passesmade: '34', tackleattempts: '10', tacklesmade: '7' },
    '101': { playername: 'TestPlayer', games: '5', goals: '1', assists: '2', rating: '6.80' }
  }
}, '328794');
assert.equal(members.length, 2);
assert.equal(members[0].name, 'AdraTheTrue02');
assert.equal(members[0].passesMade, 34);

const matches = normalizeMatches({
  matches: {
    '500': {
      matchId: '500',
      timestamp: 1790801562,
      clubs: {
        '328794': { details: { name: 'Sisal FC 2021', clubId: 328794 }, goals: '3', goalsAgainst: '0', result: '1' },
        '87515': { details: { name: 'Opponent', clubId: 87515 }, goals: '0', goalsAgainst: '3', result: '2' }
      }
    }
  }
}, '328794');
assert.equal(matches.length, 1);
assert.equal(matches[0].clubs.find(c=>c.id==='328794')?.name, 'Sisal FC 2021');
assert.equal(matches[0].clubs.find(c=>c.id==='328794')?.goals, 3);

const overall = normalizeOverall({ '328794': { gamesPlayed: '35', wins: '16', ties: '7', losses: '12', goals: '67', goalsAgainst: '64' } }, '328794');
assert.equal(overall.gamesPlayed, 35);
assert.equal(overall.wins, 16);
assert.equal(overall.draws, 7);

console.log('TEST EA CLIENT OK');
