import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const files=[];async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){if(['.git','node_modules','scripts','docs','migration','setup','vendor'].includes(e.name))continue;const name=dir+'/'+e.name;if(e.isDirectory())await walk(name);else if(/\.(js|json|html|css)$/.test(name))files.push(name);}}
await walk('.');for(const f of files){const text=await fs.readFile(f,'utf8');assert(!/@vercel\/blob|BLOB_READ_WRITE_TOKEN|BLOB_STORE_ID|blob\.vercel-storage\.com/.test(text),'Legacy storage dependency: '+f);}
const sw=await fs.readFile('sw.js','utf8');assert(sw.includes("u.pathname.includes('/api/')"));assert(sw.includes('3-supabase'));
console.log('PASS: '+files.length+' application files scanned; no old storage SDK, credentials or endpoints. Browser Blob/Canvas are local APIs.');
