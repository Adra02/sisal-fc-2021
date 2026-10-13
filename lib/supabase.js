// Server only. No browser imports and no public Supabase key.
export function hasStorageConfig(){return Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY);}
export function storageError(code,status=503){return Object.assign(new Error(code==='CONFLICT'?'I dati sono cambiati durante il salvataggio. Aggiorna e riprova.':code),{code,status});}
export async function supabase(path,{method='GET',body,headers={},binary=false}={}){
 if(!hasStorageConfig())throw storageError('SETUP');
 const base=String(process.env.SUPABASE_URL).replace(/\/$/,'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base))throw storageError('SETUP');
 const key=process.env.SUPABASE_SECRET_KEY;
 const response=await fetch(base+path,{method,headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),...(body&&!Buffer.isBuffer(body)?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:Buffer.isBuffer(body)?body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(18000)});
 if(!response.ok){let error;try{error=await response.json()}catch{}const code=error?.message||'CONNECTION';throw storageError(code,/RATE_LIMIT|DAILY_LIMIT/.test(code)?429:/CONFLICT|ARCHIVED|LIMIT/.test(code)?409:code==='NOT_FOUND'?404:503);}
 if(binary)return Buffer.from(await response.arrayBuffer());
 const text=await response.text();return text?JSON.parse(text):null;
}
export const rpc=(name,args)=>supabase('/rest/v1/rpc/'+name,{method:'POST',body:args});
const BUCKET='sisal-images';
export async function uploadImage(path,dataUrl,maxBytes=315000){
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl||''))throw storageError('INVALID_IMAGE',400);
 const bytes=Buffer.from(dataUrl.split(',')[1],'base64');
 if(bytes.length<4||bytes.length>maxBytes||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw storageError('INVALID_IMAGE',400);
 await supabase(`/storage/v1/object/${BUCKET}/${path}`,{method:'POST',body:bytes,headers:{'Content-Type':'image/jpeg','x-upsert':'true','cache-control':'31536000'}});
 return path;
}
export async function downloadImage(path){
 if(!path)return null;
 if(!/^(news|players)\/[a-z0-9/-]+\.jpg$/.test(path))throw storageError('INVALID_IMAGE');
 const bytes=await supabase(`/storage/v1/object/authenticated/${BUCKET}/${path}`,{binary:true});
 return 'data:image/jpeg;base64,'+bytes.toString('base64');
}
