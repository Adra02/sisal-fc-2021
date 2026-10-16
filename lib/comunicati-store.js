import {createHash} from 'node:crypto';
import {rpc,uploadImage,downloadImage} from './supabase.js';
export function createNewsStore(io={rpc,uploadImage,downloadImage}){
 return {async operate(q,device){
  const p={...q};delete p.fresh;
  if(['create','edit'].includes(p.action)){
   p.image_path=p.image?`news/${p.id}/${createHash('sha256').update(p.image).digest('hex')}.jpg`:null;
   if(p.image)await io.uploadImage(p.image_path,p.image,196608);
   delete p.image;
  }
  const result=await io.rpc('sisal_news_actor',{p,p_device:device});
  if(q.action==='get'){result.image=await io.downloadImage(result.image_path);delete result.image_path;}
  return result;
 }};
}
export const newsStore=createNewsStore();
