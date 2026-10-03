function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

const GROQ_MODEL = String(process.env.GROQ_MODEL || 'openai/gpt-oss-20b').trim();
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const maxDuration = 60;

export async function POST(request) {
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405);

  const apiKey = String(process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    return json({
      error: 'Manca GROQ_API_KEY nelle Environment Variables di Vercel. L\'assistente non usa Gemini come fallback, così la quota Gemini resta protetta.',
      code: 'MISSING_GROQ_API_KEY'
    }, 500);
  }

  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'Richiesta non valida.', code: 'BAD_JSON' }, 400); }

  const question = String(body?.question || '').trim();
  if (!question) return json({ error: 'Scrivi una domanda.', code: 'MISSING_QUESTION' }, 400);

  const mode = body?.mode === 'opponent' ? 'opponent' : 'normal';
  const context = prepareContext({
    mode,
    team: body?.team,
    opponent: body?.opponent,
    formation: body?.formation,
    notes: body?.notes,
    knowledge: body?.knowledge
  });

  const messages = [
    {
      role: 'system',
      content: [
        'Sei l’assistente tattico di EA SPORTS FC 27 Clubs.',
        'Rispondi in italiano in modo pratico, diretto e conciso.',
        'Usa esclusivamente i dati ricevuti come dati numerici: non inventare statistiche.',
        'recent5 = ultime 5 partite; cumulative = totale disponibile.',
        'Passaggi riusciti/tentati = passMade/passAttempts. Contrasti riusciti/tentati = tackleMade/tackleAttempts.',
        'Distingui chiaramente dati osservati da inferenze tattiche.',
        'La knowledge FC27 è materiale di supporto, non una fonte per inventare numeri del club.',
        'Massimo 220 parole e massimo 4 sezioni. Niente elenco giocatore-per-giocatore salvo richiesta esplicita.'
      ].join('\n')
    },
    {
      role: 'user',
      content: `RICHIESTA:\n${question}\n\nCONTESTO CLUBS:\n${JSON.stringify(context)}`
    }
  ];

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.2, max_tokens: 800, stream: false })
    });

    const raw = await response.text();
    const data = safeJson(raw);
    if (!response.ok) {
      return json({
        answer: localFallback({ mode, team: context.team, opponent: context.opponent }),
        model: GROQ_MODEL,
        source: 'local-fallback',
        detail: data?.error?.message || `Groq HTTP ${response.status}`,
        groqRequest: 1
      }, 200);
    }

    const answer = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!answer) {
      return json({
        answer: localFallback({ mode, team: context.team, opponent: context.opponent }),
        model: GROQ_MODEL,
        source: 'local-fallback',
        detail: 'Groq non ha restituito testo.',
        groqRequest: 1
      }, 200);
    }

    return json({ answer, model: GROQ_MODEL, source: 'groq', groqRequest: 1 }, 200);
  } catch (error) {
    return json({
      answer: localFallback({ mode, team: context.team, opponent: context.opponent }),
      model: GROQ_MODEL,
      source: 'local-fallback',
      detail: String(error?.message || 'Errore Groq.'),
      groqRequest: 1
    }, 200);
  }
}

function prepareContext({ mode, team, opponent, formation, notes, knowledge }) {
  return {
    mode,
    formation: sanitizeFormation(formation),
    notes: String(notes || '').slice(0, 1200),
    team: sanitizeClub(team),
    opponent: mode === 'opponent' ? sanitizeClub(opponent) : null,
    knowledge: sanitizeKnowledge(knowledge)
  };
}

function sanitizeClub(value) {
  if (!value || typeof value !== 'object') return null;
  const team = value.team || {};
  const summary = value.summary || {};
  const players = Array.isArray(value.players) ? value.players.slice(0, 40).map(sanitizePlayer) : [];
  const recent5 = Array.isArray(value.recent5) ? value.recent5.slice(0, 5).map(m => sanitizeObject(m, 20)) : [];
  return {
    team: sanitizeObject(team, 30),
    summary: {
      cumulative: sanitizeObject(summary.cumulative || {}, 25),
      recent5: sanitizeObject(summary.recent5 || {}, 25)
    },
    players,
    recent5
  };
}

function sanitizePlayer(player) {
  if (!player || typeof player !== 'object') return {};
  return sanitizeObject({
    name: player.name, pos: player.pos, observedDepartment: player.observedDepartment,
    ovr: player.ovr, games: player.games, goals: player.goals, assists: player.assists,
    rating: player.rating, passMade: player.passMade, passAttempts: player.passAttempts, pass: player.pass,
    tackleMade: player.tackleMade, tackleAttempts: player.tackleAttempts, tackle: player.tackle,
    recent5: player.recent5
  }, 22);
}

function sanitizeObject(value, maxKeys = 25) {
  if (!value || typeof value !== 'object') return value ?? null;
  const out = {};
  for (const key of Object.keys(value).slice(0, maxKeys)) {
    const v = value[key];
    if (typeof v === 'string') out[key] = v.slice(0, 500);
    else if (Array.isArray(v)) out[key] = v.slice(0, 8);
    else if (v && typeof v === 'object') out[key] = sanitizeObject(v, 12);
    else out[key] = v;
  }
  return out;
}

function sanitizeFormation(value) {
  if (!value || typeof value !== 'object') return null;
  return sanitizeObject({ formation: value.formation, tactics: value.tactics, players: value.players }, 8);
}

function sanitizeKnowledge(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    updatedAt: value.updatedAt || null,
    videosAnalyzed: Number(value.videosAnalyzed || 0),
    insights: Array.isArray(value.insights) ? value.insights.slice(0, 6).map(item => ({
      title: String(item?.title || '').slice(0, 160),
      evidenceLevel: item?.evidenceLevel || null,
      confidence: item?.confidence || null,
      summary: String(item?.summary || '').slice(0, 600),
      coachingPoints: Array.isArray(item?.coachingPoints) ? item.coachingPoints.slice(0, 4) : [],
      tacticalFindings: Array.isArray(item?.tacticalFindings) ? item.tacticalFindings.slice(0, 4) : [],
      patchOrMetaClaims: Array.isArray(item?.patchOrMetaClaims) ? item.patchOrMetaClaims.slice(0, 4) : [],
      caveats: Array.isArray(item?.caveats) ? item.caveats.slice(0, 4) : []
    })) : []
  };
}

function safeJson(raw) { try { return raw ? JSON.parse(raw) : {}; } catch { return {}; } }

function localFallback({ mode, team, opponent }) {
  const source = mode === 'opponent' ? opponent : team;
  const summary = source?.summary || {};
  const recent = summary.recent5 || {};
  const cumulative = summary.cumulative || {};
  const name = source?.team?.name || 'Squadra';
  const lines = [
    'ANALISI DATI',
    `${name}: ultime 5 ${recent.wins ?? 0}V-${recent.draws ?? 0}P-${recent.losses ?? 0}S, ${recent.goals ?? 0} gol fatti / ${recent.against ?? 0} subiti.`,
    `Totale disponibile: ${cumulative.matches ?? 0} partite, ${cumulative.goals ?? 0} gol fatti / ${cumulative.against ?? 0} subiti.`
  ];
  if (recent.passRate != null) lines.push(`Passaggi recenti: ${Number(recent.passRate).toFixed(1)}%.`);
  if (recent.tackleRate != null) lines.push(`Contrasti recenti: ${Number(recent.tackleRate).toFixed(1)}%.`);
  return lines.join('\n');
}
