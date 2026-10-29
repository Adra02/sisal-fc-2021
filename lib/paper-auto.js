import {waitUntil} from '@vercel/functions';
import {rpc} from './supabase.js';
import {publishPaper} from './paper-job.js';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Each changed upload schedules a bounded task. Only the last generation in a
// batch can claim the shared SQL lease. No timers run in the browser.
export async function runPaperTask(actor,queued,{pause=delay,budgetMs=100000}={}){
 const end=Date.now()+budgetMs;
 await pause(Math.max(0,Math.min(queued.delayMs||20050,25000)));
 for(let attempt=0;attempt<24&&Date.now()<end;attempt++){
  const result=await publishPaper(actor,{automatic:true,generation:queued.generation});
  if(!result.pending)return result;
  const wait=Math.max(250,Math.min(Number(result.retryAfterMs)||5000,15000));
  if(Date.now()+wait>=end)return {ok:false,code:'BUSY'};
  await pause(wait);
 }
 return {ok:false,code:'BUSY'};
}
export async function schedulePaper(actor,{keepAlive=waitUntil,pause}={}){
 try{
  const queued=await rpc('sisal_paper54',{p_action:'enqueue',p_actor:actor.id,p:{}});
  if(queued.queued)keepAlive(runPaperTask(actor,queued,{pause}).catch(()=>{
   console.error('SISAL_PAPER_BACKGROUND_FAILED');
  }));
  return {ok:true,...queued};
 }catch{
  // The source upload has already succeeded; never label it failed for the newspaper.
  console.error('SISAL_PAPER_SCHEDULE_FAILED');
  return {ok:false,code:'PAPER_SETUP',error:'Dati salvati. Controlla la configurazione della Gazzetta.'};
 }
}
