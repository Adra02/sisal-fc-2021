import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCES_PATH = path.join(ROOT, 'config', 'fc27-sources.json');
const KNOWLEDGE_PATH = path.join(ROOT, 'knowledge', 'fc27-knowledge.json');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_VIDEOS = 1;
const LOOKBACK_DAYS = Math.max(1, Math.min(30, Number(process.env.LOOKBACK_DAYS || 14)));
const MODEL = 'gemini-3.5-flash-lite';

if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

function decodeXml(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function tagText(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  return m ? decodeXml(m[1].trim()) : '';
}

function attrValue(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i');
  const m = block.match(re);
  return m ? decodeXml(m[1].trim()) : '';
}

function parseFeed(xml, source) {
  return [...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(match => {
    const block = match[1];
    const videoId = tagText(block, 'yt:videoId');
    const title = tagText(block, 'title');
    const publishedAt = tagText(block, 'published');
    const updatedAt = tagText(block, 'updated');
    const url = attrValue(block, 'link', 'href') || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
    return {
      videoId,
      title,
      publishedAt,
      updatedAt,
      url,
      channelId: source.channelId,
      channelTitle: source.name,
      sourceType: source.type,
      sourcePriority: source.priority || 0,
      sourceFocus: source.focus || []
    };
  }).filter(v => v.videoId && v.url);
}

async function fetchFeed(source) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(source.channelId)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'fc27-clubs-knowledge-bot/1.0 (+GitHub Actions)' }
  });
  const xml = await response.text();
  if (!response.ok) throw new Error(`RSS ${source.name}: HTTP ${response.status}`);
  return parseFeed(xml, source);
}

function scoreVideo(video) {
  const title = video.title.toLowerCase();
  let score = video.sourcePriority || 0;
  if (/fc\s*27|ea\s*sports\s*fc\s*27/.test(title)) score += 6;
  if (/clubs|pro\s*clubs|proclubs/.test(title)) score += 7;
  if (/gameplay|tactic|tactics|formation|defend|defending|attack|attacking|meta|passing|dribbling|build|archetype|ai|press|competitive|analysis|guide/.test(title)) score += 6;
  if (/trailer|soundtrack|pack|ultimate team|fut/.test(title)) score -= 8;
  return score;
}

function relevant(video) {
  const title = video.title.toLowerCase();
  const fc27 = /fc\s*27|eafc27|ea\s*sports\s*fc\s*27/.test(title);
  const clubs = /clubs|pro\s*clubs|proclubs/.test(title);
  if (!fc27 || !clubs) return false;
  return !/trailer|soundtrack|fut|ultimate team|career mode|pack/.test(title);
}

function extractInteractionText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;
  if (Array.isArray(data?.outputs)) return data.outputs.map(x => typeof x?.text === 'string' ? x.text : '').filter(Boolean).join('\n');
  return '';
}

function cleanJson(text) {
  return String(text || '').replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
}

async function analyzeVideo(video) {
  const prompt = [
    'Sei un analista tecnico del gameplay competitivo di EA SPORTS FC 27 Clubs.',
    'Analizza il video YouTube pubblico indicato nell’input video usando il contenuto del video come fonte primaria.',
    'Concentrati su Clubs/11v11: difesa manuale, posizionamento, pressing, transizioni, costruzione, passaggi, movimento senza palla, attacco, finalizzazione, dribbling, moduli, ruoli, archetipi e gestione degli spazi.',
    'Non trasformare opinioni del creator in fatti. Distingui osservazioni, consigli pratici e affermazioni legate a patch/meta.',
    'Per ogni consiglio importante indica un timestamp approssimativo quando disponibile.',
    'Se il video non contiene materiale utile a Clubs, dichiaralo e non inventare.',
    'Restituisci esclusivamente JSON valido con: summary, coachingPoints, tacticalFindings, patchOrMetaClaims, evidenceLevel, confidence, caveats.'
  ].join('\n');

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { type: 'text', text: `${prompt}\n\nVIDEO_TITOLO: ${video.title}\nCANALE: ${video.channelTitle}` },
        { type: 'video', uri: video.url }
      ],
      store: false,
      response_format: {
        type: 'text', mime_type: 'application/json',
        schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            coachingPoints: { type: 'array', items: { type: 'object', properties: { point: { type: 'string' }, timestamp: { type: 'string' } }, required: ['point','timestamp'] } },
            tacticalFindings: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, timestamp: { type: 'string' } }, required: ['finding','timestamp'] } },
            patchOrMetaClaims: { type: 'array', items: { type: 'string' } }, evidenceLevel: { type: 'string' }, confidence: { type: 'string' },
            caveats: { type: 'array', items: { type: 'string' } }
          },
          required: ['summary','coachingPoints','tacticalFindings','patchOrMetaClaims','evidenceLevel','confidence','caveats']
        }
      },
      generation_config: { temperature: 0.1, max_output_tokens: 1600 }
    })
  });

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const text = extractInteractionText(data);
  if (!text) throw new Error('Gemini returned no text');
  return { ...video, analyzedAt: new Date().toISOString(), model: MODEL, ...JSON.parse(cleanJson(text)) };
}

const sourcesData = await readJson(SOURCES_PATH, { sources: [] });
const knowledge = await readJson(KNOWLEDGE_PATH, { version: 1, videosAnalyzed: 0, insights: [], videos: [] });
const seen = new Set((knowledge.videos || []).map(v => v.videoId));
const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

const feedResults = await Promise.allSettled((sourcesData.sources || []).map(fetchFeed));
const feedErrors = feedResults.filter(x => x.status === 'rejected').map(x => x.reason?.message || 'feed error');
const found = feedResults.flatMap(x => x.status === 'fulfilled' ? x.value : []);

const candidates = [...new Map(found.map(v => [v.videoId, v])).values()]
  .filter(v => Date.parse(v.publishedAt || '') >= cutoff)
  .filter(relevant)
  .filter(v => !seen.has(v.videoId))
  .map(v => ({ ...v, score: scoreVideo(v) }))
  .sort((a, b) => b.score - a.score || Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || ''))
  .slice(0, MAX_VIDEOS);

console.log(`Found ${candidates.length} new relevant videos.`);
if (feedErrors.length) console.warn(feedErrors.join(' | '));

const analyzed = [];
for (const video of candidates) {
  try {
    console.log(`Analyzing ${video.channelTitle}: ${video.title}`);
    analyzed.push(await analyzeVideo(video));
  } catch (error) {
    console.warn(`Skipped ${video.videoId}: ${error.message}`);
  }
}

if (!analyzed.length) {
  console.log('No new videos analyzed; knowledge file left unchanged.');
  process.exit(0);
}

knowledge.version = Number(knowledge.version || 1) + 1;
knowledge.updatedAt = new Date().toISOString();
knowledge.lastRun = { at: knowledge.updatedAt, found: candidates.length, analyzed: analyzed.length, feedErrors };
knowledge.videosAnalyzed = Number(knowledge.videosAnalyzed || 0) + analyzed.length;
knowledge.videos = [...analyzed, ...(knowledge.videos || [])].slice(0, 80);
const newInsights = analyzed.map(v => ({
  id: `yt-${v.videoId}`,
  sourceType: v.sourceType,
  title: v.title,
  url: v.url,
  channelTitle: v.channelTitle,
  publishedAt: v.publishedAt,
  analyzedAt: v.analyzedAt,
  evidenceLevel: v.evidenceLevel,
  confidence: v.confidence,
  summary: v.summary,
  coachingPoints: v.coachingPoints,
  tacticalFindings: v.tacticalFindings,
  patchOrMetaClaims: v.patchOrMetaClaims,
  caveats: v.caveats
}));
knowledge.insights = [...newInsights, ...(knowledge.insights || [])].slice(0, 100);
knowledge.sources = (sourcesData.sources || []).map(s => s.name);
await fs.writeFile(KNOWLEDGE_PATH, JSON.stringify(knowledge, null, 2) + '\n');
console.log(`Knowledge updated: ${knowledge.insights.length} insights.`);
