import { detectKnownProClubsFile } from './proclubs-schema.js';
const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CATEGORIES = [
  'totals', 'season', 'clubInfo', 'overallStats', 'players', 'career',
  'league', 'playoffs', 'friendlies', 'playoffAchievements'
];

const LABELS = {
  totals: 'Dati totali',
  season: 'Stagione corrente',
  clubInfo: 'Informazioni club',
  overallStats: 'Overall Stats',
  players: 'Giocatori',
  career: 'Carriera giocatori',
  league: 'Campionato',
  playoffs: 'Playoff',
  friendlies: 'Amichevoli',
  playoffAchievements: 'Playoff Achievements'
};

function clean(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function safeJson(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function number(value) {
  const n = Number(String(value ?? '').replace(',', '.').replace('%', '').trim());
  return Number.isFinite(n) ? n : null;
}

function clampText(value, max = 26000) {
  return String(value ?? '').slice(0, max);
}

function extractText(data) {
  return data?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').filter(Boolean).join('\n').trim() || '';
}

function parseKeyValues(text) {
  const out = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*:\s*(.*?)\s*$/i);
    if (m) out[m[1].toUpperCase()] = clean(m[2]);
  }
  return out;
}

function parseTotals(text) {
  const kv = parseKeyValues(text);
  const aliases = {
    matches: ['MATCHES', 'GAMES', 'PLAYED', 'PARTITE'],
    wins: ['WINS', 'VITTORIE'],
    draws: ['DRAWS', 'TIES', 'PAREGGI'],
    losses: ['LOSSES', 'SCONFITTE'],
    goals: ['GOALS', 'GOALS_FOR', 'GOALS_SCORED', 'GF', 'GOL_FATTI'],
    against: ['AGAINST', 'GOALS_AGAINST', 'GOALS_CONCEDED', 'GA', 'GOL_SUBITI']
  };
  const out = {};
  for (const [target, keys] of Object.entries(aliases)) {
    for (const key of keys) {
      if (kv[key] !== undefined) {
        const n = number(kv[key]);
        if (n != null) { out[target] = n; break; }
      }
    }
  }
  if (kv.TOTALS) {
    const flat = kv.TOTALS.replace(/[|,;]/g, ' ');
    const patterns = {
      matches: /(?:matches|partite|played)\s*[=:]\s*(\d+)/i,
      wins: /(?:wins|vittorie|w)\s*[=:]\s*(\d+)/i,
      draws: /(?:draws|ties|pareggi|d)\s*[=:]\s*(\d+)/i,
      losses: /(?:losses|sconfitte|l)\s*[=:]\s*(\d+)/i,
      goals: /(?:goals|goals for|goals scored|gf|gol fatti)\s*[=:]\s*(\d+)/i,
      against: /(?:against|goals against|goals conceded|ga|gol subiti)\s*[=:]\s*(\d+)/i
    };
    for (const [key, re] of Object.entries(patterns)) {
      if (out[key] == null) { const m = flat.match(re); if (m) out[key] = Number(m[1]); }
    }
  }
  return ['matches','wins','draws','losses','goals','against'].every(k => Number.isInteger(out[k]) && out[k] >= 0) ? out : null;
}

function parseConfidence(text) {
  const kv = parseKeyValues(text);
  const n = number(kv.CONFIDENCE);
  return n == null ? 0.5 : Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
}

function summarizeShape(value, depth = 0) {
  if (depth > 3) return typeof value;
  if (Array.isArray(value)) return { type: 'array', length: value.length, sample: value.slice(0, 2).map(v => summarizeShape(v, depth + 1)) };
  if (!value || typeof value !== 'object') return { type: typeof value };
  const keys = Object.keys(value).slice(0, 80);
  const sample = {};
  for (const key of keys.slice(0, 20)) sample[key] = summarizeShape(value[key], depth + 1);
  return { type: 'object', keys, sample };
}

async function recognizeDataFile(apiKey, { fileName, raw, knownCategory = null, knownSignature = null }) {
  const prompt = [
    'Sei un classificatore di esportazioni JSON di Pro Clubs Tracker.',
    'Devi riconoscere automaticamente il tipo del file e, se è il file Dati totali, estrarre anche i 6 totali storici.',
    '',
    'CATEGORIE AMMESSE:',
    ...CATEGORIES.map(c => `${c} = ${LABELS[c]}`),
    '',
    `NOME FILE: ${fileName}`,
    `FIRMA STRUTTURALE DETERMINISTICA: ${knownSignature || 'nessuna'}`,
    `CATEGORIA STRUTTURALE GIÀ RICONOSCIUTA (usa questa come riferimento prioritario): ${knownCategory || 'nessuna'}`,
    '',
    'SHAPE DEL JSON:',
    JSON.stringify(summarizeShape(raw)),
    '',
    'ESTRATTO JSON (solo per aiutarti a capire la struttura):',
    clampText(JSON.stringify(raw), 20000),
    '',
    'REGOLE:',
    'Scegli una sola categoria. Il nome file è un indizio ma la struttura del JSON ha priorità.',
    'Se il file contiene una lista di partite con matchType, scegli league, playoffs o friendlies in base al contenuto/nome.',
    'Se contiene membri/statistiche dei singoli giocatori, scegli players. Se è esplicitamente carriera/stagioni/career, scegli career.',
    'Se contiene il record storico generale della squadra, scegli totals e, in quel caso, estrai matches, wins, draws, losses, goals, against.',
    'Non inventare valori mancanti.',
    'Rispondi SOLO con righe KEY: VALUE nel formato seguente.',
    'CATEGORY: totals|season|clubInfo|overallStats|players|career|league|playoffs|friendlies|playoffAchievements',
    'CONFIDENCE: 0.00-1.00',
    'CLUB_ID: ...',
    'CLUB_NAME: ...',
    'SUMMARY: ...',
    'MATCHES: ...',
    'WINS: ...',
    'DRAWS: ...',
    'LOSSES: ...',
    'GOALS: ...',
    'AGAINST: ...'
  ].join('\n');

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 450 } })
  });
  const rawResponse = await response.text();
  const data = safeJson(rawResponse);
  if (!response.ok) throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
  const text = extractText(data);
  if (!text) throw new Error('Gemini non ha restituito una classificazione.');

  const kv = parseKeyValues(text);
  const category = CATEGORIES.includes(kv.CATEGORY) ? kv.CATEGORY : null;
  if (!category) throw new Error('Gemini non ha riconosciuto una categoria valida.');
  const deterministic = detectKnownProClubsFile(raw, fileName);
  const result = {
    category,
    confidence: parseConfidence(text),
    clubId: clean(kv.CLUB_ID || '') || null,
    clubName: clean(kv.CLUB_NAME || '') || null,
    summary: clean(kv.SUMMARY || '') || null,
    deterministicCategory: deterministic?.category || knownCategory || null,
    deterministicSignature: deterministic?.signature || knownSignature || null,
    deterministicMatch: Boolean(deterministic?.category && deterministic.category === category),
    recognizedBy: 'gemini',
    model: GEMINI_MODEL,
    recognizedAt: new Date().toISOString()
  };
  const totals = parseTotals(text);
  if (category === 'totals' && totals) result.totals = totals;
  return result;
}

export { CATEGORIES, LABELS, recognizeDataFile, summarizeShape, parseTotals };
