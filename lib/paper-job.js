import {repairPortraits} from './paper-repair.js';
import {selectPortrait} from './paper-portrait.js';
import {randomUUID} from 'node:crypto';
import {rpc} from './supabase.js';
import {buildTeam} from './data-pipeline.js';
import {editionFacts,generateEdition,sourceFingerprint} from './editorial.js';
export const paperErrors={NO_MATCHES:'Non ci sono partite con punteggi disponibili.',BUSY:'La redazione sta già lavorando. Attendi e riprova.',DATA_CHANGED:'I dati sono cambiati durante la scrittura. Riprova al termine del caricamento.',CONFLICT:'Generazione interrotta: riprova.',COOLDOWN:'Attendi un minuto prima di riprovare.',GEMINI_QUOTA:'Quota IA esaurita. Dati salvati e ultima Gazzetta conservata.',AI_UNAVAILABLE:'IA non disponibile. Ultima Gazzetta conservata.',INVALID_EDITION:'Edizione incompleta o non valida: non è stata pubblicata.',REPEATED_EDITION:'Titolo ripetuto: ultima edizione conservata.',TimeoutError:'Tempo IA esaurito. Ultima Gazzetta conservata.'};
export async function publishPaper(actor){
 const lease=randomUUID();let acquired=false,error='';
 try{
  const bundle=await rpc('sisal_team_read',{p_role:'own'}),files=bundle.files;
  const {facts}=editionFacts(buildTeam({fileRecords:files,role:'own'}),files),fingerprint=sourceFingerprint(files);
  const job=(action,p)=>rpc('sisal_paper_job',{p_action:action,p_actor:actor.id,p});
  const claim=await job('claim',{lease,fingerprint});if(claim.existing)return {...claim,...await repairPortraits(actor,claim.edition,bundle),ok:true};acquired=true;
  const model=await generateEdition(facts,claim.recent);
  const styles=await rpc('sisal_paper_appearances',{});
  for(const story of model.stories){
   const portrait=selectPortrait(story,facts[story.ref-1].players,styles);
   if(portrait)story.portrait=portrait;
  }
  return {...await job('publish',{lease,fingerprint,revision:bundle.revision,model}),ok:true};
 }catch(e){error=e.name==='TimeoutError'?'TimeoutError':e.code||e.message;return {ok:false,code:error,error:paperErrors[error]||'Gazzetta non pubblicata. I dati caricati restano salvati.'};}
 finally{if(acquired)await rpc('sisal_paper_job',{p_action:'release',p_actor:actor.id,p:{lease,error}}).catch(()=>{});}
}
