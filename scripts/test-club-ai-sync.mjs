import assert from 'node:assert/strict';
import { normalizePCTLinks, pctLinkKey } from '../lib/pct-links.js';
import { parsePCTLinkSnapshots } from '../lib/pct-parser.js';

const ownLinks={stats:'https://proclubstracker.com/club/328794/stats',fun:'https://proclubstracker.com/club/328794/fun',players:'https://proclubstracker.com/club/328794/players',matches:'https://proclubstracker.com/club/328794/matches'};
const oppLinks={stats:'https://www.proclubstracker.com/club/999999/stats',players:'https://www.proclubstracker.com/club/999999/players',matches:'https://www.proclubstracker.com/club/999999/matches',fun:''};
assert.deepEqual(normalizePCTLinks(ownLinks,'own'),ownLinks);
assert.equal(normalizePCTLinks(oppLinks,'opponent').fun,'');
assert.throws(()=>normalizePCTLinks({...ownLinks,fun:''},'own'),/Fun/);
assert.throws(()=>normalizePCTLinks({...ownLinks,stats:'https://example.com/x'},'own'),/proclubstracker\.com/);
assert.equal(normalizePCTLinks({...oppLinks,fun:'https://evil.example/fun'},'opponent').fun,'');
assert.throws(()=>normalizePCTLinks({...ownLinks,stats:'http://proclubstracker.com/x'},'own'),/HTTPS/);
assert.equal(pctLinkKey('own',ownLinks),pctLinkKey('own',{...ownLinks,stats:ownLinks.stats+'#fragment'}));

const snapshots={
  stats:{url:ownLinks.stats,title:'Sisal FC 2021 | Pro Clubs Tracker',clubId:'328794',headings:['Sisal FC 2021','Club Overview'],bodyText:'Wins 16 Draws 7 Losses 12 Games Played 35 Goals 67 Goals Against 64 Division 4 Skill Rating 1234',keyValues:[{key:'Wins',value:'16'}],tables:[],matchBlocks:[],sections:[],clubLinks:[]},
  fun:{url:ownLinks.fun,title:'Sisal FC 2021 Fun',clubId:'328794',headings:['Sisal FC 2021','Fun'],bodyText:'Red Flag: Player2',keyValues:[],tables:[],matchBlocks:[],sections:[{heading:'Fun',lines:['Red Flag: Player2']}],clubLinks:[]},
  players:{url:ownLinks.players,title:'Sisal FC 2021 Players',clubId:'328794',headings:['Sisal FC 2021','Players'],bodyText:'AdraTheTrue02 CAM 94 97 33 83 7.50',keyValues:[],tables:[{headers:['Player','Position','Games','Goals','Assists','Overall','Average Rating'],rows:[['AdraTheTrue02','CAM','94','97','33','83','7.50']]}],matchBlocks:[],sections:[],clubLinks:[]},
  matches:{url:ownLinks.matches,title:'Sisal FC 2021 Matches',clubId:'328794',headings:['Sisal FC 2021','Matches'],bodyText:'02/10/2026 Sisal FC 2021 HABIBI HOODLUMS 3 - 0',keyValues:[],tables:[{headers:['Date','Home','Away','Score'],rows:[['02/10/2026','Sisal FC 2021','HABIBI HOODLUMS','3 - 0']]}],matchBlocks:[],sections:[],clubLinks:[]}
};
const out=parsePCTLinkSnapshots(snapshots,{role:'own'});
assert.equal(out.ok,true); assert.equal(out.source,'Pro Clubs Tracker'); assert.equal(out.club.id,'328794'); assert.equal(out.club.wins,16); assert.equal(out.players[0].name,'AdraTheTrue02'); assert.equal(out.matches[0].opponent,'HABIBI HOODLUMS'); assert.equal(out.matches[0].result,'W'); assert.equal(out.fun.available,true);
console.log('PCT linked contract + parser tests: OK');
