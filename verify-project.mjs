import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const required = [
  'index.html','package.json','vercel.json','.nvmrc','manifest.webmanifest','sw.js',
  'api/club-ai-sync.js','api/assistente.js','api/health.js','lib/pct-parser.js','lib/pct-links.js','api/scrape-stats.js',
  'knowledge/fc27-knowledge.json','config/fc27-sources.json',
  'scripts/update-fc27-knowledge.mjs','scripts/test-club-ai-sync.mjs','scripts/test-ai-connection.mjs','scripts/test-assistente.mjs','scripts/test-pct-parser.mjs','scripts/test-scrape-stats.mjs',
  'assets/horse-watermark.webp','assets/sisal-reference.jpg'
];
for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`File mancante: ${file}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if (pkg.engines?.node !== '24.x') throw new Error('package.json deve richiedere Node 24.x.');
if (pkg.version !== '5.8.0') throw new Error('package.json non aggiornato alla build V14.');

const vercel = JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
if ('functions' in vercel) throw new Error('vercel.json non deve contenere funzioni: il maxDuration è definito nel codice della funzione.');

const manifest = JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
if (!manifest.start_url || !manifest.display) throw new Error('manifest.webmanifest incompleto.');
JSON.parse(fs.readFileSync(path.join(root,'knowledge/fc27-knowledge.json'),'utf8'));
JSON.parse(fs.readFileSync(path.join(root,'config/fc27-sources.json'),'utf8'));

for (const js of ['api/club-ai-sync.js','api/assistente.js','api/health.js','lib/pct-parser.js','lib/pct-links.js','api/scrape-stats.js','scripts/update-fc27-knowledge.mjs','scripts/test-club-ai-sync.mjs','scripts/test-ai-connection.mjs']) {
  execFileSync(process.execPath,['--check',path.join(root,js)],{stdio:'pipe'});
}

const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
if (!/^<!doctype html>/i.test(html) || !/<\/html>/i.test(html)) throw new Error('index.html non è un documento HTML completo.');
for (const id of ['ownStats','ownFun','ownPlayers','ownMatches','opStats','opPlayers','opMatches']) if (!html.includes(`linkField('${id}'`)) throw new Error(`Campo link mancante: ${id}.`);
if (html.includes('id="ownName"') || html.includes('id="opName"')) throw new Error('Vecchi campi nome ancora presenti.');
if (!html.includes('/api/club-ai-sync')) throw new Error('index.html non chiama /api/club-ai-sync.');
if (!html.includes('data-tab="fun"')) throw new Error('Tab Fun mancante.');
if (!/function\s+aiPage\s*\(/.test(html)) throw new Error('Funzione aiPage mancante: il tab IA non può essere renderizzato.');
if (!/function\s+formatDate\s*\(/.test(html)) throw new Error('Funzione formatDate mancante.');
if (!/function\s+sum\s*\(/.test(html)) throw new Error('Funzione sum mancante.');
if (!html.includes('id="aiQ"') || !html.includes('id="askAI"') || !html.includes('id="aiResult"')) throw new Error('Controlli UI IA mancanti.');
if (html.includes('K.ownUrl') || html.includes('K.opUrl')) throw new Error('Vecchie chiavi URL ancora usate.');
if (!html.includes('installAndroid') || !html.includes('installIphone')) throw new Error('Pulsanti installazione PWA mancanti.');
if (!fs.existsSync(path.join(root,'icons/apple-touch-icon.png'))) throw new Error('Icona Apple touch mancante.');
if (!html.includes('beforeinstallprompt')) throw new Error('Gestione installazione Android mancante.');
if (!html.includes("await syncClub('own')")) throw new Error('Auto-sincronizzazione IA mancante.');
if (!html.includes('dataStatus:{available')) throw new Error('Stato disponibilità dati IA mancante.');
if (!html.includes('SYNC_CACHE_TTL_MS=5*60*1000')) throw new Error('Cache anti-richieste PCT non impostata a 5 minuti.');
if (!html.includes('cacheGet') || !html.includes('cacheSave')) throw new Error('Lettura/scrittura cache mancante.');
if (!html.includes('Nessuna lettura esterna effettuata.')) throw new Error('Messaggio di cache locale mancante.');
if (!html.includes('Collegamento diretto con Pro Clubs Tracker')) throw new Error('Testo collegamento PCT mancante.');
if (html.includes('Sostituisci partite') || html.includes('Aggiungi partite') || html.includes('Sincronizza EA') || html.includes('Connessioni live con EA')) throw new Error('Vecchi pulsanti rimossi ancora presenti.');
if (!html.includes('Collegamento diretto con Pro Clubs Tracker') || !html.includes('PCT ONLY')) throw new Error('Flusso link PCT non presente.');
if ((html.match(/id="syncOwn"/g)||[]).length !== 1 || (html.match(/id="syncOpp"/g)||[]).length !== 1) throw new Error('Pulsanti di sincronizzazione duplicati.');
if ((html.match(/id="syncBoth"/g)||[]).length !== 1) throw new Error('Pulsante aggiornamento completo duplicato.');
if (!html.includes('Gemini 3.5 Flash-Lite')) throw new Error('Modello Gemini 3.5 non indicato nella UI.');
const sync = fs.readFileSync(path.join(root,'api/club-ai-sync.js'),'utf8');
const ai = fs.readFileSync(path.join(root,'api/assistente.js'),'utf8');
const parser = fs.readFileSync(path.join(root,'lib/pct-parser.js'),'utf8');
if (!sync.includes('normalizePCTLinks') || !sync.includes('puppeteer') || !sync.includes('@sparticuz/chromium') || !sync.includes('parsePCTLinkSnapshots')) throw new Error('Sincronizzazione PCT tramite link non presente.');
const pctLinks = fs.readFileSync(path.join(root,'lib/pct-links.js'),'utf8');
if (!pctLinks.includes('proclubstracker.com') || !pctLinks.includes('REQUIRED_OWN') || !pctLinks.includes('REQUIRED_OPP')) throw new Error('Validazione link PCT non presente.');
if (/proclubs\.ea\.com|corsfix|generativelanguage\.googleapis\.com|google_search|url_context|GROQ/i.test(sync)) throw new Error('Il sync contiene ancora chiamate dirette EA/proxy/Gemini/Groq.');
if (/fetch\s*\(.*proclubstracker\.com/i.test(sync)) throw new Error('Il sync deve usare il browser, non fetch diretto al sito PCT.');
if (!sync.includes("from '../lib/pct-links.js'") || !sync.includes('ALLOWED_HOSTS')) throw new Error('Backend non importa correttamente il validatore/dominio PCT.');
const scraper = fs.readFileSync(path.join(root,'api/scrape-stats.js'),'utf8');
if (!scraper.includes("const PCT_ORIGIN = 'https://proclubstracker.com'") || !scraper.includes('buildSearchUrl') || !scraper.includes('SEARCH_PATH') || !scraper.includes('puppeteer-core') || !scraper.includes('@sparticuz/chromium') || !scraper.includes('clubName') || !scraper.includes('platform')) throw new Error('scrape-stats non implementa ricerca dinamica PCT con Puppeteer.');
if (/proclubs\.ea\.com|generativelanguage\.googleapis\.com/i.test(scraper)) throw new Error('scrape-stats contiene una chiamata diretta EA/Gemini non richiesta.');
if (!ai.includes('gemini-3.5-flash-lite') || /gemini-2\.5|google_search|url_context|GROQ/i.test(ai)) throw new Error('Endpoint IA Gemini 3.5 non corretto.');
if (!parser.includes('parsePCTLinkSnapshots') || !parser.includes('Pro Clubs Tracker')) throw new Error('Parser PCT mancante.');
const sw = fs.readFileSync(path.join(root,'sw.js'),'utf8');
if (!sw.includes('shell-v14')) throw new Error('Service worker non aggiornato alla v14.');
if (!html.includes("serviceWorker.register('./sw.js?v=14')")) throw new Error('Registrazione service worker non versionata alla v14.');
const updater = fs.readFileSync(path.join(root,'scripts/update-fc27-knowledge.mjs'),'utf8');
if (!updater.includes('v1beta/interactions') || !updater.includes("type: 'video'") || !updater.includes('uri: video.url')) throw new Error('Knowledge updater Gemini non aggiornato correttamente.');

// Green visual theme checks.
if (!html.includes('--green:#20f26f') || !html.includes('horse-watermark.webp')) throw new Error('Tema verde/cavallo non presente.');

console.log('VERIFY OK — struttura, JSON, sintassi JS, PCT browser sync, Gemini 3.5 e PWA cache verificati.');
