let matches=[];
let notes=localStorage.getItem('sisal_notes')||'';
let fileStatus='';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function saveData(){
  try{
    localStorage.setItem('sisal_matches',JSON.stringify(matches));
    localStorage.setItem('sisal_players',JSON.stringify(window.PLAYERS||[]));
  }catch(e){ console.warn('Impossibile salvare i dati nel browser',e); }
}

function loadSavedData(){
  try{
    const savedM=localStorage.getItem('sisal_matches');
    const savedP=localStorage.getItem('sisal_players');
    if(savedM) matches=JSON.parse(savedM);
    if(savedP){ const p=JSON.parse(savedP); if(Array.isArray(p)) window.PLAYERS=p; }
  }catch(e){ console.warn(e); }
}

async function load(){
  loadSavedData();
  if(!matches.length){
    try{ const r=await fetch('matches.json'); if(r.ok) matches=await r.json(); }catch(e){}
  }
  render('team');
}

function render(tab){
  document.querySelectorAll('.bottomnav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  let html='';
  if(tab==='team')html=team(); if(tab==='players')html=players(); if(tab==='top')html=top(); if(tab==='pitch')html=pitch(); if(tab==='matches')html=opponents(); if(tab==='ai')html=ai();
  $('#content').innerHTML=`<div class="page">${html}</div>`; bind(tab);
}

function uploader(){
  return `<div class="section upload-box"><div class="row"><div><h3 style="margin:0">AGGIORNA DATI</h3><div class="meta">Carica direttamente un file JSON dal telefono o dal PC.</div></div><button class="primary" id="uploadBtn">📁 CARICA JSON</button></div><div class="meta" id="fileStatus">${esc(fileStatus||'Riconosco automaticamente giocatori o partite.')}</div></div>`;
}

function team(){
  const total=PLAYERS.reduce((x,p)=>x+(Number(p.gp)||0),0), goals=PLAYERS.reduce((x,p)=>x+(Number(p.g)||0),0), ass=PLAYERS.reduce((x,p)=>x+(Number(p.a)||0),0);
  return `<div class="hero"><div class="eyebrow">CLUB DASHBOARD</div><h2>Sisal FC 2021</h2><p>Statistiche locali del club · dati aggiornabili tramite file JSON</p></div>${uploader()}<div class="grid"><div class="stat"><b>${PLAYERS.length}</b><span>Giocatori</span></div><div class="stat"><b>${total}</b><span>Presenze</span></div><div class="stat"><b>${goals}</b><span>Gol</span></div><div class="stat"><b>${ass}</b><span>Assist</span></div></div><div class="section"><h3>ULTIME PARTITE</h3>${matchCards(matches.slice(0,5))}</div>`;
}

function matchCards(ms){
  if(!ms.length)return '<div class="card meta">Nessuna partita caricata.</div>';
  return ms.map(m=>{const c=m.clubs||[];let opp='Avversario',score='—';if(c.length){const me=c.find(x=>/Sisal/i.test(JSON.stringify(x)))||c[0];const other=c.find(x=>x!==me)||c[1];opp=other?.name||other?.clubName||'Avversario';const a=me?.score??me?.goals,b=other?.score??other?.goals;if(a!=null&&b!=null)score=`${a} - ${b}`;}return `<div class="card"><div class="row"><div><div class="name">${esc(opp)}</div><div class="meta">${esc(m.timeAgo||m.timestamp||'')}</div></div><b>${esc(score)}</b></div></div>`}).join('');
}

function players(){return `<div class="section"><h3>ROSA · ${PLAYERS.length}</h3><div class="player-grid">${PLAYERS.map(p=>`<div class="card"><div class="row"><div class="name">${esc(p.name)}</div><span class="badge">OVR ${p.ovr||'—'}</span></div><div class="meta">${p.gp||0} GP · ${p.g||0} G · ${p.a||0} A</div><div class="meta">Rating <span class="rating">${p.r?p.r.toFixed(1):'—'}</span></div></div>`).join('')}</div></div>`}
function top(){const byGoal=[...PLAYERS].sort((a,b)=>(b.g||0)-(a.g||0)),byAss=[...PLAYERS].sort((a,b)=>(b.a||0)-(a.a||0)),byRat=[...PLAYERS].filter(p=>(p.gp||0)>0).sort((a,b)=>(b.r||0)-(a.r||0));return `<div class="section"><h3>TOP 3 GOL</h3>${list3(byGoal,'g','⚽')}</div><div class="section"><h3>TOP 3 ASSIST</h3>${list3(byAss,'a','🎯')}</div><div class="section"><h3>TOP 3 RATING</h3>${list3(byRat,'r','⭐')}</div>`}
function list3(a,k,icon){return a.slice(0,3).map((p,i)=>`<div class="card row"><div><span class="badge">#${i+1}</span> <b>${esc(p.name)}</b></div><b>${icon} ${typeof p[k]==='number'&&k==='r'?p[k].toFixed(1):p[k]||0}</b></div>`).join('')}
function pitch(){return `<div class="section"><h3>CAMPO TATTICO</h3><div class="tabs">${['3-4-2-1','4-3-3','4-2-3-1','4-4-2','5-2-1-2','3-5-2','4-1-2-1-2','5-3-2'].map(x=>`<button data-form="${x}">${x}</button>`).join('')}</div><div class="pitch" id="pitch"><div class="spot" style="left:50%;top:92%">POR</div><div class="spot" style="left:25%;top:75%">DIF</div><div class="spot" style="left:50%;top:70%">DIF</div><div class="spot" style="left:75%;top:75%">DIF</div><div class="spot" style="left:50%;top:52%">CC</div><div class="spot" style="left:35%;top:35%">ATT</div><div class="spot" style="left:65%;top:35%">ATT</div><div class="spot" style="left:50%;top:15%">ATT</div></div><textarea id="notes" rows="5" style="width:100%;margin-top:10px;background:var(--card);color:white;border:1px solid var(--line);border-radius:12px;padding:12px" placeholder="Note tattiche..."></textarea></div>`}
function opponents(){const names={};matches.forEach(m=>(m.clubs||[]).forEach(c=>{const n=c.name||c.clubName;if(n&&!/Sisal/i.test(n))names[n]=(names[n]||0)+1}));return `<div class="section"><h3>AVVERSARI</h3>${Object.entries(names).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="card row"><b>${esc(n)}</b><span class="badge">${v} partite</span></div>`).join('')||'<div class="card meta">Nessun avversario trovato nel JSON.</div>'}</div><div class="section"><h3>PARTITE</h3>${matchCards(matches)}</div>`}
function ai(){return `<div class="hero"><div class="eyebrow">GEMINI</div><h2>Assistente IA</h2><p>Analizza rosa, partite e tattica del club.</p></div><div class="section"><div class="form-row"><textarea id="question" rows="5" placeholder="Esempio: quale formazione proveresti e perché?"></textarea><button class="primary" id="ask">CHIEDI</button></div></div><div class="section card chat" id="answer">Scrivi una domanda per iniziare.</div>`}

function bind(tab){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>render(b.dataset.tab));
  if(tab==='team') $('#uploadBtn').onclick=()=>$('#fileInput').click();
  if(tab==='pitch'){document.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-form]').forEach(x=>x.classList.remove('active'));b.classList.add('active')});$('#notes').value=notes;$('#notes').oninput=e=>{notes=e.target.value;localStorage.setItem('sisal_notes',notes)}}
  if(tab==='ai')$('#ask').onclick=askAI;
}

$('#fileInput').addEventListener('change',handleFile);

async function handleFile(e){
  const file=e.target.files?.[0]; if(!file)return;
  fileStatus=`Caricamento: ${file.name}...`; render('team');
  try{
    const text=await file.text();
    const data=JSON.parse(text);
    if(isMatchesFile(data)){
      matches=Array.isArray(data)?data:(data.matches||data.data||[]);
      localStorage.setItem('sisal_matches',JSON.stringify(matches));
      fileStatus=`✅ Partite caricate da ${file.name} (${matches.length} partite)`;
    }else if(isPlayersFile(data)){
      const raw=Array.isArray(data)?data:(data.players||data.data||[]);
      window.PLAYERS=raw.map(normalizePlayer).filter(Boolean);
      localStorage.setItem('sisal_players',JSON.stringify(window.PLAYERS));
      fileStatus=`✅ Giocatori caricati da ${file.name} (${PLAYERS.length} giocatori)`;
    }else{
      throw new Error('Formato JSON non riconosciuto');
    }
    render('team');
  }catch(err){
    fileStatus=`❌ ${err.message}. Seleziona un JSON di giocatori o partite di FC.`;
    render('team');
  }finally{e.target.value='';}
}

function isMatchesFile(d){const arr=Array.isArray(d)?d:(d?.matches||d?.data);return Array.isArray(arr)&&arr.some(x=>x&&('matchId' in x||'clubs' in x||'players' in x));}
function isPlayersFile(d){const arr=Array.isArray(d)?d:(d?.players||d?.data);return Array.isArray(arr)&&arr.some(x=>x&&('name' in x||'username' in x||'gamertag' in x||'player' in x));}
function normalizePlayer(p){if(!p||typeof p!=='object')return null;return {name:p.name||p.username||p.gamertag||p.player?.name||'Giocatore',gp:Number(p.gp??p.gamesPlayed??p.appearances??0),g:Number(p.g??p.goals??0),a:Number(p.a??p.assists??0),r:Number(p.r??p.rating??p.averageRating??0),ovr:Number(p.ovr??p.overall??p.level??0)};}

async function askAI(){const q=$('#question').value.trim();if(!q)return;$('#answer').textContent='Analizzo i dati...';try{const r=await fetch('/api/assistente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,players:PLAYERS,matches,notes})});const d=await r.json();$('#answer').textContent=d.answer||d.error||'Errore';}catch(e){$('#answer').textContent='Impossibile contattare l’assistente. Controlla la funzione Vercel e GEMINI_API_KEY.'}}

load();
