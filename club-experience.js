/* Logo entry point and small, event-driven presentation. No background API loop. */
let opening=false;
const logo=document.querySelector('.club-brand');
if(logo){
 logo.tabIndex=0;logo.setAttribute('role','button');logo.setAttribute('aria-label','Apri SISAL ARENA · il campo del club');logo.setAttribute('aria-haspopup','dialog');
 const cue=document.createElement('span');cue.className='club-arena-cue';cue.innerHTML='<i aria-hidden="true"></i> SISAL ARENA <span aria-hidden="true">↗</span>';logo.append(cue);
 const launch=async()=>{
  if(opening)return;opening=true;logo.setAttribute('aria-busy','true');
  try{const {openArena}=await import('./arena-ui.js?v=arena-8');await openArena();}
  catch{cue.textContent='Arena non caricata · tocca per riprovare';}
  finally{opening=false;logo.removeAttribute('aria-busy');}
 };
 logo.addEventListener('click',launch);
 logo.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();launch();}});
}
// CSS pauses ambience when the tab is hidden; animation never keeps a network
// connection open. The club's existing reduced-motion control remains effective.
function visibility(){document.documentElement.classList.toggle('club-page-hidden',document.hidden);}
document.addEventListener('visibilitychange',visibility);visibility();
