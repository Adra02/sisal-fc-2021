const STORE = { players: 'sisal_fc_players_v1', matches: 'sisal_fc_matches_v1', notes: 'sisal_fc_notes_v1' };
const state = { players: load(STORE.players, []), matches: load(STORE.matches, []), notes: load(STORE.notes, ''), tab: 'team' };

const $ = (s) => document.querySelector(s);
const content = $('#content');

function load(key, fallback){ try { const v=localStorage.getItem(key); return v===null?fallback:JSON.parse(v); } catch { return fallback; } }
function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function esc(v){ return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function arr(v){ return Array.isArray(v)?v:[]; }
function first(obj, keys, fallback=''){ for(const k of keys){ if(obj && obj[k]!==undefined && obj[k]!==null && obj[k]!=='') return obj[k]; } return fallback; }

function normalizePlayers(raw){
  let list = Array.isArray(raw) ? raw : (raw?.players || raw?.data || raw?.members || []);
  if(!Array.isArray(list)) throw new Error('Non trovo una lista di giocatori nel JSON.');
  return list.map((p,i)=>({
    name: String(first(p,['name','username','gamertag','playerName','displayName'],`Giocatore ${i+1}`)),
    position: String(first(p,['position','pos','role'],'')),
    ovr: num(first(p,['ovr','overall','rating'],0)),
    games: num(first(p,['games','matches','appearances','gp'],0)),
    goals: num(first(p,['goals','g'],0)),
    assists: num(first(p,['assists','a'],0)),
    rating: num(first(p,['rating','averageRating','avgRating'],0)),
    raw:p
  }));
}

function normalizeMatches(raw){
  let list = Array.isArray(raw) ? raw : (raw?.matches || raw?.data || []);
  if(!Array.isArray(list)) throw new Error('Non trovo una lista di partite nel JSON.');
  return list.map(m=>({ ...m, matchId:String(first(m,['matchId','id'],'')), timestamp:first(m,['timestamp','date','createdAt'],''), timeAgo:first(m,['timeAgo'],''), clubs:arr(m.clubs), players:arr(m.players), aggregate:m.aggregate||{} }));
}

function detectType(raw, filename){
  const low = filename.toLowerCase();
  if(/match|partit|oppos/.test(low)) return 'matches';
  if(/player|giocator|squadra|roster/.test(low)) return 'players';
  if(Array.isArray(raw)){
    if(raw.some(x=>x && (x.matchId!==undefined || x.clubs!==undefined || x.aggregate!==undefined))) return 'matches';
    if(raw.some(x=>x && (x.username!==undefined || x.gamertag!==undefined || x.position!==undefined || x.goals!==undefined))) return 'players';
  }
  if(raw?.matches) return 'matches';
  if(raw?.players || raw?.members) return 'players';
  return null;
}

function setData(type, data){
  if(type==='players'){ state.players=normalizePlayers(data); save(STORE.players,state.players); }
  if(type==='matches'){ state.matches=normalizeMatches(data); save(STORE.matches,state.matches); }
  updateStatus(); render();
}

async function handleFiles(files){
  const messages=[];
  for(const file of [...files]){
    try{
      const text=await file.text();
      const raw=JSON.parse(text.replace(/^\uFEFF/,''));
      const type=detectType(raw,file.name);
      if(!type) throw new Error('Tipo non riconosciuto: usa un JSON giocatori o partite.');
      setData(type,raw);
      messages.push(`<div class="msg ok">✓ ${esc(file.name)} → ${type==='players'?'giocatori':'partite'} caricato.</div>`);
    }catch(e){ messages.push(`<div class="msg err">✕ ${esc(file.name)} → ${esc(e.message)}</div>`); }
  }
  $('#fileMessages').innerHTML=messages.join('');
}

$('#fileInput').addEventListener('change', e=>{ if(e.target.files?.length) handleFiles(e.target.files); e.target.value=''; });
$('#clearData').addEventListener('click',()=>{ if(!confirm('Eliminare i dati caricati dal browser?')) return; localStorage.removeItem(STORE.players); localStorage.removeItem(STORE.matches); state.players=[]; state.matches=[]; $('#fileMessages').innerHTML='<div class="msg ok">✓ Dati locali eliminati.</div>'; updateStatus(); render(); });

document.querySelectorAll('.bottomnav button').forEach(b=>b.addEventListener('click',()=>{ state.tab=b.dataset.tab; document.querySelectorAll('.bottomnav button').forEach(x=>x.classList.toggle('active',x===b)); render(); }));

function updateStatus(){ $('#dataStatus').textContent = `${state.players.length} giocatori · ${state.matches.length} partite caricate`; }
function page(title,body){ return `<section class="section"><div class="hero"><h2>${title}</h2>${body}</div></section>`; }
function empty(text='Carica i file JSON per vedere i dati.'){ return `<div class="empty">${text}</div>`; }

function team(){
  const p=state.players,m=state.matches;
  const gp=p.reduce((s,x)=>s+x.games,0), g=p.reduce((s,x)=>s+x.goals,0), a=p.reduce((s,x)=>s+x.assists,0);
  return page('Sisal FC 2021', `<p>I dati vengono letti esclusivamente dai file che carichi tu. Nessun dato della rosa o delle partite è scritto nel codice.</p><div class="grid"><div class="card"><div class="metric">${p.length}</div><div class="label">Giocatori</div></div><div class="card"><div class="metric">${m.length}</div><div class="label">Partite</div></div><div class="card"><div class="metric">${gp}</div><div class="label">Presenze</div></div><div class="card"><div class="metric">${g}</div><div class="label">Gol</div></div></div><div class="card" style="margin-top:12px"><b>Assist totali</b><div class="metric">${a}</div></div>`);
}

function players(){
  if(!state.players.length) return page('Giocatori',empty('Carica il JSON dei giocatori.'));
  const rows=state.players.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td><span class="badge">${esc(p.position||'—')}</span></td><td>${p.ovr||'—'}</td><td>${p.games}</td><td>${p.goals}</td><td>${p.assists}</td><td>${p.rating||'—'}</td></tr>`).join('');
  return page('Giocatori',`<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>Pos.</th><th>OVR</th><th>PG</th><th>Gol</th><th>Assist</th><th>Voto</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}

function top(){
  if(!state.players.length) return page('Top 3',empty('Carica il JSON dei giocatori.'));
  const byGoal=[...state.players].sort((a,b)=>b.goals-a.goals).slice(0,3), byAssist=[...state.players].sort((a,b)=>b.assists-a.assists).slice(0,3);
  return page('Top 3',`<div class="grid"><div class="card"><b>⚽ Gol</b>${byGoal.map((p,i)=>`<p>${i+1}. <b>${esc(p.name)}</b><br><span class="muted">${p.goals} gol</span></p>`).join('')}</div><div class="card"><b>🎯 Assist</b>${byAssist.map((p,i)=>`<p>${i+1}. <b>${esc(p.name)}</b><br><span class="muted">${p.assists} assist</span></p>`).join('')}</div></div>`);
}

function pitch(){
  const notes=esc(state.notes);
  const positions=[['GK',50,88],['LB',12,72],['CB',38,76],['CB',62,76],['RB',88,72],['CDM',50,61],['LM',22,45],['CAM',50,42],['RM',78,45],['ST',38,20],['ST',62,20]];
  return page('Campo',`<p>Schema visuale modificabile in seguito. Le note vengono salvate solo nel tuo browser.</p><div class="pitch">${positions.map(x=>`<div class="dot" style="left:${x[1]}%;top:${x[2]}%">${x[0]}</div>`).join('')}</div><textarea id="notes" class="note" placeholder="Note tattiche...">${notes}</textarea>`);
}

function matches(){
  if(!state.matches.length) return page('Opposizioni',empty('Carica il JSON delle partite.'));
  return page('Opposizioni',state.matches.map(m=>{
    const clubs=m.clubs;
    const mine=clubs.find(c=>String(first(c,['clubName','name','club'],'' )).toLowerCase().includes('sisal')) || clubs[0] || {};
    const opp=clubs.find(c=>c!==mine) || clubs[1] || {};
    const ms=first(mine,['goals','score'],0), os=first(opp,['goals','score'],0);
    const result=num(ms)>num(os)?'VITTORIA':num(ms)<num(os)?'SCONFITTA':'PAREGGIO';
    const cls=result==='VITTORIA'?'win':result==='SCONFITTA'?'loss':'draw';
    return `<div class="match"><div class="match-head"><div><div class="opponent">${esc(first(opp,['clubName','name','club'],'Avversario'))}</div><div class="muted">${esc(m.timeAgo||m.timestamp||'')}</div></div><div class="score ${cls}">${esc(ms)} - ${esc(os)}</div></div><div class="${cls}" style="margin-top:8px;font-size:11px;font-weight:900">${result}</div></div>`;
  }).join(''));
}

function ai(){
  return page('IA',`<p>La IA usa soltanto i dati attualmente caricati nel browser e la domanda che scrivi.</p><div class="ai-row"><input id="aiQuestion" placeholder="Es. Quali giocatori segnano di più?"><button id="askAI" class="primary">Chiedi</button></div><div id="aiAnswer" class="answer"></div>`);
}

function render(){
  if(state.tab==='team') content.innerHTML=team();
  if(state.tab==='players') content.innerHTML=players();
  if(state.tab==='top') content.innerHTML=top();
  if(state.tab==='pitch') content.innerHTML=pitch();
  if(state.tab==='matches') content.innerHTML=matches();
  if(state.tab==='ai') content.innerHTML=ai();
  const notes=$('#notes'); if(notes) notes.addEventListener('input',()=>{state.notes=notes.value;save(STORE.notes,state.notes)});
  const ask=$('#askAI'); if(ask) ask.addEventListener('click',askGemini);
}

async function askGemini(){
  const q=$('#aiQuestion').value.trim(), out=$('#aiAnswer');
  if(!q){out.textContent='Scrivi una domanda.';return;}
  if(!state.players.length && !state.matches.length){out.textContent='Prima carica almeno un file dati.';return;}
  out.textContent='Analisi in corso...';
  try{
    const r=await fetch('/api/assistente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,players:state.players,matches:state.matches,notes:state.notes})});
    const data=await r.json(); if(!r.ok) throw new Error(data.error||'Errore IA'); out.textContent=data.answer||'Nessuna risposta.';
  }catch(e){out.textContent=`Errore: ${e.message}`;}
}

updateStatus(); render();
