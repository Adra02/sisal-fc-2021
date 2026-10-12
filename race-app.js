import {simulateRace, ENGINE_VERSION} from './race-engine.js';
import {raceSeed} from './race-motion.js?v=32.1.39';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(data,query='') {
  const response=await fetch('/api/horse-races'+query,{...(data?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(12000)});
  let body;try{body=await response.json()}catch{throw new Error('Servizio corse non disponibile. Puoi usare la modalità locale.');}
  if(!response.ok)throw new Error(body.error||'Collegamento non riuscito.');return body;
}
export async function openRacing(card,entries,{title,profile={},onClose=()=>{}}={}) {
  if(!document.querySelector('link[data-horse-racing]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./race-premium.css?v=1';link.dataset.horseRacing='1';document.head.appendChild(link);await new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>{link.remove();reject(new Error('Impossibile caricare la grafica della corsa.'))};});}
  let closed=false,nextBefore=null,history=[],pending=null;
  card.classList.add('hr-app');card.innerHTML='<div class="hr-lobby"></div><div class="sr-host hr-stage" hidden></div>';
  const lobby=card.querySelector('.hr-lobby'),stage=card.querySelector('.hr-stage');
  function close(){closed=true;onClose();}
  function shell(){
    lobby.hidden=false;stage.hidden=true;
    lobby.innerHTML=`<div class="hr-lobby-head"><span>SISAL FC 2021 / RACING CLUB</span><button data-close>Chiudi</button></div>
      <div class="hr-lobby-hero"><small>THE GREEN MILE</small><h2>La pista.<br>Il ritmo.<br>La volata.</h2><p>400 metri. ${entries.length} cavalli. Una sola linea d’arrivo.</p><div class="hr-lobby-stripes" aria-hidden="true"></div></div>
      <div class="hr-lobby-content"><p class="hr-note">Partecipanti da ${escape(title)}. Il risultato di questa corsa è simulato e non cambia la classifica calcistica.</p>
      <div class="hr-entrants">${entries.map((p,i)=>`<span><b style="border-color:${escape(p.color)}">${i+1}</b>${escape(p.name)}</span>`).join('')}</div>
      <div class="hr-actions"><button data-start class="hr-primary">Entra in pista</button><button data-local>Prova locale senza salvataggio</button><button data-health>Verifica MongoDB</button><button data-history>Storico gare</button></div>
      <p class="hr-db" role="status">Verifica del collegamento…</p><div class="hr-history"></div></div>`;
    lobby.querySelector('[data-close]').onclick=close;
    lobby.querySelector('[data-start]').onclick=()=>start(false);
    lobby.querySelector('[data-local]').onclick=()=>start(true);
    lobby.querySelector('[data-health]').onclick=check;
    lobby.querySelector('[data-history]').onclick=()=>loadHistory(false);
  }
  const message=(s)=>{const node=lobby.querySelector('.hr-db');if(node)node.textContent=s;};
  async function check(){message('Verifica MongoDB…');try{await api(null,'?action=health');message('✅ MongoDB collegato · le gare completate verranno salvate.');}catch(e){message('❌ '+e.message);}}
  async function loadHistory(more){
    const container=lobby.querySelector('.hr-history');message('Caricamento storico…');
    try{const data=await api(null,more&&nextBefore?'?before='+encodeURIComponent(nextBefore):'');history=more?history.concat(data.races):data.races;nextBefore=data.nextBefore;container.replaceChildren();
      const h=document.createElement('h3');h.textContent='Storico delle corse';container.appendChild(h);
      if(!history.length){const p=document.createElement('p');p.textContent='Nessuna gara completata. La prima corsa salvata apparirà qui.';container.appendChild(p);}
      for(const record of history){const row=document.createElement('details'),sum=document.createElement('summary');sum.textContent=new Date(record.createdAt).toLocaleString('it-IT')+' · '+record.title+' · Vince '+record.results[0].name;row.appendChild(sum);
        const info=document.createElement('p');info.textContent='Gara '+record.raceId+' · Seed '+record.seed;row.appendChild(info);
        for(const r of record.results){const p=document.createElement('p'),s=r.statistics;p.textContent=`${r.position}° · ${r.name} · ${r.time.toFixed(3)} s · +${r.gap.toFixed(3)} s · Sorpassi ${s.overtakes} / subiti ${s.overtaken} · Posizione media ${s.averagePosition.toFixed(2)} (migliore ${s.bestPosition}, peggiore ${s.worstPosition}) · Velocità media ${(s.averageSpeed*3.6).toFixed(1)} km/h · Massima ${(s.maxSpeed*3.6).toFixed(1)} km/h · Al comando ${s.timeLeading.toFixed(2)} s · Sprint ${(s.sprintSpeed*3.6).toFixed(1)} km/h`;row.appendChild(p);}
        const events=document.createElement('p');events.textContent='Eventi: '+record.events.map(e=>`${e.time.toFixed(1)} s ${e.type==='leader'?'nuovo leader #'+e.participantId:e.type==='sprint'?'ultimi metri':e.type==='duel'?'testa a testa':'photo finish'}`).join(' · ');row.appendChild(events);
        const replay=document.createElement('button');replay.textContent='Riproduci gara';replay.disabled=record.engineVersion!==ENGINE_VERSION;replay.onclick=()=>play(record,true);row.appendChild(replay);container.appendChild(row);}
      if(nextBefore){const b=document.createElement('button');b.textContent='Carica altre gare';b.onclick=()=>loadHistory(true);container.appendChild(b);}message('✅ Storico aggiornato.');
    }catch(e){message('❌ '+e.message);}
  }
  async function start(local){
    const buttons=[...lobby.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);message('Preparazione gara…');
    try{
      const record=local?{seed:raceSeed(),participants:entries,title,engineVersion:ENGINE_VERSION}:null;
      if(local){pending=null;await play(record,false);}
      else{const data=await api({action:'create',participants:entries,title});pending={raceId:data.race.raceId,token:data.token};await play(data.race,false);}
    }catch(e){message('❌ '+e.message);}finally{buttons.forEach(b=>b.disabled=false);}
  }
  async function play(record,replay){
    if(closed||!card.isConnected)return;
    lobby.hidden=true;stage.hidden=false;stage.innerHTML='<p class="hr-loading">Preparazione cavalli e pista…</p>';
    const recordPending=pending;let saved=false,saveError=null,savePromise=null;
    try{
      const race=simulateRace(record.seed,record.participants);
      await import('./race-audio.js?v=premium-1');
      const module=await import('./race-3d.js?v=premium-1');
      if(closed||!card.isConnected)return;
      stage.replaceChildren();
      await module.runRace(stage,race.participants,{race,profile,replay,onFinish:()=>{
        if(replay||!recordPending)return;
        savePromise=api({action:'complete',...recordPending}).then(()=>{saved=true;pending=null;}).catch(e=>{saveError=e.message;});
      }});
      if(savePromise)await savePromise;
    }catch(e){saveError='Il rendering 3D non è disponibile: '+e.message;stage.replaceChildren();}
    if(closed||!card.isConnected)return;
    shell();message(replay?'Replay terminato.':saved?'✅ Gara salvata su MongoDB.':saveError?'❌ '+saveError:recordPending?'Gara interrotta: nessun risultato incompleto è stato salvato.':'Modalità locale: gara non salvata.');
    if(saveError&&recordPending&&savePromise){const b=document.createElement('button');b.textContent='Riprova salvataggio';b.onclick=async()=>{b.disabled=true;try{await api({action:'complete',...recordPending});pending=null;message('✅ Gara salvata su MongoDB.');b.remove();}catch(e){message('❌ '+e.message);b.disabled=false;}};lobby.querySelector('.hr-actions').appendChild(b);}
  }
  shell();check();
}
