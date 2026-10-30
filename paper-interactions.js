const pageMemory=new Map();
function rememberKey(reader){return 'sisal_paper_page_v4:'+String(window.SisalAccount?.user?.id||'member')+':'+reader.dataset.editionKey;}
async function fill(reader){try{const {fillPortraits}=await import('./jockey-portrait.js?v=club-57');await fillPortraits(reader);}catch{for(const n of reader.querySelectorAll('[data-portrait-image]'))if(!n.querySelector('img'))n.textContent='Ritratto non disponibile su questo dispositivo.';}}
export function bindInteractions(root=document){
 for(const reader of root.querySelectorAll('.paper-reader')){
  if(reader.dataset.paperBound==='true'){fill(reader);continue;}reader.dataset.paperBound='true';
  const pages=[...reader.querySelectorAll('[data-paper-page]')],key=rememberKey(reader);let index=0;
  try{index=Number(pageMemory.get(key)??sessionStorage.getItem(key)??0);}catch{};
  const select=(next,manual=false)=>{
   index=Math.max(0,Math.min(pages.length-1,Number.isFinite(next)?next:0));
   pages.forEach((p,i)=>p.hidden=i!==index);reader.querySelector('[data-paper-prev]').disabled=index===0;reader.querySelector('[data-paper-next]').disabled=index===pages.length-1;
   reader.querySelector('[data-paper-position]').textContent=`Partita ${index+1} di ${pages.length}`;
   reader.querySelectorAll('[data-paper-to]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
   pageMemory.set(key,index);try{sessionStorage.setItem(key,String(index));}catch{};
   if(manual){pages[index].scrollIntoView?.({block:'start',behavior:'auto'});reader.querySelector('[data-paper-to="'+index+'"]').scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'auto'});}
   fill(reader);
  };
  reader.querySelector('[data-paper-prev]').onclick=()=>select(index-1,true);reader.querySelector('[data-paper-next]').onclick=()=>select(index+1,true);
  reader.querySelectorAll('[data-paper-to]').forEach(b=>b.onclick=()=>select(Number(b.dataset.paperTo),true));
  reader.onkeydown=e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select'))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();select(index+(e.key==='ArrowRight'?1:-1),true);}};
  select(index);
 }
 for(const wrap of root.querySelectorAll('[data-trend]')){
  const data=JSON.parse(wrap.dataset.trend),svg=wrap.querySelector('svg'),info=wrap.querySelector('.trend-inspector');let selected=-1;
  const select=i=>{i=Math.max(0,Math.min(data.length-1,i));if(i===selected)return;selected=i;const r=data[i];const date=new Date(Number(r.timestamp)?Number(r.timestamp)*(Number(r.timestamp)<1e12?1000:1):r.timestamp);info.replaceChildren();const title=document.createElement('b');title.textContent=r.opponent||'Avversario non disponibile';const result=document.createElement('span');result.textContent=`Gol fatti ${r.gf??'—'} · Gol subiti ${r.ga??'—'} · ${{W:'Vittoria',L:'Sconfitta',D:'Pareggio'}[r.result]||r.result||''}`;const meta=document.createElement('small');meta.textContent=`Partita ${i+1} di ${data.length}`+(Number.isNaN(date.getTime())?'':' · '+date.toLocaleDateString('it-IT'));info.append(title,result,meta);const x=34+(data.length===1?274:548*i/(data.length-1));const cursor=svg.querySelector('.trend-cursor');cursor.removeAttribute('hidden');cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);for(const cls of ['gf','ga'])svg.querySelectorAll('circle.'+cls).forEach((c,n)=>{c.setAttribute('r',n===i?'6':'3');c.classList.toggle('selected',n===i)});};
  const at=e=>{const point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const matrix=svg.getScreenCTM();if(!matrix)return;const x=point.matrixTransform(matrix.inverse()).x;select(Math.round((x-34)/548*(data.length-1)));};
  svg.onpointermove=e=>{if(e.pointerType==='mouse')at(e)};svg.onpointerdown=at;svg.onfocus=()=>select(selected<0?data.length-1:selected);svg.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();select(e.key==='Home'?0:e.key==='End'?data.length-1:(selected<0?data.length-1:selected)+(e.key==='ArrowRight'?1:-1));}};
 }
}
