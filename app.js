const CLUB_ID = "328794";

const formationsMap = {
  "4-3-3": ["Portiere", "Terzino destro", "Difensore centrale 1", "Difensore centrale 2", "Terzino sinistro", "Centrocampista 1", "Centrocampista 2", "Trequartista", "Ala destra", "Attaccante", "Ala sinistra"],
  "4-4-2": ["Portiere", "Terzino destro", "Difensore centrale 1", "Difensore centrale 2", "Terzino sinistro", "Esterno destro", "Centrocampista 1", "Centrocampista 2", "Esterno sinistro", "Attaccante 1", "Attaccante 2"],
  "4-2-3-1": ["Portiere", "Terzino destro", "Difensore centrale 1", "Difensore centrale 2", "Terzino sinistro", "Mediano 1", "Mediano 2", "Esterno destro", "Trequartista", "Esterno sinistro", "Attaccante"],
  "3-4-2-1": ["Portiere", "Difensore centrale 1", "Difensore centrale 2", "Difensore centrale 3", "Esterno destro", "Centrocampista 1", "Centrocampista 2", "Esterno sinistro", "Trequartista 1", "Trequartista 2", "Attaccante"],
  "3-5-2": ["Portiere", "Difensore centrale 1", "Difensore centrale 2", "Difensore centrale 3", "Mediano", "Esterno destro", "Centrocampista 1", "Centrocampista 2", "Esterno sinistro", "Attaccante 1", "Attaccante 2"],
  "5-3-2": ["Portiere", "Terzino destro", "Difensore centrale 1", "Difensore centrale 2", "Difensore centrale 3", "Terzino sinistro", "Centrocampista 1", "Centrocampista 2", "Centrocampista 3", "Attaccante 1", "Attaccante 2"]
};

let realPlayers = [];
let savedLineup = {};

window.onload = () => {
  loadSavedData();
};

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tabs button').forEach(el => el.removeAttribute('aria-current'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  btn.setAttribute('aria-current', 'page');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  if (current === 'light') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', 'light');
}

// Estrazione dati sicura ed esaustiva da strutture dinamiche o frammenti di testo
function parseAndSaveData() {
  const rawM = document.getElementById("json-members").value;
  const rawX = document.getElementById("json-matches").value;

  let membersData = extractMembersWithStats(rawM);
  let matchesData = extractMatches(rawX);

  if (membersData.length > 0) {
    renderMembers(membersData);
    localStorage.setItem("ea_members_cache", JSON.stringify(membersData));
  }

  if (matchesData.length > 0 || typeof matchesData === 'object') {
    renderMatches(matchesData);
    localStorage.setItem("ea_matches_cache", JSON.stringify(matchesData));
  }

  if (membersData.length > 0 || matchesData.length > 0) {
    alert("✅ Dati elaborati con successo e salvati nella memoria dell'app!");
    switchTab('squadra', document.querySelectorAll('.tabs button')[0]);
  } else {
    alert("⚠️ Non è stato possibile elaborare i dati. Assicurati di aver incollato il testo dai link forniti.");
  }
}

function extractMembersWithStats(raw) {
  if (!raw) return [];

  // Prova parsing JSON standard
  try {
    const parsed = JSON.parse(raw);
    let arr = Array.isArray(parsed) ? parsed : (parsed.members || Object.values(parsed));
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.map(m => ({
        name: m.name || m.proName || m.nameRaw || "Giocatore",
        gamesPlayed: m.gamesPlayed || m.games || 0,
        goals: m.goals || 0,
        assists: m.assists || 0,
        rating: m.ratingAve || m.rating || "-",
        proPos: m.proPos || m.favoritePosition || "Giocatore"
      }));
    }
  } catch(e) {}

  // Estrazione via Regex avanzata se il JSON è troncato/incompleto
  let results = [];
  const playerBlocks = raw.split(/\{|\}/);
  
  playerBlocks.forEach(block => {
    const nameMatch = block.match(/"(?:name|proName|nameRaw)"\s*:\s*"([^"]+)"/);
    if (nameMatch) {
      const name = nameMatch[1];
      const games = (block.match(/"gamesPlayed"\s*:\s*"?(\d+)"?/) || [])[1] || 0;
      const goals = (block.match(/"goals"\s*:\s*"?(\d+)"?/) || [])[1] || 0;
      const assists = (block.match(/"assists"\s*:\s*"?(\d+)"?/) || [])[1] || 0;
      const rating = (block.match(/"ratingAve"\s*:\s*"?([\d.]+)"?/) || [])[1] || "-";
      const pos = (block.match(/"proPos"\s*:\s*"([^"]+)"/) || [])[1] || "Giocatore";

      if (!results.some(r => r.name === name)) {
        results.push({ name, gamesPlayed: games, goals, assists, rating, proPos: pos });
      }
    }
  });

  return results;
}

function extractMatches(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.matches || Object.values(parsed));
  } catch(e) {
    return [];
  }
}

function loadSavedData() {
  const cM = localStorage.getItem("ea_members_cache");
  const cX = localStorage.getItem("ea_matches_cache");
  if(cM) try { renderMembers(JSON.parse(cM)); } catch(e){}
  if(cX) try { renderMatches(JSON.parse(cX)); } catch(e){}
  
  const rawF = localStorage.getItem("sisal_fc_formation_data");
  if (rawF) {
    const parsed = JSON.parse(rawF);
    document.getElementById("formation-select").value = parsed.scheme || "4-3-3";
    savedLineup = parsed.lineup || {};
  }
}

function renderMembers(members) {
  const list = document.getElementById("players-list");
  list.innerHTML = "";
  realPlayers = [];

  if (Array.isArray(members) && members.length > 0) {
    members.forEach(m => {
      if (m.name && !realPlayers.includes(m.name)) realPlayers.push(m.name);
      
      list.innerHTML += `
        <div class="player-card-item">
          <div>
            <strong>${m.name}</strong>
            <div class="player-stats-detail">
              🎮 Presenze: <b>${m.gamesPlayed}</b> | ⚽ Gol: <b>${m.goals}</b> | 🅰️ Assist: <b>${m.assists}</b> | ⭐ Media: <b>${m.rating}</b>
            </div>
          </div>
          <span class="badge v">${m.proPos}</span>
        </div>
      `;
    });
    changeFormation();
  }
}

function renderMatches(data) {
  const list = document.getElementById("recent-matches-list");
  list.innerHTML = "";
  let wins = 0, draws = 0, losses = 0;

  let matches = Array.isArray(data) ? data : [];

  if (matches.length > 0) {
    matches.forEach(m => {
      if(!m.clubs) return;
      const clubInfo = Object.values(m.clubs).find(c => c.id == CLUB_ID);
      const oppInfo = Object.values(m.clubs).find(c => c.id != CLUB_ID);

      if (clubInfo && oppInfo) {
        const goalsFor = parseInt(clubInfo.goals);
        const goalsAgainst = parseInt(oppInfo.goals);
        let outcome = "N";

        if (goalsFor > goalsAgainst) { wins++; outcome = "V"; }
        else if (goalsFor === goalsAgainst) { draws++; outcome = "N"; }
        else { losses++; outcome = "P"; }

        list.innerHTML += `
          <div class="match-item">
            <div><strong>vs ${oppInfo.details?.name || 'Avversario'}</strong></div>
            <div>
              <span style="font-weight: 700; margin-right: 8px;">${goalsFor} - ${goalsAgainst}</span>
              <span class="badge ${outcome === 'V' ? 'v' : 'p'}">${outcome === 'V' ? 'VITTORIA' : (outcome === 'N' ? 'PAREGGIO' : 'SCONFITTA')}</span>
            </div>
          </div>
        `;
      }
    });

    document.getElementById("stat-matches").innerText = matches.length;
    document.getElementById("stat-wins").innerText = wins;
    document.getElementById("stat-draws").innerText = draws;
    document.getElementById("stat-losses").innerText = losses;
  }
}

function changeFormation() {
  const scheme = document.getElementById("formation-select").value;
  const roles = formationsMap[scheme];
  const container = document.getElementById("roles-container");
  container.innerHTML = "";

  roles.forEach(role => {
    const savedVal = savedLineup[role] || "";
    const div = document.createElement("div");
    div.className = "role-item";

    let options = `<option value="">-- Vuoto --</option>`;
    realPlayers.forEach(p => {
      options += `<option value="${p}" ${savedVal === p ? 'selected' : ''}>${p}</option>`;
    });
    options += `<option value="IA (bot)" ${savedVal === 'IA (bot)' ? 'selected' : ''}>🤖 IA (bot)</option>`;

    div.innerHTML = `
      <label>${role}</label>
      <select id="role-${role}" onchange="renderPitch()">
        ${options}
      </select>
    `;
    container.appendChild(div);
  });

  renderPitch();
}

function renderPitch() {
  const scheme = document.getElementById("formation-select").value;
  const roles = formationsMap[scheme];

  const pDef = document.getElementById("pitch-def");
  const pMid = document.getElementById("pitch-mid");
  const pAtt = document.getElementById("pitch-att");

  pDef.innerHTML = ""; pMid.innerHTML = ""; pAtt.innerHTML = "";

  roles.forEach(role => {
    const select = document.getElementById(`role-${role}`);
    const val = select ? select.value : (savedLineup[role] || "");
    if (!val) return;

    const tag = document.createElement("div");
    tag.className = "player-tag";
    tag.innerText = `${role}: ${val}`;

    const rLower = role.toLowerCase();
    if (rLower.includes("portiere") || rLower.includes("difensore") || rLower.includes("terzino")) {
      pDef.appendChild(tag);
    } else if (rLower.includes("centrocampista") || rLower.includes("mediano") || rLower.includes("esterno") || rLower.includes("trequartista")) {
      pMid.appendChild(tag);
    } else {
      pAtt.appendChild(tag);
    }
  });
}

function saveFormation() {
  const scheme = document.getElementById("formation-select").value;
  const roles = formationsMap[scheme];
  const lineup = {};

  roles.forEach(role => {
    const select = document.getElementById(`role-${role}`);
    if (select) lineup[role] = select.value;
  });

  localStorage.setItem("sisal_fc_formation_data", JSON.stringify({ scheme, lineup }));
  alert("Formazione salvata con successo!");
}

function autoSuggest() {
  const scheme = document.getElementById("formation-select").value;
  const roles = formationsMap[scheme];
  let pool = [...realPlayers];

  roles.forEach(role => {
    const select = document.getElementById(`role-${role}`);
    if (select) select.value = pool.length > 0 ? pool.shift() : "IA (bot)";
  });

  renderPitch();
}
