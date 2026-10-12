import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { ENGINE_VERSION, validateParticipants, simulateRace, raceRecord } from '../../race-engine.js';
const digest = text => createHash('sha256').update(text).digest('hex');
function fail(message, status=400) { throw Object.assign(new Error(message), { publicCode: 'REQUEST', status }); }
export function publicRecord(doc) {
  const { _id, tokenHash, ipHash, expiresAt, ...record } = doc;
  return record;
}
export async function createRace(collection, body, ip, now=new Date()) {
  const participants = validateParticipants(body.participants);
  const title = typeof body.title === 'string' ? body.title.slice(0,100) : 'Sisal Racing';
  const ipHash = digest(ip || 'unknown');
  // Persistent rate limit; no dependence on a warm serverless instance.
  const recent = await collection.countDocuments({ ipHash, createdAt: { $gt: new Date(now.getTime()-60000) } }, { limit: 4 });
  if (recent >= 4) fail('Hai avviato diverse gare. Aspetta un minuto prima di riprovare.', 429);
  const token=randomBytes(32).toString('hex'), seed=randomBytes(4).readUInt32LE();
  const doc={ raceId:randomUUID(), engineVersion:ENGINE_VERSION, createdAt:now, status:'pending', seed, participants, title,
    tokenHash:digest(token), ipHash, expiresAt:new Date(now.getTime()+86400000) };
  await collection.insertOne(doc);
  return { race:publicRecord(doc), token };
}
export async function completeRace(collection, body, now=new Date()) {
  if (!/^[0-9a-f-]{36}$/.test(body.raceId || '') || !/^[0-9a-f]{64}$/.test(body.token || '')) fail('Identificativo gara non valido.');
  const doc=await collection.findOne({raceId:body.raceId,tokenHash:digest(body.token)});
  if (!doc) fail('Gara non trovata o autorizzazione scaduta.',404);
  if (doc.engineVersion !== ENGINE_VERSION) fail('Questa versione della gara non può essere completata.',409);
  if (doc.status==='completed') return publicRecord(doc);
  if (doc.expiresAt < now) fail('Gara scaduta. Avvia una nuova corsa.',410);
  const race=simulateRace(doc.seed,doc.participants);
  if(now.getTime()-new Date(doc.createdAt).getTime() < race.duration*1000) fail('La gara non è ancora terminata.',409);
  // Ignore client times, places, events and stats. Recompute everything here.
  const completed={...raceRecord(race),status:'completed',completedAt:now};
  await collection.updateOne({raceId:doc.raceId,status:'pending'},{$set:completed,$unset:{expiresAt:''}});
  return publicRecord({...doc,...completed});
}
