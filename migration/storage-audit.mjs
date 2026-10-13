// Read-only inventory. Never delete files automatically while writers may be active.
import {supabase} from '../lib/supabase.js';
const used=new Set();
for(const table of ['communications','player_photos']){
 for(let offset=0;;offset+=500){const rows=await supabase(`/rest/v1/${table}?select=image_path&limit=500&offset=${offset}`);for(const r of rows)if(r.image_path)used.add(r.image_path);if(rows.length<500)break;}
}
let bytes=0,unusedBytes=0,count=0,unused=0;
async function scan(prefix=''){
 for(let offset=0;;offset+=100){const rows=await supabase('/storage/v1/object/list/sisal-images',{method:'POST',body:{prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}}});
  for(const r of rows){const key=prefix?prefix+'/'+r.name:r.name;if(!r.id){await scan(key);continue;}const size=Number(r.metadata?.size||0);count++;bytes+=size;if(!used.has(key)){unused++;unusedBytes+=size;}}
  if(rows.length<100)break;
 }
}
await scan();console.log(JSON.stringify({files:count,bytes,unreferencedFiles:unused,unreferencedBytes:unusedBytes,note:'Solo inventario: nessuna cancellazione. Le versioni non collegate restano recuperabili.'},null,2));
