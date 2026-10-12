/* Sisal Stadium v32.1.42. Navigation only: no API, Blob, AI or polling. */
(() => {
  'use strict';
  if (window.SisalStadium) return;
  const zones = [
    {id:'team', label:'Squadra', place:'Ingresso principale', description:'Il club, i risultati e le statistiche di squadra.', x:50,y:66, icon:'shield'},
    {id:'players',label:'Giocatori',place:'Spogliatoi',description:'Le schede e i numeri dei tuoi compagni.',x:85,y:54,icon:'shirt'},
    {id:'top',label:'Top 3',place:'Sala dei trofei',description:'Le classifiche U5 e le corse della Sisal.',x:83,y:31,icon:'cup'},
    {id:'pitch',label:'Campo',place:'Terreno di gioco',description:'La formazione, i ruoli e le tue tattiche.',x:50,y:41,icon:'pitch'},
    {id:'matches',label:'Partite',place:'Tabellone',description:'Risultati e dettagli delle partite archiviate.',x:69,y:14,icon:'board'},
    {id:'fun',label:'Fun',place:'Tribuna Sisal',description:'Record, protagonisti e curiosità della squadra.',x:27,y:20,icon:'flag'},
    {id:'opponent',label:'Avversario',place:'Ingresso ospiti',description:'I dati del prossimo avversario da studiare.',x:15,y:65,icon:'search'},
    {id:'ai',label:'IA',place:'Sala tattica',description:'Apri il tuo assistente per l’analisi del club.',x:12,y:37,icon:'spark'},
    {id:'data',label:'I tuoi dati',place:'Sede del club',description:'Carica e gestisci i file delle due squadre.',x:81,y:78,icon:'data'}
  ];
  const shapes = {
    shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    shirt:'<path d="m8 3-5 3-2 5 4 2 2-3v11h10V10l2 3 4-2-2-5-5-3c0 4-8 4-8 0Z"/>',
    cup:'<path d="M8 3h8v6a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 5 4m7-7h4v3a4 4 0 0 1-5 4m-3 1v5m-4 3h8m-6-3h4v3h-4Z"/>',
    pitch:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M8 3v4h8V3M8 21v-4h8v4"/><circle cx="12" cy="12" r="3"/>',
    board:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 17v4m10-4v4M7 9h3m4 0h3m-10 4h10"/>',
    flag:'<path d="M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6m-3-3v6"/>',
    spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
    data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>',
    stadium:'<ellipse cx="12" cy="8" rx="10" ry="4"/><path d="M2 8v8c0 5 20 5 20 0V8M6 12v7m6-7v8m6-8v7M5 2v4m14-4v4"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${shapes[name]}</svg>`;
  const motionKey='sisal_stadium_motion_v1';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let dialog,launcher,returnFocus,oldOverflow='',afterClose=null,motion=true;
  try { motion=localStorage.getItem(motionKey)!=='off'; } catch {}
  function navFor(id) {
    return [...document.querySelectorAll('.bottomnav [data-tab]')].find(button=>button.dataset.tab===id);
  }
  function syncMotion() {
    if(!dialog)return;
    const on=motion&&!reduced.matches&&!document.hidden&&dialog.open;
    dialog.classList.toggle('ss-moving',on);
    const control=dialog.querySelector('[data-ss-motion]');
    control.setAttribute('aria-pressed',String(motion));
    control.textContent=reduced.matches?'Movimento ridotto dal dispositivo':motion?'Animazioni: attive':'Animazioni: ferme';
  }
  function select(id) {
    if(!zones.some(zone=>zone.id===id))return;
    const target=navFor(id);
    if(!target||target.disabled||typeof target.onclick!=='function'){
      dialog.querySelector('[data-ss-status]').textContent='Questa sezione non è pronta. Chiudi lo stadio e ricarica la pagina.';
      return;
    }
    afterClose=()=>{
      target.click();
      const content=document.getElementById('content');
      if(content){content.setAttribute('tabindex','-1');content.focus({preventScroll:true});}
    };
    close();
  }
  function close(){if(dialog?.open)dialog.close();}
  function createDialog(){
    dialog=document.createElement('dialog');dialog.id='sisalStadium';dialog.className='ss-dialog';
    dialog.setAttribute('aria-labelledby','ss-title');
    dialog.innerHTML=`<div class="ss-shell">
      <header class="ss-header"><div class="ss-wordmark">${icon('stadium')}<span>SISAL FC 2021<small>IL TUO STADIO</small></span></div><button type="button" class="ss-close" data-ss-close aria-label="Chiudi lo stadio">✕</button></header>
      <div class="ss-intro"><p class="ss-eyebrow">NOVE ZONE · UN SOLO CLUB</p><h2 id="ss-title">La casa della <em>squadra.</em></h2><p>Tocca una zona dello stadio o scegli una sezione.</p></div>
      <div class="ss-layout"><div class="ss-map-column"><div class="ss-map" aria-label="Mappa dello stadio">
        <img class="ss-art" src="./assets/sisal-stadium-v42.png" width="1536" height="1024" alt="Stadio Sisal illustrato, circondato da spogliatoi, tribune, sala trofei e sede del club." decoding="async">
        <div class="ss-map-fallback" hidden>La mappa non è disponibile. Puoi usare tutte le sezioni qui sotto.</div>
        <div class="ss-pitch-glow" aria-hidden="true"></div>
        ${zones.map((z,i)=>`<button type="button" class="ss-pin" data-ss-go="${z.id}" style="--x:${z.x}%;--y:${z.y}%" aria-label="${z.label} · ${z.place}"><span class="ss-pin-number">${String(i+1).padStart(2,'0')}</span><span class="ss-pin-label">${z.label}</span></button>`).join('')}
      </div><div class="ss-map-caption"><span>ESPLORA LA SISAL</span><button type="button" class="ss-motion" data-ss-motion aria-pressed="true">Animazioni: attive</button></div></div>
      <nav class="ss-zones" aria-label="Tutte le sezioni della web app">${zones.map((z,i)=>`<button type="button" class="ss-zone" data-ss-go="${z.id}"><span class="ss-zone-icon">${icon(z.icon)}</span><span class="ss-zone-copy"><span class="ss-zone-place">${String(i+1).padStart(2,'0')} / ${z.place}</span><strong>${z.label}</strong><span class="ss-zone-description">${z.description}</span></span><span class="ss-zone-arrow" aria-hidden="true">↗</span></button>`).join('')}</nav></div>
      <p class="ss-status" data-ss-status role="status" aria-live="polite"></p>
      <footer class="ss-footer"><span>Il tuo club. La tua casa.</span><button type="button" data-ss-secret>Il segreto dello stemma <span aria-hidden="true">↗</span></button></footer>
    </div>`;
    document.body.append(dialog);
    dialog.querySelector('[data-ss-close]').addEventListener('click',close);
    dialog.querySelectorAll('[data-ss-go]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.ssGo)));
    dialog.querySelector('[data-ss-motion]').addEventListener('click',()=>{
      motion=!motion;try{localStorage.setItem(motionKey,motion?'on':'off');}catch{}syncMotion();
    });
    dialog.querySelector('[data-ss-secret]').addEventListener('click',()=>{
      const brand=document.querySelector('.club-brand');
      if(!brand)return;
      afterClose=()=>brand.click();close();
    });
    const art=dialog.querySelector('.ss-art');
    art.addEventListener('error',()=>{art.hidden=true;dialog.querySelector('.ss-map-fallback').hidden=false;dialog.classList.add('ss-art-missing');});
    dialog.addEventListener('close',()=>{
      document.body.style.overflow=oldOverflow;document.body.classList.remove('ss-stadium-open');
      launcher.setAttribute('aria-expanded','false');syncMotion();
      const task=afterClose;afterClose=null;
      if(task)task();else if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    });
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
    // Keep the app's window-level pull-to-refresh out of the scrollable dialog.
    for(const name of ['touchstart','touchmove','touchend'])dialog.addEventListener(name,event=>event.stopPropagation(),{passive:true});
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
  }
  function open(){
    if(document.querySelector('.sisal-ritual,.player-profile-modal,.sr-host'))return;
    if(!dialog)createDialog();
    if(dialog.open)return;
    returnFocus=document.activeElement;oldOverflow=document.body.style.overflow;
    if(typeof dialog.showModal!=='function'){
      launcher.textContent='Stadio non supportato';return;
    }
    dialog.querySelector('[data-ss-status]').textContent='';
    zones.forEach(zone=>{
      const nav=navFor(zone.id);const current=Boolean(nav?.classList.contains('active'));
      dialog.querySelectorAll('[data-ss-go]').forEach(button=>{
        if(button.dataset.ssGo!==zone.id)return;
        if(current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
        button.disabled=!nav;
      });
    });
    dialog.showModal();dialog.scrollTop=0;
    document.body.style.overflow='hidden';document.body.classList.add('ss-stadium-open');
    launcher.setAttribute('aria-expanded','true');syncMotion();
    dialog.querySelector('[data-ss-close]').focus({preventScroll:true});
  }
  function init(){
    const mount=document.getElementById('sisalStadiumEntry');if(!mount)return;
    launcher=document.createElement('button');launcher.type='button';launcher.className='ss-launcher';
    launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','sisalStadium');
    launcher.innerHTML=`<span class="ss-launcher-icon">${icon('stadium')}</span><span><strong>Entra nello stadio</strong><small>Esplora tutte le sezioni della Sisal</small></span><span class="ss-launcher-arrow" aria-hidden="true">↗</span>`;
    launcher.addEventListener('click',open);mount.append(launcher);
    document.addEventListener('visibilitychange',syncMotion);reduced.addEventListener?.('change',syncMotion);
  }
  window.SisalStadium=Object.freeze({open,close});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
