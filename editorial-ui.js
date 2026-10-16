const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let edition=null,last=0,inflight=null,generating=false;
async function api(action,p){const r=await fetch('/api/editorial'+(p?'':'?action='+action),{method:p?'POST':'GET',headers:p?{'Content-Type':'application/json'}:{},body:p?JSON.stringify({action,...p}):undefined,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(p?.action==='generate'||action==='generate'?58000:20000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Connessione non disponibile');return d;}
window.SisalEditorial={get edition(){return edition},bind};
function status(t){document.querySelectorAll('[data-paper-status]').forEach(n=>n.textContent=t);}
async function refreshPaper(){try{const d=await api('latest');edition=d.edition;window.dispatchEvent(new Event('sisal-edition'));}catch(e){status(e.message+' L’ultima edizione rimane disponibile.');}}
function bind(){document.querySelectorAll('[data-refresh-paper]').forEach(b=>b.onclick=refreshPaper);document.querySelectorAll('[data-generate-paper]').forEach(b=>{b.disabled=generating;b.onclick=async()=>{if(generating)return;generating=true;bind();status('La redazione sta preparando l’edizione…');try{const d=await api('generate',{});edition=d.edition;window.dispatchEvent(new Event('sisal-edition'));status(d.existing?'Queste partite hanno già un’edizione condivisa.':'Nuova edizione pubblicata.');await refreshNotifications();}catch(e){status(e.message);}finally{generating=false;bind();}}});}
await window.sisalAccountReady;
const bell=document.createElement('button');bell.className='club-bell';bell.type='button';bell.innerHTML='🔔 Notifiche <b>0</b>';bell.setAttribute('aria-label','Notifiche');document.querySelector('.topbar').append(bell);
const panel=document.createElement('dialog');panel.className='club-notifications';panel.setAttribute('aria-label','Notifiche del club');document.body.append(panel);
let notificationEpoch=0;
let snapshot={items:[],unread:0,through:0};
function renderNotifications(error=''){
 bell.querySelector('b').textContent=snapshot.unread>99?'99+':snapshot.unread;bell.setAttribute('aria-label',`Notifiche: ${snapshot.unread} non lette`);
 panel.innerHTML=`<header><h2>Il club, in breve</h2><button data-close>Chiudi ✕</button></header><div class="club-notice-tools"><button data-refresh>Aggiorna</button><button data-all ${snapshot.unread?'':'disabled'}>Segna tutte come lette</button></div><p role="status">${esc(error||'Aggiornato all’apertura e al ritorno nell’app. Nessuna scansione continua.')}</p><ol>${snapshot.items.map(e=>`<li><button data-event="${e.id}" class="${e.read?'':'unread'}"><small>${e.kind==='signup'?'ISCRIZIONE · ADMIN':e.kind==='paper'?'GAZZETTA DELLA SISAL':'COMUNICATO'}</small><strong>${esc(e.title)}</strong><time>${esc(new Date(e.created_at).toLocaleString('it-IT'))}</time>${e.read?'':'<span>Non letta</span>'}</button></li>`).join('')||'<li>Nessuna notifica disponibile.</li>'}</ol>`;
 panel.querySelector('[data-close]').onclick=()=>panel.close();panel.querySelector('[data-refresh]').onclick=refreshNotifications;
 panel.querySelector('[data-all]').onclick=async e=>{e.target.disabled=true;const epoch=++notificationEpoch;try{const next=await api('read_all',{through:snapshot.through});if(epoch===notificationEpoch){snapshot=next;renderNotifications();}}catch(err){renderNotifications(err.message);}};
 panel.querySelectorAll('[data-event]').forEach(b=>b.onclick=async()=>{b.disabled=true;const event=snapshot.items.find(x=>x.id===Number(b.dataset.event));try{
 // Navigate only after the persistent read has succeeded; the user can retry on a network error.
 ++notificationEpoch;snapshot=await api('read',{id:event.id});++notificationEpoch;panel.close();renderNotifications();
 if(event.kind==='signup')await window.SisalAccount.open('admin');
 else if(event.kind==='news')await window.SisalNews.open(event.target);
 else{const r=await fetch('/api/editorial?action=edition&id='+encodeURIComponent(event.target),{cache:'no-store',signal:AbortSignal.timeout(20000)});const d=await r.json();if(!r.ok||!d.edition)throw Error('Edizione non disponibile.');const view=document.createElement('dialog');view.className='club-notifications club-paper-view';view.innerHTML='<button data-close>Chiudi ✕</button>'+window.SisalEdition.paperMarkup(d.edition.model);view.querySelectorAll('.editorial-tools,[data-share-paper]').forEach(x=>x.remove());view.querySelector('[data-close]').onclick=()=>view.close();view.addEventListener('close',()=>view.remove());document.body.append(view);view.showModal();}
 }catch(e){if(!panel.open)panel.showModal();renderNotifications(e.message);}});
}
async function refreshNotifications(){const epoch=++notificationEpoch;try{const next=await api('notifications');if(epoch===notificationEpoch){snapshot=next;renderNotifications();}}catch(e){if(epoch===notificationEpoch)renderNotifications(e.message);}}
function refresh(){if(inflight||Date.now()-last<60000)return;last=Date.now();inflight=Promise.allSettled([refreshPaper(),refreshNotifications()]).finally(()=>inflight=null);}
bell.onclick=()=>{renderNotifications();panel.showModal();refreshNotifications();};
window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});refresh();
