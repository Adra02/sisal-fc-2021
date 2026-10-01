module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Manca GEMINI_API_KEY nelle Environment Variables di Vercel.' });

  const body = req.body || {};
  const question = String(body.question || '').trim();
  if (!question) return res.status(400).json({ error: 'Scrivi una domanda.' });

  const mode = body.mode === 'opponent' ? 'opponent' : 'normal';
  const team = body.team || null;
  const opponent = body.opponent || null;
  const formation = body.formation || null;
  const notes = String(body.notes || '');
  const knowledge = body.knowledge && typeof body.knowledge === 'object' ? {
    updatedAt: body.knowledge.updatedAt || null,
    videosAnalyzed: Number(body.knowledge.videosAnalyzed || 0),
    insights: Array.isArray(body.knowledge.insights) ? body.knowledge.insights.slice(0, 40).map(x => ({
      sourceType: x.sourceType, title: x.title, url: x.url, publishedAt: x.publishedAt, analyzedAt: x.analyzedAt,
      evidenceLevel: x.evidenceLevel, summary: x.summary, coachingPoints: x.coachingPoints,
      tacticalFindings: x.tacticalFindings, patchOrMetaClaims: x.patchOrMetaClaims, caveats: x.caveats
    })) : []
  } : null;

  const system = mode === 'opponent'
    ? [
        'Sei un analista tattico professionale di EA SPORTS FC Clubs.',
        'Stai facendo scouting di un avversario reale sulla base dei dati compattati forniti dal dashboard.',
        'USA TUTTI i dati numerici presenti: partite, risultati, gol, gol subiti, giocatori, presenze, gol, assist, rating, tiri, passaggi riusciti/tentati, percentuali, contrasti riusciti/tentati, parate, minuti e statistiche per partita.',
        'I campi passMade/passAttempts e tackleMade/tackleAttempts sono dati validi quando presenti, anche se provengono dall aggregazione delle singole partite.',
        'Un valore 0 significa zero; un valore null significa dato non disponibile. NON dire che una statistica è mancante se il campo numerico è presente.',
        'Non inventare valori. Se fai un inferenza tattica, dichiarala come inferenza e collegala ai dati che la sostengono.',
        'Analizza: rendimento, forma recente, produzione offensiva, vulnerabilità difensive, efficienza del possesso, contrasti, giocatori chiave, dipendenza da singoli giocatori, consistenza, calo o crescita recente, e piano partita.',
        'La base di conoscenza FC27 può contenere analisi di video YouTube e fonti ufficiali. Usa le fonti ufficiali EA come riferimento prioritario per le meccaniche; tratta le analisi dei creator come evidenza community e non come verità assolute.',
        'Se un consiglio video è specifico della patch/meta o non è verificabile dai dati della squadra, dichiaralo come tale.',
        'Quando è disponibile un confronto con la nostra squadra, usa anche quello.',
        'Rispondi in italiano con sezioni chiare e concrete. Quando parli di forma, usa per prima cosa le ultime 50 partite fornite nel campo recent.',
      ].join('\n')
    : [
        'Sei l assistente tattico professionale di una squadra EA SPORTS FC Clubs.',
        'Usa tutti i dati numerici ricevuti. Non inventare statistiche.',
        'I dati individuali sono stati unificati dal file giocatori e dalle statistiche per-partita quando disponibili.',
        'I campi passMade/passAttempts e tackleMade/tackleAttempts sono validi quando presenti. Un valore 0 e un valore null hanno significati diversi.',
        'NON dichiarare statistiche mancanti se il relativo campo numerico è presente nei dati.',
        'Distingui sempre tra dato osservato e inferenza tattica.',
        'La base di conoscenza FC27 può contenere analisi di video YouTube e fonti ufficiali. Usa le fonti ufficiali EA come riferimento prioritario per le meccaniche; tratta le analisi dei creator come evidenza community e non come verità assolute.',
        'Quando una conoscenza deriva da un video o da una teoria della community, non presentarla come regola certa del gioco.',
        'Analizza forma, produzione, efficienza, giocatori, partite, formazione e tattica quando richiesto.',
        'Rispondi in italiano, in modo pratico, ordinato e specifico.'
      ].join('\n');

  const payload = { team, opponent, formation, notes, question, knowledge, knowledgePolicy: 'official EA > repeated community evidence > single creator opinion' };
  const prompt = `${system}\n\nRICHIESTA UTENTE:\n${question}\n\nDATI STRUTTURATI:\n${JSON.stringify(payload)}`;

  const models = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
  ];

  const transient = new Set([408, 429, 500, 502, 503, 504]);

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function askModel(model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          topP: 0.9,
          maxOutputTokens: 2200
        }
      })
    });
    const raw = await r.text();
    let data = {};
    try { data = JSON.parse(raw); } catch (_) {}
    if (!r.ok) {
      const e = new Error(data?.error?.message || `Errore Gemini HTTP ${r.status}`);
      e.status = r.status;
      throw e;
    }
    const answer = data?.candidates?.[0]?.content?.parts?.map(x => x.text || '').join('').trim();
    if (!answer) throw new Error('Gemini non ha restituito testo.');
    return { answer, model };
  }

  let last = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt) await sleep(1200 * (2 ** (attempt - 1)));
        const out = await askModel(model);
        return res.status(200).json({ answer: out.answer, model: out.model, source: 'gemini' });
      } catch (e) {
        last = e;
        if (!transient.has(e.status)) break;
      }
    }
  }

  // Fallback locale: evita una schermata vuota se Gemini è temporaneamente non disponibile.
  // Non viene presentato come risposta Gemini.
  function n(v, d=0) {
    const x = Number(v);
    return Number.isFinite(x) ? x : d;
  }
  function pct(m, a) { return n(a) ? (100 * n(m) / n(a)) : null; }
  function teamStats(t) {
    const s = t?.summary || {};
    return {
      matches: n(s.matches), players: n(s.players), goals: n(s.goals), against: n(s.against),
      winRate: n(s.winRate), goalsPerMatch: n(s.goalsPerMatch), concededPerMatch: n(s.concededPerMatch),
      passRate: s.passRate == null ? null : n(s.passRate),
      tackleRate: s.tackleRate == null ? null : n(s.tackleRate),
    };
  }
  function top(players, key) {
    return [...(players || [])].sort((a,b)=>n(b[key])-n(a[key]))[0] || null;
  }
  const ts = teamStats(team), os = opponent ? teamStats(opponent) : null;
  const tp = [...(team?.players || [])];
  const op = [...(opponent?.players || [])];
  const tg = top(tp, 'goals'), ta = top(tp, 'assists'), tr = top(tp, 'rating');
  const og = top(op, 'goals'), oa = top(op, 'assists'), or = top(op, 'rating');
  const lines = [];
  lines.push('ANALISI AUTOMATICA DI EMERGENZA');
  lines.push('Gemini non era temporaneamente disponibile; questa risposta usa comunque i dati numerici caricati nel dashboard.');
  lines.push('');
  if (mode === 'opponent' && opponent) {
    lines.push(`AVVERSARIO: ${opponent.team?.name || 'Squadra avversaria'}`);
    lines.push(`Rendimento sulle ultime 50 partite disponibili: ${Math.min(50, os.matches)} partite, ${os.winRate.toFixed(1)}% vittorie, ${os.goals} gol fatti, ${os.against} subiti.`);
    if (os.goalsPerMatch) lines.push(`Produzione: ${os.goalsPerMatch.toFixed(2)} gol/partita.`);
    if (os.concededPerMatch) lines.push(`Difesa: ${os.concededPerMatch.toFixed(2)} gol subiti/partita.`);
    if (os.passRate != null) lines.push(`Passaggi: ${os.passRate.toFixed(1)}% riusciti.`);
    if (os.tackleRate != null) lines.push(`Contrasti: ${os.tackleRate.toFixed(1)}% riusciti.`);
    if (og) lines.push(`Giocatore offensivo principale: ${og.name} (${n(og.goals)} gol, ${n(og.assists)} assist).`);
    if (oa && (!og || oa.name !== og.name)) lines.push(`Creatore principale: ${oa.name} (${n(oa.assists)} assist).`);
    if (or) lines.push(`Rating più alto: ${or.name} (${n(or.rating).toFixed(2)}).`);
    if (os.goalsPerMatch >= 2) lines.push('Punto forte numerico: produzione offensiva elevata.');
    if (os.concededPerMatch >= 2) lines.push('Possibile vulnerabilità numerica: concede almeno 2 gol/partita.');
    if (os.passRate != null && os.passRate < 70) lines.push('Possibile vulnerabilità nel possesso: precisione passaggi sotto il 70%.');
    if (os.tackleRate != null && os.tackleRate < 65) lines.push('Possibile vulnerabilità nei contrasti: efficienza sotto il 65%.');
    if (team) {
      lines.push('');
      lines.push(`CONFRONTO CON NOI: noi ${ts.goalsPerMatch.toFixed(2)} gol/partita e ${ts.concededPerMatch.toFixed(2)} subiti/partita; loro ${os.goalsPerMatch.toFixed(2)} e ${os.concededPerMatch.toFixed(2)}.`);
      if (ts.passRate != null && os.passRate != null) lines.push(`Possesso: noi ${ts.passRate.toFixed(1)}% passaggi, loro ${os.passRate.toFixed(1)}%.`);
      if (ts.tackleRate != null && os.tackleRate != null) lines.push(`Contrasti: noi ${ts.tackleRate.toFixed(1)}%, loro ${os.tackleRate.toFixed(1)}%.`);
    }
  } else {
    lines.push(`SQUADRA: ${team?.team?.name || 'La tua squadra'}`);
    lines.push(`Rendimento sulle ultime 50 partite disponibili: ${Math.min(50, ts.matches)} partite, ${ts.winRate.toFixed(1)}% vittorie, ${ts.goals} gol fatti, ${ts.against} subiti.`);
    if (ts.passRate != null) lines.push(`Passaggi: ${ts.passRate.toFixed(1)}% riusciti.`);
    if (ts.tackleRate != null) lines.push(`Contrasti: ${ts.tackleRate.toFixed(1)}% riusciti.`);
    if (tg) lines.push(`Capocannoniere: ${tg.name} (${n(tg.goals)} gol).`);
    if (ta) lines.push(`Assistman: ${ta.name} (${n(ta.assists)} assist).`);
    if (tr) lines.push(`Rating migliore: ${tr.name} (${n(tr.rating).toFixed(2)}).`);
  }

  const detail = last?.message ? `Ultimo errore Gemini: ${last.message}` : 'Gemini non disponibile.';
  return res.status(200).json({ answer: lines.join('\n'), model: null, source: 'local-fallback', detail });
};
