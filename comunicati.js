import {exportNewspaper} from './comunicati-export.js?v=2-blob';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=()=>crypto.randomUUID();
const getLocal=(k,f)=>{try{return JSON.parse(localStorage.getItem('sisal-news-'+k))??f;}catch{return f;}};
const setLocal=(k,v)=>{try{localStorage.setItem('sisal-news-'+k,JSON.stringify(v));return true;}catch{return false;}};
let device=getLocal('device',null);if(!/^[0-9a-f-]{36}$/i.test(device||'')){device=uuid();setLocal('device',device);}
let seen=getLocal('seen',{});let dbPromise;
function cacheDb(){return dbPromise??=new Promise(resolve=>{try{const r=indexedDB.open('sisal-comunicati-blob',1);r.onupgradeneeded=()=>r.result.createObjectStore('cache');r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null);}catch{resolve(null);}});}
async function cache(key,value){const db=await cacheDb();if(!db)return null;return new Promise(resolve=>{const tx=db.transaction('cache',value===undefined?'readonly':'readwrite');const req=value===undefined?tx.objectStore('cache').get(key):tx.objectStore('cache').put(value,key);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>resolve(null);});}
const state={archived:false,posts:[],total:0,fetched:null,post:null,form:null,pending:null,busy:false,epoch:0,files:[],urls:[],view:'list'};
const dialog=document.createElement('dialog');dialog.id='sisal-news';dialog.setAttribute('aria-labelledby','news-heading');
dialog.innerHTML='<div class="news-bar"><b id="news-heading">Sala stampa · Sisal FC 2021</b><button type="button" data-close>Chiudi ✕</button></div><div class="news-main"><div id="news-screen"></div><div class="news-notice" id="news-notice" role="status" aria-live="polite"></div></div>';
document.body.append(dialog);const screen=dialog.querySelector('#news-screen'),notice=dialog.querySelector('#news-notice');
const $=selector=>screen.querySelector(selector);
function message(text){notice.textContent=text||'';}
function date(v){return new Date(v).toLocaleString('it-IT',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function masthead(){return '<div class="news-masthead"><img src="./assets/sisal-branding.png" alt="Stemma Sisal FC 2021"><h2>La voce del club.</h2><div class="news-kicker">SISAL FC 2021 — COMUNICATI</div></div>';}
function button(text,action,extra=''){return `<button type="button" class="news-button ${extra}" data-action="${action}">${text}</button>`;}
let heartId=0;
function heart(p){const id='news-gold-'+(++heartId);return `<button type="button" class="news-heart" data-like="${esc(p.id)}" aria-pressed="${!!p.liked}" aria-label="${p.liked?'Togli':'Metti'} like"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#9b6811"/><stop offset=".32" stop-color="#f6d35e"/><stop offset=".46" stop-color="#fff1af"/><stop offset=".58" stop-color="#c29325"/><stop offset="1" stop-color="#edc34a"/></linearGradient></defs><path fill="url(#${id})" stroke="#956b20" stroke-width=".8" d="M12 21C10 19 2 14 2 7.5A5.5 5.5 0 0 1 12 4.4 5.5 5.5 0 0 1 22 7.5C22 14 14 19 12 21Z"/></svg><span>${Number(p.likes)||0}</span></button>`;}
async function api(payload){
 const response=await fetch('/api/comunicati',{method:'POST',headers:{'Content-Type':'application/json','X-Sisal-Device':device},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(22000)});
 const data=await response.json();if(!response.ok){const e=Error(data.error||'Operazione non riuscita.');e.code=data.code;e.status=response.status;throw e;}return data;
}
function cleanupFiles(){state.urls.forEach(URL.revokeObjectURL);state.urls=[];state.files=[];}
function begin(view){state.view=view;state.epoch++;message('');cleanupFiles();dialog.scrollTop=0;}
function busy(on){state.busy=on;dialog.querySelector('[data-close]').disabled=on;screen.querySelectorAll('button,input,textarea').forEach(x=>x.disabled=on);if(!on&&state.view==='editor'){if(state.form.archived)$('#news-pin').disabled=true;if(state.pending){for(const s of ['#news-title','#news-body','#news-file','#news-pin','[data-action=remove-image]']){const el=$(s);if(el)el.disabled=true;}}}}
function article(p){return `<article class="news-article"><div class="news-meta">${p.pinned?'<span class="news-badge">In evidenza</span>':''}${date(p.created_at)}${p.updated_at&&p.updated_at!==p.created_at?'<br>Aggiornato: '+date(p.updated_at):''}</div><h3>${esc(p.title)}</h3>${p.image?`<img class="news-photo" src="${esc(p.image)}" alt="Immagine del comunicato">`:''}<div class="news-body">${esc(p.body)}</div><div class="news-signature">Sisal FC 2021</div></article>`;}
function renderList(){
 state.view='list';screen.innerHTML=masthead()+`<div class="news-tools">${button('Scrivi comunicato','new','primary')}${button('Aggiorna','refresh')}</div><div class="news-tools">${button('Bacheca','board',!state.archived?'selected':'')}${button('Archivio','archive-list',state.archived?'selected':'')}${getLocal('draft',null)?button('Riprendi bozza','draft'):''}</div><div class="news-meta">${state.fetched?'Copia scaricata il '+date(state.fetched):'Nessuna copia scaricata'} · ${state.total} comunicati</div>`;
 if(!state.posts.length)screen.innerHTML+='<div class="news-empty"><h3>'+ (state.archived?'L’archivio è vuoto.':'La prossima notizia è vostra.')+'</h3><p>'+ (state.archived?'Qui troverai i comunicati archiviati.':'Scrivi il primo comunicato della Sisal.')+'</p></div>';
 for(const p of state.posts){screen.innerHTML+=`<article class="news-card ${p.pinned?'featured':''}"><div class="news-meta">${p.pinned?'<span class="news-badge">In evidenza</span>':''}${!seen[p.id]||seen[p.id]!==p.updated_at?'<span class="news-badge">Nuovo</span>':''}${date(p.created_at)}</div><button type="button" class="news-title-button" data-open="${esc(p.id)}"><h3>${esc(p.title)}</h3></button><p class="news-excerpt">${esc(p.excerpt)}${p.excerpt.length>=240?'…':''}</p><div class="news-card-bottom">${heart(p)}<button type="button" class="news-button" data-open="${esc(p.id)}">Leggi articolo ↗</button></div></article>`;}
 if(state.posts.length<state.total)screen.innerHTML+=`<div class="news-tools">${button('Carica altri','more')}</div>`;
}
async function loadList(force=false,more=false){
 begin('list');const epoch=state.epoch,key='list-'+state.archived;
 if(!more){const stored=await cache(key);if(epoch!==state.epoch)return;state.posts=stored?.posts||[];state.total=stored?.total||0;state.fetched=stored?.fetched_at||null;renderList();if(!force&&stored){message('Stai leggendo la copia sul dispositivo. Premi Aggiorna per cercare novità.');return;}}
 message('Caricamento comunicati…');busy(true);
 try{const result=await api({action:'list',fresh:force,archived:state.archived,offset:more?state.posts.length:0});if(epoch!==state.epoch)return;
  state.posts=more?[...state.posts,...result.posts.filter(p=>!state.posts.some(x=>x.id===p.id))]:result.posts;state.total=result.total;state.fetched=result.fetched_at;
  await cache(key,{posts:state.posts,total:state.total,fetched_at:state.fetched});renderList();message('');
 }catch(e){message((e.message||'Connessione non riuscita.')+(state.fetched?' Stai vedendo i dati del '+date(state.fetched)+'. Premi Aggiorna per riprovare.':''));}finally{busy(false);}
}
function renderDetail(){const p=state.post;screen.innerHTML=masthead()+`<div class="news-tools">${button('← Comunicati','back')}${button('Aggiorna articolo','refresh-post')}</div>`+article(p)+`<div class="news-tools">${heart(p)}${button('Condividi come immagine','export','primary')}</div><details class="news-management"><summary>Gestisci comunicato</summary><div class="news-tools">${button('Modifica','edit')}${!p.archived?button(p.pinned?'Togli dall’evidenza':'Fissa in alto','pin'):''}${button(p.archived?'Ripristina':'Archivia','archive')}${button('Elimina','delete','danger')}</div></details>`;}
async function openPost(id,force=false){
 begin('detail');const epoch=state.epoch;screen.innerHTML=masthead()+'<div class="news-loading">Apro il comunicato…</div>';busy(true);
 const saved=await cache('post-'+id);
 try{const summary=state.posts.find(p=>p.id===id);state.post=!force&&saved&&summary&&saved.revision===summary.revision?{...saved,likes:summary.likes,liked:summary.liked}:await api({action:'get',id,fresh:force});
  if(epoch!==state.epoch)return;await cache('post-'+id,state.post);seen[id]=state.post.updated_at;setLocal('seen',seen);renderDetail();
 }catch(e){if(saved&&e.status!==404){state.post=saved;renderDetail();message(e.message+' Stai leggendo una copia sul dispositivo, che potrebbe non essere aggiornata.');}
 else {screen.innerHTML=masthead()+button('← Comunicati','back');message(e.message);}}
 finally{busy(false);}
}
function readForm(){if(!$('#news-title'))return state.form;state.form={...state.form,title:$('#news-title').value,body:$('#news-body').value,pinned:$('#news-pin').checked};return state.form;}
function saveDraft(){readForm();const ok=setLocal('draft',{form:state.form,pending:state.pending});message(ok?'Bozza salvata solo su questo dispositivo.':'Spazio sul dispositivo insufficiente: la bozza non è stata salvata.');return ok;}
function renderEditor(){const f=state.form;screen.innerHTML=masthead()+`<div class="news-tools">${button('← Comunicati','leave-editor')}</div><h3>${f.edit?'Modifica comunicato':'Scrivi un comunicato'}</h3><p class="news-meta">La tua voce, sulla pagina della Sisal. Tutti possono pubblicare e gestire i comunicati.</p><form id="news-form"><label for="news-title">Titolo</label><input id="news-title" type="text" maxlength="160" required value="${esc(f.title)}"><label for="news-body">Testo</label><textarea id="news-body" maxlength="18000" required>${esc(f.body)}</textarea><p class="news-meta">Fino a 18.000 caratteri e 300 a capo · I paragrafi vengono mantenuti.</p><label for="news-file">Immagine facoltativa</label><input id="news-file" type="file" accept="image/jpeg,image/png,image/webp"><p class="news-meta">JPEG, PNG o WebP, fino a 12 MB. La foto viene ridimensionata e compressa a massimo 192 KB.</p><div id="news-image">${f.image?`<img class="news-photo" src="${esc(f.image)}" alt="Anteprima foto">${button('Rimuovi immagine','remove-image')}`:''}</div><label class="news-check"><input id="news-pin" type="checkbox" ${f.pinned?'checked':''} ${f.archived?'disabled':''}>Fissa in alto</label><div class="news-tools">${button('Anteprima','preview')}${button('Salva bozza','save-draft')}<button class="news-button primary" type="submit">${state.pending?'Riprova il salvataggio':f.edit?'Salva modifiche':'Pubblica'}</button></div><p class="news-meta">Le bozze restano su questo dispositivo e non sono visibili agli altri.</p></form><div id="news-preview"></div>`;
 $('#news-form').addEventListener('submit',e=>{e.preventDefault();publish();});$('#news-file').addEventListener('change',selectImage);
 if(state.pending){$('#news-title').disabled=$('#news-body').disabled=$('#news-file').disabled=$('#news-pin').disabled=true;message('L’esito dell’ultimo invio è incerto. Riprova lo stesso salvataggio: non verrà duplicato.');}
}
function editor(f){begin('editor');state.form=f||{id:uuid(),title:'',body:'',image:null,pinned:false};state.pending=null;renderEditor();}
async function selectImage(e){const file=e.target.files?.[0];if(!file)return;readForm();busy(true);message('Preparo la foto…');try{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Scegli una foto JPEG, PNG o WebP fino a 12 MB.');
 const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>40000000){bitmap.close();throw Error('Foto troppo grande: scegli un’immagine con meno di 40 megapixel.');}
 const c=document.createElement('canvas');let size=1400,encoded='';
 for(let attempt=0;attempt<8;attempt++){const scale=Math.min(1,size/Math.max(bitmap.width,bitmap.height));c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bitmap,0,0,c.width,c.height);encoded=c.toDataURL('image/jpeg',.8-attempt*.055);if(encoded.length<=262167)break;size*=.8;}
 bitmap.close();c.width=c.height=1;if(encoded.length>262167)throw Error('Foto troppo complessa da comprimere. Scegline un’altra.');state.form.image=encoded;renderEditor();message('Foto pronta.');
 }catch(err){message(err.message);}finally{busy(false);}}
async function publish(){if(state.busy)return;readForm();const f=state.form;if(!f.title.trim()||!f.body.trim()){message('Inserisci titolo e testo.');return;}
 const payload=state.pending||{action:f.edit?'edit':'create',id:f.id,revision:f.revision,title:f.title,body:f.body,image:f.image,pinned:f.pinned,request_id:uuid()};state.pending=payload;
 setLocal('draft',{form:f,pending:payload});busy(true);message('Salvataggio in corso…');
 try{const result=await api(payload);state.pending=null;setLocal('draft',null);await cache('post-'+result.id,{...payload,...result});state.post={...payload,...result};begin('detail');renderDetail();message('Comunicato salvato e visibile a tutti.');
 // Invalida soltanto la cache della bacheca, senza ulteriori richieste.
 await cache('list-false',null);await cache('list-true',null);
 }catch(e){if(e.status&&e.status<500){state.pending=null;setLocal('draft',{form:f,pending:null});}renderEditor();message(e.message+(state.pending?' Riprova il salvataggio: il contenuto è conservato.':''));}
 finally{busy(false);if(state.pending){$('#news-title').disabled=$('#news-body').disabled=$('#news-file').disabled=$('#news-pin').disabled=true;}}
}
async function mutate(action,value){if(state.busy)return;const p=state.post;if(action==='delete'&&!confirm('Eliminare definitivamente questo comunicato e i suoi like?'))return;busy(true);message('Salvataggio…');
 try{const result=await api({action,id:p.id,revision:p.revision,value,request_id:uuid()});await cache('list-false',null);await cache('list-true',null);
 if(action==='delete'){await cache('post-'+p.id,null);await loadList(true);}else{state.post={...p,...result};await cache('post-'+p.id,state.post);renderDetail();message('Modifica salvata.');}}
 catch(e){message(e.message+' Usa Aggiorna articolo per verificare lo stato.');}finally{busy(false);}}
async function like(id,el){if(state.busy)return;const p=state.view==='detail'?state.post:state.posts.find(x=>x.id===id);if(!p)return;busy(true);message('');
 try{const result=await api({action:'like',id,value:!p.liked,request_id:uuid()});Object.assign(p,result);const saved=await cache('post-'+id);if(saved)await cache('post-'+id,{...saved,...result});if(state.view==='detail'){renderDetail();await cache('list-false',null);await cache('list-true',null);}else {renderList();await cache('list-'+state.archived,{posts:state.posts,total:state.total,fetched_at:state.fetched});}const b=screen.querySelector(`[data-like="${id}"]`);b?.classList.add('pulse');b?.focus({preventScroll:true});}
 catch(e){message(e.message+' Il contatore non è stato modificato sul dispositivo. Aggiorna per verificarlo.');}finally{busy(false);}}
async function exportPost(){begin('export');screen.innerHTML=masthead()+'<div class="news-loading">Impagino il giornale…</div>';busy(true);
 try{state.files=await exportNewspaper(state.post);screen.innerHTML=masthead()+`<div class="news-tools">${button('← Articolo','return-post')}${button('Condividi immagini','share','primary')}</div><p class="news-meta">${state.files.length} ${state.files.length===1?'pagina pronta':'pagine pronte'}. Puoi scaricarle singolarmente qui sotto.</p>`;
 state.files.forEach((f,i)=>{const url=URL.createObjectURL(f);state.urls.push(url);screen.innerHTML+=`<div class="news-export-page"><img src="${url}" alt="Anteprima pagina ${i+1}"><a class="news-download" href="${url}" download="${f.name}">Scarica pagina ${i+1}</a></div>`;});
 }catch(e){screen.innerHTML=masthead()+button('← Articolo','return-post');message(e.message);}finally{busy(false);}}
async function share(){try{if(!navigator.canShare?.({files:state.files})){message('Questo browser non condivide direttamente le immagini. Usa “Scarica pagina” e inviale dalla galleria.');return;}await navigator.share({files:state.files,title:state.post.title});}catch(e){if(e.name!=='AbortError')message('Condivisione non riuscita. Puoi scaricare le pagine con i pulsanti sotto le immagini.');}}
screen.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||state.busy)return;
 if(b.dataset.open){await openPost(b.dataset.open);return;}if(b.dataset.like){await like(b.dataset.like,b);return;}
 switch(b.dataset.action){
 case 'new':editor();break;
 case 'draft':{const d=getLocal('draft',null);if(d){editor(d.form);state.pending=d.pending;renderEditor();}break;}
 case 'refresh':await loadList(true);break;
 case 'more':await loadList(true,true);break;
 case 'board':state.archived=false;await loadList();break;
 case 'archive-list':state.archived=true;await loadList();break;
 case 'back':await loadList();break;
 case 'refresh-post':await openPost(state.post.id,true);break;
 case 'edit':editor({...state.post,edit:true});break;
 case 'leave-editor':if(confirm('Tornare alla bacheca? La bozza verrà salvata su questo dispositivo.')){if(saveDraft())await loadList();}break;
 case 'save-draft':saveDraft();break;
 case 'remove-image':readForm();state.form.image=null;renderEditor();break;
 case 'preview':{const f=readForm();$('#news-preview').innerHTML='<div class="news-draft-preview"><div class="news-kicker">Anteprima · non pubblicato</div>'+article({...f,created_at:f.created_at||new Date().toISOString()})+'</div>';$('#news-preview').scrollIntoView({behavior:'auto'});break;}
 case 'pin':await mutate('pin',!state.post.pinned);break;
 case 'archive':await mutate('archive',!state.post.archived);break;
 case 'delete':await mutate('delete');break;
 case 'export':await exportPost();break;
 case 'return-post':begin('detail');renderDetail();break;
 case 'share':await share();break;
 }
});
function close(){if(state.busy)return;if(state.view==='editor'&&!saveDraft())return;state.epoch++;cleanupFiles();dialog.close();launch.focus();}
dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
// Evita che il gesto di questa finestra raggiunga il pull-to-refresh delle statistiche.
for(const name of ['touchstart','touchmove','touchend'])dialog.addEventListener(name,e=>e.stopPropagation(),{passive:true});
const launch=document.createElement('button');launch.type='button';launch.className='news-launch';launch.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 11h4v5H7zM14 11h3M14 15h3M7 19h10"/></svg>Comunicati';
launch.onclick=()=>{dialog.showModal();loadList();};document.querySelector('.topbar').append(launch);
