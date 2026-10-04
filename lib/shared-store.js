import { del, get, put } from '@vercel/blob';

const ROLES = ['own', 'opponent'];
const CATEGORIES = ['totals', 'season', 'clubInfo', 'overallStats', 'players', 'career', 'league', 'playoffs', 'friendlies', 'playoffAchievements'];
const PATH = (role, category) => `sisal-fc/fc27/shared/${role}/${category}.json`;
const TOTALS_PATH = role => `sisal-fc/fc27/shared/${assertRole(role)}/_meta/totals.json`;
const LEGACY_TOTALS_PATH = role => `sisal-fc/fc27/shared/${assertRole(role)}/totals.json`;
const MEMORY_PATH = role => `sisal-fc/fc27/shared/${assertRole(role)}/_meta/memory.json`;

function assertRole(value) {
  if (!ROLES.includes(value)) throw new Error(`Ruolo dati non valido: ${value}`);
  return value;
}

function assertCategory(value) {
  if (!CATEGORIES.includes(value)) throw new Error(`Categoria file non valida: ${value}`);
  return value;
}

/**
 * Vercel Blob authentication modes supported by the current SDK:
 * 1) BLOB_READ_WRITE_TOKEN (static token)
 * 2) BLOB_STORE_ID + Vercel OIDC (automatic on Vercel, or explicit VERCEL_OIDC_TOKEN)
 *
 * We intentionally do NOT treat VERCEL=1 as Blob configuration: a Vercel project can
 * exist without any Blob store connected.
 */
function blobAuthOptions() {
  const token = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  if (token) return { token };

  const storeId = String(process.env.BLOB_STORE_ID || '').trim();
  if (!storeId) return null;

  const oidcToken = String(process.env.VERCEL_OIDC_TOKEN || '').trim();
  return oidcToken ? { oidcToken, storeId } : { storeId };
}

function hasBlobConfig() {
  return Boolean(blobAuthOptions());
}

function blobConfigError() {
  return new Error(
    'Vercel Blob non è collegato a questo progetto. In Vercel apri Storage → Blob → collega/crea uno store per questo progetto; in alternativa imposta BLOB_READ_WRITE_TOKEN.'
  );
}

async function getJson(pathname) {
  const auth = blobAuthOptions();
  if (!auth) throw blobConfigError();
  try {
    const result = await get(pathname, {
      access: 'private',
      useCache: false,
      ...auth
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Il file condiviso ${pathname} non contiene JSON valido.`);
    }
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/not found|404|does not exist|blob not found/i.test(message)) return null;
    throw error;
  }
}

async function readAllFiles(role) {
  const safeRole = assertRole(role);
  const entries = await Promise.all(
    CATEGORIES.map(async category => [category, await getJson(PATH(safeRole, category))])
  );
  return Object.fromEntries(entries);
}

async function writeFile({ role, category, payload }) {
  const safeRole = assertRole(role);
  const safeCategory = assertCategory(category);
  const auth = blobAuthOptions();
  if (!auth) throw blobConfigError();
  return put(PATH(safeRole, safeCategory), JSON.stringify(payload), {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
    ...auth
  });
}


async function readRoleTotals(role) {
  const safeRole = assertRole(role);
  return (await getJson(TOTALS_PATH(safeRole))) || (await getJson(LEGACY_TOTALS_PATH(safeRole)));
}

async function writeRoleTotals(role, payload) {
  const safeRole = assertRole(role);
  const auth = blobAuthOptions();
  if (!auth) throw blobConfigError();
  return put(TOTALS_PATH(safeRole), JSON.stringify(payload), {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
    ...auth
  });
}

async function readRoleMemory(role) {
  const safeRole = assertRole(role);
  return (await getJson(MEMORY_PATH(safeRole))) || { schemaVersion: 1, snapshots: [] };
}

async function writeRoleMemory(role, payload) {
  const safeRole = assertRole(role);
  const auth = blobAuthOptions();
  if (!auth) throw blobConfigError();
  return put(MEMORY_PATH(safeRole), JSON.stringify(payload), {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
    ...auth
  });
}

async function deleteRole(role) {
  const safeRole = assertRole(role);
  const auth = blobAuthOptions();
  if (!auth) throw blobConfigError();
  await del([...CATEGORIES.map(category => PATH(safeRole, category)), TOTALS_PATH(safeRole), LEGACY_TOTALS_PATH(safeRole), MEMORY_PATH(safeRole)], auth);
}

export {
  ROLES,
  CATEGORIES,
  PATH,
  TOTALS_PATH,
  LEGACY_TOTALS_PATH,
  MEMORY_PATH,
  assertRole,
  assertCategory,
  blobAuthOptions,
  hasBlobConfig,
  readAllFiles,
  writeFile,
  readRoleTotals,
  writeRoleTotals,
  readRoleMemory,
  writeRoleMemory,
  deleteRole
};
