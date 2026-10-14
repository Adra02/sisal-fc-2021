import {requireAccount,errorResponse} from '../lib/accounts.js';
import {rpc,downloadImage} from '../lib/supabase.js';
export async function GET(request){
 const id=new URL(request.url).searchParams.get('id');
 if(!/^[0-9a-f-]{36}$/i.test(id||''))return new Response('',{status:400});
 try{await requireAccount(request);const p=await rpc('sisal_news',{p:{action:'get',id},p_device:'00000000-0000-4000-8000-000000000000'});
  if(!p.image_path)return new Response('',{status:404});
  const image=await downloadImage(p.image_path);
  return new Response(Buffer.from(image.split(',')[1],'base64'),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return errorResponse(e);}
}
