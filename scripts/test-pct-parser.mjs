import assert from 'node:assert/strict';
import { parsePCTLinkSnapshots } from '../lib/pct-parser.js';

const base = {
  clubId:'328794', title:'Sisal FC 2021 | Pro Clubs Tracker', headings:['Sisal FC 2021','Club Overview'],
  bodyText:'Sisal FC 2021 Club Overview Wins 16 Draws 7 Losses 12 Games Played 35 Goals 67 Goals Against 64 Division 4 Skill Rating 1,234',
  keyValues:[{key:'Wins',value:'16'},{key:'Draws',value:'7'},{key:'Losses',value:'12'},{key:'Games Played',value:'35'},{key:'Goals',value:'67'},{key:'Goals Against',value:'64'},{key:'Division',value:'4'},{key:'Skill Rating',value:'1,234'}],
  tables:[], matchBlocks:[], sections:[], clubLinks:[]
};
const stats={...base,url:'https://proclubstracker.com/club/328794/stats'};
const players={...base,url:'https://proclubstracker.com/club/328794/players',tables:[{headers:['Player','Position','Games','Goals','Assists','Overall','Average Rating'],rows:[['AdraTheTrue02','CAM','94','97','33','83','7.50'],['Player2','ST','30','20','9','90','7.20']]}]};
const matches={...base,url:'https://proclubstracker.com/club/328794/matches',tables:[{headers:['Date','Home','Away','Score'],rows:[['02/10/2026','Sisal FC 2021','HABIBI HOODLUMS','3 - 0'],['01/10/2026','Other Club','Sisal FC 2021','2 - 5']]}]};
const fun={...base,url:'https://proclubstracker.com/club/328794/fun',headings:['Sisal FC 2021','Fun & Banter'],sections:[{heading:'Fun & Banter',lines:['Red Flag: Player2','Top Carry: AdraTheTrue02']} ]};
const out=parsePCTLinkSnapshots({stats,players,matches,fun},{role:'own'});
assert.equal(out.ok,true); assert.equal(out.source,'Pro Clubs Tracker'); assert.equal(out.club.wins,16); assert.equal(out.club.skillRating,1234);
assert.equal(out.players.length,2); assert.equal(out.players[0].name,'AdraTheTrue02'); assert.equal(out.matches.length,2); assert.equal(out.matches[0].opponent,'HABIBI HOODLUMS'); assert.equal(out.matches[0].result,'W');
assert.equal(out.fun.available,true); assert.match(out.fun.items[0].text,/Red Flag/i); assert.equal(out.club.id,'328794');

const slugSnapshot={...stats,url:'https://proclubstracker.com/club/sisal-fc-2021/stats',clubId:'',headings:['Sisal FC 2021','Club Overview']};
const slugPlayers={...players,url:'https://proclubstracker.com/club/sisal-fc-2021/players',clubId:'',headings:['Sisal FC 2021','Players']};
const slugMatches={...matches,url:'https://proclubstracker.com/club/sisal-fc-2021/matches',clubId:'',headings:['Sisal FC 2021','Matches']};
const slugFun={...fun,url:'https://proclubstracker.com/club/sisal-fc-2021/fun',clubId:'',headings:['Sisal FC 2021','Fun']};
const slugOut=parsePCTLinkSnapshots({stats:slugSnapshot,players:slugPlayers,matches:slugMatches,fun:slugFun},{role:'own'});
assert.equal(slugOut.ok,true); assert.match(slugOut.club.id,/^pct-/);
console.log('PCT link parser tests: OK');
