import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const required = [
  'index.html','index-inline.js','package.json','vercel.json','.nvmrc','manifest.webmanifest','sw.js',
  'api/scrape-stats.js','api/club-ai-sync.js','api/assistente.js','api/health.js',
  'lib/ea-client-core.js','knowledge/fc27-knowledge.json','config/fc27-sources.json',
  'scripts/update-fc27-knowledge.mjs','scripts/test-ea-client.mjs','scripts/test-ai-connection.mjs','scripts/test-assistente.mjs',
  'assets/horse-watermark.webp','assets/sisal-reference.jpg'
];
for (const file of required) {
  if (!fs.existsSync(path.join(root,file))) throw new Error(`File mancante: ${file}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if (pkg.version !== '6.0.0') throw new Error(`Versione inattesa: ${pkg.version}`);
if (pkg.engines?.node !== '24.x') throw new Error('Node 24.x richiesto.');
if (!pkg.dependencies?.['puppeteer-core'] || !pkg.dependencies?.['@sparticuz/chromium']) throw new Error('Dipendenze Chromium mancanti.');

const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
if (!/^<!doctype html>/i.test(html) || !/<\/html>/i.test(html)) throw new Error('index.html incompleto.');
if (!html.includes('id="ownName"') || !html.includes('id="opName"')) throw new Error('Campi nome club mancanti.');
if ((html.match(/id="ownName"/g)||[]).length !== 1 || (html.match(/id="opName"/g)||[]).length !== 1) throw new Error('Campi nome duplicati.');
if (!html.includes('id="ownPlatform"') || !html.includes('id="opPlatform"')) throw new Error('Selettori piattaforma mancanti.');
if (!html.includes('/api/scrape-stats')) throw new Error('Frontend non usa /api/scrape-stats.');
if (html.includes('/api/club-ai-sync')) throw new Error('Frontend contiene ancora il vecchio endpoint club-ai-sync.');
if (html.includes('linkField(') || html.includes('ownStats') || html.includes('opStats')) throw new Error('Vecchia UI a link PCT ancora presente.');
if (/Pro Clubs Tracker|PCT ONLY|Collegamento diretto con Pro Clubs Tracker/i.test(html)) throw new Error('Vecchi riferimenti PCT nella UI principale.');
if (!html.includes('Gemini 3.5 Flash-Lite')) throw new Error('Gemini 3.5 non indicato.');
if (!html.includes("serviceWorker.register('./sw.js?v=18')")) throw new Error('Service Worker V18 non registrato.');

const filesToCheck = [
  'api/scrape-stats.js','api/club-ai-sync.js','api/assistente.js','api/health.js',
  'lib/ea-client-core.js','scripts/update-fc27-knowledge.mjs','scripts/test-ea-client.mjs','scripts/test-ai-connection.mjs','scripts/test-assistente.mjs','index-inline.js'
];
for (const file of filesToCheck) execFileSync(process.execPath, ['--check', path.join(root,file)], { stdio:'pipe' });

const scraper = fs.readFileSync(path.join(root,'api/scrape-stats.js'),'utf8');
if (!scraper.includes("const EA_ORIGIN = 'https://proclubs.ea.com';") || !scraper.includes('const EA_API = `${EA_ORIGIN}/api/fc`;')) throw new Error('Endpoint EA FC27 mancante.');
for (const token of ['currentSeasonLeaderboard/search','clubs/info','clubs/overallStats','members/stats','members/career/stats','clubs/matches','friendlyMatch']) {
  if (!scraper.includes(token)) throw new Error(`Endpoint ${token} mancante.`);
}
if (!scraper.includes('puppeteer-core') || !scraper.includes('@sparticuz/chromium')) throw new Error('Chromium serverless mancante.');
if (!scraper.includes("page.evaluate") || !scraper.includes("page.goto(url")) throw new Error('Fallback browser mancante.');
if (scraper.includes('seasonId')) throw new Error('members/stats non deve ricevere seasonId.');
if (scraper.includes('proclubstracker.com')) throw new Error('Lo scraper non deve dipendere da PCT.');

const ai = fs.readFileSync(path.join(root,'api/assistente.js'),'utf8');
if (!ai.includes('gemini-3.5-flash-lite')) throw new Error('Gemini 3.5 mancante nell’IA.');
if (/gemini-2\.5|google_search|url_context|GROQ|Pro Clubs Tracker/i.test(ai)) throw new Error('Vecchia configurazione IA ancora presente.');

const sw = fs.readFileSync(path.join(root,'sw.js'),'utf8');
if (!sw.includes('shell-v18')) throw new Error('SW shell-v18 mancante.');

console.log('VERIFY V18 OK');
