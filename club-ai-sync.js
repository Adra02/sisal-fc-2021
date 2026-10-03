import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { parsePCTLinkSnapshots } from '../lib/pct-parser.js';
import { normalizePCTLinks, pctLinkKey, SECTION_ORDER, ALLOWED_HOSTS } from '../lib/pct-links.js';
const CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_TIMEOUT_MS = 30000;
const PAGE_WAIT_MS = 1400;
export const maxDuration = 55;

const memoryCache = globalThis.__SISAL_PCT_LINK_CACHE || new Map();
globalThis.__SISAL_PCT_LINK_CACHE = memoryCache;

function reply(body, status=200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate'}
  });
}
function str(v) { return v == null ? '' : String(v).trim(); }
function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }
function cacheKey(role, links) { return pctLinkKey(role, links); }

async function launchBrowser() {
  chromium.setGraphicsMode = false;
  const executablePath = await chromium.executablePath();
  return puppeteer.launch({
    args:[...chromium.args,'--disable-dev-shm-usage','--no-sandbox'],
    defaultViewport:{width:1365,height:900,deviceScaleFactor:1},
    executablePath,
    headless:true
  });
}

function blockedText(textValue) {
  const t=str(textValue).toLowerCase();
  return /access denied|forbidden|error 403|temporarily blocked|captcha|verify you are human/.test(t);
}

async function openPctPage(page, url, section) {
  await page.goto(url, {waitUntil:'domcontentloaded',timeout:PAGE_TIMEOUT_MS});
  await sleep(PAGE_WAIT_MS);
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 80, {timeout:10000}).catch(()=>{});
  const snapshot = await extractSnapshot(page, section);
  if (blockedText(snapshot.bodyText)) throw new Error(`Pro Clubs Tracker ha bloccato la lettura della pagina ${section}. Apri il link nel browser: se la pagina funziona normalmente, riprova con lo stesso link.`);
  if (!ALLOWED_HOSTS.has(new URL(page.url()).hostname.toLowerCase())) throw new Error(`Il link ${section} ha reindirizzato fuori da Pro Clubs Tracker.`);
  return snapshot;
}

async function extractSnapshot(page, section) {
  return page.evaluate((sectionName) => {
    const clean = v => String(v ?? '').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
    const visible = el => { const s=getComputedStyle(el); return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'; };
    const tables=[...document.querySelectorAll('table')].slice(0,30).map(table=>({
      headers:[...table.querySelectorAll('thead th,thead td')].map(x=>clean(x.innerText)),
      rows:[...table.querySelectorAll('tbody tr')].slice(0,200).map(tr=>[...tr.querySelectorAll('th,td')].map(td=>clean(td.innerText))).filter(r=>r.length)
    })).filter(t=>t.headers.length||t.rows.length);
    const keyValues=[];
    for(const dl of [...document.querySelectorAll('dl')].slice(0,30)){
      const dts=[...dl.querySelectorAll('dt')],dds=[...dl.querySelectorAll('dd')];
      for(let i=0;i<Math.min(dts.length,dds.length);i++)keyValues.push({key:clean(dts[i].innerText),value:clean(dds[i].innerText)});
    }
    for(const card of [...document.querySelectorAll('section,article,[role="region"],div')].slice(0,500)){
      if(!visible(card))continue;
      const children=[...card.children].slice(0,8);
      if(children.length===2&&children.every(visible)){
        const k=clean(children[0].innerText),v=clean(children[1].innerText);
        if(k&&v&&k.length<90&&v.length<100)keyValues.push({key:k,value:v});
      }
    }
    const matchBlocks=[...document.querySelectorAll('tr,article,li,[class*="match" i],[class*="fixture" i],[data-match]')]
      .filter(visible).map(x=>clean(x.innerText)).filter(t=>/\b\d{1,2}\s*[-–:]\s*\d{1,2}\b/.test(t)&&t.length<700).slice(0,160);
    const sections=[...document.querySelectorAll('main section,main article,section,article')].slice(0,150).map(s=>({
      heading:clean(s.querySelector('h1,h2,h3,h4,h5')?.innerText||''),
      lines:clean(s.innerText).split(/\n+/).map(clean).filter(Boolean).slice(0,60)
    })).filter(s=>s.heading||s.lines.length);
    const headings=[...document.querySelectorAll('h1,h2,h3,h4,h5')].map(x=>clean(x.innerText)).filter(Boolean).slice(0,120);
    const links=[...document.querySelectorAll('a[href]')].map(a=>({text:clean(a.innerText),href:a.href})).filter(x=>x.href&&/proclubstracker\.com/i.test(x.href)).slice(0,200);
    const canonical=document.querySelector('link[rel="canonical"]')?.href||'';
    const bodyText=clean(document.querySelector('main')?.innerText||document.body.innerText).slice(0,80000);
    const ids=[location.pathname,canonical,...links.map(x=>x.href)].map(x=>String(x||'').match(/(?:club|clubs|team|teams)[\/_-](\d+)/i)?.[1]).filter(Boolean);
    return {section:sectionName,url:location.href,title:document.title,clubId:ids[0]||ids[1]||ids[2]||'',bodyText,headings,keyValues,tables,matchBlocks,sections,clubLinks:links};
  }, section);
}

export async function syncPCTLinks(links, {role='own', browserFactory=launchBrowser}={}) {
  const normalizedLinks = normalizePCTLinks(links,role);
  const browser=await browserFactory();
  try {
    const page=await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({'accept-language':'en-US,en;q=0.9,it-IT;q=0.8'});
    const snapshots={};
    for (const section of SECTION_ORDER) {
      const url=normalizedLinks[section];
      if (!url) continue;
      snapshots[section]=await openPctPage(page,url,section);
    }
    const parsed=parsePCTLinkSnapshots(snapshots,{role});
    if (!parsed.ok) {
      const missing=[];
      if (!parsed.players.length) missing.push('Players');
      if (!parsed.matches.length) missing.push('Matches');
      if (parsed.club.gamesPlayed==null && parsed.club.wins==null) missing.push('Stats');
      throw new Error(`Pro Clubs Tracker è stato letto, ma i dati essenziali non sono stati riconosciuti${missing.length?` (${missing.join(', ')})`:''}. Il layout della pagina potrebbe essere cambiato.`);
    }
    return {...parsed,fetchedAt:new Date().toISOString(),requestedLinks:normalizedLinks};
  } finally { await browser.close().catch(()=>{}); }
}

export function buildPCTBundleFromSnapshots(snapshots,{role='own',requestedName=''}={}) {
  return parsePCTLinkSnapshots(snapshots,{role,requestedName});
}

export async function POST(request) {
  if (request.method!=='POST') return reply({ok:false,error:'Metodo non consentito.'},405);
  let body={};
  try { body=await request.json(); } catch { return reply({ok:false,error:'Richiesta JSON non valida.'},400); }
  const role=body?.role==='opponent'?'opponent':'own';
  let links;
  try { links=normalizePCTLinks(body?.links,role); } catch(error) { return reply({ok:false,error:error?.message||'Link PCT non validi.',code:'PCT_LINKS_INVALID',source:'Pro Clubs Tracker'},400); }
  const key=cacheKey(role,links),cached=memoryCache.get(key);
  if(cached&&cached.expiresAt>Date.now()) return reply({...cached.data,cached:true,cachedAt:cached.savedAt},200);
  const startedAt=Date.now();
  try {
    const data=await syncPCTLinks(links,{role});
    const payload={ok:true,club:data.club,players:data.players,matches:data.matches,fun:data.fun,sections:data.sections,source:'Pro Clubs Tracker',sourceUrls:data.sourceUrls,sourcePageTitle:data.sourcePageTitle,pctSnapshot:data.pctSnapshot,fetchedAt:data.fetchedAt,requestedLinks:links,platform:'common-gen5',elapsedMs:Date.now()-startedAt};
    memoryCache.set(key,{expiresAt:Date.now()+CACHE_TTL_MS,savedAt:data.fetchedAt,data:payload});
    return reply(payload,200);
  } catch(error) {
    console.error('PCT linked sync error',error);
    return reply({ok:false,error:error?.message||'Errore durante la lettura dei link Pro Clubs Tracker.',code:'PCT_LINK_SYNC_FAILED',source:'Pro Clubs Tracker',requestedLinks:links,elapsedMs:Date.now()-startedAt},502);
  }
}
