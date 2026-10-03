import { buildTeam, parseJsonText, normalizePlayersFile, normalizeMatchesFile, detectDataFile } from '../lib/data-pipeline.js';
import { CATEGORIES, ROLES, assertCategory, assertRole, hasBlobConfig, readAllFiles, writeFile, deleteRole } from '../lib/shared-store.js';

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
async function loadTeam(role) {
  const files = await readAllFiles(role);
  const team = buildTeam({ fileRecords: files, role });
  return { ...team, updatedAt: latestUpdatedAt(files), files: team.fileStatus };
}

export async function GET() {
  if (!hasBlobConfig()) return json({ ok:false, code:'BLOB_NOT_CONFIGURED', error:'Collega un Vercel Blob al progetto prima di usare i dati condivisi.' },503);
  try {
    const [own, opponent] = await Promise.all([loadTeam('own'), loadTeam('opponent')]);
    return json({ ok:true, version:2, updatedAt:new Date().toISOString(), teams:{ own, opponent } });
  } catch(error) {
    return json({ ok:false, code:'SHARED_DATA_READ_FAILED', error:error?.message||'Impossibile leggere i dati condivisi.' },502);
  }
}

export async function POST(request) {
  if (!hasBlobConfig()) return json({ok:false,code:'BLOB_NOT_CONFIGURED',error:'Collega un Vercel Blob al progetto prima di caricare i dati.'},503);
  try {
    const form = await request.formData();
    const role = assertRole(String(form.get('role')||''));
    const requestedCategory = String(form.get('category')||'').trim();
    if (requestedCategory) assertCategory(requestedCategory);
    const file = form.get('file');
    if (!(file instanceof File)) return json({ok:false,code:'FILE_REQUIRED',error:'Nessun file ricevuto.'},400);
    if (file.size<=0) return json({ok:false,code:'EMPTY_FILE',error:'Il file è vuoto.'},400);
    if (file.size>MAX_FILE_BYTES) return json({ok:false,code:'FILE_TOO_LARGE',error:'File troppo grande. Massimo 4 MB.'},413);
    const raw=parseJsonText(await file.text());
    const detected=detectDataFile(raw, String(file.name||''));
    const category=requestedCategory || detected.category;
    if (!category) {
      return json({ok:false,code:'CATEGORY_NOT_RECOGNIZED',error:`Non riesco a riconoscere automaticamente il tipo di file “${file.name}”. Il contenuto sembra contenere partite, ma il matchType non è tra quelli riconosciuti. Puoi rinominare il file con “league”, “playoff” o “friendly” e riprovare.`,detected:{confidence:detected.confidence,reason:detected.reason,rows:detected.rows}},422);
    }
    let parsed;
    if (category==='players') parsed=normalizePlayersFile(raw,'');
    else parsed=normalizeMatchesFile(raw,category);
    if (!parsed.length) return json({ok:false,code:'NO_DATA_RECOGNIZED',error:`Il file “${file.name}” non contiene dati ${category} riconoscibili.`},422);
    const payload={schemaVersion:3,role,category,fileName:String(file.name||`${category}.json`).slice(0,180),uploadedAt:new Date().toISOString(),size:file.size,rows:parsed.length,detected:{confidence:detected.confidence,reason:detected.reason},parsed};
    await writeFile({role,category,payload});
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
