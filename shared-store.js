import { del, get, put } from '@vercel/blob';

const ROLES = ['own', 'opponent'];
const CATEGORIES = ['players', 'league', 'playoffs', 'friendlies'];
const PATH = (role, category) => `sisal-fc/fc27/shared/${role}/${category}.json`;

function assertRole(value) {
  if (!ROLES.includes(value)) throw new Error(`Ruolo dati non valido: ${value}`);
  return value;
}
function assertCategory(value) {
  if (!CATEGORIES.includes(value)) throw new Error(`Categoria file non valida: ${value}`);
  return value;
}
function hasBlobConfig() {
  return Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || '').trim() || String(process.env.BLOB_STORE_ID || '').trim() || String(process.env.VERCEL || '').trim() === '1');
}

async function getJson(pathname) {
  try {
    const result = await get(pathname, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    try { return JSON.parse(text); } catch { throw new Error(`Il file condiviso ${pathname} non contiene JSON valido.`); }
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/not found|404|does not exist|blob not found/i.test(message)) return null;
    throw error;
  }
}

async function readAllFiles(role) {
  const safeRole = assertRole(role);
  const entries = await Promise.all(CATEGORIES.map(async category => [category, await getJson(PATH(safeRole, category))]));
  return Object.fromEntries(entries);
}

async function writeFile({ role, category, payload }) {
  const safeRole = assertRole(role);
  const safeCategory = assertCategory(category);
  return put(PATH(safeRole, safeCategory), JSON.stringify(payload), {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json'
  });
}

async function deleteRole(role) {
  const safeRole = assertRole(role);
  await del(CATEGORIES.map(category => PATH(safeRole, category)));
}

export { ROLES, CATEGORIES, PATH, assertRole, assertCategory, hasBlobConfig, readAllFiles, writeFile, deleteRole };
