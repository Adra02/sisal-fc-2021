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
    overall: team.overall,
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
    mode === 'fun' ? 'PER LA MODALITÀ FUN: crea una panoramica ricca e divertente ma verificabile. Usa record cumulativi, forma U5, impact score U5, hot/cold, red flags, streak e statistiche insolite. Non inventare premi o battute basate su dati assenti.' : mode === 'audit' ? 'PER LA MODALITÀ AUDIT: separa problemi reali da differenze normali tra cumulativo e U5. Classifica ogni rilievo come ERRORE, AVVISO o DIFFERENZA DI SCOPE e indica file/scope coinvolto. Non cambiare nessun numero.' : mode === 'fouls' ? 'PER LA MODALITÀ FALLI: analizza esclusivamente i falli totali di squadra realmente disponibili, indica copertura del dato, falli/partita solo sul campione con dato disponibile, andamento e possibili implicazioni disciplinari. Non inventare falli nelle gare senza dato.' : mode === 'formation' ? 'PER LA MODALITÀ FORMAZIONE: devi restituire SOLO JSON valido con `formation`, `placements`, `rationale`, `strengths`, `cautions`. Scegli una sola formazione presente nel catalogo fornito. `placements` deve contenere esattamente 11 elementi unici con `slot` 0-10, `playerId` esistente e `role` identico al ruolo previsto da quello slot. Non inventare giocatori, ruoli o ID. Usa posizione/favoritePosition e statistiche reali per scegliere i titolari; puoi usare dati cumulativi e U5 come contesto, ma non fare divisioni tra scope differenti.' : '',
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

function validateFormationRecommendation(raw, players, formationCatalog) {
  if (!raw || typeof raw !== 'object') throw Object.assign(new Error('La risposta IA della formazione non è JSON valido.'), { code: 'AI_FORMATION_INVALID' });
  const catalog = Array.isArray(formationCatalog) ? formationCatalog : [];
  const chosen = catalog.find(x => String(x?.name || '') === String(raw?.formation || ''));
  if (!chosen || !Array.isArray(chosen.roles) || chosen.roles.length !== 11) throw Object.assign(new Error('L’IA ha restituito una formazione non presente nel catalogo del sito.'), { code: 'AI_FORMATION_INVALID' });

  const playerMap = new Map((players || []).map(p => [String(p.id || ''), p]));
  const placements = Array.isArray(raw.placements) ? raw.placements : [];
  if (placements.length !== 11) throw Object.assign(new Error('L’IA non ha assegnato esattamente 11 giocatori.'), { code: 'AI_FORMATION_INVALID' });

  const usedPlayers = new Set();
  const usedSlots = new Set();
  const cleanPlacements = [];
  for (const item of placements) {
    const slot = Number(item?.slot);
    const playerId = String(item?.playerId || '').trim();
    const role = String(item?.role || '').trim();
    if (!Number.isInteger(slot) || slot < 0 || slot > 10 || usedSlots.has(slot)) throw Object.assign(new Error('La risposta IA contiene slot di formazione non validi o duplicati.'), { code: 'AI_FORMATION_INVALID' });
    if (role !== chosen.roles[slot]) throw Object.assign(new Error(`Lo slot ${slot + 1} non corrisponde al ruolo previsto (${chosen.roles[slot]}).`), { code: 'AI_FORMATION_INVALID' });
    if (usedPlayers.has(playerId)) throw Object.assign(new Error('L’IA ha assegnato lo stesso giocatore più di una volta.'), { code: 'AI_FORMATION_INVALID' });
    const player = playerMap.get(playerId);
    if (!player) throw Object.assign(new Error('L’IA ha restituito un giocatore che non esiste nel dataset.'), { code: 'AI_FORMATION_INVALID' });
    usedSlots.add(slot);
    usedPlayers.add(playerId);
    cleanPlacements.push({ slot, playerId, playerName: player.name, role });
  }
  if (usedSlots.size !== 11) throw Object.assign(new Error('Manca almeno uno slot della formazione IA.'), { code: 'AI_FORMATION_INVALID' });

  cleanPlacements.sort((a, b) => a.slot - b.slot);
  return {
    formation: chosen.name,
    placements: cleanPlacements,
    rationale: clampText(raw.rationale, 1800),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.slice(0, 6).map(x => clampText(x, 250)) : [],
    cautions: Array.isArray(raw.cautions) ? raw.cautions.slice(0, 6).map(x => clampText(x, 250)) : []
  };
}

function formationAnswer(recommendation) {
  const rows = recommendation.placements.map(x => `${x.role}: ${x.playerName}`).join('\n');
  const strengths = recommendation.strengths.length ? `\n\nPUNTI FORTI\n${recommendation.strengths.map(x => `• ${x}`).join('\n')}` : '';
  const cautions = recommendation.cautions.length ? `\n\nATTENZIONI\n${recommendation.cautions.map(x => `• ${x}`).join('\n')}` : '';
  return `FORMAZIONE IA: ${recommendation.formation}\n\n${rows}\n\nPERCHÉ\n${recommendation.rationale || 'Motivazione non fornita.'}${strengths}${cautions}`;
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
