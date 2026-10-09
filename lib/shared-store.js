import { del, get, put } from '@vercel/blob';

const ROLES = ['own', 'opponent'];
const CATEGORIES = ['totals', 'season', 'clubInfo', 'overallStats', 'players', 'career', 'league', 'playoffs', 'friendlies', 'playoffAchievements'];
const PATH = (role, category) => `sisal-fc/fc27/shared/${role}/${category}.json`;
const TOTALS_PATH = role => `sisal-fc/fc27/shared/${assertRole(role)}/_meta/totals.json`;
const LEGACY_TOTALS_PATH = role => `sisal-fc/fc27/shared/${assertRole(role)}/totals.json`;
const MEMORY_PATH = role => `sisal-fc/fc27/shared/${assertRole(role)}/_meta/memory.json`;

// V32.1.19 · Blob Saver
// Invece di leggere fino a 10 file + totali + memoria ad ogni apertura,
// manteniamo un bundle sincronizzato per ciascuna squadra.
// Le sorgenti originali restano comunque salvate separatamente: il bundle è
// un indice/cache persistente, non sostituisce i JSON caricati dall'utente.
const BUNDLE_PATH = role => `sisal-fc/fc27/shared/${assertRole(role)}/_meta/team-bundle-v1.json`;
const BUNDLE_SCHEMA_VERSION = 1;
const MEMORY_TTL_MS = 20_000;
const AUTHORITATIVE_TTL_MS = 5_000;

const bundleMemoryCache = new Map();
const bundleReadPromises = new Map();
const roleMutationLocks = new Map();

function assertRole(value) {
  if (!ROLES.includes(value)) throw new Error(`Ruolo dati non valido: ${value}`);
  return value;
}

function assertCategory(value) {
  if (!CATEGORIES.includes(value)) throw new Error(`Categoria file non valida: ${value}`);
  return value;
}

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

async function getJson(pathname, { fresh = false } = {}) {
  const auth = blobAuthOptions();
  if (!auth) throw blobConfigError();

  try {
    const result = await get(pathname, {
      access: 'private',
      useCache: !fresh,
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

    if (/not found|404|does not exist|blob not found/i.test(message)) {
      return null;
    }

    throw error;
  }
}

function emptyFiles() {
  return Object.fromEntries(CATEGORIES.map(category => [category, null]));
}

function emptyBundle(role) {
  return {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    role: assertRole(role),
    files: emptyFiles(),
    totals: null,
    memory: { schemaVersion: 1, snapshots: [] },
    updatedAt: new Date().toISOString()
  };
}

function normalizeBundle(role, value) {
  const safeRole = assertRole(role);
  const source = value && typeof value === 'object' ? value : {};
  const files = emptyFiles();

  for (const category of CATEGORIES) {
    files[category] = source.files?.[category] || null;
  }

  return {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    role: safeRole,
    files,
    totals: source.totals || null,
    memory:
      source.memory && typeof source.memory === 'object'
        ? source.memory
        : { schemaVersion: 1, snapshots: [] },
    updatedAt: source.updatedAt || new Date().toISOString()
  };
}

function rememberBundle(role, bundle, { authoritative = false } = {}) {
  bundleMemoryCache.set(assertRole(role), {
    value: bundle,
    expiresAt: Date.now() + MEMORY_TTL_MS,
    authoritativeUntil: authoritative ? Date.now() + AUTHORITATIVE_TTL_MS : 0
  });
  return bundle;
}

function memoryBundle(role, { fresh = false } = {}) {
  const safeRole = assertRole(role);
  const entry = bundleMemoryCache.get(safeRole);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    bundleMemoryCache.delete(safeRole);
    return null;
  }
  // Una lettura fresh serve solo a bypassare dati letti in precedenza.
  // Se il bundle è stato appena scritto da QUESTA stessa invocazione, quella
  // copia è già la fonte più recente e rileggerla da Blob sarebbe uno spreco.
  if (fresh && entry.authoritativeUntil <= Date.now()) return null;
  return entry.value;
}

function clearBundleMemory(role) {
  bundleMemoryCache.delete(assertRole(role));
}

async function putBundle(role, bundle) {
  const safeRole = assertRole(role);
  const auth = blobAuthOptions();
  if (!auth) throw blobConfigError();

  const normalized = normalizeBundle(safeRole, {
    ...bundle,
    updatedAt: new Date().toISOString()
  });

  await put(BUNDLE_PATH(safeRole), JSON.stringify(normalized), {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
    ...auth
  });

  return rememberBundle(safeRole, normalized, { authoritative: true });
}

async function bootstrapBundle(role, { fresh = false } = {}) {
  const safeRole = assertRole(role);

  const [fileEntries, metaTotals, memory] = await Promise.all([
    Promise.all(
      CATEGORIES.map(async category => [
        category,
        await getJson(PATH(safeRole, category), { fresh })
      ])
    ),
    getJson(TOTALS_PATH(safeRole), { fresh }),
    getJson(MEMORY_PATH(safeRole), { fresh })
  ]);

  const totals =
    metaTotals ||
    (await getJson(LEGACY_TOTALS_PATH(safeRole), { fresh }));

  const bundle = normalizeBundle(safeRole, {
    files: Object.fromEntries(fileEntries),
    totals,
    memory: memory || { schemaVersion: 1, snapshots: [] }
  });

  // Migrazione una tantum: dopo questa scrittura le aperture normali leggono
  // un solo Blob per squadra invece dei singoli file.
  return putBundle(safeRole, bundle);
}

async function readRoleBundle(role, { fresh = false } = {}) {
  const safeRole = assertRole(role);

  const cached = memoryBundle(safeRole, { fresh });
  if (cached) return cached;

  const pendingKey = `${safeRole}:${fresh ? 'fresh' : 'cached'}`;
  if (bundleReadPromises.has(pendingKey)) {
    return bundleReadPromises.get(pendingKey);
  }

  const pending = (async () => {
    const stored = await getJson(BUNDLE_PATH(safeRole), { fresh });
    if (stored) return rememberBundle(safeRole, normalizeBundle(safeRole, stored), { authoritative: false });
    return bootstrapBundle(safeRole, { fresh });
  })();

  bundleReadPromises.set(pendingKey, pending);

  try {
    return await pending;
  } finally {
    bundleReadPromises.delete(pendingKey);
  }
}

function withRoleMutation(role, work) {
  const safeRole = assertRole(role);
  const previous = roleMutationLocks.get(safeRole) || Promise.resolve();
  const next = previous.catch(() => {}).then(work);
  const tracked = next.finally(() => {
    if (roleMutationLocks.get(safeRole) === tracked) {
      roleMutationLocks.delete(safeRole);
    }
  });
  roleMutationLocks.set(safeRole, tracked);
  return tracked;
}

async function readAllFiles(role, { fresh = false } = {}) {
  const bundle = await readRoleBundle(assertRole(role), { fresh });
  return bundle.files;
}

async function writeFile({ role, category, payload }) {
  const safeRole = assertRole(role);
  const safeCategory = assertCategory(category);
  const auth = blobAuthOptions();

  if (!auth) throw blobConfigError();

  return withRoleMutation(safeRole, async () => {
    const current = await readRoleBundle(safeRole);
    const previous = current.files?.[safeCategory] || null;
    let sameRaw = false;
    let sameRecognition = false;
    try {
      sameRaw = Boolean(previous && JSON.stringify(previous.raw) === JSON.stringify(payload?.raw));
      const recognitionSignature = value => JSON.stringify({
        category: value?.category || null,
        confidence: value?.confidence ?? null,
        clubId: value?.clubId || null,
        clubName: value?.clubName || null,
        totals: value?.totals || null,
        profileFields: value?.profileFields || null,
        deterministicCategory: value?.deterministicCategory || null,
        deterministicSignature: value?.deterministicSignature || null
      });
      sameRecognition = recognitionSignature(previous?.aiRecognition) === recognitionSignature(payload?.aiRecognition);
    } catch {}

    // Se l'utente ricarica lo stesso identico JSON e non c'è un miglioramento
    // semantico del riconoscimento IA, non riscriviamo file sorgente né bundle.
    // Se invece Gemini ha recuperato nuovi campi, la scrittura avviene normalmente.
    if (sameRaw && sameRecognition) {
      rememberBundle(safeRole, current, { authoritative: true });
      return { skipped: true, duplicate: true };
    }

    const result = await put(
      PATH(safeRole, safeCategory),
      JSON.stringify(payload),
      {
        access: 'private',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'application/json',
        ...auth
      }
    );

    await putBundle(safeRole, {
      ...current,
      files: {
        ...current.files,
        [safeCategory]: payload
      }
    });

    return result;
  });
}

async function readRoleTotals(role, { fresh = false } = {}) {
  const bundle = await readRoleBundle(assertRole(role), { fresh });
  return bundle.totals || null;
}

async function writeRoleTotals(role, payload) {
  const safeRole = assertRole(role);
  if (!blobAuthOptions()) throw blobConfigError();

  return withRoleMutation(safeRole, async () => {
    const current = await readRoleBundle(safeRole);
    const comparable = value => JSON.stringify({
      source: value?.source || null,
      totals: value?.totals || null,
      goalDifference: value?.goalDifference ?? null,
      winRate: value?.winRate ?? null,
      url: value?.url || null,
      importedAt: value?.importedAt || null
    });
    if (comparable(current.totals) === comparable(payload)) {
      rememberBundle(safeRole, current, { authoritative: true });
      return current.totals;
    }
    // V32.1.24: totals vive nel bundle primario. TOTALS_PATH resta solo come
    // sorgente di migrazione per installazioni precedenti, evitando una seconda PUT.
    return putBundle(safeRole, { ...current, totals: payload });
  });
}

async function readRoleMemory(role, { fresh = false } = {}) {
  const bundle = await readRoleBundle(assertRole(role), { fresh });
  return bundle.memory || { schemaVersion: 1, snapshots: [] };
}

async function writeRoleMemory(role, payload) {
  const safeRole = assertRole(role);
  if (!blobAuthOptions()) throw blobConfigError();

  return withRoleMutation(safeRole, async () => {
    const current = await readRoleBundle(safeRole);
    const currentFingerprint = current.memory?.snapshots?.[0]?.fingerprint || null;
    const nextFingerprint = payload?.snapshots?.[0]?.fingerprint || null;
    if (currentFingerprint && nextFingerprint && currentFingerprint === nextFingerprint) {
      rememberBundle(safeRole, current, { authoritative: true });
      return current.memory;
    }
    // La memoria IA è già contenuta nel team bundle. MEMORY_PATH rimane leggibile
    // soltanto per la migrazione dei vecchi dati: una sola PUT invece di due.
    return putBundle(safeRole, { ...current, memory: payload });
  });
}

async function deleteRole(role) {
  const safeRole = assertRole(role);
  const auth = blobAuthOptions();

  if (!auth) throw blobConfigError();

  return withRoleMutation(safeRole, async () => {
    clearBundleMemory(safeRole);

    await del(
      [
        ...CATEGORIES.map(category => PATH(safeRole, category)),
        TOTALS_PATH(safeRole),
        LEGACY_TOTALS_PATH(safeRole),
        MEMORY_PATH(safeRole),
        BUNDLE_PATH(safeRole)
      ],
      auth
    );

    // Manteniamo un bundle vuoto. In questo modo il loadTeam() eseguito subito
    // dopo la cancellazione non deve fare 12 letture per scoprire che è tutto vuoto.
    return putBundle(safeRole, emptyBundle(safeRole));
  });
}

export {
  ROLES,
  CATEGORIES,
  PATH,
  TOTALS_PATH,
  LEGACY_TOTALS_PATH,
  MEMORY_PATH,
  BUNDLE_PATH,
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
