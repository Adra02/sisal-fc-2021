const { normalizePlayers, normalizeMatches, detectType, inferClub } = window.FCData;

const STORE = {
  players: 'fc_dashboard_players_v2',
  matches: 'fc_dashboard_matches_v2',
  notes: 'fc_dashboard_notes_v2'
};

const state = {
  players: load(STORE.players, []),
  matches: load(STORE.matches, []),
  notes: load(STORE.notes, ''),
  tab: 'team'
};

const $ = (selector) => document.querySelector(selector);
const content = $('#content');

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value)) return String(timestamp || '');
  const ms = value < 10000000000 ? value * 1000 : value;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return date.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function clubInfo() {
  return inferClub(state.matches, state.players);
}

function updateHeader() {
  const club = clubInfo();
  $('#clubName').textContent = club.name || 'FC CLUBS DASHBOARD';
  $('#clubId').textContent = club.id ? `#${club.id}` : '—';
  $('#dataStatus').textContent = `${state.players.length} giocatori · ${state.matches.length} partite`;
}

function showMessage(message, type = 'ok') {
  const box = $('#fileMessages');
  const row = document.createElement('div');
  row.className = `msg ${type}`;
  row.textContent = message;
  box.prepend(row);
  while (box.children.length > 6) box.lastElementChild.remove();
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossibile leggere il file.'));
    reader.readAsText(file, 'utf-8');
  });
}

async function handleFiles(files) {
  for (const file of files) {
    try {
      const text = (await readFileAsText(file)).replace(/^\uFEFF/, '').trim();
      if (!text) throw new Error('Il file è vuoto.');

      let raw;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new Error('Il file non contiene JSON valido. Assicurati che sia un file .json oppure un .txt con JSON al suo interno.');
      }

      const type = detectType(raw, file.name);
      if (!type) throw new Error('Non riesco a capire se è il file dei giocatori o delle partite.');

      if (type === 'players') {
        const players = normalizePlayers(raw);
        state.players = players;
        save(STORE.players, players);
        showMessage(`✓ ${file.name}: caricati ${players.length} giocatori.`);
      } else {
        const matches = normalizeMatches(raw);
        state.matches = matches;
        save(STORE.matches, matches);
        showMessage(`✓ ${file.name}: caricate ${matches.length} partite.`);
      }

      updateHeader();
      render();
    } catch (error) {
      showMessage(`✕ ${file.name}: ${error.message}`, 'err');
    }
  }
}

$('#fileInput').addEventListener('change', async (event) => {
  const files = [...(event.target.files || [])];
  event.target.value = '';
  if (files.length) await handleFiles(files);
});

$('#clearData').addEventListener('click', () => {
  localStorage.removeItem(STORE.players);
  localStorage.removeItem(STORE.matches);
  localStorage.removeItem(STORE.notes);
  state.players = [];
  state.matches = [];
  state.notes = '';
  $('#fileMessages').innerHTML = '';
  updateHeader();
  render();
  showMessage('✓ Dati eliminati dal browser.');
});

document.querySelectorAll('.bottomnav button').forEach((button) => {
  button.addEventListener('click', () => {
    state.tab = button.dataset.tab;
    document.querySelectorAll('.bottomnav button').forEach((item) => item.classList.toggle('active', item === button));
    render();
  });
});

function page(title, body) {
  return `<section class="section"><div class="hero"><div class="section-kicker">${esc(title)}</div>${body}</div></section>`;
}

function empty(message) {
  return `<div class="empty">${esc(message)}</div>`;
}

function teamPage() {
  const p = state.players;
  const m = state.matches;
  const games = p.reduce((sum, player) => sum + num(player.games), 0);
  const goals = p.reduce((sum, player) => sum + num(player.goals), 0);
  const assists = p.reduce((sum, player) => sum + num(player.assists), 0);
  const wins = m.reduce((sum, match) => sum + (resultForMatch(match) === 'VITTORIA' ? 1 : 0), 0);
  const draws = m.reduce((sum, match) => sum + (resultForMatch(match) === 'PAREGGIO' ? 1 : 0), 0);
  const losses = m.reduce((sum, match) => sum + (resultForMatch(match) === 'SCONFITTA' ? 1 : 0), 0);

  return page('Squadra', `
    <p class="intro">I dati arrivano esclusivamente dai file che carichi tu. Il codice del sito non contiene statistiche della squadra.</p>
    <div class="stats-grid">
      <div class="stat-card"><strong>${p.length}</strong><span>Giocatori</span></div>
      <div class="stat-card"><strong>${m.length}</strong><span>Partite</span></div>
      <div class="stat-card"><strong>${games}</strong><span>Presenze</span></div>
      <div class="stat-card"><strong>${goals}</strong><span>Gol</span></div>
      <div class="stat-card"><strong>${assists}</strong><span>Assist</span></div>
      <div class="stat-card"><strong>${wins}-${draws}-${losses}</strong><span>V-P-S</span></div>
    </div>
    ${!p.length && !m.length ? empty('Carica i due file dalla sezione in alto.') : ''}
  `);
}

function playersPage() {
  if (!state.players.length) return page('Giocatori', empty('Carica il file dei giocatori.'));

  const rows = [...state.players]
    .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))
    .map((player) => `
      <tr>
        <td><b>${esc(player.name)}</b></td>
        <td>${esc(player.position || '—')}</td>
        <td>${player.ovr || '—'}</td>
        <td>${player.games || 0}</td>
        <td>${player.goals || 0}</td>
        <td>${player.assists || 0}</td>
        <td>${player.rating ? player.rating.toFixed(2) : '—'}</td>
      </tr>`).join('');

  return page('Giocatori', `<div class="table-wrap"><table><thead><tr><th>Giocatore</th><th>Pos</th><th>OVR</th><th>PG</th><th>⚽</th><th>🎯</th><th>Voto</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}

function topPage() {
  if (!state.players.length) return page('Top 3', empty('Carica il file dei giocatori.'));

  const goals = [...state.players].sort((a, b) => b.goals - a.goals).slice(0, 3);
  const assists = [...state.players].sort((a, b) => b.assists - a.assists).slice(0, 3);
  const rating = [...state.players].filter((p) => p.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 3);

  const podium = (items, field, suffix) => items.map((p, i) => `<div class="rank"><span>${i + 1}</span><div><b>${esc(p.name)}</b><small>${p[field]} ${suffix}</small></div></div>`).join('');

  return page('Top 3', `<div class="top-grid">
    <div class="card"><h3>⚽ Gol</h3>${podium(goals, 'goals', 'gol')}</div>
    <div class="card"><h3>🎯 Assist</h3>${podium(assists, 'assists', 'assist')}</div>
    <div class="card"><h3>⭐ Voto</h3>${podium(rating, 'rating', 'media')}</div>
  </div>`);
}

const FORMATIONS = ['4-1-2-1-2', '4-3-3', '4-2-3-1', '4-4-2', '5-2-1-2', '3-5-2', '5-3-2', '3-4-2-1'];

function pitchPage() {
  return page('Campo', `
    <div class="control-row"><label>Modulo <select id="formation">${FORMATIONS.map((f) => `<option>${f}</option>`).join('')}</select></label></div>
    <div class="pitch">
      <div class="center-circle"></div><div class="half-line"></div>
      <div class="penalty top"></div><div class="penalty bottom"></div>
      <div class="position p1">GK</div><div class="position p2">LB</div><div class="position p3">CB</div><div class="position p4">CB</div><div class="position p5">RB</div>
      <div class="position p6">CDM</div><div class="position p7">LM</div><div class="position p8">CAM</div><div class="position p9">RM</div><div class="position p10">ST</div><div class="position p11">ST</div>
    </div>
    <textarea id="notes" placeholder="Scrivi qui le note tattiche della squadra..."></textarea>
  `);
}

function matchClubGoals(club) {
  return num(club?.goals ?? club?.score);
}

function resultForMatch(match) {
  if (match.clubs.length < 2) return 'N/D';
  const myId = clubInfo().id;
  let mine = match.clubs.find((club) => myId && String(club.id) === String(myId));
  if (!mine) mine = match.clubs.find((club) => club.name === clubInfo().name);
  if (!mine) mine = match.clubs[0];
  const opponent = match.clubs.find((club) => club !== mine) || match.clubs[1];
  const myGoals = matchClubGoals(mine);
  const oppGoals = matchClubGoals(opponent);
  return myGoals > oppGoals ? 'VITTORIA' : myGoals < oppGoals ? 'SCONFITTA' : 'PAREGGIO';
}

function matchesPage() {
  if (!state.matches.length) return page('Partite', empty('Carica il file delle partite.'));

  return page('Partite', state.matches.map((match) => {
    const myId = clubInfo().id;
    let mine = match.clubs.find((club) => myId && String(club.id) === String(myId)) || match.clubs[0];
    const opponent = match.clubs.find((club) => club !== mine) || match.clubs[1];
    const myGoals = matchClubGoals(mine);
    const oppGoals = matchClubGoals(opponent);
    const result = resultForMatch(match);
    const className = result === 'VITTORIA' ? 'win' : result === 'SCONFITTA' ? 'loss' : 'draw';

    return `<article class="match ${className}">
      <div><small>${formatDate(match.timestamp)}</small><h3>${esc(opponent?.name || 'Avversario')}</h3></div>
      <div class="score">${myGoals} - ${oppGoals}</div>
      <span class="result">${result}</span>
    </article>`;
  }).join(''));
}

function aiPage() {
  return page('IA', `
    <p class="intro">La IA riceve i dati che hai caricato. Per usarla su Vercel devi impostare <b>GEMINI_API_KEY</b>.</p>
    <div class="ai-row"><input id="aiQuestion" type="text" placeholder="Es. Come stiamo giocando in attacco?"><button id="askAI" class="primary" type="button">CHIEDI</button></div>
    <div id="aiAnswer" class="answer"></div>
  `);
}

function compactForAI() {
  return {
    club: clubInfo(),
    players: state.players,
    matches: state.matches.map((match) => ({
      id: match.id,
      timestamp: match.timestamp,
      clubs: match.clubs,
      players: match.players
    }))
  };
}

async function askAI() {
  const question = $('#aiQuestion')?.value.trim();
  const answer = $('#aiAnswer');
  if (!question) { answer.textContent = 'Scrivi una domanda.'; return; }
  if (!state.players.length && !state.matches.length) { answer.textContent = 'Prima carica almeno un file.'; return; }

  answer.textContent = 'Analisi in corso...';

  try {
    const response = await fetch('/api/assistente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, notes: state.notes, data: compactForAI() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Errore IA.');
    answer.textContent = data.answer || 'Nessuna risposta.';
  } catch (error) {
    answer.textContent = `Errore: ${error.message}`;
  }
}

function render() {
  if (state.tab === 'team') content.innerHTML = teamPage();
  if (state.tab === 'players') content.innerHTML = playersPage();
  if (state.tab === 'top') content.innerHTML = topPage();
  if (state.tab === 'pitch') content.innerHTML = pitchPage();
  if (state.tab === 'matches') content.innerHTML = matchesPage();
  if (state.tab === 'ai') content.innerHTML = aiPage();

  const notes = $('#notes');
  if (notes) {
    notes.value = state.notes;
    notes.addEventListener('input', () => { state.notes = notes.value; save(STORE.notes, state.notes); });
  }
  const ask = $('#askAI');
  if (ask) ask.addEventListener('click', askAI);
}

updateHeader();
render();
