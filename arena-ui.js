const EPOCH=1800000;
let current=null;
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export async function openArena(){
 if(current){current.focus();return}
 if(!window.SisalAccount?.user){window.SisalAccount?.open();return}
 if(!document.querySelector('[data-arena-css]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./arena.css?v=arena-2';css.dataset.arenaCss='';document.head.append(css)}
 const previous=document.activeElement,dialog=document.createElement('dialog');current=dialog;dialog.className='arena-dialog';dialog.id='sisal-arena';
 dialog.innerHTML='<header class="arena-header"><div><span>SISAL FC 2021 / CLUB EXPERIENCE</span><h2>SISAL ARENA</h2></div><button data-close aria-label="Chiudi SISAL ARENA">Chiudi ×</button></header><div class="arena-stage"><p class="arena-loading" role="status">Entriamo in campo…</p></div><div class="arena-caption" aria-live="polite"><span data-speaker></span><p data-line></p></div><footer class="arena-footer"><div class="arena-live"><span class="arena-dot"></span><b data-title>Allenamento condiviso</b><small data-sync>Collegamento…</small></div><div class="arena-controls"><label>Segui <select data-follow><option value="">Tutta la squadra</option></select></label><button data-zoom="-3" aria-label="Avvicina">＋</button><button data-zoom="3" aria-label="Allontana">−</button><button data-pause aria-pressed="false">Pausa locale</button><button data-audio aria-pressed="false">Audio spento</button><button data-dialogue aria-pressed="true">Dialoghi attivi</button></div><details class="arena-info"><summary>Informazioni e gestione</summary><p>Allenamento di fantasia: le scene non rappresentano fatti realmente accaduti. Dialoghi satirici con linguaggio esplicito. Nessuna statistica viene modificata.</p><p>Trascina per ruotare. La scena continua per tutti: tornando nell’app ti riallinei al momento corrente.</p><div data-admin></div><p data-error role="status"></p></details></footer>';
 document.body.append(dialog);dialog.showModal();window.dispatchEvent(new Event('sisal-arena-opened'));dialog.setAttribute('aria-label','SISAL ARENA');
 const stage=dialog.querySelector('.arena-stage'),error=dialog.querySelector('[data-error]'),caption=dialog.querySelector('.arena-caption');
 let engine=null,timer=0,disposed=false,abort=null,clockBase=0,performanceBase=0,epoch=null,showDialogue=true,lastText='',lastTitle='',resumeAt=0,inFlight=false,localPaused=false;
 try{showDialogue=localStorage.getItem('sisal_arena_dialogue')!=='off';}catch{}
 function syncDialogue(){const b=dialog.querySelector('[data-dialogue]');b.textContent=showDialogue?'Dialoghi attivi':'Dialoghi nascosti';b.setAttribute('aria-pressed',String(showDialogue));caption.hidden=!showDialogue;}syncDialogue();
 function status(message){error.textContent=message;dialog.querySelector('.arena-info').open=!!message;}
 const close=()=>{if(disposed)return;disposed=true;clearTimeout(timer);abort?.abort();engine?.dispose();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('sisal-eligibility',auth);dialog.remove();current=null;window.dispatchEvent(new Event('sisal-arena-closed'));previous?.focus?.()};
 dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 dialog.querySelector('[data-follow]').onchange=e=>engine?.follow(e.target.value);
 dialog.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>engine?.zoom(Number(b.dataset.zoom)));
 dialog.querySelector('[data-audio]').onclick=async e=>{try{const on=await engine?.toggleAudio();e.target.textContent=on?'Audio attivo':'Audio spento';e.target.setAttribute('aria-pressed',String(!!on));if(on===false&&!(window.AudioContext||window.webkitAudioContext))status('Audio non disponibile in questo browser.')}catch{status('Impossibile attivare l’audio su questo dispositivo.')}};
 dialog.querySelector('[data-dialogue]').onclick=e=>{showDialogue=!showDialogue;e.target.textContent=showDialogue?'Dialoghi attivi':'Dialoghi nascosti';e.target.setAttribute('aria-pressed',String(showDialogue));caption.hidden=!showDialogue;try{localStorage.setItem('sisal_arena_dialogue',showDialogue?'on':'off')}catch{};lastText=''};
 function renderFrame(f){
  if(f.title!==lastTitle){dialog.querySelector('[data-title]').textContent=f.title;lastTitle=f.title;}
  const text=showDialogue&&f.dialogue?f.dialogue.text:'';
  if(text!==lastText){dialog.querySelector('[data-line]').textContent=text;dialog.querySelector('[data-speaker]').textContent=text?f.dialogue.name:'';caption.classList.toggle('has-line',!!text);lastText=text}
 }
 function schedule(){clearTimeout(timer);if(disposed||document.hidden||localPaused)return;const serverNow=clockBase+performance.now()-performanceBase;timer=setTimeout(()=>load(),Math.max(1000,(epoch+1)*EPOCH-serverNow+150));}
 async function load(){
  if(disposed||inFlight||document.hidden||localPaused)return;inFlight=true;abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),20000);
  try{
   const start=performance.now(),r=await fetch('/api/account?action=arena',{credentials:'same-origin',cache:'no-store',signal:abort.signal}),data=await r.json();
   if(!r.ok||!data.ok)throw Object.assign(Error(data.error||'Arena non disponibile. Riprova tra poco.'),{status:r.status});
   if(data.version!==2)throw Error('Aggiorna l’app per entrare nella nuova versione dell’Arena.');
   if(disposed)return;
   clockBase=Number(data.serverNow)+(performance.now()-start)/2;performanceBase=performance.now();resumeAt=performanceBase;
   if(!data.snapshot.players.length){engine?.dispose();engine=null;stage.innerHTML='<p class="arena-loading">La rosa non è disponibile. Carica il file Giocatori con il pulsante Termux abituale, poi riapri l’Arena.</p>';return}
   const changed=epoch!==data.epoch;epoch=data.epoch;
   if(changed||!engine){
    engine?.dispose();stage.replaceChildren();
    const {createArenaRenderer}=await import('./arena-renderer.js?v=arena-2');if(disposed)return;
    engine=createArenaRenderer(stage,data.snapshot,{clock:()=> (clockBase+performance.now()-performanceBase)/1000,onFrame:renderFrame,onFailure:status});
    dialog.querySelector('[data-audio]').textContent='Audio spento';dialog.querySelector('[data-audio]').setAttribute('aria-pressed','false');
    dialog.querySelector('[data-follow]').innerHTML='<option value="">Tutta la squadra</option>'+data.snapshot.players.map(p=>'<option value="'+escape(p.key)+'">'+escape(p.name)+'</option>').join('')+(!data.snapshot.keeper?'<option value="__keeper_bot">BOT · Portiere</option>':'');
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
