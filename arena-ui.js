import {createArenaOverlay} from './arena-overlays.js?v=arena-11';
import {nameKey} from './horse-style.js?v=studio-9';
const EPOCH=1800000;let current=null;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function arenaResponse(response){
 let data;try{data=JSON.parse(await response.text());}catch{throw Object.assign(Error('Il server non ha risposto correttamente. Attendi un momento e premi Riprova.'),{status:response.status});}
 if(!response.ok||!data?.ok)throw Object.assign(Error(data?.error||'Il campo non è disponibile. Riprova tra poco.'),{status:response.status,code:data?.code});
 return data;
}
export async function openArena(){
 if(current){current.focus();return;}if(!window.SisalAccount?.user){window.SisalAccount?.open();return;}
 if(!document.querySelector('[data-arena-css]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./arena.css?v=arena-11';css.dataset.arenaCss='';document.head.append(css);}
 const previous=document.activeElement,dialog=document.createElement('dialog');current=dialog;dialog.className='arena-dialog';dialog.id='sisal-arena';dialog.setAttribute('aria-label','SISAL ARENA');
 dialog.innerHTML=`<header class="arena-header"><div class="arena-brand"><small>IL CAMPO DEL CLUB</small><h2>SISAL ARENA</h2></div><div class="arena-header-actions"><button data-self aria-label="Segui il mio giocatore">◎ Il mio</button><button data-zen aria-label="Attiva Solo campo" aria-pressed="false">⛶</button><button data-close aria-label="Chiudi SISAL ARENA">Chiudi ×</button></div></header>
 <div class="arena-program"><div><span class="arena-dot" aria-hidden="true"></span><b data-title>Entriamo in campo</b></div><small data-sync role="status">Collegamento…</small><div class="arena-match-strip" data-match-strip hidden><b>VERDI <strong data-match-score>0 – 0</strong> ORO</b><span data-match-info></span></div></div>
 <div class="arena-stage"><div class="arena-technique" data-technique hidden aria-live="off"></div><div class="arena-replay-state" data-replay-state hidden><b>REPLAY <span data-replay-label></span></b><progress data-replay-progress value="0" max="1" aria-label="Avanzamento replay"></progress></div><p class="arena-loading" role="status">Preparazione del campo e della rosa…</p></div>
 <section class="arena-caption" aria-label="Dialoghi dal campo"><div class="arena-caption-meta"><small data-talk-state>DAL CAMPO</small><button type="button" data-follow-speaker disabled aria-label="Inquadra chi parla"><span data-caption-speaker>Spogliatoio Sisal</span><i aria-hidden="true">↗</i></button></div><p data-line aria-live="polite">Le battute compariranno qui e nei fumetti sui giocatori.</p></section>
 <nav class="arena-dock" aria-label="Comandi Arena"><div class="arena-views"><button data-view="director" aria-pressed="true">Azione</button><button data-view="field" aria-pressed="false">Campo</button></div><button data-audio aria-pressed="false" disabled aria-label="Attiva gli effetti del campo">Audio</button><button data-replay disabled aria-pressed="false" aria-label="Replay dell’ultima azione">↶ Replay</button><button data-pause aria-pressed="false">Pausa</button><button data-options aria-expanded="false" aria-controls="arena-options">Opzioni ☷</button></nav>
 <aside class="arena-options" id="arena-options" aria-label="Opzioni Arena" hidden><div class="arena-options-head"><h3>Il tuo punto di vista</h3><button data-close-options aria-label="Chiudi opzioni">×</button></div><div class="arena-controls"><label>Segui un giocatore<select data-follow aria-label="Segui un giocatore"><option value="">Azione del campo</option></select></label><div class="arena-zoom"><button data-zoom="-3" aria-label="Avvicina">＋</button><button data-zoom="3" aria-label="Allontana">−</button></div><label>Qualità grafica<select data-quality aria-label="Qualità grafica"><option value="auto">Automatica</option><option value="high">Alta</option><option value="low">Risparmio</option></select></label><label>Nomi in campo<select data-names aria-label="Nomi in campo"><option value="all">Tutti, quando c’è spazio</option><option value="focus">Solo mio, selezionato e chi parla</option><option value="none">Nascosti</option></select></label><label>Volume effetti<input type="range" data-volume min="0" max="100" step="5" value="65" aria-label="Volume effetti"></label><button data-dialogue aria-pressed="true">Fumetti attivi</button></div><p class="arena-identity" data-my-player></p>
 <details class="arena-history"><summary>Azioni dell’Arena <span data-history-count></span></summary><p>Eventi di fantasia del campo, separati dalle statistiche EA. Tocca ↶ per rivedere un’azione ancora nel buffer; gli altri nomi seguono il giocatore in diretta.</p><ol data-history><li>Nessuna azione registrata in questa apertura.</li></ol></details>
 <details class="arena-roster"><summary>Rosa <span data-roster-count></span></summary><div data-roster class="arena-roster-list"></div></details>
 <details class="arena-info"><summary>Come funziona e gestione</summary><p>Un allenamento di fantasia continuo, con dialoghi satirici e linguaggio esplicito. Le azioni non cambiano statistiche EA o gare Top 3.</p><p>Trascina per ruotare; allarga due dita per lo zoom. Il cerchio dorato e il badge TU identificano il tuo giocatore. Il pulsante ⛶ attiva Solo campo. Nomi, fumetti, qualità e visuale vengono ricordati su questo dispositivo.</p><p>Pausa e Replay riguardano soltanto la tua vista: il campo condiviso continua. Il replay contiene esclusivamente fotogrammi già passati, resta sul dispositivo ed è silenzioso. Puoi tornare subito in diretta. Chiudendo l’Arena si libera il buffer.</p><p>Audio richiede un tuo tocco e attiva suoni sintetizzati sul dispositivo. Qualità Automatica riduce e recupera dettaglio quando il carico lo consente; Risparmio limita il carico. Con animazioni ridotte la regia evita avvicinamenti automatici.</p><p>Rosa e personalizzazioni si aggiornano al prossimo salvataggio condiviso, circa ogni 30 minuti. Si conservano posizioni e palloni quando la rosa resta uguale. Non vengono scritte posizioni a ogni fotogramma e non vengono fatte chiamate IA per i dialoghi.</p><p>Campo ridotto di 34 × 52 m e partitelle a obiettivo gol. Sono gestiti rimesse, ripartenze, rigori, punizioni e fuorigioco al tocco; VAR, cartellini e tutti i casi del calcio a undici non sono simulati. Il portiere assegnato sostituisce un BOT anche nelle partitelle. Con partecipanti dispari riposa a rotazione un giocatore di movimento con 0 presenze EA note; se nessuno ha 0 presenze, ruotano i giocatori di movimento. Un dato mancante non è zero. Il tabellone conta anche i portieri.</p><div data-admin></div></details></aside>
 <div class="arena-notice" hidden><p data-error role="status"></p><button data-retry hidden>Riprova</button><button data-dismiss aria-label="Chiudi messaggio">×</button></div>`;
 document.body.append(dialog);document.documentElement.classList.add('sisal-arena-open');dialog.showModal();window.dispatchEvent(new Event('sisal-arena-opened'));
 const text=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
 const $=selector=>dialog.querySelector(selector),selfKey=nameKey(window.SisalAccount.user.player_key||window.SisalAccount.user.display_name),stage=$('.arena-stage'),error=$('[data-error]'),caption=$('.arena-caption'),options=$('.arena-options'),prefKey='sisal_arena_camera:'+selfKey;
 let engine=null,overlay=null,timer=0,disposed=false,abort=null,clockBase=Date.now(),performanceBase=performance.now(),epoch=null,showDialogue=true,quality='auto',inFlight=false,localPaused=false,lastFrame=null,lastText='',lastSpeaker='',selected='',busyRetries=0,snapshot=null,preparedAt=0,volume=.65,names='all',zen=false,cameraPreference=null,lastHistory='',syncOk=false,lastSync=0,cameraSaveTimer=0;
 const remember=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
 try{showDialogue=localStorage.getItem('sisal_arena_dialogue')!=='off';quality=localStorage.getItem('sisal_arena_quality')||'auto';const saved=localStorage.getItem('sisal_arena_volume');if(saved!=null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));names=localStorage.getItem('sisal_arena_names:'+selfKey)||'all';if(!['all','focus','none'].includes(names))names='all';zen=localStorage.getItem('sisal_arena_zen:'+selfKey)==='on';cameraPreference=JSON.parse(localStorage.getItem(prefKey)||'null');}catch{}
 $('[data-quality]').value=quality;$('[data-volume]').value=Math.round(volume*100);$('[data-names]').value=names;
 function status(message,retry=false){error.textContent=typeof message==='string'?message:message?.message||'';$('.arena-notice').hidden=!error.textContent;$('[data-retry]').hidden=!retry;}
 function loading(text){let node=stage.querySelector('.arena-loading');if(!node){node=document.createElement('p');node.className='arena-loading';node.setAttribute('role','status');stage.append(node);}node.textContent=text;}
 function syncDialogue(){const b=$('[data-dialogue]');b.textContent=showDialogue?'Fumetti attivi':'Fumetti nascosti';b.setAttribute('aria-pressed',String(showDialogue));caption.hidden=!showDialogue||zen;}
 function setZen(value){zen=value;dialog.classList.toggle('arena-zen',zen);$('[data-zen]').setAttribute('aria-pressed',String(zen));$('[data-zen]').setAttribute('aria-label',zen?'Disattiva Solo campo':'Attiva Solo campo');syncDialogue();remember('sisal_arena_zen:'+selfKey,zen?'on':'off');}
 setZen(zen);
 function toggleOptions(open){options.hidden=!open;$('[data-options]').setAttribute('aria-expanded',String(open));(open?$('[data-close-options]'):$('[data-options]')).focus();}
 $('[data-options]').onclick=()=>toggleOptions(options.hidden);$('[data-close-options]').onclick=()=>toggleOptions(false);$('[data-zen]').onclick=()=>setZen(!zen);
 $('[data-volume]').oninput=e=>{volume=Number(e.target.value)/100;engine?.setVolume(volume);remember('sisal_arena_volume',String(volume));};
 $('[data-quality]').onchange=e=>{quality=e.target.value;engine?.setQuality(quality);remember('sisal_arena_quality',quality);};
 $('[data-names]').onchange=e=>{names=e.target.value;remember('sisal_arena_names:'+selfKey,names);if(lastFrame)renderFrame(lastFrame);};
 $('[data-dialogue]').onclick=()=>{showDialogue=!showDialogue;remember('sisal_arena_dialogue',showDialogue?'on':'off');syncDialogue();if(lastFrame)renderFrame(lastFrame);};
 $('[data-dismiss]').onclick=()=>status('');$('[data-retry]').onclick=()=>{busyRetries=0;if(engine&&contextFailed){engine.dispose();engine=null;overlay?.dispose();overlay=null;contextFailed=false;}load();};
 let contextFailed=false;
 const close=()=>{if(disposed)return;disposed=true;clearTimeout(timer);clearTimeout(cameraSaveTimer);if(cameraPreference)remember(prefKey,JSON.stringify(cameraPreference));abort?.abort();engine?.dispose();overlay?.dispose();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('sisal-eligibility',auth);dialog.remove();document.documentElement.classList.remove('sisal-arena-open');current=null;window.dispatchEvent(new Event('sisal-arena-closed'));previous?.focus?.();};
 $('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();if(!options.hidden)toggleOptions(false);else close();});
 function follow(key){selected=key||'';engine?.follow(selected);$('[data-follow]').value=selected;dialog.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(!selected&&b.dataset.view==='director')));}
 $('[data-follow]').onchange=e=>follow(e.target.value);$('[data-self]').onclick=()=>follow(selfKey);$('[data-follow-speaker]').onclick=()=>{if(lastSpeaker)follow(lastSpeaker);};
 dialog.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{selected='';engine?.view(b.dataset.view);$('[data-follow]').value='';dialog.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
 dialog.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>engine?.zoom(Number(b.dataset.zoom)));
 function syncAudio(enabled){const b=$('[data-audio]');if(b.getAttribute('aria-pressed')===String(!!enabled))return;b.setAttribute('aria-pressed',String(!!enabled));b.textContent=enabled?'Audio ✓':'Audio';b.setAttribute('aria-label',enabled?'Disattiva gli effetti del campo':'Attiva gli effetti del campo');}
 $('[data-audio]').onclick=async()=>{const enabled=await engine?.toggleAudio();syncAudio(enabled);if(!enabled&&!lastFrame?.replay&&!(globalThis.AudioContext||globalThis.webkitAudioContext))status('Questo browser non supporta gli effetti audio. Il campo e i fumetti restano disponibili.');};
 $('[data-replay]').onclick=()=>{if(lastFrame?.replay){engine?.live?.();return;}if(!engine?.replay?.())status('Il replay sarà disponibile dopo una parata, un gol o una giocata interessante.');};
 function renderHistory(history){
  const signature=history.map(e=>e.id+':'+!!e.replayable).join('|');if(signature===lastHistory)return;lastHistory=signature;$('[data-history-count]').textContent=history.length?'· '+history.length:'';
  const display=key=>snapshot?.players.find(p=>p.key===key)?.appearance?.nickname||snapshot?.players.find(p=>p.key===key)?.name||(key?.startsWith('__keeper')?'BOT':'');
  $('[data-history]').innerHTML=history.length?[...history].reverse().map(e=>'<li><button type="button" data-event="'+e.id+'" data-actor="'+escape(e.actor||'')+'" '+(e.replayable?'data-clip="true"':'')+'><span>'+escape(e.label)+'</span><b>'+escape(e.actorName||display(e.actor))+'</b><small>'+escape(e.type==='save'&&e.target?'Tiro di '+(e.targetName||display(e.target)):e.target?'Con '+(e.targetName||display(e.target)):'')+'</small><i>'+(e.replayable?'↶':'↗')+'</i></button></li>').join(''):'<li>Nessuna azione registrata in questa apertura.</li>';
  $('[data-history]').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.clip&&engine?.replay?.(Number(b.dataset.event))){toggleOptions(false);return;}if(b.dataset.actor)follow(b.dataset.actor);toggleOptions(false);});
 }
 function renderFrame(f){
  if(disposed)return;lastFrame=f;const skill=$('[data-technique]');if(skill){skill.hidden=!f.technique;if(f.technique)text(skill,f.technique.label+' · '+f.technique.name);}
  syncAudio(f.audioEnabled);$('[data-audio]').disabled=!!f.replay;
  overlay?.update({...f,names,dialogue:showDialogue&&!zen?f.dialogue:null});text($('[data-title]'),f.title);
  const replay=$('[data-replay]');replay.disabled=!f.replay&&!f.replayAvailable||localPaused;text(replay,f.replay?'● Diretta':'↶ Replay');replay.setAttribute('aria-pressed',String(!!f.replay));replay.setAttribute('aria-label',f.replay?'Torna subito in diretta':'Replay dell’ultima azione');
  $('[data-replay-state]').hidden=!f.replay;if(f.replay){text($('[data-replay-label]'),f.replay.label);$('[data-replay-progress]').value=f.replay.progress;}
  text($('[data-sync]'),f.replay?'REPLAY · SUL DISPOSITIVO':syncOk?'DIRETTA CONDIVISA':'SINCRONIZZAZIONE SOSPESA');$('[data-sync]').title=lastSync?'Ultimo collegamento: '+new Date(lastSync).toLocaleTimeString('it-IT'):'';dialog.classList.toggle('is-replay',!!f.replay);
  const strip=$('[data-match-strip]');strip.hidden=!f.match;
  if(f.match){text($('[data-match-score]'),f.match.score.join(' – '));const bench=snapshot?.players.find(p=>p.key===f.match.benchKey)?.name,keepers=f.match.keepers||['__keeper_bot','__keeper_away_bot'],human=keepers.find(k=>!k.startsWith('__keeper'));
   text($('[data-match-info]'),(f.match.number+1)+' contro '+(f.match.number+1)+' · '+(human?'Portiere '+(snapshot?.players.find(p=>p.key===human)?.name||'del club'):'portieri BOT')+(bench?' · Riposa '+bench+(f.match.benchReason==='zero-appearances'?' (0 presenze)':' (rotazione)'):''));
  }
  const line=f.dialogue||f.recentDialogue,lineText=showDialogue&&line?line.text:'';lastSpeaker=line?.speaker||'';$('[data-follow-speaker]').disabled=!lastSpeaker;text($('[data-talk-state]'),f.dialogue?'STA PARLANDO':line?'ULTIMA BATTUTA':'DAL CAMPO');
  if(lineText!==lastText){text($('[data-line]'),lineText||'I compagni parleranno durante le azioni del campo.');lastText=lineText;}text($('[data-caption-speaker]'),line?.name||'Spogliatoio Sisal');renderHistory(f.history||[]);
 }
 const clock=()=> (clockBase+performance.now()-performanceBase)/1000;
 function schedule(delay){clearTimeout(timer);if(disposed||document.hidden||localPaused)return;timer=setTimeout(load,delay??Math.max(1000,(epoch+1)*EPOCH-clock()*1000+180));}
 async function load(){
  if(disposed||inFlight||document.hidden||localPaused)return;inFlight=true;abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),125000);
  try{
   const start=performance.now(),response=await fetch('/api/account?action=arena&scene=11',{credentials:'same-origin',cache:'no-store',signal:abort.signal}),data=await arenaResponse(response);
   if(data.version!==3||data.sceneVersion!==11)throw Error('Aggiorna la pagina per aprire questa versione dell’Arena.');if(disposed)return;
   const network=Math.max(0,performance.now()-start-Number(data.processingMs||0));clockBase=Number(data.serverNow)+network/2;performanceBase=performance.now();
   if(data.pending){if(++busyRetries>10)throw Error('Il campo condiviso è ancora in preparazione. Riprova tra poco.');if(!engine)loading('Preparazione condivisa del campo…');$('[data-sync]').textContent='Sincronizzazione…';schedule(Math.min(12000,Number(data.retryAfterMs||2400)*Math.min(4,busyRetries)));return;}
   busyRetries=0;if(data.snapshot?.world?.version!==11)throw Error('Completa l’aggiornamento dell’Arena e il passaggio SQL 19-arena-calcio.sql.');
   if(!Array.isArray(data.snapshot.players))throw Error('La rosa ricevuta non è valida. Riprova tra poco.');
   if(!data.snapshot.players.length){engine?.dispose();engine=null;overlay?.dispose();overlay=null;loading('La rosa non è disponibile. Carica il file Giocatori con il pulsante Termux abituale, poi premi Riprova.');epoch=data.epoch;status('In attesa della rosa del club.',true);schedule();return;}
   const next=data.snapshot,{prewarmContinuous:prewarmArena}=await import('./arena-live-cache.js?v=arena-11');
   if(!engine)loading('Entriamo nel campo condiviso…');
   await prewarmArena(next,clock(),{signal:abort.signal,onProgress:p=>{const node=stage.querySelector('.arena-loading');if(node)node.textContent='Preparazione del campo · '+Math.round(p*100)+'%';}});if(disposed)return;
   epoch=data.epoch;snapshot=next;preparedAt=performance.now();lastSync=Number(data.serverNow);syncOk=true;
   if(!engine){const {createArenaRenderer}=await import('./arena-renderer.js?v=arena-11');if(disposed)return;stage.querySelector('.arena-loading')?.remove();engine=createArenaRenderer(stage,snapshot,{clock,onFrame:renderFrame,onFailure:m=>{contextFailed=m?.code==='ARENA_CONTEXT_LOST';status(m,true);},selfKey,volume,cameraPreference,onCameraChange:value=>{cameraPreference=value;clearTimeout(cameraSaveTimer);cameraSaveTimer=setTimeout(()=>remember(prefKey,JSON.stringify(cameraPreference)),180);}});engine.setQuality(quality);selected=engine.cameraState?.().selected||'';}
   else engine.replaceSnapshot(next);
   $('[data-audio]').disabled=false;
   overlay?.dispose();const people=[...snapshot.players,{key:'__keeper_bot',name:'BOT · Porta A',appearance:{}},{key:'__keeper_away_bot',name:'BOT · Porta B',appearance:{}}];overlay=createArenaOverlay(stage,people,{selfKey,onSelect:follow});
   $('[data-follow]').innerHTML='<option value="">Azione del campo</option>'+people.map(p=>'<option value="'+escape(p.key)+'">'+escape(p.appearance?.nickname||p.name)+'</option>').join('');if(selected&&!people.some(p=>p.key===selected))follow('');else $('[data-follow]').value=selected;
   const view=engine.cameraState?.().view||'director';dialog.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(!selected&&b.dataset.view===view)));
   const own=people.find(p=>p.key===selfKey);$('[data-self]').disabled=!own;$('[data-my-player]').textContent=own?'TU · '+own.name+' · cerchio e nome dorati':'Il tuo account non compare nella rosa attuale.';
   $('[data-roster-count]').textContent='· '+snapshot.players.length+' membri';$('[data-roster]').innerHTML=people.map(p=>'<button type="button" data-person="'+escape(p.key)+'" '+(p.key===selfKey?'class="is-self"':'')+'>'+escape(p.appearance?.nickname||p.name)+(p.key===selfKey?' <b>TU</b>':'')+'</button>').join('');dialog.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>follow(b.dataset.person));admin(snapshot);
   if(localPaused||document.hidden)engine.pause();else engine.resume();$('[data-sync]').textContent='DIRETTA CONDIVISA';status('');lastHistory='';schedule();
  }catch(e){
   if(disposed)return;if(e.status===401){close();location.reload();return;}
   syncOk=false;if(!engine)loading(e.code==='ARENA_WEBGL'?'Il browser non riesce ad avviare il 3D.':'Il campo è in attesa di collegamento.');
   $('[data-sync]').textContent=engine?'Campo attivo · sincronizzazione sospesa':'Campo non disponibile';status(e.name==='AbortError'?'La preparazione ha impiegato troppo tempo. Riprova.':e.message,true);
  }finally{clearTimeout(timeout);inFlight=false;}
 }
 function admin(value){
  const host=$('[data-admin]');if(!window.SisalAccount?.user?.is_admin){host.replaceChildren();return;}
  host.innerHTML='<h3>Portiere dell’Arena</h3><p>La scelta vale per esercizi e partitelle dalla prossima sessione condivisa, circa ogni 30 minuti. Il portiere assegnato sostituisce un BOT.</p><label>Portiere <select data-keeper><option value="">BOT · Portiere</option>'+value.players.filter(p=>p.registered).map(p=>'<option value="'+escape(p.key)+'" '+(value.keeper===p.key?'selected':'')+'>'+escape(p.name)+'</option>').join('')+'</select></label><label>La tua password <input data-password type="password" autocomplete="current-password"></label><button data-save-keeper>Salva portiere</button>';
  host.querySelector('[data-save-keeper]').onclick=async e=>{
   const pw=host.querySelector('[data-password]');if(!pw.value){status('Inserisci la tua password di amministratore.');return;}e.target.disabled=true;
   try{const response=await fetch('/api/account',{method:'POST',credentials:'same-origin',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'arena_keeper',key:host.querySelector('[data-keeper]').value,currentPassword:pw.value})}),data=await arenaResponse(response);status('Portiere salvato. Sarà attivo dalla sessione delle '+new Date(data.effectiveAt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'.');}
   catch(err){status(err.message);}finally{pw.value='';e.target.disabled=false;}
  };
 }
 $('[data-pause]').onclick=e=>{localPaused=!localPaused;e.target.textContent=localPaused?'Riprendi':'Pausa';e.target.setAttribute('aria-pressed',String(localPaused));if(localPaused){clearTimeout(timer);engine?.pause();$('[data-sync]').textContent='VISTA IN PAUSA';if(lastFrame)renderFrame(lastFrame);$('[data-sync]').textContent='VISTA IN PAUSA';}else visibility();};
 async function visibility(){
  clearTimeout(timer);if(localPaused)return;if(document.hidden){engine?.pause();return;}
  if(!snapshot||Math.floor(clock()*1000/EPOCH)!==epoch||performance.now()-preparedAt>300000){await load();}
  else{if(engine){const {prewarmContinuous:prewarmArena}=await import('./arena-live-cache.js?v=arena-11');try{await prewarmArena(snapshot,clock());if(!disposed&&!document.hidden&&!localPaused)engine.resume();}catch(e){status(e.message,true);}}schedule();}
 }
 function auth(){if(!window.SisalAccount?.user)close();}
 document.addEventListener('visibilitychange',visibility);window.addEventListener('sisal-eligibility',auth);await load();
}
