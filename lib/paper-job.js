import {randomUUID} from 'node:crypto';
import {rpc} from './supabase.js';
import {buildTeam} from './data-pipeline.js';
import {editionFacts,generateEdition} from './editorial.js';
import {selectPortrait} from './paper-portrait.js';
export const paperErrors={PAPER_SETUP:'Completa la migrazione 21-gazzetta-cinque-partite.sql su Supabase.',NO_MATCHES:'Non ci sono partite con punteggi disponibili.',BUSY:'La redazione sta già lavorando. Attendi e riprova.',DATA_CHANGED:'I dati sono cambiati durante la scrittura. Riprova al termine del caricamento.',CONFLICT:'Generazione interrotta: riprova.',COOLDOWN:'Attendi un minuto prima di riprovare.',GEMINI_QUOTA:'Quota IA esaurita. Dati salvati e ultima Gazzetta conservata.',AI_UNAVAILABLE:'IA non disponibile. Ultima Gazzetta conservata.',INVALID_EDITION:'Edizione incompleta o non valida: non è stata pubblicata.',REPEATED_EDITION:'Titolo ripetuto: ultima edizione conservata.',TimeoutError:'Tempo IA esaurito. Ultima Gazzetta conservata.'};
export async function publishPaper(actor,options={}){
 const lease=randomUUID();let acquired=false,error='',fingerprint='';
 const job=(action,p)=>rpc('sisal_paper54',{p_action:action,p_actor:actor.id,p});
 try{
  const claim=await job('claim',{lease,...options});
  if(claim.existing||claim.skipped||claim.pending)return {ok:true,...claim};
  acquired=true;fingerprint=claim.fingerprint;
  const {facts}=editionFacts(buildTeam({fileRecords:claim.files,role:'own'}),claim.files,{limit:5});
  const model=await generateEdition(facts,claim.recent);
  model.stories=model.stories.map((story,i)=>({...story,portrait:selectPortrait(story,facts[i].players,claim.styles||{})}));
  return {...await job('publish',{lease,fingerprint,model}),ok:true};
 }catch(e){error=e.name==='TimeoutError'?'TimeoutError':e.code||e.message;if(/sisal_paper54|schema cache|could not find.*function/i.test(error))error='PAPER_SETUP';return {ok:false,code:error,error:paperErrors[error]||'Gazzetta non pubblicata. I dati caricati restano salvati.'};}
 finally{if(acquired)await job('release',{lease,fingerprint,error}).catch(()=>{});}
}
