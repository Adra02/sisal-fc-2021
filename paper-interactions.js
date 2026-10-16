import {fillPortraits} from './jockey-portrait.js?v=paper-pages';
export function bindInteractions(root=document){
 for(const reader of root.querySelectorAll('.paper-reader')){
  const pages=[...reader.querySelectorAll('[data-paper-page]')];let current=0;
  const show=i=>{current=Math.max(0,Math.min(pages.length-1,i));reader.dataset.page=current;pages.forEach((p,n)=>p.hidden=n!==current);reader.querySelector('[data-paper-position]').textContent=`Partita ${current+1} di ${pages.length}`;reader.querySelector('[data-paper-prev]').disabled=current===0;reader.querySelector('[data-paper-next]').disabled=current===pages.length-1;fillPortraits(reader);};
  reader.querySelector('[data-paper-prev]').onclick=()=>show(current-1);reader.querySelector('[data-paper-next]').onclick=()=>show(current+1);
  let start=null;reader.ontouchstart=e=>{if(e.target.closest('button'))return;start={x:e.touches[0].clientX,y:e.touches[0].clientY};};reader.ontouchend=e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)show(current+(dx<0?1:-1));start=null;};
  show(Number(reader.dataset.page||0));
 }
 for(const details of root.querySelectorAll('.sisal-news'))details.ontoggle=()=>{if(details.open){fillPortraits(details);if(!details.dataset.refreshed){details.dataset.refreshed='true';window.SisalEditorial?.refreshPaper();}}};
 for(const wrap of root.querySelectorAll('[data-trend]')){
  const data=JSON.parse(wrap.dataset.trend),svg=wrap.querySelector('svg'),info=wrap.querySelector('.trend-inspector');let selected=-1;
  const select=i=>{i=Math.max(0,Math.min(data.length-1,i));if(i===selected)return;selected=i;const r=data[i];const date=new Date(Number(r.timestamp)?Number(r.timestamp)*(Number(r.timestamp)<1e12?1000:1):r.timestamp);info.replaceChildren();const title=document.createElement('b');title.textContent=r.opponent||'Avversario non disponibile';const result=document.createElement('span');result.textContent=`Gol fatti ${r.gf??'—'} · Gol subiti ${r.ga??'—'} · ${{W:'Vittoria',L:'Sconfitta',D:'Pareggio'}[r.result]||r.result||''}`;const meta=document.createElement('small');meta.textContent=`Partita ${i+1} di ${data.length}`+(Number.isNaN(date.getTime())?'':' · '+date.toLocaleDateString('it-IT'));info.append(title,result,meta);const x=34+(data.length===1?274:548*i/(data.length-1));const cursor=svg.querySelector('.trend-cursor');cursor.removeAttribute('hidden');cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);for(const cls of ['gf','ga'])svg.querySelectorAll('circle.'+cls).forEach((c,n)=>{c.setAttribute('r',n===i?'6':'3');c.classList.toggle('selected',n===i)});};
  const at=e=>{const point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const matrix=svg.getScreenCTM();if(!matrix)return;const x=point.matrixTransform(matrix.inverse()).x;select(Math.round((x-34)/548*(data.length-1)));};
  svg.onpointermove=e=>{if(e.pointerType==='mouse')at(e)};svg.onpointerdown=at;svg.onfocus=()=>select(selected<0?data.length-1:selected);svg.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();select(e.key==='Home'?0:e.key==='End'?data.length-1:(selected<0?data.length-1:selected)+(e.key==='ArrowRight'?1:-1));}};
 }
}
