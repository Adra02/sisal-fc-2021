/* Structural UI, entirely local. Existing data, buttons and server contracts stay authoritative. */
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy={
 team:['IL CLUB, A COLPO D’OCCHIO','Storia, forma e giornale della squadra, con i periodi sempre separati.'],
 players:['DENTRO I NUMERI','Una vista per ogni tipo di statistica. Cerca un giocatore e apri la sua scheda.'],
 top:['IL PODIO PRENDE VITA','Le classifiche delle ultime cinque partite, da scoprire in pista.'],
 pitch:['LA LAVAGNA TATTICA','Scegli modulo e interpreti. La formazione resta sotto il tuo controllo.'],
 matches:['L’ARCHIVIO DEL CLUB','Ogni risultato nel suo contesto, con i dettagli della singola partita.'],
 fun:['CLUB WRAPPED','Forma, record e curiosità calcolati dai file, senza richieste IA all’apertura.'],
 opponent:['DOSSIER AVVERSARIO','Storico e forma recente per leggere i numeri prima della partita.'],
 ai:['LA TUA DOMANDA, I DATI DEL CLUB','Un confronto diretto con l’assistente. Le incertezze restano dichiarate.'],
 data:['IL BANCO DI LAVORO','Sorgenti della squadra e dell’avversario, aggiornamenti e controllo dati.'],
};
function node(tag,cls,content){const el=document.createElement(tag);el.className=cls;if(content!=null)el.innerHTML=content;return el;}
function summaryDetails(element,title,subtitle=''){
 const details=node('details','cc-analysis-drawer'),summary=node('summary','',`<span><b>${esc(title)}</b>${subtitle?'<small>'+esc(subtitle)+'</small>':''}</span><i aria-hidden="true">＋</i>`);element.before(details);details.append(summary,element);return details;
}
function decorateTeam(root,t){
 const cover=root.querySelector('.hero');if(!cover||!t)return;const totals=t.manualTotals?.totals||t.autoTotals?.totals||{},n=Number(totals.matches),valid=Number.isFinite(n)&&n>0;
 cover.classList.add('cc-team-cover');const wins=valid?Math.max(0,Math.min(100,100*Number(totals.wins||0)/n)):0,draws=valid?Math.max(0,Math.min(100,100*Number(totals.draws||0)/n)):0,losses=valid?Math.max(0,100-wins-draws):0;
 cover.innerHTML=`<div class="cc-cover-copy"><small>FC27 · IL NOSTRO CLUB</small><h3>${esc(t.club?.name||'Sisal FC 2021')}</h3><p>Lo storico racconta il percorso.<br>Le ultime cinque raccontano il momento.</p><div class="cc-cover-tags"><span>${esc(t.players?.length||0)} giocatori nei dati</span><span>${esc(t.matches?.length||0)} partite in archivio</span></div></div><div class="cc-cover-number"><small>TOTALE STORICO</small><strong>${totals.matches==null?'—':esc(totals.matches)}</strong><span>partite · ${totals.matches==null?'storico non disponibile':'sorgente cumulativa'}</span><div class="cc-result-spectrum" role="img" aria-label="${esc(totals.wins??'—')} vittorie, ${esc(totals.draws??'—')} pareggi, ${esc(totals.losses??'—')} sconfitte"><i style="--segment:${wins}%;--segment-color:#c9ec9c"></i><i style="--segment:${draws}%;--segment-color:#e0cb90"></i><i style="--segment:${losses}%;--segment-color:#567969"></i></div><p>${esc(totals.wins??'—')} V <span>·</span> ${esc(totals.draws??'—')} P <span>·</span> ${esc(totals.losses??'—')} S</p></div><svg class="cc-cover-pitch" viewBox="0 0 460 340" aria-hidden="true"><path d="M40 22h380v296H40zM230 22v296M40 100h70v140H40m380-140h-70v140h70"/><circle cx="230" cy="170" r="52"/><path class="cc-pitch-route" d="M90 250 170 190 230 170 300 90 365 170"/><circle class="cc-pitch-point" cx="300" cy="90" r="9"/></svg>`;

 for(const block of [...root.children]){
  if(block.matches('.rich-grid')){const title=block.querySelector('.table-caption')?.textContent||'';summaryDetails(block,/Passaggi|tackle/i.test(title)?'Passaggi e contrasti':/Efficienza/i.test(title)?'Efficienza e rendimento':'Profili e fonti del club','Apri le tabelle dettagliate');}
 }
}
function decoratePlayers(root,t){
 const tables=[...root.querySelectorAll('.card.rich-card')].filter(c=>c.querySelector('table'));
 if(!tables.length)return;const nav=node('div','cc-data-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Viste statistiche giocatori');
 const labels=['Prestazioni','Tecnica U5','Rapporti','Export','Profilo Pro','Carriera','Ultime 5'];
 let selected=0;const key='sisal-roster-view:'+String(window.SisalAccount?.user?.id||'local');try{selected=Math.max(0,Math.min(tables.length-1,Number(localStorage.getItem(key))||0));}catch{}
 const area=node('div','cc-table-workspace');tables[0].before(nav,area);
 const buttons=tables.map((card,i)=>{const b=node('button','',esc(labels[i]||'Vista '+(i+1)));b.type='button';b.id='cc-roster-tab-'+i;b.dataset.rosterView=String(i);b.setAttribute('role','tab');b.setAttribute('aria-controls','cc-roster-panel-'+i);nav.append(b);card.id='cc-roster-panel-'+i;card.setAttribute('role','tabpanel');card.setAttribute('aria-labelledby',b.id);area.append(card);return b;});
 function choose(i,focus=false){selected=i;buttons.forEach((b,j)=>{b.setAttribute('aria-selected',String(j===i));b.tabIndex=j===i?0:-1;tables[j].hidden=j!==i;});try{localStorage.setItem(key,String(i));}catch{}if(focus)buttons[i].focus({preventScroll:true});}
 buttons.forEach((b,i)=>{b.onclick=()=>choose(i);b.onkeydown=e=>{let next=i;if(e.key==='ArrowRight')next=(i+1)%buttons.length;else if(e.key==='ArrowLeft')next=(i-1+buttons.length)%buttons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;e.preventDefault();choose(next,true);};});choose(selected);
 const byName=new Map((t?.players||[]).map(p=>[String(p.name).toLowerCase(),p]));
 for(const row of area.querySelectorAll('tbody tr')){const name=row.querySelector('[data-player-name]')?.dataset.playerName,p=byName.get(String(name).toLowerCase());if(!name)continue;row.dataset.playerRow='';row.dataset.dep=window.SisalPlayerProfile?.roleGroup?.(p?.position)||'';}
 const u5Note=[...root.querySelectorAll(':scope>.notice')].find(n=>n.textContent.trim().startsWith('ULTIME 5 PARTITE:'));if(u5Note)tables.at(-1).prepend(u5Note);
 const composition=root.querySelector('.card.rich-card:not(:has(table))');if(composition)summaryDetails(composition,'Composizione dei giocatori','Dati dei ruoli presenti nel file');
 const toolbar=root.querySelector('.toolbar');if(toolbar)toolbar.classList.add('cc-roster-search');
}
function decorateMatches(root){
 const grid=root.querySelector('.match-grid');if(!grid)return;grid.classList.add('cc-match-timeline');
 for(const card of grid.children){card.classList.add('cc-timeline-match');const meta=card.querySelector('.match-top'),score=card.querySelector('.score-grid');if(meta)meta.classList.add('cc-match-date');if(score)score.classList.add('cc-match-score');const id=meta?.lastElementChild;if(id?.textContent.startsWith('#'))id.classList.add('cc-match-reference');}
}
function decorate(){
 const root=document.getElementById('content'),snapshot=window.SisalWorkspace?.snapshot?.();if(!root||!snapshot||root.dataset.workspaceReady==='true')return;
 root.dataset.workspaceReady='true';const {tab,own,opponent}=snapshot;root.classList.add('cc-page','cc-page-'+tab);document.body.dataset.clubSection=tab;
 const heading=root.querySelector(':scope>h2'),kicker=root.querySelector(':scope>.kicker'),intro=copy[tab];
 if(heading&&intro){const mast=node('header','cc-page-heading');if(kicker)mast.append(kicker);mast.append(heading);mast.append(node('p','cc-page-description',esc(intro[1])));root.prepend(mast);}
 if(tab==='team')decorateTeam(root,own);
 else if(tab==='players')decoratePlayers(root,own);
 else if(tab==='matches')decorateMatches(root);
 else if(tab==='top'){const stage=node('div','cc-race-cover','<div><small>LE ULTIME CINQUE · IL CLUB IN PISTA</small><h3>Il podio<br>prende vita.</h3><p>Ogni corsa rivela una classifica.<br>Le personalizzazioni raccontano chi sei.</p></div><div class="cc-race-emblem" aria-hidden="true">3<small>TOP</small></div>');const notice=root.querySelector('.notice');if(notice)notice.before(stage);}
 else if(tab==='opponent'){const title=root.querySelector('.cc-page-heading');if(title)title.classList.add('cc-scouting-heading');root.querySelector('.compact-stat-sections')?.classList.add('cc-scouting-totals');}
 else if(tab==='ai'){root.querySelector('.grid2')?.classList.add('cc-assistant-workbench');const input=root.querySelector('#aiQ');if(input){input.setAttribute('aria-label','Domanda per l’assistente');input.placeholder='Che cosa vuoi capire dai dati della squadra?';}}
 else if(tab==='data'){root.querySelector('.grid2')?.classList.add('cc-source-workbench');root.querySelectorAll('[data-upload-all]').forEach(b=>b.classList.add('cc-upload-action'));}
 window.dispatchEvent(new Event('sisal-workspace-layout'));
}
function nav(){
 const n=document.querySelector('.bottomnav');if(!n||n.dataset.workspaceNav)return;n.dataset.workspaceNav='true';n.classList.add('cc-navigation');
 const brand=node('div','cc-rail-brand','<img src="./icons/icon-192.png" alt=""><span><b>SISAL FC 2021</b><small>CLUBHOUSE · FC27</small></span>');n.prepend(brand);
 const label=node('small','cc-rail-caption','IL TUO CLUB');brand.after(label);
 const footer=node('div','cc-rail-footer','<span class="cc-rail-live"></span><b>Un club, lo stesso archivio.</b><small>Dati condivisi · accesso personale</small>');n.append(footer);
}
function alignNavigation(){
 const n=document.querySelector('.cc-navigation'),active=n?.querySelector('[data-tab].active');
 if(!n||!active||getComputedStyle(n).flexDirection!=='row')return;
 n.scrollTo?.({left:Math.max(0,active.offsetLeft-(n.clientWidth-active.offsetWidth)/2),behavior:'auto'});
}
window.addEventListener('sisal-content-rendered',()=>{decorate();alignNavigation();});window.addEventListener('sisal-eligibility',()=>{nav();decorate();});
await window.sisalAccountReady;nav();decorate();
