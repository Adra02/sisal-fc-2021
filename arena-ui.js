import {createArenaOverlay} from './arena-overlays.js?v=arena-5';
import {nameKey} from './horse-style.js?v=studio-8';
const EPOCH=1800000;
let current=null;
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export async function openArena(){
 if(current){current.focus();return}
 if(!window.SisalAccount?.user){window.SisalAccount?.open();return}
 if(!document.querySelector('[data-arena-css]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./arena.css?v=arena-5';css.dataset.arenaCss='';document.head.append(css)}
 const previous=document.activeElement,dialog=document.createElement('dialog');current=dialog;dialog.className='arena-dialog';dialog.id='sisal-arena';
 dialog.innerHTML='<header class="arena-header"><div><small>SISAL FC 2021 · TRAINING GROUND</small><h2>SISAL ARENA</h2></div><div class="arena-header-actions"><button data-self>◎ Il mio giocatore</button><button data-close aria-label="Chiudi SISAL ARENA">Chiudi ×</button></div></header><div class="arena-program"><div><span class="arena-dot"></span><b data-title>Entriamo in campo</b></div><small data-sync>Collegamento…</small><div class="arena-match-strip" data-match-strip hidden><b>VERDI <strong data-match-score>0 – 0</strong> ORO</b><span data-match-info></span></div><progress data-progress max="50" value="0" aria-label="Avanzamento della scena"></progress></div><div class="arena-stage"><p class="arena-loading" role="status">Preparazione del campo e della rosa…</p></div><section class="arena-caption" aria-label="Dialoghi del campo"><div class="arena-caption-meta"><small data-talk-state>DAL CAMPO</small><button type="button" data-follow-speaker disabled aria-label="Inquadra chi parla"><span data-caption-speaker>Spogliatoio Sisal</span><i aria-hidden="true">↗</i></button></div><p data-line aria-live="polite">I dialoghi compariranno qui e nei fumetti sui giocatori.</p></section><footer class="arena-footer"><div class="arena-controls"><div class="arena-views" aria-label="Inquadratura"><button data-view="director" aria-pressed="true">Regia</button><button data-view="field" aria-pressed="false">Campo intero</button></div><label>Segui <select data-follow><option value="">Scegli un giocatore</option></select></label><div class="arena-zoom"><button data-zoom="-3" aria-label="Avvicina">＋</button><button data-zoom="3" aria-label="Allontana">−</button></div><button data-pause aria-pressed="false">Pausa locale</button><button data-audio aria-pressed="false">Audio spento</button><button data-dialogue aria-pressed="true">Fumetti attivi</button></div><p class="arena-identity" data-my-player></p><details class="arena-roster"><summary>In campo <span data-roster-count></span></summary><div data-roster class="arena-roster-list"></div></details><details class="arena-info"><summary>Informazioni e gestione</summary><p>Allenamento di fantasia con dialoghi satirici e linguaggio esplicito. Le scene non rappresentano fatti realmente accaduti e non cambiano le statistiche.</p><p>Trascina per ruotare e allarga due dita per lo zoom. Il cerchio dorato identifica il tuo giocatore. Regia segue l’azione e i suoi fumetti. Le battute restano leggibili sotto il campo: tocca il nome per inquadrare chi parla. Campo intero mostra il campo; Pausa locale ferma soltanto la tua vista.</p><p>Le scene sono condivise tramite l’orario server. Rosa e personalizzazioni entrano nello snapshot successivo, ogni 30 minuti. Nelle partitelle i membri formano due gruppi uguali, con due portieri BOT dedicati. I risultati sono solo dell’Arena e non cambiano le statistiche EA. Con una rosa dispari va in panchina, a rotazione casuale, un membro con 0 presenze EA; se nessuno ha 0 presenze note, ruotano tutti. Un dato mancante non vale 0. Con solo due giocatori attivi non è possibile cambiare i compagni. La scelta del portiere degli esercizi resta separata. Audio: effetti del campo, senza voci o telecronaca.</p><div data-admin></div><p data-error role="status"></p></details></footer>';
 document.body.append(dialog);document.documentElement.classList.add('sisal-arena-open');dialog.showModal();window.dispatchEvent(new Event('sisal-arena-opened'));dialog.setAttribute('aria-label','SISAL ARENA');
 const selfKey=nameKey(window.SisalAccount.user.player_key||window.SisalAccount.user.display_name);
 const stage=dialog.querySelector('.arena-stage'),error=dialog.querySelector('[data-error]'),caption=dialog.querySelector('.arena-caption');
 let engine=null,overlay=null,timer=0,disposed=false,abort=null,clockBase=0,performanceBase=0,epoch=null,showDialogue=true,lastText='',lastTitle='',resumeAt=0,inFlight=false,localPaused=false,lastFrame=null,lastSpeaker='';
 try{showDialogue=localStorage.getItem('sisal_arena_dialogue')!=='off';}catch{}
 function syncDialogue(){const b=dialog.querySelector('[data-dialogue]');b.textContent=showDialogue?'Fumetti attivi':'Fumetti nascosti';b.setAttribute('aria-pressed',String(showDialogue));caption.hidden=!showDialogue;}syncDialogue();
 function status(message){error.textContent=message;dialog.querySelector('.arena-info').open=!!message;}
 const close=()=>{if(disposed)return;disposed=true;clearTimeout(timer);abort?.abort();engine?.dispose();overlay?.dispose();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('sisal-eligibility',auth);dialog.remove();document.documentElement.classList.remove('sisal-arena-open');current=null;window.dispatchEvent(new Event('sisal-arena-closed'));previous?.focus?.()};
 dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 function follow(key){engine?.follow(key);dialog.querySelector('[data-follow]').value=key;dialog.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(!key&&b.dataset.view==='director')));}
 dialog.querySelector('[data-follow]').onchange=e=>follow(e.target.value);
 dialog.querySelector('[data-self]').onclick=()=>follow(selfKey);
 dialog.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{engine?.view?.(b.dataset.view);dialog.querySelector('[data-follow]').value='';dialog.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
 dialog.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>engine?.zoom(Number(b.dataset.zoom)));
 dialog.querySelector('[data-audio]').onclick=async e=>{try{const on=await engine?.toggleAudio();e.target.textContent=on?'Audio attivo':'Audio spento';e.target.setAttribute('aria-pressed',String(!!on));if(on===false&&!(window.AudioContext||window.webkitAudioContext))status('Audio non disponibile in questo browser.')}catch{status('Impossibile attivare l’audio su questo dispositivo.')}};
 dialog.querySelector('[data-dialogue]').onclick=e=>{showDialogue=!showDialogue;e.target.textContent=showDialogue?'Fumetti attivi':'Fumetti nascosti';e.target.setAttribute('aria-pressed',String(showDialogue));caption.hidden=!showDialogue;try{localStorage.setItem('sisal_arena_dialogue',showDialogue?'on':'off')}catch{};lastText='';if(lastFrame)renderFrame(lastFrame)};
 dialog.querySelector('[data-follow-speaker]').onclick=()=>{if(lastSpeaker)follow(lastSpeaker)};
 function renderFrame(f){
  lastFrame=f;
  overlay?.update({...f,dialogue:showDialogue?f.dialogue:null});const progress=dialog.querySelector('[data-progress]');progress.max=f.duration||50;progress.value=f.time;
  const matchStrip=dialog.querySelector('[data-match-strip]');matchStrip.hidden=!f.match;if(f.match){dialog.querySelector('[data-match-score]').textContent=f.match.score.join(' – ');const bench=f.match.benchKey?[...dialog.querySelectorAll('[data-person]')].find(p=>p.dataset.person===f.match.benchKey)?.textContent||'Un membro':'';dialog.querySelector('[data-match-info]').textContent=f.match.number+' contro '+f.match.number+' · portieri BOT'+(bench?' · In panchina: '+bench+(f.match.benchReason==='zero-appearances'?' (0 presenze nei dati)':' (rotazione)'):'');}
  if(f.title!==lastTitle){dialog.querySelector('[data-title]').textContent=f.title;lastTitle=f.title;}
  const line=f.dialogue||f.recentDialogue,text=showDialogue&&line?line.text:'';
  const speakerChanged=lastSpeaker!==(line?.speaker||'');lastSpeaker=line?.speaker||'';dialog.querySelector('[data-follow-speaker]').disabled=!lastSpeaker;dialog.querySelector('[data-talk-state]').textContent=f.dialogue?'STA PARLANDO':line?'ULTIMA BATTUTA':'DAL CAMPO';
  if(text!==lastText||speakerChanged){dialog.querySelector('[data-line]').textContent=text||'I compagni parleranno durante l’allenamento. Le battute restano leggibili anche quando chi parla è fuori inquadratura.';dialog.querySelector('[data-caption-speaker]').textContent=line?.name||'Spogliatoio Sisal';caption.classList.toggle('has-line',!!text);lastText=text}
 }
 function schedule(){clearTimeout(timer);if(disposed||document.hidden||localPaused)return;const serverNow=clockBase+performance.now()-performanceBase;timer=setTimeout(()=>load(),Math.max(1000,(epoch+1)*EPOCH-serverNow+150));}
 async function load(){
  if(disposed||inFlight||document.hidden||localPaused)return;inFlight=true;abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),20000);
  try{
   const start=performance.now(),r=await fetch('/api/account?action=arena&scene=5',{credentials:'same-origin',cache:'no-store',signal:abort.signal}),data=await r.json();
   if(!r.ok||!data.ok)throw Object.assign(Error(data.error||'Arena non disponibile. Riprova tra poco.'),{status:r.status});
   if(data.version!==2||data.sceneVersion!==5)throw Error('Aggiorna l’app per entrare nella nuova versione dell’Arena.');
   if(disposed)return;
   clockBase=Number(data.serverNow)+(performance.now()-start)/2;performanceBase=performance.now();resumeAt=performanceBase;
   if(!data.snapshot.players.length){engine?.dispose();engine=null;stage.innerHTML='<p class="arena-loading">La rosa non è disponibile. Carica il file Giocatori con il pulsante Termux abituale, poi riapri l’Arena.</p>';return}
   const changed=epoch!==data.epoch;epoch=data.epoch;
   if(changed||!engine){
    engine?.dispose();overlay?.dispose();stage.replaceChildren();const loading=document.createElement('p');loading.className='arena-loading';loading.setAttribute('role','status');stage.append(loading);
    const {prewarmArena}=await import('./arena-simulation.js?v=arena-5');clearTimeout(timeout);await prewarmArena(data.snapshot,clockBase/1000,{signal:abort.signal,onProgress:p=>{const loading=stage.querySelector('.arena-loading');if(loading)loading.textContent='Preparazione del campo · '+Math.round(p*100)+'%';}});if(disposed)return;
    const {createArenaRenderer}=await import('./arena-renderer.js?v=arena-5');if(disposed)return;
    stage.querySelector('.arena-loading')?.remove();engine=createArenaRenderer(stage,data.snapshot,{clock:()=> (clockBase+performance.now()-performanceBase)/1000,onFrame:renderFrame,onFailure:status,selfKey});
    dialog.querySelector('[data-audio]').textContent='Audio spento';dialog.querySelector('[data-audio]').setAttribute('aria-pressed','false');
    dialog.querySelector('[data-follow]').innerHTML='<option value="">Tutta la squadra</option>'+data.snapshot.players.map(p=>'<option value="'+escape(p.key)+'">'+escape(p.name)+'</option>').join('')+'<option value="__keeper_bot">BOT · Porta A</option><option value="__keeper_away_bot">BOT · Porta B</option>';
    const people=[...data.snapshot.players,{key:'__keeper_bot',name:'BOT · Porta A',appearance:{}},{key:'__keeper_away_bot',name:'BOT · Porta B',appearance:{}}];
    overlay=createArenaOverlay(stage,people,{selfKey,onSelect:follow});
    const own=people.find(p=>p.key===selfKey);dialog.querySelector('[data-self]').disabled=!own;
    dialog.querySelector('[data-my-player]').textContent=own?'TU · '+own.name+' · cerchio e nome dorati in campo':'Il tuo account non compare nella rosa di questo snapshot. La rosa si aggiorna nella sessione successiva.';
    dialog.querySelector('[data-roster-count]').textContent='· '+people.length;
    dialog.querySelector('[data-roster]').innerHTML=people.map(p=>'<button type="button" data-person="'+escape(p.key)+'" '+(p.key===selfKey?'class="is-self"':'')+'>'+escape(p.name)+(p.key===selfKey?' <b>TU</b>':'')+'</button>').join('');
    dialog.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>follow(b.dataset.person));
    admin(data.snapshot);
   }else engine.resume();
   if(localPaused||document.hidden)engine?.pause();
   dialog.querySelector('[data-sync]').textContent='Scena condivisa · orario server';status('');schedule();
  }catch(e){
   if(disposed)return;
   if(e.status===401){close();location.reload();return}
   engine?.pause();if(!engine)stage.innerHTML='<p class="arena-loading">Impossibile aprire il campo. Leggi il messaggio qui sotto e riprova.</p>';dialog.querySelector('[data-sync]').textContent='Collegamento da ripristinare';
   status(e.name==='AbortError'?'Il collegamento ha impiegato troppo tempo.':e.message);
   if(!dialog.querySelector('[data-retry]')){const b=document.createElement('button');b.dataset.retry='';b.textContent='Riprova collegamento';b.onclick=()=>{b.remove();load()};error.after(b)}
  }finally{clearTimeout(timeout);inFlight=false}
 }
 function admin(snapshot){
  const host=dialog.querySelector('[data-admin]');if(!window.SisalAccount?.user?.is_admin){host.replaceChildren();return}
  host.innerHTML='<h3>Portiere dell’Arena</h3><p>BOT finché non assegni un account. La scelta entra nella prossima sessione di 30 minuti.</p><label>Portiere <select data-keeper><option value="">BOT · Portiere</option>'+snapshot.players.filter(p=>p.registered).map(p=>'<option value="'+escape(p.key)+'" '+(snapshot.keeper===p.key?'selected':'')+'>'+escape(p.name)+'</option>').join('')+'</select></label><label>La tua password <input data-password type="password" autocomplete="current-password"></label><button data-save-keeper>Salva portiere</button>';
  host.querySelector('[data-save-keeper]').onclick=async e=>{
   const pw=host.querySelector('[data-password]');if(!pw.value){status('Inserisci la tua password di amministratore.');return}
   e.target.disabled=true;try{const r=await fetch('/api/account',{method:'POST',credentials:'same-origin',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'arena_keeper',key:host.querySelector('[data-keeper]').value,currentPassword:pw.value})}),d=await r.json();if(!r.ok)throw Error(d.error||'Salvataggio non riuscito.');status('Portiere salvato. Sarà attivo dalla sessione delle '+new Date(d.effectiveAt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'.');}catch(err){status(err.message)}finally{pw.value='';e.target.disabled=false}
  };
 }
 dialog.querySelector('[data-pause]').onclick=e=>{localPaused=!localPaused;e.target.textContent=localPaused?'Torna in diretta':'Pausa locale';e.target.setAttribute('aria-pressed',String(localPaused));if(localPaused){clearTimeout(timer);engine?.pause();}else visibility();};
 function visibility(){clearTimeout(timer);if(localPaused)return;if(document.hidden){engine?.pause();return}if(performance.now()-resumeAt>300000||Math.floor((clockBase+performance.now()-performanceBase)/EPOCH)!==epoch)load();else{engine?.resume();schedule()}}
 function auth(){if(!window.SisalAccount?.user)close()}
 document.addEventListener('visibilitychange',visibility);window.addEventListener('sisal-eligibility',auth);
 await load();
}
