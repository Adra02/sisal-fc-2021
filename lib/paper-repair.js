import {isDeepStrictEqual} from 'node:util';
import {rpc} from './supabase.js';
import {buildTeam} from './data-pipeline.js';
import {editionFacts,sourceFingerprint} from './editorial.js';
import {selectPortrait} from './paper-portrait.js';
const key=v=>String(v??'').normalize('NFKC').trim().toLowerCase();
const date=v=>{const n=Number(v),d=new Date(Number.isFinite(n)&&n>0?(n<1e12?n*1000:n):v);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('it-IT',{timeZone:'Europe/Rome'})};
function matchStory(story,facts,refsTrusted){
 if(story.matchId)return facts.find(f=>f.id===String(story.matchId))||null;
 const candidates=facts.filter(f=>key(f.opponent)===key(story.opponent)
  &&Number(f.goals)===Number(story.goals)&&Number(f.against)===Number(story.against)
  &&date(f.timestamp)===story.date&&key(f.competition)===key(story.competition)
  &&(!story.own||key(f.own)===key(story.own)));
 if(refsTrusted){const f=facts[Number(story.ref)-1];if(candidates.includes(f))return f;}
 return candidates.length===1?candidates[0]:null;
}
export async function repairPortraits(actor,edition,bundle=null){
 if(!edition?.id||!Array.isArray(edition.model?.stories))return {edition,corrected:0,unavailable:0};
 bundle ||= await rpc('sisal_team_read',{p_role:'own'});
 const {facts}=editionFacts(buildTeam({fileRecords:bundle.files,role:'own'}),bundle.files,{limit:null});
 const trusted=edition.fingerprint===sourceFingerprint(bundle.files),styles=await rpc('sisal_paper_appearances',{});
 let corrected=0,unavailable=0;
 const stories=edition.model.stories.map(story=>{
  const fact=matchStory(story,facts,trusted),portrait=fact?selectPortrait(story,fact.players,styles):null;
  if(!portrait)unavailable++;
  const next={...story};if(portrait)next.portrait=portrait;else delete next.portrait;
  if(!isDeepStrictEqual(story.portrait??null,portrait))corrected++;
  return next;
 });
 if(!corrected)return {edition,corrected,unavailable};
 const result=await rpc('sisal_paper_portraits',{p_actor:actor.id,p_id:edition.id,p_revision:bundle.revision,p_expected:edition.model,p_model:{...edition.model,stories}});
 return {...result,corrected,unavailable};
}
