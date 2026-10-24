import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),seen=new Set(),missing=[];
async function localFile(url,parent=root+'/index.html'){
 if(!url.startsWith('.')&&!url.startsWith('/'))return;
 const clean=url.split(/[?#]/)[0],p=url.startsWith('/')?path.join(root,clean):path.resolve(path.dirname(parent),clean);
 if(seen.has(p))return;seen.add(p);
 const stat=await fs.stat(p).catch(()=>null);if(!stat){missing.push(path.relative(root,p));return;}if(!stat.isFile()||!/\.(?:html|css|js)$/.test(p))return;
 const s=await fs.readFile(p,'utf8'),refs=p.endsWith('.html')?[...s.matchAll(/(?:src|href)=["']([^"']+)["']/g)]:[...s.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g),...s.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
 for(const m of refs)await localFile(m[1],p);
}
await localFile('./index.html');
const sw=await fs.readFile('sw.js','utf8'),shell=JSON.parse(sw.match(/const SHELL=(\[[^;]+\]);/)[1].replace(/'/g,'"'));
for(const url of shell)await localFile(url);
assert.deepEqual(missing,[],'all recursive local modules, assets and service-worker shell exist');
assert.equal(new Set(shell).size,shell.length,'no duplicate shell requests');
const html=await fs.readFile('index.html','utf8');assert(html.includes('./club-modern.css?v=studio-6'));assert(html.includes('./club-experience.js?v=studio-6'));
for(const f of ['index.html','sw.js','account.js','studio-viewer.js','race-3d.js','jockey-portrait.js'])assert(!(await fs.readFile(f,'utf8')).includes('studio-4'),f+' has no stale shared model version');
console.log(`PASS release resource closure: ${seen.size} local resources/imports, ${shell.length} service-worker shell entries, consistent Studio 6 cache/entry points.`);
