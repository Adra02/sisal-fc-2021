const KEYWORDS = {
  name: /^(?:player|player name|name|username|gamertag|persona)$/i,
  position: /^(?:pos|position|role)$/i,
  ovr: /^(?:ovr|overall|overall rating)$/i,
  games: /^(?:games|games played|played|appearances|apps|matches|matches played)$/i,
  goals: /^(?:goals|g)$/i,
  assists: /^(?:assists|ast|a)$/i,
  passAccuracy: /pass.*(?:accuracy|success)|pass accuracy/i,
  tackleSuccess: /tackle.*(?:success|accuracy)|tackle success/i,
  shotsOnTarget: /shots?.*(?:on target|target)/i,
  cleanSheets: /clean sheets?/i,
  motm: /man of the match|\bmotm\b|player of the match/i,
  rating: /average rating|match rating|rating/i,
  date: /date|played|when/i,
  opponent: /opponent|opposition|versus|vs\.?/i,
  score: /score|result/i,
  home: /home|home team/i,
  away: /away|away team/i,
  type: /competition|type|match type/i,
};

function text(v) {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function normalized(v) {
  return text(v).toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function num(v) {
  let s = text(v).replace(/%/g, '').trim();
  if (!s) return null;
  // Keep decimals sensible while also handling Italian/English thousands separators.
  if (/^-?\d{1,3}(?:\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else if (/^-?\d{1,3}(?:,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
  else if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
  else if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v) {
  const s = text(v);
  if (!s) return null;
  const dayFirst = s.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
  if (dayFirst) {
    const year = Number(dayFirst[3].length === 2 ? `20${dayFirst[3]}` : dayFirst[3]);
    const month = Number(dayFirst[2]);
    const day = Number(dayFirst[1]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month - 1, day));
      if (Number.isFinite(d.getTime())) return Math.floor(d.getTime() / 1000);
    }
  }
  const iso = Date.parse(s);
  return Number.isFinite(iso) ? Math.floor(iso / 1000) : null;
}

function scorePair(v) {
  const m = text(v).match(/\b(\d{1,2})\s*[-–:]\s*(\d{1,2})\b/);
  return m ? { home: Number(m[1]), away: Number(m[2]), raw: text(v) } : null;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function headerKey(h) {
  const s = normalized(h);
  if (KEYWORDS.name.test(s)) return 'name';
  if (KEYWORDS.position.test(s)) return 'position';
  if (/^ovr$|^overall$|^overall rating$/.test(s)) return 'ovr';
  if (KEYWORDS.games.test(s)) return 'games';
  if (/^goals?$|^g$/.test(s)) return 'goals';
  if (/^assists?$|^ast$|^a$/.test(s)) return 'assists';
  if (KEYWORDS.passAccuracy.test(s)) return 'passAccuracy';
  if (KEYWORDS.tackleSuccess.test(s)) return 'tackleSuccess';
  if (KEYWORDS.shotsOnTarget.test(s)) return 'shotsOnTarget';
  if (KEYWORDS.cleanSheets.test(s)) return 'cleanSheets';
  if (KEYWORDS.motm.test(s)) return 'motm';
  if (/^average rating$|^match rating$|^rating$/.test(s)) return 'rating';
  return null;
}

function parsePlayers(snapshot) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const candidateTables = tables
    .map(t => ({ headers: (t.headers || []).map(text), rows: Array.isArray(t.rows) ? t.rows : [] }))
    .map(t => ({ t, keys: t.headers.map(headerKey) }))
    .filter(x => x.keys.includes('name') && x.keys.filter(Boolean).length >= 2)
    .sort((a, b) => (b.t.rows.length * b.keys.filter(Boolean).length) - (a.t.rows.length * a.keys.filter(Boolean).length));

  for (const { t, keys } of candidateTables) {
    const players = [];
    for (const row of t.rows.slice(0, 150)) {
      const cells = row.map(text);
      if (!cells.length) continue;
      const obj = {};
      keys.forEach((key, i) => { if (key && cells[i] !== undefined) obj[key] = cells[i]; });
      const name = text(obj.name);
      if (!name || name.length < 2 || /^player$/i.test(name) || /^name$/i.test(name)) continue;
      const player = {
        name,
        position: text(obj.position) || null,
        ovr: num(obj.ovr),
        games: num(obj.games),
        goals: num(obj.goals) ?? 0,
        assists: num(obj.assists) ?? 0,
        rating: num(obj.rating),
        passAccuracy: num(obj.passAccuracy),
        tackleSuccess: num(obj.tackleSuccess),
        shotsOnTarget: num(obj.shotsOnTarget),
        cleanSheets: num(obj.cleanSheets),
        motm: num(obj.motm),
        source: 'Pro Clubs Tracker'
      };
      if (player.games != null || player.goals || player.assists || player.rating != null || player.ovr != null) players.push(player);
    }
    const deduped = uniqueBy(players, p => normalized(p.name));
    if (deduped.length) return deduped;
  }
  return [];
}

function parseOverall(rawText, snapshot) {
  const out = { gamesPlayed:null, wins:null, draws:null, losses:null, goals:null, goalsAgainst:null, division:null, skillRating:null };
  const body = normalized(rawText);
  const patterns = [
    ['gamesPlayed', /(?:games played|matches played)\s*[:\-]?\s*(\d+)/i],
    ['wins', /(?:wins|victories)\s*[:\-]?\s*(\d+)/i],
    ['draws', /(?:draws|ties)\s*[:\-]?\s*(\d+)/i],
    ['losses', /(?:losses|defeats)\s*[:\-]?\s*(\d+)/i],
    ['goalsAgainst', /(?:goals against|goals conceded|conceded)\s*[:\-]?\s*(\d+)/i],
    ['goals', /(?:goals scored|goals for|goals)\s*[:\-]?\s*(\d+)/i],
    ['division', /(?:current )?division\s*[:\-]?\s*(\d+)/i],
    ['skillRating', /(?:skill rating|skill)\s*[:\-]?\s*([\d.,]+)/i]
  ];
  for (const [key,re] of patterns) {
    const m = body.match(re);
    if (m) out[key] = num(m[1]);
  }
  for (const kv of (snapshot?.keyValues || [])) {
    const k = normalized(kv?.key), v = num(kv?.value);
    if (v == null) continue;
    if (/games played|matches played/.test(k) && out.gamesPlayed == null) out.gamesPlayed = v;
    else if (/^wins?$|victories/.test(k) && out.wins == null) out.wins = v;
    else if (/^draws?$|^ties$/.test(k) && out.draws == null) out.draws = v;
    else if (/^losses?$|defeats/.test(k) && out.losses == null) out.losses = v;
    else if (/goals against|goals conceded|conceded/.test(k) && out.goalsAgainst == null) out.goalsAgainst = v;
    else if (/goals scored|goals for/.test(k) && out.goals == null) out.goals = v;
    else if (/^goals?$/.test(k) && out.goals == null) out.goals = v;
    else if (/division/.test(k) && out.division == null) out.division = v;
    else if (/skill rating|skill/.test(k) && out.skillRating == null) out.skillRating = v;
  }
  return out;
}

function pickOpponent(lines, clubName, homeName, awayName) {
  const club = normalized(clubName);
  const explicit = [homeName, awayName].map(text).filter(Boolean).find(x => !normalized(x).includes(club));
  if (explicit) return explicit;
  const candidates = lines.map(text).filter(Boolean).filter(line => {
    const n = normalized(line);
    if (!n || n.includes(club)) return false;
    if (/^(home|away|score|result|win|loss|draw|date|division|goals)$/i.test(line)) return false;
    if (/^\d{1,2}\s*[-–:]\s*\d{1,2}$/.test(line)) return false;
    if (/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/.test(line)) return false;
    return line.length <= 90;
  });
  return candidates[0] || 'Avversario';
}

function parseMatchBlock(block, clubName) {
  const lines = String(block || '').split(/\n|\r|·/).map(text).filter(Boolean);
  if (!lines.length) return null;
  const score = lines.map(scorePair).find(Boolean) || null;
  if (!score) return null;
  const timestamp = parseDate(lines.find(x => parseDate(x) != null));
  let homeName='', awayName='';
  const slash = lines.find(x => /\s+(?:vs\.?|v|@|at)\s+/i.test(x));
  if (slash) {
    const parts = slash.split(/\s+(?:vs\.?|v|@|at)\s+/i);
    homeName = text(parts[0]);
    awayName = text(parts[1]);
  }
  const opponent = pickOpponent(lines, clubName, homeName, awayName);
  const clubNorm = normalized(clubName);
  const ownScore = normalized(homeName).includes(clubNorm) ? score.home : normalized(awayName).includes(clubNorm) ? score.away : null;
  const oppScore = normalized(homeName).includes(clubNorm) ? score.away : normalized(awayName).includes(clubNorm) ? score.home : null;
  const result = ownScore == null ? null : ownScore > oppScore ? 'W' : ownScore < oppScore ? 'L' : 'D';
  return { id:null, timestamp, opponent, for:ownScore, against:oppScore, result, source:'Pro Clubs Tracker' };
}

function parseMatchTableRow(headers, row, clubName, index) {
  const cells = row.map(text);
  const h = headers.map(normalized);
  const at = re => h.findIndex(x => re.test(x));
  const dateIdx = at(/date|played|when/);
  const homeIdx = at(/^home$|home team/);
  const awayIdx = at(/^away$|away team/);
  const scoreIdx = at(/^score$|^result$/);
  const oppIdx = at(/^opponent$|opposition|versus|vs\.?/);
  const typeIdx = at(/competition|match type|^type$/);
  const timestamp = dateIdx >= 0 ? parseDate(cells[dateIdx]) : null;
  const score = scoreIdx >= 0 ? scorePair(cells[scoreIdx]) : null;
  const home = homeIdx >= 0 ? cells[homeIdx] : '';
  const away = awayIdx >= 0 ? cells[awayIdx] : '';
  const opponentCell = oppIdx >= 0 ? cells[oppIdx] : '';
  if (!score) return null;
  const clubNorm = normalized(clubName);
  const homeOwn = home && normalized(home).includes(clubNorm);
  const awayOwn = away && normalized(away).includes(clubNorm);
  let ownScore=null, oppScore=null, opponent=opponentCell;
  if (homeOwn) { ownScore=score.home; oppScore=score.away; opponent=away||opponentCell; }
  else if (awayOwn) { ownScore=score.away; oppScore=score.home; opponent=home||opponentCell; }
  if (!opponent) opponent=pickOpponent(cells, clubName, home, away);
  const result = ownScore == null ? null : ownScore > oppScore ? 'W' : ownScore < oppScore ? 'L' : 'D';
  if (timestamp == null && !opponent) return null;
  return { id:`pct-${index+1}`, timestamp, opponent:opponent||'Avversario', for:ownScore, against:oppScore, result, matchType:typeIdx>=0?cells[typeIdx]||null:null, source:'Pro Clubs Tracker' };
}

function parseMatches(snapshot, clubName) {
  const out=[];
  for (const table of (snapshot?.tables||[])) {
    const headers=(table.headers||[]).map(text);
    const hasMatchSignals=headers.some(h=>KEYWORDS.date.test(h)||KEYWORDS.opponent.test(h)||KEYWORDS.score.test(h)||KEYWORDS.home.test(h)||KEYWORDS.away.test(h));
    if (!hasMatchSignals) continue;
    (table.rows||[]).slice(0,150).forEach((row,i)=>{
      const m=parseMatchTableRow(headers,row,clubName,out.length+i);
      if (m) out.push(m);
      else {
        const fallback=parseMatchBlock(row.map(text).join(' · '),clubName);
        if (fallback) out.push({...fallback,id:`pct-fallback-${out.length+1}`});
      }
    });
  }
  for (const block of (snapshot?.matchBlocks||[])) {
    const m=parseMatchBlock(block,clubName);
    if (m) out.push({...m,id:`pct-b-${out.length+1}`});
  }
  return uniqueBy(out,m=>`${m.timestamp||0}|${normalized(m.opponent)}|${m.for}|${m.against}`).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).slice(0,100);
}

function parseClubName(snapshots, requestedName='') {
  const pages=Array.isArray(snapshots)?snapshots:Object.values(snapshots||{});
  const candidates=[];
  for (const s of pages) candidates.push(s?.clubName,s?.headings?.[0],s?.title);
  const filtered=candidates.map(text).filter(Boolean);
  if (requestedName) {
    const exact=filtered.find(x=>normalized(x)===normalized(requestedName));
    if (exact) return exact;
    const contains=filtered.find(x=>normalized(x).includes(normalized(requestedName)));
    if (contains) return contains;
  }
  return filtered.find(x=>!/(pro clubs tracker|stats|players|matches|fun)/i.test(x)) || filtered[0] || requestedName || 'Club';
}

function extractFun(snapshot) {
  if (!snapshot) return {available:false,items:[]};
  const sections=Array.isArray(snapshot.sections)?snapshot.sections:[];
  const funSection=sections.find(s=>/fun|banter|red flag|carrying|roast/i.test(text(s.heading))) || {
    heading:'Fun', lines:(snapshot.bodyText||'').split(/\n+/).map(text).filter(x=>/red flag|roast|fun|banter|carrying|award|record/i.test(x)).slice(0,30)
  };
  const lines=(funSection.lines||[]).map(text).filter(Boolean);
  if (!lines.length) return {available:false,items:[]};
  return {available:true,items:lines.slice(0,30).map(line=>({title:'PCT',text:line,value:null,player:null}))};
}

function stableLocalId(value) {
  let h=2166136261;
  for (const ch of String(value||'')) { h^=ch.codePointAt(0); h=Math.imul(h,16777619); }
  return `pct-${(h>>>0).toString(36)}`;
}
function clubIdFromSnapshots(snapshots) {
  const pages=Object.values(snapshots||{});
  for (const s of pages) {
    const fromUrl=String(s?.url||'').match(/(?:club|clubs|team|teams)[\/_-](\d+)/i)?.[1];
    if (fromUrl) return fromUrl;
    if (s?.clubId) return text(s.clubId);
    const href=Array.isArray(s?.clubLinks)?s.clubLinks.map(x=>x.href).find(h=>/(?:club|clubs|team|teams)[\/_-]\d+/i.test(h||'')) : '';
    const fromHref=String(href||'').match(/(?:club|clubs|team|teams)[\/_-](\d+)/i)?.[1];
    if (fromHref) return fromHref;
  }
  const primary=pages.find(s=>s?.url)?.url || '';
  return primary ? stableLocalId(primary) : '';
}

export function parsePCTLinkSnapshots(snapshots, { role='own', requestedName='' }={}) {
  const pages=snapshots||{};
  const clubName=parseClubName(pages,requestedName);
  const stats=pages.stats||{};
  const playersPage=pages.players||stats;
  const matchesPage=pages.matches||stats;
  const funPage=pages.fun||null;
  const overall=parseOverall(`${stats.bodyText||''}\n${stats.title||''}`,stats);
  const players=parsePlayers(playersPage);
  const matches=parseMatches(matchesPage,clubName);
  const fun=role==='opponent'?{available:false,items:[]}:extractFun(funPage);
  const hasCore=players.length>0 && (matches.length>0 || overall.gamesPlayed!=null || overall.wins!=null);
  return {
    ok:hasCore,
    club:{id:clubIdFromSnapshots(pages)||null,name:clubName,platform:'common-gen5',...overall},
    players,
    matches,
    fun,
    sections:{
      stats:{available:Boolean(stats?.bodyText||stats?.tables?.length),url:text(stats?.url)},
      fun:{available:Boolean(fun.available),url:text(funPage?.url)},
      players:{available:players.length>0,url:text(playersPage?.url)},
      matches:{available:matches.length>0,url:text(matchesPage?.url)}
    },
    source:'Pro Clubs Tracker',
    sourceUrls:Object.values(pages).map(x=>text(x?.url)).filter(Boolean),
    sourcePageTitle:text(stats.title||pages.players?.title||pages.matches?.title||''),
    pctSnapshot:{
      pages:Object.fromEntries(Object.entries(pages).map(([k,s])=>[k,{url:text(s?.url),title:text(s?.title),rawText:text(s?.bodyText).slice(0,20000)}]))
    }
  };
}

export function parsePCTSnapshot(snapshot, requestedName='') {
  return parsePCTLinkSnapshots({stats:snapshot,players:snapshot,matches:snapshot,fun:snapshot},{role:'own',requestedName});
}
