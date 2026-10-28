const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let edition=null,last=0,inflight=null,generating=false,lastStatus='',paperEpoch=0,lastPaperRead=0,paperRead=null;
async function api(action,p){
 const r=await fetch('/api/editorial'+(p?'':'?action='+action),{method:p?'POST':'GET',headers:p?{'Content-Type':'application/json'}:{},body:p?JSON.stringify({action,...p}):undefined,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(action==='generate'?90000:20000)});
 const d=await r.json().catch(()=>{throw Error('Il server non ha risposto correttamente. Riprova tra poco.');});
 if(!r.ok)throw Error(d.error||'Connessione non disponibile');return d;
}
window.SisalEditorial={get edition(){return edition},refreshPaper,bind};
function status(t){lastStatus=t;document.querySelectorAll('[data-paper-status]').forEach(n=>n.textContent=t);}
function receive(value){if(JSON.stringify(value)!==JSON.stringify(edition)){edition=value;window.dispatchEvent(new Event('sisal-edition'));}}
async function refreshPaper(force=false){
 if(paperRead)return paperRead;if(!force&&Date.now()-lastPaperRead<5000)return;
 const epoch=++paperEpoch;lastPaperRead=Date.now();
 paperRead=(async()=>{try{
  const d=await api('latest');if(epoch!==paperEpoch)return;receive(d.edition||null);
  const error=d.generation?.error;
  if(error){const reason={PAPER_SETUP:'La configurazione della Gazzetta va completata.',INTERRUPTED:'La preparazione è stata interrotta.',GEMINI_QUOTA:'Quota IA esaurita.',TimeoutError:'L’IA non ha risposto in tempo.',INVALID_EDITION:'L’IA ha restituito un’edizione incompleta.',REPEATED_EDITION:'L’IA ha ripetuto un titolo.',NO_MATCHES:'Servono partite con punteggi disponibili.',DATA_CHANGED:'I dati sono cambiati durante la preparazione.'}[error]||'L’ultimo tentativo non è riuscito.';status(reason+' L’ultima edizione valida è conservata.'+(window.SisalAccount?.user?.is_admin?' Puoi riprovare dal pulsante qui sotto.':''));}
  else status(d.generation?.pending||d.generation?.working?'La redazione IA sta preparando la nuova prima pagina. L’edizione precedente resta leggibile.':'');
 }catch(e){if(epoch===paperEpoch)status(e.message+' L’ultima edizione rimane disponibile.');}})().finally(()=>paperRead=null);
 return paperRead;
}
function bind(){
 status(lastStatus);const admin=Boolean(window.SisalAccount?.user?.is_admin);
 document.querySelectorAll('[data-refresh-paper],[data-generate-paper]').forEach(b=>{if(!admin){b.remove();return;}
  b.disabled=generating;
  if(b.hasAttribute('data-refresh-paper')){b.onclick=()=>refreshPaper(true);return;}
  b.onclick=async()=>{if(generating)return;generating=true;bind();status('La redazione IA sta preparando la prima pagina…');
   try{const d=await api('generate',{});++paperEpoch;
    if(d.pending){status('La redazione sta già lavorando. L’ultima edizione è conservata.');return;}
    receive(d.edition||edition);status(d.existing?'Questi dati hanno già un’edizione condivisa. Nessuna nuova chiamata all’IA.':'Nuova prima pagina pubblicata.');await refreshNotifications();
   }catch(e){status(e.message);}finally{generating=false;bind();}
  };
 });
}
await window.sisalAccountReady;
const bell=document.createElement('button');bell.className='club-bell';bell.type='button';bell.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg><span>Notifiche</span><b>0</b>' ;bell.setAttribute('aria-label','Notifiche');document.querySelector('.topbar').append(bell);
const panel=document.createElement('dialog');panel.className='club-notifications';panel.setAttribute('aria-label','Notifiche del club');panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)panel.close();}});document.body.append(panel);
let notificationEpoch=0,noticeSeen=null;
let snapshot={items:[],unread:0,through:0};
function renderNotifications(error=''){
 bell.querySelector('b').textContent=snapshot.unread>99?'99+':snapshot.unread;bell.querySelector('b').hidden=!snapshot.unread;bell.setAttribute('aria-label',`Notifiche: ${snapshot.unread} non lette`);
 panel.innerHTML=`<header><div><small>SISAL FC 2021</small><h2>Notifiche</h2></div><button data-close aria-label="Chiudi notifiche">✕</button></header><div class="club-notice-tools"><span>${snapshot.unread?`${snapshot.unread} da leggere`:'Sei in pari'}</span><button data-all ${snapshot.unread?'':'disabled'}>Segna tutte lette</button><button data-refresh aria-label="Aggiorna notifiche">↻</button></div>${error?`<p role="alert">${esc(error)}</p>`:''}<ol>${snapshot.items.map(e=>`<li><button data-event="${e.id}" class="${e.read?'':'unread'}"><span class="notice-symbol" aria-hidden="true">${e.kind==='signup'?'＋':e.kind==='paper'?'G':'C'}</span><span class="notice-copy"><small>${e.kind==='signup'?'RICHIESTA DI ISCRIZIONE':e.kind==='paper'?'GAZZETTA DELLA SISAL':'COMUNICATO'}</small><strong>${esc(e.kind==='paper'?'È uscita una nuova edizione':String(e.title||'Nuovo aggiornamento').slice(0,100))}</strong><time>${esc(new Date(e.created_at).toLocaleString('it-IT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}</time></span><span class="notice-arrow" aria-hidden="true">›</span></button></li>`).join('')||'<li class="notice-empty">Nessuna notifica.<br><small>Le novità del club compariranno qui.</small></li>'}</ol>`;
 panel.querySelector('[data-close]').onclick=()=>panel.close();panel.querySelector('[data-refresh]').onclick=refreshNotifications;
 panel.querySelector('[data-all]').onclick=async e=>{e.target.disabled=true;const epoch=++notificationEpoch;try{const next=await api('read_all',{through:snapshot.through});if(epoch===notificationEpoch){snapshot=next;renderNotifications();}}catch(err){renderNotifications(err.message);}};
 panel.querySelectorAll('[data-event]').forEach(b=>b.onclick=async()=>{b.disabled=true;const event=snapshot.items.find(x=>x.id===Number(b.dataset.event));try{
 // Navigate only after the persistent read has succeeded; the user can retry on a network error.
 ++notificationEpoch;snapshot=await api('read',{id:event.id});++notificationEpoch;panel.close();renderNotifications();
 if(event.kind==='signup')await window.SisalAccount.open('admin',event.target);
 else if(event.kind==='news')await window.SisalNews.open(event.target);
 else{const r=await fetch('/api/editorial?action=edition&id='+encodeURIComponent(event.target),{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(20000)});const d=await r.json().catch(()=>({}));if(!r.ok||!d.edition)throw Error('Edizione non disponibile.');++paperEpoch;receive(d.edition);window.SisalEdition.open();}
 }catch(e){if(!panel.open)panel.showModal();renderNotifications(e.message);}});
}
async function refreshNotifications(){const epoch=++notificationEpoch;try{const next=await api('notifications');if(epoch===notificationEpoch){if(noticeSeen){const fresh=next.items.filter(x=>!x.read&&!noticeSeen.has(x.id)).sort((a,b)=>b.id-a.id)[0];if(fresh)window.dispatchEvent(new CustomEvent('sisal-internal-notice',{detail:fresh}));}if(noticeSeen)next.items.forEach(x=>noticeSeen.add(x.id));else noticeSeen=new Set(next.items.map(x=>x.id));snapshot=next;renderNotifications();}}catch(e){if(epoch===notificationEpoch)renderNotifications(e.message);}}
function refresh(){if(inflight||Date.now()-last<60000)return;last=Date.now();inflight=Promise.allSettled([refreshPaper(),refreshNotifications()]).finally(()=>inflight=null);}
window.SisalNotice={open:id=>{const button=panel.querySelector('[data-event="'+Number(id)+'"]');if(button)button.click();else bell.click();}};
bell.onclick=()=>{renderNotifications();panel.showModal();refreshNotifications();};
window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});refresh();

// One read after a local upload batch, no recurring polling and no client generation.
let uploadNoticeTimer;
window.addEventListener('sisal-data-updated',e=>{
 clearTimeout(uploadNoticeTimer);
 if(e.detail?.ok===false){status(e.detail.error||'Dati salvati. La Gazzetta richiede un controllo.');return;}
 if(e.detail?.queued){status('Nuovi dati salvati. La redazione IA preparerà la prima pagina.');uploadNoticeTimer=setTimeout(()=>{if(!document.hidden){refreshPaper(true);refreshNotifications();}},45000);}
});
