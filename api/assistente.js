import { buildTeam } from '../lib/data-pipeline.js';
import { hasBlobConfig, readAllFiles } from '../lib/shared-store.js';

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
export const maxDuration = 60;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function safeJson(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function clampText(value, max = 1400) {
  return String(value ?? '').slice(0, max);
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function compactRecentPlayer(p) {
  if (!p) return null;
  return {
    appearances: number(p.appearances ?? p.games),
    goals: number(p.goals),
    assists: number(p.assists),
    rating: p.rating == null ? null : number(p.rating),
    shots: number(p.shots),
    passesMade: number(p.passesMade),
    passAttempts: number(p.passAttempts),
    passAccuracy: p.passAccuracy == null ? null : number(p.passAccuracy),
    tacklesMade: number(p.tacklesMade),
    tackleAttempts: number(p.tackleAttempts),
    tackleSuccess: p.tackleSuccess == null ? null : number(p.tackleSuccess),
    saves: number(p.saves),
    cleanSheets: number(p.cleanSheets),
    mom: number(p.mom),
    redcards: number(p.redcards),
    fouls: p.fouls == null ? null : number(p.fouls),
    secondsPlayed: number(p.secondsPlayed),
    platform: p.platform || null
  };
}

function compactSeasonPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    position: p.position || null,
    proName: p.proName || null,
    platform: p.platform || null,
    ovr: p.ovr == null ? null : number(p.ovr),
    games: p.games == null ? null : number(p.games),
    goals: number(p.goals),
    assists: number(p.assists),
    rating: p.rating == null ? null : number(p.rating),
    winRate: p.winRate == null ? null : number(p.winRate),
    shots: number(p.shots),
    shotAccuracy: p.shotAccuracy == null ? null : number(p.shotAccuracy),
    passesMade: number(p.passesMade),
    passAttempts: p.passAttempts == null ? null : number(p.passAttempts),
    passAccuracy: p.passAccuracy == null ? null : number(p.passAccuracy),
    tacklesMade: number(p.tacklesMade),
    tackleAttempts: p.tackleAttempts == null ? null : number(p.tackleAttempts),
    tackleSuccess: p.tackleSuccess == null ? null : number(p.tackleSuccess),
    saves: number(p.saves),
    cleanSheets: number(p.cleanSheets),
    mom: number(p.mom),
    redcards: number(p.redcards),
    fouls: p.fouls == null ? null : number(p.fouls),
    secondsPlayed: p.secondsPlayed == null ? null : number(p.secondsPlayed),
    goalsPerGame: p.games ? number(p.goals) / number(p.games) : 0,
    assistsPerGame: p.games ? number(p.assists) / number(p.games) : 0,
    scope: p.sourceScope || 'unknown',
    recent5: compactRecentPlayer(p.recent5),
    fromUploadedMatchArchive: compactRecentPlayer(p.matchAggregate)
  };
}

function compactMatch(m, clubId) {
  const own = m.clubs.find(c => String(c.id) === String(clubId)) || m.clubs[0];
  const opp = m.clubs.find(c => String(c.id) !== String(own?.id)) || m.clubs[1];
  const ownPlayers = (m.players || [])
    .filter(p => !clubId || !p.clubId || String(p.clubId) === String(clubId))
    .sort((a, b) => number(b.secondsPlayed) - number(a.secondsPlayed) || number(b.rating) - number(a.rating))
    .slice(0, 14)
    .map(p => ({
      name: p.name,
      position: p.position || null,
      goals: number(p.goals),
      assists: number(p.assists),
      rating: p.rating == null ? null : number(p.rating),
      shots: number(p.shots),
      passesMade: number(p.passesMade),
      passAttempts: number(p.passAttempts),
      tacklesMade: number(p.tacklesMade),
      tackleAttempts: number(p.tackleAttempts),
      saves: number(p.saves),
      secondsPlayed: number(p.secondsPlayed),
      mom: number(p.mom),
      redcards: number(p.redcards),
      fouls: p.fouls == null ? null : number(p.fouls)
    }));
  return {
    id: m.id,
    timestamp: m.timestamp,
    competition: m.competition,
    own: own ? { id: own.id, name: own.name, goals: number(own.goals), fouls: own.fouls == null ? null : number(own.fouls) } : null,
    opponent: opp ? { id: opp.id, name: opp.name, goals: number(opp.goals), fouls: opp.fouls == null ? null : number(opp.fouls) } : null,
    players: ownPlayers
  };
}

function compactTeam(team) {
  if (!team) return null;
  return {
    role: team.role,
    club: team.club,
    fileStatus: team.fileStatus,
    complete: Boolean(team.complete),
    ready: Boolean(team.ready),
    playerStatsScope: team.playerStatsScope,
    playerStatsScopeLabel: team.playerStatsScopeLabel,
    overall: (() => {
      const { fouls, foulsAvailableMatches, foulsCoverage, foulsPerAvailableMatch, ...overallWithoutFouls } = team.overall || {};
      return overallWithoutFouls;
    })(),
    byCompetition: team.byCompetition,
    recent5: {
      team: team.recent5?.team || null,
      players: (team.recent5?.players || []).map(compactRecentPlayer),
      matches: (team.recent5?.matches || []).map(m => compactMatch(m, team.club?.id))
    },
    recent10: {
      team: team.recent10?.team || null,
      players: (team.recent10?.players || []).map(compactRecentPlayer),
      matches: (team.recent10?.matches || []).map(m => compactMatch(m, team.club?.id))
    },
    players: (team.players || []).map(compactSeasonPlayer),
    rosterReconciliation: team.rosterReconciliation || null,
    dataQuality: team.dataQuality || null,
    fun: team.fun || null,
    matchArchive: (team.matchArchive || team.matches || []).map(m => compactMatch(m, team.club?.id))
  };
}

function buildPrompt({ question, mode, notes, formation, formationCatalog, own, opponent, knowledge }) {
  const modeText = mode === 'opponent'
    ? 'scouting dell’avversario e confronto con la nostra squadra'
    : mode === 'fun'
      ? 'creazione della sezione Fun: superlativi, banter leggero, forma recente, impatto e record'
      : mode === 'audit'
        ? 'controllo qualità del dataset e ricerca di incoerenze senza modificare i numeri'
        : mode === 'fouls'
          ? 'analisi disciplinare dei falli totali della squadra senza ricostruire numeri mancanti'
          : mode === 'formation'
            ? 'scelta da parte dell’IA della formazione e degli 11 ruoli titolari usando i dati della squadra'
            : 'analisi approfondita della nostra squadra';

  return [
    'Sei l’assistente tattico di EA SPORTS FC 27 Clubs per una squadra privata.',
    `Obiettivo: ${modeText}.`,
    '',
    'FONTE DATI OBBLIGATORIA:',
    'I dati numerici arrivano esclusivamente dai file JSON/TXT caricati nell’archivio centrale.',
    'Non cercare dati sul web, non usare API EA, non usare Pro Clubs Tracker e non inventare informazioni.',
    '',
    'SEPARAZIONE DEI DATI — OBBLIGATORIA:',
    '1) `players[].games/goals/assists/rating/passAccuracy/tackleSuccess/...` sono statistiche cumulative del file Giocatori quando `playerStatsScope` è `season-player-file`.',
    '2) `recent5.team`, `recent5.players` e `recent5.matches` sono calcolati esclusivamente sulle ULTIME 5 partite archiviate, ordinate dalla più recente alla più vecchia.',
    '3) `recent10` è una finestra separata sulle ultime 10 partite.',
    '4) `matchArchive` contiene lo storico delle partite caricate. `overall.matches` è il numero di partite archiviate, non il numero di presenze sommate dai giocatori.',
    '5) `players[].fromUploadedMatchArchive` è una statistica ricavata dalle sole partite caricate e NON deve essere sommata o fusa con la statistica cumulativa del file Giocatori.',
    '6) Se `playerStatsScope` è `uploaded-matches`, le statistiche giocatore derivano dalle sole partite disponibili e non vanno chiamate “stagionali complete”.',
    '7) `overall.fouls` è il totale dei FALLI DELLA SQUADRA nell’archivio, quando i dati sorgente lo permettono. `overall.foulsAvailableMatches` e `overall.foulsCoverage` indicano su quante partite il dato è realmente disponibile.',
    '8) Non sommare mai `overall.fouls` con i falli dei singoli giocatori: il totale di squadra ha priorità e i dati parziali non vanno duplicati.',
    'NON usare mai un numeratore/denominatore proveniente da scope diversi. Per esempio, non dividere i passaggi cumulativi del file Giocatori per i tentativi delle ultime 5 partite.',
    '',
    'REGOLE DI ACCURATEZZA:',
    'Non inventare giocatori, risultati, statistiche, divisioni o eventi.',
    'Un valore 0 significa zero; null/assenza significa dato non disponibile.',
    'Calcola le percentuali riusciti/tentati solo quando i due numeri appartengono allo stesso scope.',
    'Se esiste una percentuale EA ma mancano i tentativi, usa la percentuale e dichiara che il denominatore non è disponibile.',
    'Per inferenze tattiche cita i numeri che le sostengono e presentale come inferenze.',
    'Considera insieme Campionato, Playoff e Amichevoli solo quando la domanda riguarda tutto l’archivio.',
    'Per domande sulle ultime 5 usa esclusivamente `recent5` e i cinque match più recenti; non sostituirli con le statistiche cumulative.',
    'La sezione fun contiene record e curiosità calcolati dal backend: può essere usata come contesto numerico. I record cumulative hanno etichetta cumulative; la forma è U5.',
    'Il backend non usa la IA per correggere automaticamente numeri sorgente: se trovi una discrepanza, segnalala e indica entrambi gli scope invece di scegliere arbitrariamente un valore.',
    'I giocatori del file Giocatori e quelli trovati nell’archivio partite vengono riconciliati per nome. Un giocatore match-only non va escluso. Non filtrare mai per piattaforma.',
    'Per i FALLI usa prima i totali di squadra presenti in `overall` o nel singolo match. Usa la somma dei giocatori solo quando il totale squadra non è disponibile per quella gara. Non contare due volte la stessa gara.',
    'La knowledge FC27 è solo contesto generale sul gameplay; non sostituisce i dati della squadra.',
    '',
    mode === 'fun' ? 'PER LA MODALITÀ FUN: crea una panoramica ricca e divertente ma verificabile. Usa record cumulativi, forma U5, impact score U5, hot/cold, red flags, streak e statistiche insolite. Non inventare premi o battute basate su dati assenti.' : mode === 'audit' ? 'PER LA MODALITÀ AUDIT: separa problemi reali da differenze normali tra cumulativo e U5. Classifica ogni rilievo come ERRORE, AVVISO o DIFFERENZA DI SCOPE e indica file/scope coinvolto. Non cambiare nessun numero.' : mode === 'fouls' ? 'PER LA MODALITÀ FALLI: analizza esclusivamente i falli totali di squadra realmente disponibili, indica copertura del dato, falli/partita solo sul campione con dato disponibile, andamento e possibili implicazioni disciplinari. Non inventare falli nelle gare senza dato.' : mode === 'formation' ? 'PER LA MODALITÀ FORMAZIONE: devi restituire SOLO JSON valido con `formation`, `placements`, `rationale`, `strengths`, `cautions`. Scegli una sola formazione presente nel catalogo fornito. `placements` deve contenere le preferenze IA per i titolari: usa slot 0-10, `playerId` esistenti e `role` come ruolo desiderato dall’IA. Le preferenze possono avere conflitti o ruoli sovraffollati: NON bloccare la risposta per questo. Il backend confronterà ruolo naturale, rendimento e statistiche e risolverà automaticamente i conflitti assegnando un solo posto a ogni giocatore. Usa posizione/favoritePosition e statistiche reali per scegliere i titolari; puoi usare dati cumulativi e U5 come contesto, ma non fare divisioni tra scope differenti.' : '',
    'FORMATO RISPOSTA:',
    'Rispondi in italiano. Usa sezioni brevi, numeri concreti e consigli pratici. Evita frasi generiche.',
    'Per un’analisi tattica proponi problema osservabile, possibile causa, evidenza numerica e intervento pratico.',
    'Per lo scouting avversario evidenzia stile desunto dai dati, giocatori chiave, minacce e cosa limitare.',
    'Quando citi una statistica, specifica se è STAGIONE/CUMULATIVA, ULTIME 5, ULTIME 10 oppure PARTITA SINGOLA.',
    'Non dare una valutazione politica o non pertinente: resta sul calcio e sul dataset.',
    '',
    `DOMANDA UTENTE:\n${clampText(question, 1800)}`,
    '',
    `NOTE DELLA SQUADRA:\n${clampText(notes, 1500)}`,
    '',
    `FORMAZIONE CORRENTE:\n${JSON.stringify(formation || {})}`,
    '',
    'DATASET NOSTRA SQUADRA:',
    JSON.stringify(compactTeam(own)),
    '',
    'DATASET AVVERSARIO:',
    JSON.stringify(mode === 'opponent' ? compactTeam(opponent) : null),
    '',
    'KNOWLEDGE FC27:',
    JSON.stringify(knowledge || null)
  ].join('\n');
}

async function askGemini(apiKey, prompt, { jsonMode = false, maxOutputTokens = 2600 } = {}) {
  const generationConfig = {
    maxOutputTokens,
    responseMimeType: jsonMode ? 'application/json' : 'text/plain'
  };
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig
    })
  });

  const raw = await response.text();
  const data = safeJson(raw);
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
    error.status = response.status;
    error.details = data?.error?.details || [];
    throw error;
  }

  const text = data?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('').trim();
  if (!text) throw new Error('Gemini non ha restituito testo.');
  return text;
}

function extractJsonObject(text) {
  const source = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(source);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {}

  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(source.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

const ROLE_ALIASES = {
  GK: ['gk', 'goalkeeper', 'keeper', 'portiere'],
  LB: ['lb', 'leftback', 'left back', 'terzino sinistro'],
  CB: ['cb', 'centreback', 'centerback', 'centre back', 'center back', 'difensore', 'defender'],
  RB: ['rb', 'rightback', 'right back', 'terzino destro'],
  CDM: ['cdm', 'defensive midfielder', 'mediano'],
  CM: ['cm', 'midfielder', 'centrocampista'],
  LM: ['lm', 'leftmid', 'left midfielder', 'laterale sinistro'],
  RM: ['rm', 'rightmid', 'right midfielder', 'laterale destro'],
  CAM: ['cam', 'attacking midfielder', 'trequartista'],
  LW: ['lw', 'leftwing', 'left wing', 'ala sinistra'],
  RW: ['rw', 'rightwing', 'right wing', 'ala destra'],
  ST: ['st', 'striker', 'forward', 'attaccante', 'punta'],
  CF: ['cf', 'second striker', 'support striker', 'seconda punta']
};

function normalizedRoleText(value) {
  return String(value || '').toLowerCase().trim();
}

function playerRoleTokens(player) {
  const raw = [player?.position, player?.favoritePosition, player?.secondaryPosition]
    .filter(Boolean)
    .map(normalizedRoleText)
    .join(' | ');
  const tokens = new Set();
  for (const [role, aliases] of Object.entries(ROLE_ALIASES)) {
    const compact = raw.replace(/[^a-z0-9]+/g, ' ');
    if (aliases.some(alias => {
      const a = alias.replace(/[^a-z0-9]+/g, ' ').trim();
      return compact.split(/\s+/).includes(a) || compact.includes(a);
    })) tokens.add(role);
  }
  return tokens;
}

function roleDepartment(role) {
  if (role === 'GK') return 'GK';
  if (['LB', 'CB', 'RB'].includes(role)) return 'DEF';
  if (role === 'CDM') return 'CDM';
  if (['CM', 'LM', 'RM'].includes(role)) return 'MID';
  if (['CAM', 'CF'].includes(role)) return 'AM';
  if (['LW', 'RW'].includes(role)) return 'WIDE';
  if (role === 'ST') return 'ST';
  return '';
}

function roleFitScore(player, role) {
  const tokens = playerRoleTokens(player);
  if (tokens.has(role)) return 100;
  const dep = roleDepartment(role);
  const same = [...tokens].some(x => roleDepartment(x) === dep);
  if (same) return dep === 'GK' ? 55 : 62;
  const adjacent = [...tokens].some(x => {
    const d = roleDepartment(x);
    if (dep === 'WIDE' && ['AM', 'MID'].includes(d)) return true;
    if (dep === 'AM' && ['WIDE', 'MID', 'ST'].includes(d)) return true;
    if (dep === 'ST' && ['AM', 'WIDE'].includes(d)) return true;
    if (dep === 'CDM' && d === 'MID') return true;
    if (dep === 'MID' && ['CDM', 'AM'].includes(d)) return true;
    if (dep === 'DEF' && d === 'CDM') return true;
    return false;
  });
  return adjacent ? 40 : 12;
}

function ratio(a, b) {
  const den = number(b);
  return den > 0 ? number(a) / den : null;
}

function performanceScoreForScope(player, role, scope) {
  const x = scope === 'recent5' ? player?.recent5 : player;
  if (!x) return null;
  const appearances = number(x.appearances ?? x.games);
  const values = [];
  const push = (value, weight) => {
    if (value == null || !Number.isFinite(Number(value))) return;
    values.push({ value: Math.max(0, Math.min(100, Number(value))), weight });
  };
  const rating = x.rating == null ? null : number(x.rating) * 10;
  const passAccuracy = x.passAccuracy != null
    ? number(x.passAccuracy)
    : (number(x.passAttempts) > 0 ? 100 * number(x.passesMade) / number(x.passAttempts) : null);
  const tackleSuccess = x.tackleSuccess != null
    ? number(x.tackleSuccess)
    : (number(x.tackleAttempts) > 0 ? 100 * number(x.tacklesMade) / number(x.tackleAttempts) : null);
  const goalsRate = ratio(x.goals, appearances);
  const assistsRate = ratio(x.assists, appearances);
  const shotsRate = ratio(x.shots, appearances);
  const tacklesRate = ratio(x.tacklesMade, appearances);
  const savesRate = ratio(x.saves, appearances);
  const cleanSheetRate = ratio(x.cleanSheets, appearances);

  push(rating, 36);
  if (role === 'GK') {
    if (savesRate != null) push(Math.min(100, savesRate / 4 * 100), 30);
    if (cleanSheetRate != null) push(Math.min(100, cleanSheetRate * 100), 22);
  } else if (['LB', 'CB', 'RB'].includes(role)) {
    if (tacklesRate != null) push(Math.min(100, tacklesRate / 3 * 100), 20);
    if (tackleSuccess != null) push(tackleSuccess, 14);
    if (passAccuracy != null) push(passAccuracy, 14);
    if (cleanSheetRate != null) push(Math.min(100, cleanSheetRate * 100), 8);
  } else if (['CDM', 'CM', 'LM', 'RM'].includes(role)) {
    if (passAccuracy != null) push(passAccuracy, 18);
    if (assistsRate != null) push(Math.min(100, assistsRate / 0.8 * 100), 14);
    if (goalsRate != null) push(Math.min(100, goalsRate / 0.8 * 100), 10);
    if (tacklesRate != null) push(Math.min(100, tacklesRate / 2.5 * 100), 10);
  } else {
    if (goalsRate != null) push(Math.min(100, goalsRate / 1.2 * 100), 22);
    if (assistsRate != null) push(Math.min(100, assistsRate / 1 * 100), 18);
    if (shotsRate != null) push(Math.min(100, shotsRate / 5 * 100), 10);
    if (passAccuracy != null) push(passAccuracy, 8);
  }
  if (!values.length) return null;
  const totalWeight = values.reduce((sum, x2) => sum + x2.weight, 0);
  return values.reduce((sum, x2) => sum + x2.value * x2.weight, 0) / totalWeight;
}

function playerPerformanceScore(player, role) {
  const season = performanceScoreForScope(player, role, 'season');
  const recent = number(player?.recent5?.appearances) > 0 ? performanceScoreForScope(player, role, 'recent5') : null;
  const ovr = player?.ovr == null ? null : Math.max(0, Math.min(100, number(player.ovr)));
  const base = season != null ? season : (recent != null ? recent : 0);
  const blended = recent != null ? base * 0.70 + recent * 0.30 : base;
  return ovr == null ? blended : blended * 0.86 + ovr * 0.14;
}

function hungarianMax(matrix) {
  const n = matrix.length;
  const m = matrix[0]?.length || 0;
  if (!n || n > m) return Array(n).fill(-1);
  const u = Array(n + 1).fill(0);
  const v = Array(m + 1).fill(0);
  const p = Array(m + 1).fill(0);
  const way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(m + 1).fill(Infinity);
    const used = Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j += 1) {
        if (used[j]) continue;
        const cur = -matrix[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j += 1) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }
  const assignment = Array(n).fill(-1);
  for (let j = 1; j <= m; j += 1) {
    if (p[j] !== 0) assignment[p[j] - 1] = j - 1;
  }
  return assignment;
}

function cleanFormationPreferences(rawPlacements, playerMap) {
  const bySlot = new Map();
  const byPlayer = new Map();
  for (const item of Array.isArray(rawPlacements) ? rawPlacements : []) {
    const slot = Number(item?.slot);
    const playerId = String(item?.playerId || '').trim();
    if (!Number.isInteger(slot) || slot < 0 || slot > 10 || !playerMap.has(playerId)) continue;
    if (!bySlot.has(slot)) {
      const pref = { playerId, role: String(item?.role || '').trim() };
      bySlot.set(slot, pref);
      const list = byPlayer.get(playerId) || [];
      list.push({ slot, role: pref.role });
      byPlayer.set(playerId, list);
    }
  }
  return { bySlot, byPlayer };
}

function resolveFormation(chosen, players, rawPlacements) {
  const playerList = Array.isArray(players) ? players.filter(p => String(p?.id || '').trim()) : [];
  if (playerList.length < 11) throw Object.assign(new Error('Servono almeno 11 giocatori nel dataset per costruire la formazione IA.'), { code: 'AI_FORMATION_NOT_ENOUGH_PLAYERS' });
  const playerMap = new Map(playerList.map(p => [String(p.id), p]));
  const prefs = cleanFormationPreferences(rawPlacements, playerMap);
  const matrix = chosen.roles.map((role, slot) => playerList.map(player => {
    let score = roleFitScore(player, role) * 0.55 + playerPerformanceScore(player, role) * 0.45;
    const pref = prefs.bySlot.get(slot);
    if (pref?.playerId === String(player.id)) score += 22;
    if (pref?.role && normalizedRoleText(pref.role) === normalizedRoleText(role)) score += 8;
    const playerPrefs = prefs.byPlayer.get(String(player.id)) || [];
    if (playerPrefs.some(x => normalizedRoleText(x.role) === normalizedRoleText(role))) score += 5;
    return score;
  }));
  const assignment = hungarianMax(matrix);
  const placements = assignment.map((playerIndex, slot) => {
    const player = playerList[playerIndex];
    return {
      slot,
      playerId: String(player.id),
      playerName: player.name,
      role: chosen.roles[slot]
    };
  });

  const adjustments = [];
  for (let slot = 0; slot < chosen.roles.length; slot += 1) {
    const pref = prefs.bySlot.get(slot);
    const final = placements[slot];
    if (pref && pref.playerId !== final.playerId) {
      const wanted = playerMap.get(pref.playerId);
      const fromRole = pref.role || 'ruolo richiesto dall’IA';
      adjustments.push(`Slot ${slot + 1} (${chosen.roles[slot]}): ${wanted?.name || pref.playerId} era la scelta IA (${fromRole}), ma è stato spostato a un ruolo/slot più adatto; qui subentra ${final.playerName} per compatibilità e rendimento.`);
    }
  }

  const duplicateIds = [...prefs.byPlayer.entries()].filter(([, list]) => list.length > 1).map(([id]) => id);
  if (duplicateIds.length) {
    adjustments.unshift(`Conflitti risolti automaticamente: ${duplicateIds.length} giocatore/i erano stati proposti in più slot. Sono stati confrontati ruolo naturale e statistiche per assegnare ogni giocatore a un solo posto.`);
  }

  return { placements, adjustments: adjustments.slice(0, 10) };
}

function validateFormationRecommendation(raw, players, formationCatalog) {
  if (!raw || typeof raw !== 'object') throw Object.assign(new Error('La risposta IA della formazione non è JSON valido.'), { code: 'AI_FORMATION_INVALID' });
  const catalog = Array.isArray(formationCatalog) ? formationCatalog : [];
  if (!catalog.length) throw Object.assign(new Error('Il catalogo delle formazioni del sito non è disponibile.'), { code: 'AI_FORMATION_INVALID' });

  let chosen = catalog.find(x => normalizedRoleText(x?.name) === normalizedRoleText(raw?.formation));
  if (!chosen || !Array.isArray(chosen.roles) || chosen.roles.length !== 11) {
    chosen = catalog.find(x => normalizedRoleText(x?.name) === normalizedRoleText('4-1-2-1-2 Narrow')) || catalog[0];
  }
  if (!chosen || !Array.isArray(chosen.roles) || chosen.roles.length !== 11) throw Object.assign(new Error('Il catalogo non contiene una formazione valida a 11 slot.'), { code: 'AI_FORMATION_INVALID' });

  const resolved = resolveFormation(chosen, players, raw.placements);
  return {
    formation: chosen.name,
    placements: resolved.placements,
    adjustments: resolved.adjustments,
    rationale: clampText(raw.rationale, 1800),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.slice(0, 6).map(x => clampText(x, 250)) : [],
    cautions: Array.isArray(raw.cautions) ? raw.cautions.slice(0, 6).map(x => clampText(x, 250)) : []
  };
}

function formationAnswer(recommendation) {
  const rows = recommendation.placements.map(x => `${x.role}: ${x.playerName}`).join('\n');
  const adjustments = recommendation.adjustments?.length ? `\n\nADATTAMENTI AUTOMATICI\n${recommendation.adjustments.map(x => `• ${x}`).join('\n')}` : '';
  const strengths = recommendation.strengths.length ? `\n\nPUNTI FORTI\n${recommendation.strengths.map(x => `• ${x}`).join('\n')}` : '';
  const cautions = recommendation.cautions.length ? `\n\nATTENZIONI\n${recommendation.cautions.map(x => `• ${x}`).join('\n')}` : '';
  return `FORMAZIONE IA: ${recommendation.formation}\n\n${rows}\n\nPERCHÉ\n${recommendation.rationale || 'Motivazione non fornita.'}${adjustments}${strengths}${cautions}`;
}

async function loadCentralTeams() {
  const [ownFiles, opponentFiles] = await Promise.all([
    readAllFiles('own'),
    readAllFiles('opponent')
  ]);
  return {
    own: buildTeam({ fileRecords: ownFiles, role: 'own' }),
    opponent: buildTeam({ fileRecords: opponentFiles, role: 'opponent' })
  };
}

export async function POST(request) {
  if (request.method !== 'POST') return json({ ok:false, code:'METHOD_NOT_ALLOWED', error:'Metodo non consentito.' }, 405);
  if (!hasBlobConfig()) return json({ ok:false, code:'BLOB_NOT_CONFIGURED', error:'Archivio centrale non configurato su Vercel. Collega un Vercel Blob al progetto.' }, 503);

  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return json({ ok:false, code:'MISSING_GEMINI_API_KEY', error:'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.', model:GEMINI_MODEL }, 500);

  let body = {};
  try { body = await request.json(); }
  catch { return json({ ok:false, code:'BAD_JSON', error:'Richiesta JSON non valida.' }, 400); }

  const question = String(body?.question || '').trim();
  if (!question) return json({ ok:false, code:'MISSING_QUESTION', error:'Scrivi una domanda.' }, 400);

  try {
    const { own, opponent } = await loadCentralTeams();
    if (!own.ready) return json({ ok:false, code:'OWN_DATA_EMPTY', error:'Non sono ancora presenti dati della tua squadra nell’archivio centrale. Carica almeno un file.' }, 422);
    if (body?.mode === 'opponent' && !opponent.ready) return json({ ok:false, code:'OPPONENT_DATA_EMPTY', error:'Non sono ancora presenti dati dell’avversario nell’archivio centrale. Carica almeno un file.' }, 422);

    const mode = ['opponent', 'fun', 'audit', 'fouls', 'formation'].includes(body?.mode) ? body.mode : 'normal';
    const formationCatalog = Array.isArray(body?.formationCatalog) ? body.formationCatalog.slice(0, 40) : [];

    const knowledge = body?.knowledge && typeof body.knowledge === 'object'
      ? {
          updatedAt: body.knowledge.updatedAt || null,
          videosAnalyzed: number(body.knowledge.videosAnalyzed),
          insights: Array.isArray(body.knowledge.insights) ? body.knowledge.insights.slice(0, 30) : []
        }
      : null;

    const prompt = buildPrompt({
      question,
      mode,
      notes: body?.notes,
      formation: body?.formation,
      formationCatalog,
      own,
      opponent,
      knowledge
    });

    const answer = await askGemini(apiKey, prompt, {
      jsonMode: mode === 'formation',
      maxOutputTokens: mode === 'formation' ? 1800 : 2600
    });

    if (mode === 'formation') {
      const recommendation = validateFormationRecommendation(extractJsonObject(answer), own.players, formationCatalog);
      return json({
        ok: true,
        answer: formationAnswer(recommendation),
        recommendation,
        model: GEMINI_MODEL,
        source: 'central-shared-dataset',
        searchGrounding: false,
        geminiRequests: 1,
        mode,
        ownComplete: Boolean(own.complete),
        opponentComplete: Boolean(opponent.complete)
      });
    }

    return json({
      ok: true,
      answer,
      model: GEMINI_MODEL,
      source: 'central-shared-dataset',
      searchGrounding: false,
      geminiRequests: 1,
      mode,
      ownComplete: Boolean(own.complete),
      opponentComplete: Boolean(opponent.complete)
    });
  } catch (error) {
    const status = Number(error?.status || 502);
    return json({
      ok: false,
      code: status === 429 ? 'GEMINI_QUOTA' : 'AI_REQUEST_FAILED',
      error: error?.message || 'Errore durante l’analisi IA.',
      model: GEMINI_MODEL,
      status,
      searchGrounding: false,
      geminiRequests: 1
    }, Math.min(Math.max(status, 400), 504));
  }
}
