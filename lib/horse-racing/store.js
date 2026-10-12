import { MongoClient } from 'mongodb';
let connection;
export async function raceCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw Object.assign(new Error('MongoDB non configurato. Aggiungi MONGODB_URI su Vercel e ridistribuisci il progetto.'), { publicCode: 'NOT_CONFIGURED', status: 503 });
  if (!connection) {
    connection = (async () => {
      const client = new MongoClient(uri, { maxPoolSize: 3, minPoolSize: 0, serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
      try {
        await client.connect();
        const collection = client.db('sisal_racing').collection('horse_races');
        await collection.createIndexes([
          { key: { raceId: 1 }, unique: true },
          { key: { status: 1, createdAt: -1 } },
          { key: { ipHash: 1, createdAt: -1 } },
          { key: { expiresAt: 1 }, expireAfterSeconds: 0 }
        ]);
        return collection;
      } catch (e) { await client.close().catch(() => {}); throw e; }
    })().catch(e => { connection = null; throw e; });
  }
  return connection;
}
export function publicDatabaseError(error) {
  if (error.publicCode) return { code: error.publicCode, error: error.message };
  if (error.code === 18 || /authentication failed/i.test(error.message || '')) return { code: 'AUTH', error: 'MongoDB non collegato: controlla utente e password nella variabile privata MONGODB_URI, poi ridistribuisci.' };
  return { code: 'CONNECTION', error: 'MongoDB non collegato. Controlla che il cluster sia attivo, la connection string sia corretta e Network Access consenta Vercel.' };
}
