import { del, get, put } from '@vercel/blob';
import { createHash } from 'node:crypto';

export const maxDuration = 30;
const BASE_PATH = 'sisal-fc/fc27/shared/own/_meta/player-photos';
const MAX_DATA_URL_CHARS = 420000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function blobAuthOptions() {
  const token = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  if (token) return { token };
  const storeId = String(process.env.BLOB_STORE_ID || '').trim();
  if (!storeId) return null;
  const oidcToken = String(process.env.VERCEL_OIDC_TOKEN || '').trim();
  return oidcToken ? { oidcToken, storeId } : { storeId };
}

function safePlayerKey(value) {
  const key = String(value || '').trim();
  if (!key || key.length > 180) throw new Error('Giocatore non valido.');
  return key;
}

function photoPath(playerKey) {
  const hash = createHash('sha256').update(playerKey).digest('hex').slice(0, 32);
  return `${BASE_PATH}/${hash}.json`;
}

// V32.1.19: foto lette tramite cache Blob. Dopo una sovrascrittura un altro
// dispositivo può vedere la versione precedente per pochi secondi, ma evitiamo
// una Simple Operation di origine ad ogni apertura della player card.
async function readPhoto(playerKey) {
  const auth = blobAuthOptions();
  if (!auth) throw new Error('Vercel Blob non configurato.');
  try {
    const result = await get(photoPath(playerKey), {
      access: 'private',
      useCache: true,
      ...auth
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/not found|404|does not exist|blob not found/i.test(message)) return null;
    throw error;
  }
}

async function writePhoto(playerKey, playerName, dataUrl) {
  const auth = blobAuthOptions();
  if (!auth) throw new Error('Vercel Blob non configurato.');
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
    throw new Error('Formato immagine non valido.');
  }
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error('Foto troppo pesante dopo la compressione.');
  }
  const payload = {
    schemaVersion: 1,
    playerKey,
    playerName: String(playerName || playerKey).slice(0, 120),
    dataUrl,
    updatedAt: new Date().toISOString()
  };
  await put(photoPath(playerKey), JSON.stringify(payload), {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
    ...auth
  });
  return payload;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const playerKey = safePlayerKey(url.searchParams.get('playerKey'));
    const record = await readPhoto(playerKey);
    return json({
      ok: true,
      found: Boolean(record?.dataUrl),
      dataUrl: record?.dataUrl || '',
      playerName: record?.playerName || null,
      updatedAt: record?.updatedAt || null
    });
  } catch (error) {
    return json({ ok: false, error: error?.message || 'Impossibile leggere la foto giocatore.' }, 400);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = String(body?.action || '');
    const playerKey = safePlayerKey(body?.playerKey);
    const auth = blobAuthOptions();
    if (!auth) throw new Error('Vercel Blob non configurato.');

    if (action === 'save') {
      const dataUrl = String(body?.dataUrl || '');
      const record = await writePhoto(playerKey, body?.playerName, dataUrl);
      return json({ ok: true, action, playerKey, updatedAt: record.updatedAt });
    }

    if (action === 'remove') {
      await del(photoPath(playerKey), auth);
      return json({ ok: true, action, playerKey });
    }

    return json({ ok: false, error: 'Azione foto non valida.' }, 400);
  } catch (error) {
    return json({ ok: false, error: error?.message || 'Impossibile aggiornare la foto giocatore.' }, 400);
  }
}
