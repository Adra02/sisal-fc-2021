import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const required = [
  'index.html','package.json','vercel.json','.nvmrc','manifest.webmanifest','sw.js',
  'api/club-ai-sync.js','api/assistente.js','api/health.js',
  'knowledge/fc27-knowledge.json','config/fc27-sources.json',
  'scripts/update-fc27-knowledge.mjs','scripts/test-club-ai-sync.mjs','scripts/test-ai-connection.mjs','scripts/test-assistente.mjs',
  'assets/horse-watermark.webp','assets/sisal-reference.jpg'
];
for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`File mancante: ${file}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if (pkg.engines?.node !== '24.x') throw new Error('package.json deve richiedere Node 24.x.');

const vercel = JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
if ('functions' in vercel) throw new Error('vercel.json contiene ancora il blocco functions: rimuoverlo.');

const manifest = JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
if (!manifest.start_url || !manifest.display) throw new Error('manifest.webmanifest incompleto.');
JSON.parse(fs.readFileSync(path.join(root,'knowledge/fc27-knowledge.json'),'utf8'));
JSON.parse(fs.readFileSync(path.join(root,'config/fc27-sources.json'),'utf8'));

for (const js of ['api/club-ai-sync.js','api/assistente.js','api/health.js','scripts/update-fc27-knowledge.mjs','scripts/test-club-ai-sync.mjs','scripts/test-ai-connection.mjs']) {
  execFileSync(process.execPath,['--check',path.join(root,js)],{stdio:'pipe'});
}

const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
if (!/^<!doctype html>/i.test(html) || !/<\/html>/i.test(html)) throw new Error('index.html non è un documento HTML completo.');
if (!html.includes('id="ownName"') || !html.includes('id="opName"')) throw new Error('Campi nome squadra/avversario mancanti.');
if (!html.includes('/api/club-ai-sync')) throw new Error('index.html non chiama /api/club-ai-sync.');
if (!html.includes('data-tab="fun"')) throw new Error('Tab Fun mancante.');
if (!/function\s+aiPage\s*\(/.test(html)) throw new Error('Funzione aiPage mancante: il tab IA non può essere renderizzato.');
if (!/function\s+formatDate\s*\(/.test(html)) throw new Error('Funzione formatDate mancante.');
if (!/function\s+sum\s*\(/.test(html)) throw new Error('Funzione sum mancante.');
if (!html.includes('id="aiQ"') || !html.includes('id="askAI"') || !html.includes('id="aiResult"')) throw new Error('Controlli UI IA mancanti.');
if (html.includes('incolla il link Pro Clubs Tracker')) throw new Error('Testo vecchio del flusso URL ancora presente.');
if (html.includes('K.ownUrl') || html.includes('K.opUrl')) throw new Error('Vecchie chiavi URL ancora usate.');
if (!html.includes('installAndroid') || !html.includes('installIphone')) throw new Error('Pulsanti installazione PWA mancanti.');
if (!fs.existsSync(path.join(root,'icons/apple-touch-icon.png'))) throw new Error('Icona Apple touch mancante.');
if (!html.includes('beforeinstallprompt')) throw new Error('Gestione installazione Android mancante.');
if (!html.includes("await syncClub('own')")) throw new Error('Auto-sincronizzazione IA mancante.');
if (!html.includes('dataStatus:{available')) throw new Error('Stato disponibilità dati IA mancante.');
if (!html.includes('SYNC_CACHE_TTL_MS')) throw new Error('Cache anti-richieste mancante.');
if (!html.includes('cacheGet') || !html.includes('cacheSave')) throw new Error('Lettura/scrittura cache mancante.');
if (!html.includes('NON è stato richiamato')) throw new Error('Messaggio di cache Gemini mancante.');
if (html.includes('Sostituisci partite') || html.includes('Aggiungi partite') || html.includes('Sincronizza EA')) throw new Error('Vecchi pulsanti rimossi ancora presenti.');
if ((html.match(/id="syncOwn"/g)||[]).length !== 1 || (html.match(/id="syncOpp"/g)||[]).length !== 1) throw new Error('Pulsanti di sincronizzazione duplicati.');
if ((html.match(/id="syncBoth"/g)||[]).length !== 1) throw new Error('Pulsante aggiornamento completo duplicato.');

// Green visual theme checks.
if (!html.includes('--green:#20f26f') || !html.includes('horse-watermark.webp')) throw new Error('Tema verde/cavallo non presente.');

console.log('VERIFY OK — struttura, JSON, Vercel, sintassi JS, tema e architettura one-request superati.');
