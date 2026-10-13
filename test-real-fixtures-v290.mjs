import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { detectDataFile } from '../lib/data-pipeline.js';
const expected={
 'search.json':'totals','search (1).json':'season','info.json':'clubInfo','overallStats.json':'overallStats','stats.json':'players','stats (1).json':'career','matches.json':'league'
};
let count=0;
for(const [file,cat] of Object.entries(expected)){
 try{
   const raw=JSON.parse(await fs.readFile(`/mnt/data/${file}`,'utf8'));
   const d=detectDataFile(raw,file);
   assert.equal(d.category,cat,`${file} -> ${d.category}`);
   count++;
 }catch(e){if(e?.code==='ENOENT')continue;throw e}
}
assert.equal(count,7);
console.log('test-real-fixtures: OK');
