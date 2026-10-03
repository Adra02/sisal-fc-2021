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
    secondsPlayed: number(p.secondsPlayed)
  };
}

function compactSeasonPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    position: p.position || null,
    proName: p.proName || null,
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
      redcards: number(p.redcards)
    }));
  return {
    id: m.id,
    timestamp: m.timestamp,
    competition: m.competition,
    own: own ? { id: own.id, name: own.name, goals: number(own.goals) } : null,
    opponent: opp ? { id: opp.id, name: opp.name, goals: number(opp.goals) } : null,
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
    matchArchive: (team.matchArchive || team.matches || []).map(m => compactMatch(m, team.club?.id))
  };
}

function buildPrompt({ question, mode, notes, formation, own, opponent, knowledge }) {
  const modeText = mode === 'opponent'
    ? 'scouting dell’avversario e confronto con la nostra squadra'
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
    'La sezione fun contiene record e curiosità calcolati dal backend: può essere usata come contesto numerico.',
    'La knowledge FC27 è solo contesto generale sul gameplay; non sostituisce i dati della squadra.',
    '',
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

async function askGemini(apiKey, prompt) {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 2600,
        responseMimeType: 'text/plain'
      }
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

    const knowledge = body?.knowledge && typeof body.knowledge === 'object'
      ? {
          updatedAt: body.knowledge.updatedAt || null,
          videosAnalyzed: number(body.knowledge.videosAnalyzed),
          insights: Array.isArray(body.knowledge.insights) ? body.knowledge.insights.slice(0, 30) : []
        }
      : null;

    const prompt = buildPrompt({
      question,
      mode: body?.mode === 'opponent' ? 'opponent' : 'normal',
      notes: body?.notes,
      formation: body?.formation,
      own,
      opponent,
      knowledge
    });

    const answer = await askGemini(apiKey, prompt);
    return json({
      ok: true,
      answer,
      model: GEMINI_MODEL,
      source: 'central-shared-dataset',
      searchGrounding: false,
      geminiRequests: 1,
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
