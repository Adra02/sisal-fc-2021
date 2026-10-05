import { buildTeam, parseJsonText, normalizePlayersFile, normalizeMatchesFile, detectDataFile, extractHistoricalTotals } from '../lib/data-pipeline.js';
import { CATEGORIES, ROLES, assertCategory, assertRole, hasBlobConfig, readAllFiles, writeFile, deleteRole, readRoleTotals, writeRoleTotals, readRoleMemory, writeRoleMemory } from '../lib/shared-store.js';
import { importTrackerTotals, validateTotals, normalizeTrackerUrl } from '../lib/tracker-import.js';
import { recognizeDataFile } from '../lib/file-ai-recognizer.js';

export const maxDuration = 60;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
function latestUpdatedAt(files) {
  return Object.values(files || {}).map(f => f?.uploadedAt).filter(Boolean).sort((a,b)=>Date.parse(b)-Date.parse(a))[0] || null;
}
async function repairMissingClubProfiles(role, files) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return false;

  const categories = ['totals', 'season'];
  let repaired = false;
  for (const category of categories) {
    const fileRecord = files?.[category];
    if (!fileRecord?.raw || fileRecord?.aiRecognition?.profileFields) continue;

    try {
      const aiRecognition = await recognizeDataFile(apiKey, {
        fileName: String(fileRecord.fileName || `${category}.json`),
        raw: fileRecord.raw,
        knownCategory: category,
        knownSignature: fileRecord.detected?.signature || null
      });
      const profileFields = aiRecognition?.profileFields;
      if (!profileFields || typeof profileFields !== 'object' || !Object.keys(profileFields).length) continue;

      await writeFile({
        role,
        category,
        payload: {
          ...fileRecord,
          aiRecognition: { ...(fileRecord.aiRecognition || {}), ...aiRecognition, category, profileFields }
        }
      });
      repaired = true;
    } catch {
      // The deterministic parser remains the source of truth when Gemini is unavailable.
    }
  }
  return repaired;
}

async function loadTeam(role) {
  let [files, storedTotals, memory] = await Promise.all([readAllFiles(role), readRoleTotals(role), readRoleMemory(role)]);
  let team = buildTeam({ fileRecords: files, role });

  // V32.1.3: if the JSON is present but the club-profile block could not be read,
  // ask the already integrated Gemini recognizer to recover only explicit source fields.
  // It runs only once per file because the recovered profileFields are saved back into Blob.
  if (await repairMissingClubProfiles(role, files)) {
    files = await readAllFiles(role);
    team = buildTeam({ fileRecords: files, role });
  }

  const autoTotals = team.autoTotals?.totals ? team.autoTotals : null;
  const storedTime = storedTotals?.updatedAt ? Date.parse(storedTotals.updatedAt) : 0;
  const autoTime = autoTotals?.updatedAt ? Date.parse(autoTotals.updatedAt) : 0;
  const manualTotals = autoTotals && autoTime >= storedTime ? autoTotals : (storedTotals?.totals ? storedTotals : null);
  const trackerUrl = storedTotals?.url || null;
  return { ...team, manualTotals, trackerUrl, memory: memory || { schemaVersion: 1, snapshots: [] }, updatedAt: latestUpdatedAt(files) };
}

export async function GET() {
  if (!hasBlobConfig()) return json({ ok:false, code:'BLOB_NOT_CONFIGURED', error:'Collega un Vercel Blob al progetto prima di usare i dati condivisi.' },503);
  try {
    const [own, opponent] = await Promise.all([loadTeam('own'), loadTeam('opponent')]);
    return json({ ok:true, version:4, updatedAt:new Date().toISOString(), teams:{ own, opponent } });
  } catch(error) {
    return json({ ok:false, code:'SHARED_DATA_READ_FAILED', error:error?.message||'Impossibile leggere i dati condivisi.' },502);
  }
}


function totalsPayloadFrom(value, source = 'manual') {
  const totals = {
    matches: Number(value?.matches),
    wins: Number(value?.wins),
    draws: Number(value?.draws),
    losses: Number(value?.losses),
    goals: Number(value?.goals),
    against: Number(value?.against)
  };
  const check = validateTotals(totals);
  if (!check.ok) throw Object.assign(new Error(check.reason), { code: 'TOTALS_INVALID' });
  return {
    schemaVersion: 1,
    source,
    totals,
    goalDifference: totals.goals - totals.against,
    winRate: totals.matches ? 100 * totals.wins / totals.matches : 0,
    updatedAt: new Date().toISOString(),
    ...(value?.url ? { url: String(value.url).slice(0, 500) } : {})
  };
}

async function updateMemory(role, team) {
  const existing = await readRoleMemory(role);
  const current = {
    manualTotals: team.manualTotals?.totals || null,
    automaticTotals: team.autoTotals?.totals || null,
    archive: { matches: team.overall?.matches || 0, wins: team.overall?.wins || 0, draws: team.overall?.draws || 0, losses: team.overall?.losses || 0, goals: team.overall?.goals || 0, against: team.overall?.against || 0 },
    recent5: { matches: team.recent5?.team?.matches || 0, wins: team.recent5?.team?.wins || 0, draws: team.recent5?.team?.draws || 0, losses: team.recent5?.team?.losses || 0, goals: team.recent5?.team?.goals || 0, against: team.recent5?.team?.against || 0 },
    currentProfile: { skillRating: team.teamProfile?.overallStats?.skillRating ?? null, division: team.teamProfile?.season?.currentDivision ?? team.teamProfile?.totals?.currentDivision ?? null, winStreak: team.teamProfile?.overallStats?.wstreak ?? null, unbeatenStreak: team.teamProfile?.overallStats?.unbeatenstreak ?? null, matches: team.autoTotals?.totals?.matches ?? team.teamProfile?.overallStats?.gamesPlayed ?? null, goals: team.autoTotals?.totals?.goals ?? team.teamProfile?.overallStats?.goals ?? null, against: team.autoTotals?.totals?.against ?? team.teamProfile?.overallStats?.goalsAgainst ?? null, recentCodes: { lastMatches: Array.isArray(team.teamProfile?.overallStats?.lastMatches) ? team.teamProfile.overallStats.lastMatches : [], lastOpponents: Array.isArray(team.teamProfile?.overallStats?.lastOpponents) ? team.teamProfile.overallStats.lastOpponents : [] } },
    matchTrend: team.matchTrend || [],
    files: Object.fromEntries(Object.entries(team.fileStatus || {}).map(([category, info]) => [category, {fileName: info.fileName || null, uploadedAt: info.uploadedAt || null, present: Boolean(info.present), detection: info.detection || null, aiRecognition: info.aiRecognition ? {category: info.aiRecognition.category || null, confidence: info.aiRecognition.confidence ?? null, recognizedBy: info.aiRecognition.recognizedBy || null, summary: info.aiRecognition.summary || null} : null}])),
    teamProfile: team.teamProfile || null,
    playerSnapshot: (team.players || []).slice(0, 100).map(p => ({
      name:p.name,position:p.position||null,favoritePosition:p.favoritePosition||null,proName:p.proName||null,
      proPosCode:p.proPosCode==null?null:Number(p.proPosCode),proStyle:p.proStyle==null?null:Number(p.proStyle),proHeight:p.proHeight==null?null:Number(p.proHeight),proNationality:p.proNationality==null?null:Number(p.proNationality),ovr:p.ovr==null?null:Number(p.ovr),
      games:p.games==null?null:Number(p.games),winRate:p.winRate==null?null:Number(p.winRate),goals:Number(p.goals||0),assists:Number(p.assists||0),rating:p.rating==null?null:Number(p.rating),mom:Number(p.mom||0),
      cleanSheets:Number(p.cleanSheets||0),cleanSheetsDef:p.cleanSheetsDef==null?null:Number(p.cleanSheetsDef),cleanSheetsGK:p.cleanSheetsGK==null?null:Number(p.cleanSheetsGK),redcards:Number(p.redcards||0),
      performanceIndex:p.performanceIndex==null?null:Number(p.performanceIndex),recent5Index:p.recent5Index==null?null:Number(p.recent5Index),goalsPerGame:p.goalsPerGame==null?null:Number(p.goalsPerGame),assistsPerGame:p.assistsPerGame==null?null:Number(p.assistsPerGame),goalInvolvementPerGame:p.goalInvolvementPerGame==null?null:Number(p.goalInvolvementPerGame),shotsPerGame:p.shotsPerGame==null?null:Number(p.shotsPerGame),passPerGame:p.passPerGame==null?null:Number(p.passPerGame),tacklePerGame:p.tacklePerGame==null?null:Number(p.tacklePerGame),cleanSheetRate:p.cleanSheetRate==null?null:Number(p.cleanSheetRate),shots:Number(p.shots||0),shotAccuracy:p.shotAccuracy==null?null:Number(p.shotAccuracy),passesMade:Number(p.passesMade||0),passAttempts:p.passAttempts==null?null:Number(p.passAttempts),passAccuracy:p.passAccuracy==null?null:Number(p.passAccuracy),
      tacklesMade:Number(p.tacklesMade||0),tackleAttempts:p.tackleAttempts==null?null:Number(p.tackleAttempts),tackleSuccess:p.tackleSuccess==null?null:Number(p.tackleSuccess),saves:Number(p.saves||0),
      previousGoals:Array.isArray(p.previousGoals)?p.previousGoals:[],career:p.career||null
    }))
  };
  const fingerprint = JSON.stringify(current);
  const snapshots = Array.isArray(existing?.snapshots) ? existing.snapshots.filter(x => x?.fingerprint !== fingerprint) : [];
  snapshots.unshift({ capturedAt: new Date().toISOString(), fingerprint, ...current });
  await writeRoleMemory(role, { schemaVersion: 1, snapshots: snapshots.slice(0, 20) });
}

export async function POST(request) {
  if (!hasBlobConfig()) return json({ok:false,code:'BLOB_NOT_CONFIGURED',error:'Collega un Vercel Blob al progetto prima di caricare i dati.'},503);
  try {
    const contentType = String(request.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const role = assertRole(String(body?.role || ''));
      const action = String(body?.action || '');
      if (action === 'saveTotals') {
        const payload = totalsPayloadFrom(body?.totals, body?.source === 'proclubtracker' ? 'proclubtracker' : 'manual');
        const existing = await readRoleTotals(role);
        if (!body?.url && existing?.url) payload.url = existing.url;
        await writeRoleTotals(role, payload);
        const team = await loadTeam(role);
        await updateMemory(role, team);
        return json({ ok: true, role, manualTotals: payload, team: await loadTeam(role) });
      }
      if (action === 'saveTrackerUrl') {
        const { parsed } = normalizeTrackerUrl(String(body?.url || '').trim());
        const existing = await readRoleTotals(role);
        const payload = {
          schemaVersion: existing?.schemaVersion || 2,
          source: existing?.source || 'unset',
          ...(existing?.totals ? { totals: existing.totals } : {}),
          ...(existing?.goalDifference != null ? { goalDifference: existing.goalDifference } : {}),
          ...(existing?.winRate != null ? { winRate: existing.winRate } : {}),
          ...(existing?.importedAt ? { importedAt: existing.importedAt } : {}),
          url: parsed.href,
          updatedAt: new Date().toISOString()
        };
        await writeRoleTotals(role, payload);
        return json({ ok: true, role, trackerUrl: parsed.href, team: await loadTeam(role) });
      }
      if (action === 'removeTrackerUrl') {
        const existing = await readRoleTotals(role);
        if (existing) {
          const payload = { ...existing, updatedAt: new Date().toISOString() };
          delete payload.url;
          await writeRoleTotals(role, payload);
        }
        return json({ ok: true, role, trackerUrl: null, team: await loadTeam(role) });
      }
      if (action === 'importTracker') {
        const { parsed } = normalizeTrackerUrl(String(body?.url || '').trim());
        const trackerUrl = parsed.href;
        const existing = await readRoleTotals(role);
        const savedLinkPayload = {
          schemaVersion: existing?.schemaVersion || 2,
          source: existing?.source || 'unset',
          ...(existing?.totals ? { totals: existing.totals } : {}),
          ...(existing?.goalDifference != null ? { goalDifference: existing.goalDifference } : {}),
          ...(existing?.winRate != null ? { winRate: existing.winRate } : {}),
          ...(existing?.importedAt ? { importedAt: existing.importedAt } : {}),
          url: trackerUrl,
          updatedAt: new Date().toISOString()
        };
        await writeRoleTotals(role, savedLinkPayload);
        let imported;
        try {
          imported = await importTrackerTotals(trackerUrl);
        } catch (error) {
          return json({
            ok: false,
            role,
            code: error?.code || 'TRACKER_IMPORT_FAILED',
            error: error?.message || 'Gemini non è riuscito a importare i totali ProClubTracker.',
            trackerUrl,
            linkSaved: true
          }, error?.status && Number.isInteger(error.status) ? error.status : 422);
        }
        const payload = totalsPayloadFrom({
          matches: imported.totals.matches,
          wins: imported.totals.wins,
          draws: imported.totals.draws,
          losses: imported.totals.losses,
          goals: imported.totals.goals,
          against: imported.totals.against,
          url: imported.url
        }, 'proclubtracker');
        payload.verifiedBy = 'gemini-url-context';
        payload.ai = imported.ai || null;
        await writeRoleTotals(role, payload);
        const team = await loadTeam(role);
        await updateMemory(role, team);
        return json({ ok: true, role, imported: { ...imported, saved: true }, message: 'Totali ProClubTracker letti, verificati e salvati.' });
      }
      return json({ ok:false, code:'ACTION_NOT_SUPPORTED', error:'Azione non supportata.' },400);
    }
    const form = await request.formData();
    const role = assertRole(String(form.get('role')||''));
    const requestedCategory = String(form.get('category')||'').trim();
    if (requestedCategory) assertCategory(requestedCategory);
    const file = form.get('file');
    if (!(file instanceof File)) return json({ok:false,code:'FILE_REQUIRED',error:'Nessun file ricevuto.'},400);
    if (file.size<=0) return json({ok:false,code:'EMPTY_FILE',error:'Il file è vuoto.'},400);
    if (file.size>MAX_FILE_BYTES) return json({ok:false,code:'FILE_TOO_LARGE',error:'File troppo grande. Massimo 4 MB.'},413);
    const raw=parseJsonText(await file.text());
    let detected=detectDataFile(raw, String(file.name||''));
    let aiRecognition=null;
    const geminiKey=String(process.env.GEMINI_API_KEY||'').trim();
    if(geminiKey){
      try{
        aiRecognition=await recognizeDataFile(geminiKey,{fileName:String(file.name||''),raw,knownCategory:detected.category||null,knownSignature:detected.signature||null});
        if(!requestedCategory && aiRecognition?.confidence>=0.70){
          const exactDeterministic = detected?.confidence === 'exact';
          if (!exactDeterministic) {
            detected={...detected,category:aiRecognition.category,confidence:'ai',reason:`Gemini: ${aiRecognition.summary||'categoria riconosciuta dalla struttura del JSON'}`};
          }
        }
      }catch(error){
        detected={...detected,reason:`${detected.reason}; riconoscimento IA non disponibile: ${error?.message||'errore Gemini'}`};
      }
    }
    const category=requestedCategory || detected.category || aiRecognition?.category;
    if (!category) {
      return json({ok:false,code:'CATEGORY_NOT_RECOGNIZED',error:`Non riesco a riconoscere automaticamente il tipo di file “${file.name}”. Prova a usare il file originale di Pro Clubs Tracker o il nome della categoria.`,detected:{confidence:detected.confidence,reason:detected.reason,rows:detected.rows}},422);
    }
    if (!CATEGORIES.includes(category)) return json({ok:false,code:'CATEGORY_NOT_SUPPORTED',error:`Categoria non supportata: ${category}.`},422);
    let parsed;
    if (category==='players' || category==='career') parsed=normalizePlayersFile(raw,'');
    else if (category==='league' || category==='playoffs' || category==='friendlies') parsed=normalizeMatchesFile(raw,category);
    else parsed=raw;
    const rows=Array.isArray(parsed)?parsed.length:(parsed?1:0);
    if (!rows) return json({ok:false,code:'NO_DATA_RECOGNIZED',error:`Il file “${file.name}” non contiene dati riconoscibili.`},422);
    const payload={schemaVersion:6,role,category,fileName:String(file.name||`${category}.json`).slice(0,180),uploadedAt:new Date().toISOString(),size:file.size,rows,detected:{confidence:detected.confidence,reason:detected.reason},aiRecognition,raw,parsed};
    if(category==='totals'){
      const aiTotals=aiRecognition?.totals || extractHistoricalTotals(raw)?.totals || null;
      if(aiTotals){
        const check=validateTotals(aiTotals);
        if(!check.ok) return json({ok:false,code:'TOTALS_FILE_INVALID',error:`Il file Dati totali è stato riconosciuto, ma i sei valori non sono coerenti: ${check.reason}.`},422);
        payload.aiRecognition={...(aiRecognition||{}),category:'totals',totals:check.totals};
      }
    }
    await writeFile({role,category,payload});
    if (!requestedCategory && Array.isArray(detected?.mirrorCategories)) {
      for (const mirrorCategory of detected.mirrorCategories) {
        if (mirrorCategory === category) continue;
        const mirrorPayload = {
          ...payload,
          category: mirrorCategory,
          autoMirror: true,
          sourceCategory: category,
          mirroredAt: new Date().toISOString()
        };
        await writeFile({role,category:mirrorCategory,payload:mirrorPayload});
      }
    }
    const team = await loadTeam(role);
    await updateMemory(role, team);
    return json({ok:true,role,category,fileName:payload.fileName,rows:parsed.length,detected:payload.detected,team:await loadTeam(role)});
  } catch(error) {
    return json({ok:false,code:'SHARED_DATA_WRITE_FAILED',error:error?.message||'Impossibile salvare il file.'},400);
  }
}

export async function DELETE(request) {
  if (!hasBlobConfig()) return json({ok:false,code:'BLOB_NOT_CONFIGURED',error:'Collega un Vercel Blob al progetto prima di cancellare i dati.'},503);
  try {
    const role=assertRole(new URL(request.url).searchParams.get('role')||'');
    await deleteRole(role);
    return json({ok:true,role,deleted:true,team:await loadTeam(role)});
  } catch(error) {
    return json({ok:false,code:'SHARED_DATA_DELETE_FAILED',error:error?.message||'Impossibile cancellare i dati.'},400);
  }
}

export { ROLES, CATEGORIES };
