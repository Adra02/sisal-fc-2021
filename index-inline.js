(function(){'use strict';
const APP_VERSION='v32.1.8';
const FORMATIONS=[
'4-2-1-3','4-4-1-1','4-2-3-1 Wide','4-3-3 Attack','4-1-2-1-2 Narrow','4-4-2','4-3-1-2','4-3-3 Holding','4-4-2 Holding','4-1-2-1-2 Wide','4-2-3-1','4-1-4-1','4-3-3 Defend','4-3-2-1','4-5-1 Flat','4-2-2-2','4-3-3','4-2-4','4-1-3-2','4-5-1 Attack','3-4-2-1','3-5-2','5-2-1-2','3-4-1-2','5-3-2','5-2-3','5-4-1','3-4-3','3-1-4-2'];
const FORM_ROWS={
'4-2-1-3':['GK','LB','CB','CB','RB','CM','CM','CAM','LW','ST','RW'],
'4-4-1-1':['GK','LB','CB','CB','RB','LM','CM','CM','RM','CF','ST'],
'4-2-3-1 Wide':['GK','LB','CB','CB','RB','CDM','CDM','LW','CAM','RW','ST'],
'4-3-3 Attack':['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'],
'4-1-2-1-2 Narrow':['GK','LB','CB','CB','RB','CDM','CM','CM','CAM','ST','ST'],
'4-4-2':['GK','LB','CB','CB','RB','LM','CM','CM','RM','ST','ST'],
'4-3-1-2':['GK','LB','CB','CB','RB','CM','CM','CM','CAM','ST','ST'],
'4-3-3 Holding':['GK','LB','CB','CB','RB','CM','CDM','CM','LW','ST','RW'],
'4-4-2 Holding':['GK','LB','CB','CB','RB','LM','CDM','CDM','RM','ST','ST'],
'4-1-2-1-2 Wide':['GK','LB','CB','CB','RB','CDM','LM','RM','CAM','ST','ST'],
'4-2-3-1':['GK','LB','CB','CB','RB','CDM','CDM','LW','CAM','RW','ST'],
'4-1-4-1':['GK','LB','CB','CB','RB','CDM','LM','CM','CM','RM','ST'],
'4-3-3 Defend':['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'],
'4-3-2-1':['GK','LB','CB','CB','RB','CM','CM','CM','CF','CF','ST'],
'4-5-1 Flat':['GK','LB','CB','CB','RB','LM','CM','CM','CM','RM','ST'],
'4-2-2-2':['GK','LB','CB','CB','RB','CDM','CDM','CAM','CAM','ST','ST'],
'4-3-3':['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'],
'4-2-4':['GK','LB','CB','CB','RB','CM','CM','LW','ST','ST','RW'],
'4-1-3-2':['GK','LB','CB','CB','RB','CDM','LM','CAM','RM','ST','ST'],
'4-5-1 Attack':['GK','LB','CB','CB','RB','LM','CM','CAM','CM','RM','ST'],
'3-4-2-1':['GK','CB','CB','CB','LM','CM','CM','RM','CAM','CAM','ST'],
'3-5-2':['GK','CB','CB','CB','LM','CM','CDM','CM','RM','ST','ST'],
'5-2-1-2':['GK','LB','CB','CB','CB','RB','CM','CM','CAM','ST','ST'],
'3-4-1-2':['GK','CB','CB','CB','LM','CM','CM','RM','CAM','ST','ST'],
'5-3-2':['GK','LB','CB','CB','CB','RB','CM','CDM','CM','ST','ST'],
'5-2-3':['GK','LB','CB','CB','CB','RB','CM','CM','LW','ST','RW'],
'5-4-1':['GK','LB','CB','CB','CB','RB','LM','CM','CM','RM','ST'],
'3-4-3':['GK','CB','CB','CB','LM','CM','CM','RM','LW','ST','RW'],
'3-1-4-2':['GK','CB','CB','CB','CDM','LM','CM','CM','RM','ST','ST']};
const PITCH_Y={GK:92,DEF:74,CDM:59,MID:48,AM:35,WIDE:29,ST:19};
function spread(n,left,right){if(n<=1)return[(left+right)/2];const out=[];for(let i=0;i<n;i++)out.push(left+(right-left)*(i/(n-1)));return out}
function pitchCoordinates(roles){const coords=Array(roles.length).fill(null).map(()=>({x:50,y:50}));const groups={DEF:[],CDM:[],MID:[],AM:[],ST:[]};roles.forEach((role,i)=>{if(role==='GK'){coords[i]={x:50,y:PITCH_Y.GK};return}if(['LB','CB','RB','LWB','RWB'].includes(role)){groups.DEF.push(i);return}if(role==='CDM'){groups.CDM.push(i);return}if(role==='CM'||role==='LM'||role==='RM'){groups.MID.push(i);return}if(['CAM','CF','LW','RW'].includes(role)){groups.AM.push(i);return}if(role==='ST'){groups.ST.push(i);return}groups.MID.push(i)});const cbs=groups.DEF.filter(i=>roles[i]==='CB'),side=groups.DEF.filter(i=>roles[i]!=='CB'),cbXs=spread(cbs.length,28,72);cbs.forEach((i,j)=>coords[i]={x:cbXs[j],y:PITCH_Y.DEF});side.forEach(i=>coords[i]={x:roles[i].startsWith('L')?15:85,y:PITCH_Y.DEF});const cdmXs=spread(groups.CDM.length,40,60);groups.CDM.forEach((i,j)=>coords[i]={x:cdmXs[j],y:PITCH_Y.CDM});const cms=groups.MID.filter(i=>roles[i]==='CM');const cmXs=spread(cms.length,31,69);cms.forEach((i,j)=>coords[i]={x:cmXs[j],y:PITCH_Y.MID});groups.MID.filter(i=>roles[i]==='LM').forEach(i=>coords[i]={x:15,y:PITCH_Y.MID});groups.MID.filter(i=>roles[i]==='RM').forEach(i=>coords[i]={x:85,y:PITCH_Y.MID});const amCentral=groups.AM.filter(i=>['CAM','CF'].includes(roles[i])),amXs=spread(amCentral.length,40,60);amCentral.forEach((i,j)=>coords[i]={x:amXs[j],y:PITCH_Y.AM});groups.AM.filter(i=>roles[i]==='LW').forEach(i=>coords[i]={x:17,y:PITCH_Y.WIDE});groups.AM.filter(i=>roles[i]==='RW').forEach(i=>coords[i]={x:83,y:PITCH_Y.WIDE});const stXs=spread(groups.ST.length,38,62);groups.ST.forEach((i,j)=>coords[i]={x:stXs[j],y:PITCH_Y.ST});return coords}
function playerRoleMatch(position,role){const raw=String(position||'').toLowerCase();const map={gk:['gk','goalkeeper','keeper','portiere','port'],lb:['lb','left back','terzino sinistro'],cb:['cb','centre back','center back','defender','difensore'],rb:['rb','right back','terzino destro'],cdm:['cdm','defensive midfielder'],cm:['cm','midfielder','centrocampista'],lm:['lm','left mid','left midfielder'],rm:['rm','right mid','right midfielder'],cam:['cam','attacking midfielder'],lw:['lw','left wing'],rw:['rw','right wing'],st:['st','striker','forward','attaccante'],cf:['cf','second striker']};const wanted=map[String(role||'').toLowerCase()]||[];return wanted.some(x=>raw===x||raw.includes(x))}

const K={notes:'fc27_shared_notes',lineups:'fc27_shared_lineups',tactics:'fc27_shared_tactics',formation:'fc27_shared_formation'};
const state={own:null,opponent:null,sharedError:'',loadingShared:false,notes:jget(K.notes,''),lineups:jget(K.lineups,{}),tactics:jget(K.tactics,{lineHeight:55,width:50,build:55,pressure:45,tempo:50}),formation:jget(K.formation,'4-1-2-1-2 Narrow'),knowledge:null,knowledgeError:'',tab:'team',aiMode:'normal',aiResults:{normal:'',opponent:'',fun:'',audit:'',fouls:'',formation:''},aiFormationRecommendation:null,matchFilter:''};
const el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function isPlainObject(v){return Boolean(v&&typeof v==='object'&&!Array.isArray(v))}
function jget(k,d){try{const x=localStorage.getItem(k);return x===null?d:JSON.parse(x)}catch{return d}}
function jset(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}
function num(v,d=0){const n=Number(String(v??'').replace(',','.').replace('%',''));return Number.isFinite(n)?n:d}
function pct(a,b){const n=num(b);return n?100*num(a)/n:null}
function formatDate(v){if(v===null||v===undefined||v==='')return'';const n=Number(v);const d=Number.isFinite(n)?new Date(n<1e12?n*1000:n):new Date(v);if(Number.isNaN(d.getTime()))return String(v);return new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)}
function shortDate(v){if(!v)return'';const n=Number(v);const d=Number.isFinite(n)?new Date(n<1e12?n*1000:n):new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
function team(role){return role==='opponent'?state.opponent:state.own}
function roleLabel(role){return role==='opponent'?'Avversario':'La tua squadra'}
function competitionLabel(c){return c==='league'?'Campionato':c==='playoffs'?'Playoff':'Amichevoli'}
function resultLabel(r){return r==='W'?'VITTORIA':r==='L'?'SCONFITTA':'PAREGGIO'}
function resultClass(r){return r==='W'?'win':r==='L'?'loss':'draw'}
function dataReady(t){return Boolean(t?.ready)}
function complete(t){return Boolean(t?.complete)}
const DATA_FILES=[['totals','🏆 Dati totali'],['season','📅 Stagione corrente'],['clubInfo','🏟️ Informazioni club'],['overallStats','📊 Overall Stats'],['players','👥 Giocatori'],['career','📈 Carriera giocatori'],['league','⚽ Campionato'],['playoffs','🏆 Playoff'],['friendlies','🤝 Amichevoli'],['playoffAchievements','🏅 Playoff Achievements']];function fileCount(t){return DATA_FILES.filter(([k])=>t?.fileStatus?.[k]?.present).length}
function statusLine(t){if(!t)return'Nessun dato condiviso';return `${fileCount(t)}/${DATA_FILES.length} file · ${t.players?.length||0} giocatori · ${t.matches?.length||0} partite archiviate`;}
function ownClubInMatch(t,m){return m?.clubs?.find(c=>String(c.id)===String(t?.club?.id))||m?.clubs?.[0]||null}
function oppClubInMatch(t,m){const own=ownClubInMatch(t,m);return m?.clubs?.find(c=>String(c.id)!==String(own?.id))||m?.clubs?.[1]||null}
function matchResult(t,m){const a=ownClubInMatch(t,m),b=oppClubInMatch(t,m);return num(a?.goals)>num(b?.goals)?'W':num(a?.goals)<num(b?.goals)?'L':'D'}
function department(p){const x=String(p||'').toLowerCase();if(/gk|goalkeeper|keeper/.test(x))return'GK';if(/lb|rb|cb|def|lwb|rwb/.test(x))return'DEF';if(/cm|cdm|lm|rm|cam|mid/.test(x))return'MID';if(/st|lw|rw|cf|att|forward/.test(x))return'ATT';return''}
function stat(v,label){return `<div class="stat"><strong>${esc(v)}</strong><span>${esc(label)}</span></div>`}
function showToast(t,err=false){const box=el('toast');if(!box)return;box.innerHTML=`<div class="message ${err?'err':'ok'}">${esc(t)}</div>`;box.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>box.classList.remove('show'),2800)}
function shell(kicker,title,content){return `<div class="kicker">${esc(kicker)}</div><h2 style="margin:6px 0 11px">${esc(title)}</h2>${content}`}
function empty(text){return `<div class="empty">${esc(text)}</div>`}
function setHeader(){const t=state.own;el('clubName').textContent=t?.club?.name||'SISAL FC 2021';el('clubId').textContent=t?.club?.id?`#${t.club.id}`:'—';el('status').textContent=statusLine(t)+(t?.updatedAt?` · aggiornato ${shortDate(t.updatedAt)}`:'');const ls=el('liveStatus');if(ls)ls.textContent=state.loadingShared?'Caricamento archivio centrale…':state.sharedError?'⚠ Archivio centrale non disponibile':t?`${complete(t)?'✓ Dataset completo':'⚠ Dataset parziale'} · condiviso per tutti gli utenti`:'Pronto · carica i file nella sezione I tuoi dati'}
function archiveTeamTotals(t){
  const matches=Array.isArray(t?.matches)?t.matches:[];
  let wins=0,draws=0,losses=0,goals=0,against=0;
  for(const m of matches){
    const own=ownClubInMatch(t,m),opp=oppClubInMatch(t,m); const gf=num(own?.goals),ga=num(opp?.goals);
    goals+=gf; against+=ga; if(gf>ga)wins+=1; else if(gf<ga)losses+=1; else draws+=1;
  }
  return {matches:matches.length,wins,draws,losses,goals,against,winRate:matches.length?100*wins/matches.length:0};
}
function displayTeamTotals(t){
  const manual=t?.manualTotals?.totals;
  if(manual)return {...manual,winRate:t.manualTotals.winRate,source:t.manualTotals.source,updatedAt:t.manualTotals.updatedAt};
  return {matches:null,wins:null,draws:null,losses:null,goals:null,against:null,winRate:null,source:'unset'};
}
function displayValue(value){return value==null?'—':num(value)}
function finiteValue(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function historicalProfileValue(t,key){
  const totals=t?.shooting?.totalsProfile||{};
  const overall=t?.shooting?.overallProfile||{};
  return finiteValue(totals[key]) ?? finiteValue(overall[key]);
}
function shootingRate(value){
  const n=finiteValue(value);
  return n==null?'—':n.toFixed(1)+'%';
}
function shootingAvg(value){
  const n=finiteValue(value);
  return n==null?'—':n.toFixed(2);
}
function shootingCount(value){
  const n=finiteValue(value);
  return n==null?'—':Math.round(n);
}
function shootingMetricRow(label,value){
  return '<div class="profile-row"><span>'+esc(label)+'</span><span>'+esc(value)+'</span></div>';
}
function shootingAnalyticsCard(t,title,scope){
  const recent=scope==='recent5';
  const o=recent?(t?.recent5?.team||{}):displayTeamTotals(t);
  const historical=t?.shooting?.historical||{};
  const matches=finiteValue(o.matches);
  const wins=finiteValue(o.wins);
  const draws=finiteValue(o.draws);
  const losses=finiteValue(o.losses);
  const goals=finiteValue(o.goals);
  const against=finiteValue(o.against);
  const gd=goals!=null&&against!=null?goals-against:null;
  const points=finiteValue(o.points) ?? (wins!=null&&draws!=null?wins*3+draws:null);
  let shots=null;
  let conversion=null;
  let shotsLabel='non disponibili';
  let note='';

  if(recent){
    const s=t?.shooting?.recent5||{};
    const candidate=finiteValue(s.shots);
    if(s.complete&&candidate!=null){
      shots=candidate;
      conversion=goals!=null&&shots>0?100*goals/shots:null;
      shotsLabel='osservati nei JSON partita';
      note='Tiri U5 esatti: somma dei campi aggregate.shots delle cinque partite più recenti. Nessuna IA necessaria.';
    }else{
      const known=finiteValue(s.knownMatches)??0;
      const total=finiteValue(s.totalMatches)??0;
      shots=null;
      shotsLabel=total?'dati incompleti ('+known+'/'+total+' gare)':'non disponibili';
      note='I tiri U5 non vengono inventati: sono mostrati solo quando tutte le partite della finestra hanno un dato tiri esplicito.';
    }
  }else{
    shots=finiteValue(historical.shots);
    conversion=finiteValue(historical.goalConversionRate);
    shotsLabel=historical.sourceLabel||'non disponibili';

    // Se il totale storico visualizzato è stato aggiornato manualmente, riapplica la stessa
    // conversione ricavata dai JSON al nuovo totale gol invece di mostrare numeri incoerenti.
    const basisGoals=finiteValue(historical.goals);
    if(historical.shotsEstimated&&conversion!=null&&conversion>0&&goals!=null&&basisGoals!=null&&goals!==basisGoals){
      shots=Math.round(goals*100/conversion);
    }
    if(conversion==null&&shots!=null&&shots>0&&goals!=null){
      conversion=100*goals/shots;
    }

    if(historical.source==='players-conversion-estimate'){
      const coverage=finiteValue(historical.goalCoverage);
      note='Stima matematica dai JSON giocatori: gol + shotSuccessRate di '+(historical.playersUsed||0)+' giocatori'+(coverage!=null?' coprono il '+coverage.toFixed(1)+'% dei gol storici':'')+'. Il codice calcola la conversione ponderata e la applica ai gol totali; Gemini non viene chiamato.';
    }else if(historical.source==='profile-conversion-estimate'){
      note='Tiri storici calcolati dai gol totali e dalla percentuale realizzativa storica esplicita presente nei JSON.';
    }else if(historical.source==='profile-explicit'){
      note='Tiri storici letti direttamente dal profilo JSON storico.';
    }else{
      note='Il sistema non mostra 0 quando il dato non è ricavabile. Gemini resta un fallback una tantum al caricamento dei file per campi espliciti con struttura non riconosciuta.';
    }
  }

  const shotsPerGoal=shots!=null&&goals!=null&&goals>0?shots/goals:null;
  const shotsPerMatch=shots!=null&&matches>0?shots/matches:null;
  const goalsPerMatch=goals!=null&&matches>0?goals/matches:null;
  const concededPerMatch=against!=null&&matches>0?against/matches:null;
  const gdPerMatch=gd!=null&&matches>0?gd/matches:null;
  const cleanSheets=recent?finiteValue(o.cleanSheets):(finiteValue(historical.cleanSheets)??historicalProfileValue(t,'cleanSheets'));
  const cleanSheetRate=cleanSheets!=null&&matches>0?100*cleanSheets/matches:null;
  const winRate=wins!=null&&matches>0?100*wins/matches:null;
  const drawRate=draws!=null&&matches>0?100*draws/matches:null;
  const lossRate=losses!=null&&matches>0?100*losses/matches:null;
  const pointsPerMatch=points!=null&&matches>0?points/matches:null;
  const pointsRate=points!=null&&matches>0?100*points/(3*matches):null;

  const rows=[
    shootingMetricRow('Tiri totali',shots==null?'—':shootingCount(shots)+' · '+shotsLabel),
    shootingMetricRow('Percentuale realizzativa',shootingRate(conversion)),
    shootingMetricRow('Tiri per gol',shootingAvg(shotsPerGoal)),
    shootingMetricRow('Tiri per partita',shootingAvg(shotsPerMatch)),
    shootingMetricRow('Gol per partita',shootingAvg(goalsPerMatch)),
    shootingMetricRow('Gol subiti per partita',shootingAvg(concededPerMatch)),
    shootingMetricRow('Differenza reti media per partita',shootingAvg(gdPerMatch)),
    shootingMetricRow('Clean sheet %',shootingRate(cleanSheetRate)),
    shootingMetricRow('Vittorie %',shootingRate(winRate)),
    shootingMetricRow('Pareggi %',shootingRate(drawRate)),
    shootingMetricRow('Sconfitte %',shootingRate(lossRate)),
    shootingMetricRow('Punti per partita',shootingAvg(pointsPerMatch)),
    shootingMetricRow('Punti % · sistema 3-1-0',shootingRate(pointsRate))
  ].join('');

  return '<div class="card rich-card"><div class="table-caption">'+title+'</div><div class="profile-list">'+rows+'</div><div class="analytics-note">'+esc(note)+'</div></div>';
}
function shootingAnalyticsPanel(t){
  if(!t)return '';
  return '<div class="rich-grid" style="margin-top:10px"><div class="grid2">'+
    shootingAnalyticsCard(t,'⚽ Efficienza offensiva e rendimento · STORICO','overall')+
    shootingAnalyticsCard(t,'⚡ Efficienza offensiva e rendimento · ULTIME 5','recent5')+
    '</div></div>';
}
function totalTable(t,scope='overall'){
  const o=scope==='recent5'?(t?.recent5?.team||{}):displayTeamTotals(t); const src=scope==='recent5'?'Calcolato esclusivamente sulle ultime 5 partite':'Fonte: '+(o.source==='proclubtracker'?'ProClubTracker · Gemini':o.source==='dati-totali-ai'?'Dati totali JSON · IA':o.source==='dati-totali-json'?'Dati totali JSON · automatico':'modifica manuale')+(o.source==='unset'?' · totale storico non ancora impostato':'');
  const gd=o.goals==null||o.against==null?null:num(o.goals)-num(o.against);
  const winRate=o.winRate==null?null:num(o.winRate).toFixed(1)+'%';
  return `<div class="compact-total"><table class="compact-total-table"><tbody><tr><th>Partite</th><td>${displayValue(o.matches)}</td><th>Vittorie</th><td>${displayValue(o.wins)}</td></tr><tr><th>Pareggi</th><td>${displayValue(o.draws)}</td><th>Sconfitte</th><td>${displayValue(o.losses)}</td></tr><tr><th>Gol fatti</th><td>${displayValue(o.goals)}</td><th>Gol subiti</th><td>${displayValue(o.against)}</td></tr><tr><th>Diff. reti</th><td>${gd==null?'—':`${gd>0?'+':''}${gd}`}</td><th>Win rate</th><td>${winRate==null?'—':winRate}</td></tr></tbody></table><div class="compact-source">${esc(src)}</div></div>`;
}
function richTable(rows, opts={}){
  const keys=opts.keys||rows.map(r=>Object.keys(r)).flat().filter((v,i,a)=>a.indexOf(v)===i);
  const labels=opts.labels||{};
  const htmlKeys=new Set(opts.htmlKeys||['player']);
  const cellValue=(k,v)=>{if(v==null||v==='')return '—';if(htmlKeys.has(k))return String(v);return esc(typeof v==='number'?num(v):v)};
  return `<div class="scroll-x"><table class="rich-table"><thead><tr>${keys.map(k=>`<th>${esc(labels[k]||k)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td class="${k==='value'?'value':''}">${cellValue(k,r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function profileRows(items){return `<div class="profile-list">${items.filter(x=>x[1]!==null&&x[1]!==undefined&&x[1]!=='').map(([k,v])=>`<div class="profile-row"><span>${esc(k)}</span><span>${esc(Array.isArray(v)?v.join(' · '):v)}</span></div>`).join('')}</div>`}
function matchShotsValue(t,m){
  const own=ownClubInMatch(t,m);
  if(!own)return null;
  const aggregate=m?.aggregate?.[String(own.id)];
  if(aggregate?.shotsKnown)return finiteValue(aggregate.shots);
  const ps=(m?.players||[]).filter(p=>(!t?.club?.id||!p.clubId||String(p.clubId)===String(t.club.id))&&activePlayerForView(p));
  if(!ps.length||ps.some(p=>p.shotsKnown!==true))return null;
  return ps.reduce((sum,p)=>sum+num(p.shots),0);
}
function activePlayerForView(p){return num(p?.secondsPlayed)>0||num(p?.goals)!==0||num(p?.assists)!==0||num(p?.passAttempts)>0||num(p?.passesMade)>0||num(p?.tackleAttempts)>0||num(p?.tacklesMade)>0||num(p?.shots)>0||num(p?.saves)>0||num(p?.mom)>0||num(p?.redcards)>0||num(p?.fouls)>0;}
function matchMetricRow(t,m){const own=ownClubInMatch(t,m),opp=oppClubInMatch(t,m),ps=(m.players||[]).filter(p=>!t.club?.id||!p.clubId||String(p.clubId)===String(t.club.id));let passM=0,passA=0,tackleM=0,tackleA=0,rateSum=0,rateN=0,assists=0;for(const p of ps){passM+=num(p.passesMade);passA+=num(p.passAttempts);tackleM+=num(p.tacklesMade);tackleA+=num(p.tackleAttempts);assists+=num(p.assists);if(p.rating!=null&&num(p.rating)>0){rateSum+=num(p.rating);rateN++;}}const shots=matchShotsValue(t,m);return {date:shortDate(m.timestamp),opponent:opp?.name||'—',result:matchResult(t,m),score:`${num(own?.goals)}-${num(opp?.goals)}`,pass:passA?`${(100*passM/passA).toFixed(1)}%`:'—',tackle:tackleA?`${(100*tackleM/tackleA).toFixed(1)}%`:'—',rating:rateN?(rateSum/rateN).toFixed(2):'—',shots:shots==null?'—':shootingCount(shots),assists};}
function u5AnalysisPanel(t){const rows=(t?.recent5?.matches||[]).map(m=>matchMetricRow(t,m));const r=t?.recent5?.team||{},shoot=t?.shooting?.recent5||{};if(!rows.length)return empty('Nessuna partita nelle ultime 5.');const shots=shoot.complete&&finiteValue(shoot.shots)!=null?finiteValue(shoot.shots):null;const conversion=shots!=null&&shots>0?100*num(r.goals)/shots:null;const shotLabel=shots==null?'—':shootingCount(shots);return `<div class="card rich-card" style="margin-top:10px"><div class="table-caption">🔥 Analisi dettagliata ultime 5</div><div class="analytics-kpis">${stat(r.matches??rows.length,'Partite')}${stat(`${r.wins??0}-${r.draws??0}-${r.losses??0}`,'V-P-S')}${stat(num(r.goals),'Gol')}${stat(num(r.against),'Subiti')}${stat(r.assists??0,'Assist')}${stat(shotLabel,'Tiri squadra')}${stat(shootingRate(conversion),'Realizzazione')}${stat(r.cleanSheets??0,'Clean sheet squadra')}${stat(r.mom??0,'MOTM')}${stat(r.passRate==null?'—':num(r.passRate).toFixed(1)+'%','Passaggi')}${stat(r.tackleRate==null?'—':num(r.tackleRate).toFixed(1)+'%','Contrasti')}${stat(r.playerRatingAverage==null?'—':num(r.playerRatingAverage).toFixed(2),'Rating medio')}${stat(r.matchesWithPlayerStats??0,'Gare con dati player')}${stat(r.matches?num(r.goals/r.matches).toFixed(2):'—','Gol/media gara')}${stat(r.matches?num(r.against/r.matches).toFixed(2):'—','Subiti/media gara')}</div><div class="scroll-x" style="margin-top:9px"><table class="rich-table match-detail-table"><thead><tr><th>Data</th><th>Avversario</th><th>Esito</th><th>Risultato</th><th>Pass %</th><th>Tackle %</th><th>Rating</th><th>Tiri squadra</th><th>Assist</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.opponent)}</td><td>${resultLabel(x.result)}</td><td>${esc(x.score)}</td><td>${esc(x.pass)}</td><td>${esc(x.tackle)}</td><td>${esc(x.rating)}</td><td>${esc(x.shots)}</td><td>${x.assists}</td></tr>`).join('')}</tbody></table></div><div class="analytics-note">Tiri e realizzazione usano la nuova sorgente squadra: aggregate EA quando disponibile, altrimenti somma giocatori solo se il dato tiri è esplicito per tutti i giocatori attivi della partita.</div></div>`}
function polyline(values,x0,y0,w,h,minV,maxV){if(!values.length)return'';const span=maxV-minV||1;return values.map((v,i)=>`${x0+(values.length===1?w/2:w*i/(values.length-1))},${y0+h-(Number(v)-minV)/span*h}`).join(' ')}
function trendChart(t){const rows=Array.isArray(t?.matchTrend)?t.matchTrend:[];if(!rows.length)return `<div class="card rich-card"><div class="table-caption">📈 Andamento storico</div>${empty('Servono partite archiviate.')}</div>`;const data=rows.slice(-20),gf=data.map(x=>x.gf),ga=data.map(x=>x.ga),max=Math.max(1,...gf,...ga),gline=polyline(gf,34,18,548,150,0,max),aline=polyline(ga,34,18,548,150,0,max),formStrip=data.map(x=>`<span class="trend-form-pill ${x.result==='W'?'win':x.result==='L'?'loss':'draw'}" title="${esc(`${x.opponent} · ${x.gf}-${x.ga}`)}">${x.result}</span>`).join(''),dots=(vals,cls)=>vals.map((v,i)=>{const x=34+(vals.length===1?274:548*i/(vals.length-1)),y=168-(v/max)*150;return `<circle cx="${x}" cy="${y}" r="3" class="trend-dot-svg ${cls}"/>`}).join(''),last=data[data.length-1];return `<div class="card rich-card"><div class="table-caption">📈 Andamento storico · archivio partite</div><div class="trend-wrap"><svg class="trend-svg" viewBox="0 0 620 210" role="img" aria-label="Andamento gol fatti e subiti"><line x1="34" y1="18" x2="34" y2="168" class="trend-axis"/><line x1="34" y1="168" x2="582" y2="168" class="trend-axis"/><polyline points="${gline}" class="trend-line gf"/><polyline points="${aline}" class="trend-line ga"/>${dots(gf,'gf')}${dots(ga,'ga')}<text x="40" y="15" class="trend-label">0-${max} gol</text></svg><div class="trend-legend"><span>🟢 Gol fatti</span><span>🔵 Gol subiti</span><span>Sequenza risultati</span><div class="trend-form">${formStrip}</div></div></div><div class="analytics-kpis" style="margin-top:8px">${stat(last?.cumulativeGF??0,'Gol fatti archivio')}${stat(last?.cumulativeGA??0,'Gol subiti archivio')}${stat(last?.cumulativeGD??0,'Diff. reti archivio')}${stat(last?.cumulativePoints??0,'Punti archivio')}</div><div class="analytics-note">Andamento delle sole partite caricate; non sostituisce il totale storico.</div></div>`}
function profileScopeRows(scope,mode='totals'){
  if(!scope||typeof scope!=='object')return [];
  const has=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const rows=mode==='season' ? [
    ['Tiri totali stagione',scope.shots],
    ['Realizzazione stagione %',scope.goalConversionRate],
    ['Divisione attuale',scope.currentDivision],
    ['Presenze in lega',scope.leagueAppearances]
  ] : [
    ['Clean sheet',scope.cleanSheets],
    ['Punti',scope.points],
    ['Tiri totali storici',scope.shots],
    ['Realizzazione storica %',scope.goalConversionRate],
    ['Promozioni',scope.promotions],
    ['Retrocessioni',scope.relegations],
    ['Miglior divisione',scope.bestDivision],
    ['Partite playoff',scope.gamesPlayedPlayoff],
    ['Reputation tier',scope.reputationtier]
  ];
  return rows.filter(([,v])=>has(v)).map(([k,v])=>[k,num(v)]);
}
function teamProfileTables(t){
  const tp=t?.teamProfile||{},tot=tp?.totals||{},sea=tp?.season||{},ov=tp?.overallStats||{},ci=tp?.clubInfo||{};
  const scalar=(obj,keys)=>keys.map(([key,label])=>[label,obj?.[key]]);
  const overallRows=scalar(ov,[['skillRating','Skill rating'],['wstreak','Win streak'],['unbeatenstreak','Imbattibilità'],['leagueAppearances','League appearances'],['gamesPlayed','Partite'],['gamesPlayedPlayoff','Partite playoff'],['wins','Vittorie'],['draws','Pareggi'],['losses','Sconfitte'],['goals','Gol'],['goalsAgainst','Gol subiti'],['shots','Tiri totali'],['goalConversionRate','Realizzazione %'],['promotions','Promozioni'],['relegations','Retrocessioni'],['bestDivision','Miglior divisione'],['bestFinishGroup','Miglior piazzamento/gruppo'],['reputationtier','Reputation tier']]);
  const clubRows=scalar(ci,[['name','Nome club'],['clubId','Club ID'],['regionId','Region ID'],['teamId','Team ID'],['stadium','Stadio']]);
  const extraAchievement=tp?.playoffAchievements||null;
  const renderScope=(title,source,mode,emptyText,note)=>{
    const rows=profileScopeRows(source,mode);
    return `<div class="card rich-card"><div class="table-caption">${title}</div>${rows.length?profileRows(rows):`<div class="muted">${esc(emptyText)}</div>`}<div class="source-note">${esc(note)}</div></div>`;
  };
  return `<div class="rich-grid" style="margin-top:10px"><div class="grid2">${renderScope('🏆 Dati totali · campi aggiuntivi',tot,'totals','Nessun valore numerico disponibile nel file Dati totali.','Campi aggiuntivi esclusivi del profilo storico: non ripete Partite/Vittorie/Pareggi/Sconfitte/Gol/Gol subiti della tabella Totale storico.')}${renderScope('📅 Stagione corrente · campi disponibili',sea,'season','Nessun valore numerico disponibile nel file Stagione corrente.','Dati numerici della stagione corrente: non mostra i campi aggiuntivi storici del pannello Dati totali.')}</div><div class="grid2"><div class="card rich-card"><div class="table-caption">📊 Overall Stats</div>${profileRows(overallRows)}<div class="source-note">I codici recenti dell’export non vengono mostrati nell’interfaccia: restano disponibili nella memoria IA per confronti futuri.</div></div><div class="card rich-card"><div class="table-caption">🏟️ Informazioni club</div>${profileRows(clubRows)}</div></div>${extraAchievement?`<div class="card rich-card"><div class="table-caption">🏅 Playoff Achievements</div>${profileRows(Object.entries(extraAchievement))}</div>`:''}</div>`;
}

function teamPage(){
  const t=state.own;
  if(!t||!dataReady(t)) return shell('SQUADRA','Command Center',`<div class="hero"><div class="kicker">ARCHIVIO CENTRALE</div><h2>Dati non ancora caricati</h2><p>Carica i file disponibili. Il sito li salva centralmente.</p><button class="btn primary" data-goto="data">⚙️ Apri I tuoi dati</button></div>`);
  const parts=t.byCompetition||{},rq=t.rosterReconciliation||{},dq=t.dataQuality||{}; const platforms=[...new Set((t.players||[]).map(p=>p.platform).filter(Boolean))];
  return shell('SQUADRA',t.club?.name||'Sisal FC 2021',`
  <div class="hero"><div class="kicker">STORICO + FORMA</div><h2>${esc(t.club?.name||'Sisal FC 2021')}</h2><p>Totale storico dal file Dati totali; U5 dalle cinque gare più recenti dell'archivio. Dati aggiuntivi separati per sorgente.</p></div>
  <div class="grid2 compact-stat-sections"><div class="card"><div class="section-title"><b>📊 TOTALE STORICO</b></div>${totalTable(t)}</div><div class="card"><div class="section-title"><b>🔥 ULTIME 5</b><span class="tag">${t.recent5?.matches?.length||0}</span></div>${totalTable(t,'recent5')}</div></div>
  ${shootingAnalyticsPanel(t)}
  ${teamProfileTables(t)}
  <div class="analytics-grid" style="margin-top:10px">${trendChart(t)}</div>
  ${u5AnalysisPanel(t)}
  <div class="grid3" style="margin-top:10px">${['league','playoffs','friendlies'].map(k=>`<div class="card"><div class="section-title"><b>${competitionLabel(k)}</b><span class="tag">${parts[k]?.matches||0}</span></div><div class="muted">${parts[k]?.wins||0}V · ${parts[k]?.draws||0}P · ${parts[k]?.losses||0}S · ${parts[k]?.goals||0}-${parts[k]?.against||0}</div></div>`).join('')}</div>
  <div class="grid2" style="margin-top:10px"><div class="card"><h3>👥 Riconciliazione rosa</h3><div class="stats-grid">${stat(t.players?.length||0,'Giocatori visibili')}${stat(rq.matchOnlyCount||0,'Match-only')}${stat(rq.rosterOnlyCount||0,'Roster-only')}</div><div class="notice" style="margin-top:9px">I giocatori presenti nelle partite ma non nel file Giocatori <b>non vengono scartati</b>.${platforms.length?` Piattaforme lette: <b>${esc(platforms.join(' · '))}</b>.`:''}</div>${rq.matchOnlyPlayers?.length?`<div class="muted" style="margin-top:8px">Match-only: ${rq.matchOnlyPlayers.map(x=>esc(x.name)).join(', ')}</div>`:''}</div><div class="card"><h3>🛡️ Controllo automatico</h3><div class="section-title"><b>Affidabilità strutturale</b><span class="tag ${dq.ok?'live':'warn'}">${dq.score??'—'}/100</span></div>${dq.errors?.length?`<div class="message err">${dq.errors.map(x=>esc(x)).join('<br>')}</div>`:'<div class="message ok">✓ Nessun errore strutturale trovato nei dati caricati.</div>'}${dq.warnings?.length?`<div class="message" style="margin-top:7px">${dq.warnings.map(x=>esc(x)).join('<br>')}</div>`:''}</div></div>`
  )
}
function renderRecent(t,n=5,filter=''){const source=filter?(t?.matches||[]).filter(m=>m.competition===filter):(t?.matches||[]);const ms=source.slice(0,n);if(!ms.length)return empty('Nessuna partita disponibile.');return `<div class="rank-list">${ms.map(m=>{const op=oppClubInMatch(t,m),r=matchResult(t,m);return `<div class="rank-row"><div class="rank-no ${r==='W'?'f-win':r==='L'?'f-loss':'f-draw'}">${r}</div><div><b>${esc(op?.name||'Avversario')}</b><small>${competitionLabel(m.competition)} · ${shortDate(m.timestamp)}</small></div><div class="rank-val">${num(ownClubInMatch(t,m)?.goals)}-${num(op?.goals)}</div></div>`}).join('')}</div>`}
function dataStatusMini(t){const fs=t?.fileStatus||{};return `<div class="rank-list">${DATA_FILES.map(([k,l])=>`<div class="rank-row"><div class="rank-no">${fs[k]?.present?'✓':'—'}</div><div><b>${l}</b><small>${esc(fs[k]?.fileName||'File non caricato')}</small></div><div class="rank-val">${fs[k]?.present?'OK':'Manca'}</div></div>`).join('')}</div>`}
function playersPage(){
  const t=state.own;
  if(!dataReady(t)) return shell('GIOCATORI','Statistiche individuali',empty('Carica i dati della tua squadra.'));
  const ps=t.players||[];
  const rowName=p=>`<button class="player-link" data-player="${esc(p.id||'')}"><b class="name">${esc(p.name)}</b><small>${esc(p.position||'Posizione n/d')}</small></button>`;
  const recentRows=ps.map(p=>{const r=p.recent5||null;return {player:rowName(p),games:r?.appearances??null,goals:r?.goals??null,assists:r?.assists??null,rating:r?.rating==null?null:num(r.rating).toFixed(2),shots:r?.shots??null,passes:r?`${num(r.passesMade)}/${num(r.passAttempts)}`:null,tackles:r?`${num(r.tacklesMade)}/${num(r.tackleAttempts)}`:null,saves:r?.saves??null,clean:r?.cleanSheets??null,mom:r?.mom??null,reds:r?.redcards??null,minutes:r?.secondsPlayed==null?null:(num(r.secondsPlayed)/60).toFixed(1)}});
  const seasonRows=ps.map(p=>({player:rowName(p),ovr:p.ovr==null?null:num(p.ovr),games:p.games==null?null:num(p.games),win:p.winRate==null?null:`${num(p.winRate)}%`,goals:num(p.goals),assists:num(p.assists),ga:p.goalInvolvementPerGame==null?null:num(p.goalInvolvementPerGame).toFixed(2),rating:p.rating==null?null:num(p.rating).toFixed(2),idx:p.performanceIndex==null?null:`${num(p.performanceIndex)}/100`,form:p.recent5Index==null?null:`${num(p.recent5Index)}/100`,mom:num(p.mom),reds:num(p.redcards),u5g:Array.isArray(p.previousGoals)?p.previousGoals.slice(0,5).join(' · '):null}));
  const techRows=ps.map(p=>{
    const r=p.recent5||null;
    const hasRecent=Boolean(r&&num(r.appearances)>0);
    const shots=hasRecent?num(r.shots):null;
    const goals=hasRecent?num(r.goals):null;
    const passMade=hasRecent?num(r.passesMade):null;
    const passAttempts=hasRecent?num(r.passAttempts):null;
    const tackleMade=hasRecent?num(r.tacklesMade):null;
    const tackleAttempts=hasRecent?num(r.tackleAttempts):null;
    return {
      player:rowName(p),
      apps:hasRecent?num(r.appearances):null,
      shots,
      conversion:shots!=null&&shots>0&&goals!=null?`${(100*goals/shots).toFixed(1)}%`:null,
      pass:hasRecent?`${passMade}/${passAttempts}`:null,
      passPct:passAttempts!=null&&passAttempts>0?`${(100*passMade/passAttempts).toFixed(1)}%`:null,
      tackles:hasRecent?`${tackleMade}/${tackleAttempts}`:null,
      tacklePct:tackleAttempts!=null&&tackleAttempts>0?`${(100*tackleMade/tackleAttempts).toFixed(1)}%`:null,
      saves:hasRecent?num(r.saves):null,
      cleanDef:hasRecent?(r.cleanSheetsDef==null?0:num(r.cleanSheetsDef)):null,
      cleanGK:hasRecent?(r.cleanSheetsGK==null?0:num(r.cleanSheetsGK)):null,
      clean:hasRecent?num(r.cleanSheets):null,
      reds:hasRecent?num(r.redcards):null,
      fouls:hasRecent&&r.fouls!=null?num(r.fouls):null
    };
  });
  const profileRowsData=ps.map(p=>({player:rowName(p),pro:p.proName||null,posCode:p.proPosCode==null?null:num(p.proPosCode),style:p.proStyle==null?null:num(p.proStyle),height:p.proHeight==null?null:`${num(p.proHeight)} cm`,nationality:p.proNationality==null?null:num(p.proNationality),favorite:p.favoritePosition||p.position||null,platform:p.platform||null}));
  const careerRows=ps.map(p=>{const c=p.career||{};return {player:rowName(p),games:c.games==null?null:num(c.games),goals:c.goals==null?null:num(c.goals),assists:c.assists==null?null:num(c.assists),mom:c.mom==null?null:num(c.mom),rating:c.rating==null?null:num(c.rating).toFixed(2),position:c.favoritePosition||null,proPos:c.proPosCode==null?null:num(c.proPosCode)}});
  const calculatedRows=ps.map(p=>({player:rowName(p),gpg:p.goalsPerGame==null?null:num(p.goalsPerGame).toFixed(2),apg:p.assistsPerGame==null?null:num(p.assistsPerGame).toFixed(2),gipg:p.goalInvolvementPerGame==null?null:num(p.goalInvolvementPerGame).toFixed(2),spg:p.shotsPerGame==null?null:num(p.shotsPerGame).toFixed(2),shpg:p.shots!=null&&num(p.goals)>0?(num(p.shots)/num(p.goals)).toFixed(2):null,conv:num(p.shots)>0?((100*num(p.goals)/num(p.shots)).toFixed(1)+'%'):null,ppg:p.passPerGame==null?null:num(p.passPerGame).toFixed(2),tpg:p.tacklePerGame==null?null:num(p.tacklePerGame).toFixed(2),csr:p.cleanSheetRate==null?null:(num(p.cleanSheetRate).toFixed(1)+'%'),u5g:Array.isArray(p.previousGoals)?p.previousGoals.slice(0,5).join(' · '):null}));
  const exportRows=ps.map(p=>({player:rowName(p),ovr:p.ovr==null?null:num(p.ovr),games:p.games==null?null:num(p.games),win:p.winRate==null?null:`${num(p.winRate)}%`,goals:num(p.goals),assists:num(p.assists),rating:p.rating==null?null:num(p.rating).toFixed(2),shots:p.shots==null?null:num(p.shots),shotPct:p.shotAccuracy==null?null:`${num(p.shotAccuracy)}%`,passMade:num(p.passesMade),passAtt:p.passAttempts==null?null:num(p.passAttempts),passPct:p.passAccuracy==null?null:`${num(p.passAccuracy)}%`,tackleMade:num(p.tacklesMade),tackleAtt:p.tackleAttempts==null?null:num(p.tackleAttempts),tacklePct:p.tackleSuccess==null?null:`${num(p.tackleSuccess)}%`,saves:num(p.saves),csDef:p.cleanSheetsDef==null?null:num(p.cleanSheetsDef),csGK:p.cleanSheetsGK==null?null:num(p.cleanSheetsGK),mom:num(p.mom),reds:num(p.redcards),fouls:p.fouls==null?null:num(p.fouls),u5g:Array.isArray(p.previousGoals)?p.previousGoals.slice(0,5).join(' · '):null}));
  return shell('GIOCATORI','Statistiche individuali',`
    <div class="toolbar"><div class="field"><label>Ricerca</label><input id="playerSearch" placeholder="Nome giocatore..."></div><div class="field"><label>Reparto</label><select id="playerDept"><option value="">Tutti</option><option value="GK">Portieri</option><option value="DEF">Difensori</option><option value="MID">Centrocampisti</option><option value="ATT">Attaccanti</option></select></div></div>
    <div class="notice" style="margin-bottom:10px"><b>STAGIONE / CUMULATIVO:</b> dati dal file Giocatori. L'OVR è quello esportato dal file, mentre l'Indice è un indicatore interno 0–100.</div>
    ${t.teamProfile?.playerPositionCount?`<div class="card rich-card" style="margin-bottom:10px"><div class="table-caption">🧩 Composizione rosa dal file Giocatori</div>${profileRows(Object.entries(t.teamProfile.playerPositionCount).map(([k,v])=>[k,v]))}</div>`:''}
    <div class="card rich-card"><div class="table-caption">👤 Prestazioni principali + indice</div>${richTable(seasonRows,{keys:['player','ovr','games','win','goals','assists','ga','rating','idx','form','mom','reds','u5g'],labels:{player:'Giocatore',ovr:'OVR',games:'PG',win:'Win %',goals:'Gol',assists:'Assist',ga:'G+A/PG',rating:'Voto',idx:'Indice',form:'Forma U5',mom:'MOTM',reds:'Rossi',u5g:'Forma gol export (5)'}})}<div class="analytics-note">Indice 0–100: 60% cumulativo + 40% U5 quando disponibile; pesi adattati al reparto. Non è l'OVR EA.</div></div>
    <div class="card rich-card" style="margin-top:10px"><div class="table-caption">🎯 Tecnica e difesa · ultime 5 partite</div>${richTable(techRows,{keys:['player','apps','shots','conversion','pass','passPct','tackles','tacklePct','saves','cleanDef','cleanGK','clean','reds','fouls'],labels:{player:'Giocatore',apps:'PG U5',shots:'Tiri U5',conversion:'Gol/Tiri %',pass:'Passaggi U5',passPct:'Pass % U5',tackles:'Contrasti U5',tacklePct:'Tackle % U5',saves:'Parate U5',cleanDef:'CS dif. U5',cleanGK:'CS GK U5',clean:'CS tot. U5',reds:'Rossi U5',fouls:'Falli U5'}})}<div class="analytics-note">Solo le ultime 5 partite archiviate. Tiri, passaggi, contrasti, parate e clean sheet sono aggregati dalle gare U5; le percentuali di passaggi e tackle sono ricalcolate dai tentativi U5. “Gol/Tiri %” è la realizzazione U5, non la percentuale di precisione al tiro del file cumulativo. Quando un giocatore non compare nelle U5 viene mostrato “—”, non “0”.</div></div>
    <div class="card rich-card" style="margin-top:10px"><div class="table-caption">🧮 Rapporti per partita</div>${richTable(calculatedRows,{keys:['player','gpg','apg','gipg','spg','shpg','conv','ppg','tpg','csr','u5g'],labels:{player:'Giocatore',gpg:'Gol/PG',apg:'Assist/PG',gipg:'G+A/PG',spg:'Tiri/PG',shpg:'Tiri/Gol',conv:'Realizzazione %',ppg:'Pass/PG',tpg:'Tackle/PG',csr:'CS/PG',u5g:'Forma gol export (5)'}})}<div class="analytics-note">Rapporti calcolati nello stesso scope delle statistiche di base.</div></div>
    <div class="card rich-card" style="margin-top:10px"><div class="table-caption">📋 Tutti i principali valori dell'export giocatori</div>${richTable(exportRows,{keys:['player','ovr','games','win','goals','assists','rating','shots','shotPct','passMade','passAtt','passPct','tackleMade','tackleAtt','tacklePct','saves','csDef','csGK','mom','reds','fouls','u5g'],labels:{player:'Giocatore',ovr:'OVR',games:'PG',win:'Win %',goals:'Gol',assists:'Assist',rating:'Voto',shots:'Tiri',shotPct:'Realizzazione export %',passMade:'Pass riusciti',passAtt:'Tentativi',passPct:'Pass %',tackleMade:'Tackle riusciti',tackleAtt:'Tentativi',tacklePct:'Tackle %',saves:'Parate',csDef:'CS dif.',csGK:'CS GK',mom:'MOTM',reds:'Rossi',fouls:'Falli',u5g:'Forma gol export (5)'}})}<div class="analytics-note">Questa tabella raccoglie i principali campi numerici presenti nell'export reale. I 5 valori di forma mostrati derivano dai primi 5 campi prevGoals dell'export, senza reinterpretarne l'ordine. I codici non interpretati restano nei dati sorgente per l'IA.</div></div>
    <div class="card rich-card" style="margin-top:10px"><div class="table-caption">🧬 Profilo Pro</div>${richTable(profileRowsData,{keys:['player','pro','posCode','style','height','nationality','favorite','platform'],labels:{player:'Giocatore',pro:'Pro name',posCode:'ProPos',style:'ProStyle',height:'Altezza',nationality:'Nazionalità',favorite:'Posizione',platform:'Piattaforma'}})}<div class="source-note">I codici ProPos/ProStyle/Nazionalità vengono mostrati come presenti nel file.</div></div>
    <div class="card rich-card" style="margin-top:10px"><div class="table-caption">📈 Carriera giocatori</div>${richTable(careerRows,{keys:['player','games','goals','assists','mom','rating','position','proPos'],labels:{player:'Giocatore',games:'PG carriera',goals:'Gol',assists:'Assist',mom:'MOTM',rating:'Rating',position:'Posizione',proPos:'ProPos'}})}</div>
    <div class="notice" style="margin:12px 0 10px"><b>ULTIME 5 PARTITE:</b> solo le cinque gare archiviate più recenti.</div>
    <div class="card rich-card">${richTable(recentRows,{keys:['player','games','goals','assists','rating','shots','passes','tackles','saves','clean','mom','reds','minutes'],labels:{player:'Giocatore',games:'PG U5',goals:'Gol U5',assists:'Assist U5',rating:'Voto',shots:'Tiri',passes:'Pass',tackles:'Tackle',saves:'Parate',clean:'CS',mom:'MOTM',reds:'Rossi',minutes:'Minuti'}})}</div>`);
}
function topPage(){const t=state.own;if(!dataReady(t))return shell('TOP 3','Classifiche',empty('Carica i dati della squadra.'));const p=t.recent5?.players||[],eligible=p.filter(x=>num(x.appearances||x.games)>0),pass=[...eligible].map(x=>({...x,passAccuracy:x.passAttempts>0?pct(x.passesMade,x.passAttempts):x.passAccuracy})).filter(x=>x.passAccuracy!=null).sort((a,b)=>num(b.passAccuracy)-num(a.passAccuracy)),tackle=[...eligible].map(x=>({...x,tackleSuccess:x.tackleAttempts>0?pct(x.tacklesMade,x.tackleAttempts):x.tackleSuccess})).filter(x=>x.tackleSuccess!=null).sort((a,b)=>num(b.tackleSuccess)-num(a.tackleSuccess));const box=(title,arr,key,unit='',decimals=0)=>`<div class="card"><h3>${title}</h3><div class="rank-list">${arr.slice(0,3).map((x,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div><b>${esc(x.name)}</b><small>${esc(x.position||'')} · ULTIME 5</small></div><div class="rank-val">${num(x[key]).toFixed(decimals)}${unit}</div></div>`).join('')}</div></div>`;return shell('TOP 3','Classifiche · ultime 5 partite',`<div class="notice" style="margin-bottom:10px"><b>SOLO ULTIME 5:</b> questa sezione usa esclusivamente le 5 partite archiviate più recenti. Non usa i cumulativi del file Giocatori.</div><div class="grid2">${box('⚽ Gol U5',[...eligible].sort((a,b)=>num(b.goals)-num(a.goals)),'goals')}${box('🎯 Assist U5',[...eligible].sort((a,b)=>num(b.assists)-num(a.assists)),'assists')}${box('⭐ Rating U5',[...eligible].filter(x=>num(x.appearances)>=2&&x.rating!=null).sort((a,b)=>num(b.rating)-num(a.rating)),'rating','',2)}${box('🎯 Pass accuracy U5',pass,'passAccuracy','%',1)}${box('🛡️ Tackle success U5',tackle,'tackleSuccess','%',1)}</div>`)}
function playerModal(id){const t=state.own;if(!t)return;const p=(t.players||[]).find(x=>String(x.id)===String(id))||(t.players||[]).find(x=>String(x.name)===String(id));if(!p)return;const r=p.recent5||null,c=p.career||null;const prev=Array.isArray(p.previousGoals)?p.previousGoals.filter(v=>v!=null).join(' · '):'';el('modalRoot').innerHTML=`<div class="modal"><div class="modal-inner"><div class="modal-head"><div><div class="kicker">GIOCATORE</div><h2 style="margin:4px 0 0">${esc(p.name)}</h2><div class="muted">${esc(p.position||'Posizione n/d')} · OVR ${p.ovr==null?'—':num(p.ovr)}${p.proName?` · ${esc(p.proName)}`:''}</div></div><button class="close" id="closeModal">✕</button></div><div class="stats-grid">${stat(p.ovr==null?'—':num(p.ovr),'OVR')}${stat(p.games==null?'—':num(p.games),'PG stagione')}${stat(num(p.goals),'Gol stagione')}${stat(num(p.assists),'Assist stagione')}${stat(p.rating==null?'—':num(p.rating).toFixed(2),'Rating')}${stat(p.winRate==null?'—':num(p.winRate)+'%','Win rate')}${stat(p.shots==null?'—':num(p.shots),p.shotsEstimated?'Tiri stimati':'Tiri')}${stat(num(p.goals)>0?num(p.shots)/num(p.goals).toFixed(2):'—','Tiri/Gol')}${stat(num(p.shots)>0?(100*num(p.goals)/num(p.shots)).toFixed(1)+'%':'—','Realizzazione')}${stat(p.shotAccuracy==null?'—':num(p.shotAccuracy)+'%','Realizzazione export %')}${stat(p.passAccuracy==null?'—':num(p.passAccuracy)+'%','Pass %')}${stat(p.tackleSuccess==null?'—':num(p.tackleSuccess)+'%','Tackle %')}${stat(num(p.cleanSheets),'Clean sheet')}${stat(num(p.mom),'MOTM')}${stat(num(p.redcards),'Rossi')}${stat(p.proHeight==null?'—':num(p.proHeight)+' cm','Altezza')}${stat(p.proPosCode==null?'—':num(p.proPosCode),'ProPos')}${stat(p.proStyle==null?'—':num(p.proStyle),'ProStyle')}</div>${r?`<div class="notice" style="margin:12px 0 10px"><b>ULTIME 5</b></div><div class="stats-grid">${stat(r.appearances,'PG U5')}${stat(r.goals,'Gol U5')}${stat(r.assists,'Assist U5')}${stat(r.rating==null?'—':num(r.rating).toFixed(2),'Rating U5')}${stat(r.shots,'Tiri U5')}${stat(r.passAttempts?`${r.passesMade}/${r.passAttempts}`:'—','Pass U5')}${stat(r.tackleAttempts?`${r.tacklesMade}/${r.tackleAttempts}`:'—','Tackle U5')}${stat(r.saves,'Parate U5')}${stat(r.cleanSheets,'CS U5')}${stat(r.mom,'MOTM U5')}${stat(r.redcards,'Rossi U5')}${stat(r.secondsPlayed==null?'—':(num(r.secondsPlayed)/60).toFixed(1),'Minuti U5')}</div>`:''}${c?`<div class="notice" style="margin:12px 0 10px"><b>CARRIERA</b></div><div class="stats-grid">${stat(c.games==null?'—':num(c.games),'PG carriera')}${stat(c.goals,'Gol carriera')}${stat(c.assists,'Assist carriera')}${stat(c.mom,'MOTM carriera')}${stat(c.rating==null?'—':num(c.rating).toFixed(2),'Rating carriera')}</div>`:''}<div class="card" style="margin-top:10px"><div class="table-caption">🧾 Altri dati esportati</div>${profileRows([['Posizione preferita',p.favoritePosition||p.position||null],['Pro name',p.proName||null],['Nazionalità codice',p.proNationality],['Piattaforma',p.platform],['Goal precedenti',prev||null]])}</div></div></div>`;const close=el('closeModal');if(close)close.onclick=()=>{el('modalRoot').innerHTML=''};el('modalRoot').onclick=e=>{if(e.target?.classList?.contains('modal'))el('modalRoot').innerHTML=''}}

function openPitchSlotEditor(slot){
  const t=state.own;if(!t)return;
  const roles=FORM_ROWS[state.formation]||[];const role=roles[slot]||'Posizione';const assigned=state.lineups[state.formation]||{};const currentId=String(assigned[slot]||'');const players=[...(t.players||[])];
  const listHtml=(query='')=>{const q=String(query||'').trim().toLowerCase();const filtered=players.filter(p=>!q||String(p.name||'').toLowerCase().includes(q)||String(p.position||'').toLowerCase().includes(q));return `<div class="rank-row" style="cursor:pointer" data-pitch-player=""><div class="rank-no">—</div><div><b>Nessun giocatore</b><small>Lascia ${esc(role)} vuoto</small></div><div class="rank-val">${currentId?'': '✓'}</div></div>${filtered.map(p=>`<div class="rank-row" style="cursor:pointer" data-pitch-player="${esc(p.id)}"><div class="rank-no">⚽</div><div><b>${esc(p.name)}</b><small>${esc(p.position||'Posizione n/d')} · OVR ${p.ovr==null?'—':num(p.ovr)}</small></div><div class="rank-val">${String(p.id)===currentId?'✓':''}</div></div>`).join('')}`};
  el('modalRoot').innerHTML=`<div class="modal"><div class="modal-inner"><div class="modal-head"><div><div class="kicker">CAMPO · ${esc(state.formation)}</div><h2 style="margin:4px 0 0">${esc(role)}</h2><div class="muted">Tocca un giocatore per assegnarlo direttamente a questo pallino.</div></div><button class="close" id="closePitchModal">✕</button></div><div class="field"><label>Cerca giocatore</label><input id="pitchPlayerSearch" type="search" placeholder="Nome giocatore…" autocomplete="off"></div><div class="rank-list" id="pitchPlayerList" style="margin-top:9px"></div></div></div>`;
  const list=el('pitchPlayerList'),search=el('pitchPlayerSearch');
  const close=()=>{el('modalRoot').innerHTML=''};
  const renderList=()=>{if(list)list.innerHTML=listHtml(search?.value||'');document.querySelectorAll('[data-pitch-player]').forEach(b=>b.onclick=()=>{state.lineups[state.formation] ||= {};const id=String(b.dataset.pitchPlayer||'');if(id)state.lineups[state.formation][String(slot)]=id;else delete state.lineups[state.formation][String(slot)];jset(K.lineups,state.lineups);close();render()})};
  if(search)search.oninput=renderList;if(el('closePitchModal'))el('closePitchModal').onclick=close;el('modalRoot').onclick=e=>{if(e.target?.classList?.contains('modal'))close()};renderList();if(search)search.focus();
}

function shufflePlayers(list){const out=[...(list||[])];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function autoLineup(){const t=state.own;if(!dataReady(t)||!t.players?.length)return;const formationNames=Object.keys(FORM_ROWS);state.formation=formationNames[Math.floor(Math.random()*formationNames.length)]||'4-1-2-1-2 Narrow';const roles=FORM_ROWS[state.formation],remaining=shufflePlayers(t.players),assigned={},used=new Set();roles.forEach((role,i)=>{const candidates=remaining.filter(p=>!used.has(String(p.id))&&playerRoleMatch(p.position||p.favoritePosition||'',role));const fallback=remaining.filter(p=>!used.has(String(p.id))&&department(p.position||p.favoritePosition||'')===department(role));const pool=candidates.length?candidates:(fallback.length?fallback:remaining.filter(p=>!used.has(String(p.id))));const chosen=pool[Math.floor(Math.random()*pool.length)];if(chosen){used.add(String(chosen.id));assigned[i]=chosen.id}});state.lineups[state.formation]=assigned;jset(K.formation,state.formation);jset(K.lineups,state.lineups);render();showToast(`🎲 Auto-formazione casuale · ${state.formation}`)}
function applyAIFormation(){const rec=state.aiFormationRecommendation;if(!rec||!FORM_ROWS[rec.formation]){showToast('Nessuna formazione IA valida da applicare.',true);return}const assigned={};for(const item of rec.placements||[]){const slot=Number(item.slot);if(Number.isInteger(slot)&&slot>=0&&slot<11)assigned[slot]=String(item.playerId)}state.formation=rec.formation;state.lineups[state.formation]=assigned;jset(K.formation,state.formation);jset(K.lineups,state.lineups);render();showToast(`✓ Formazione IA applicata · ${rec.formation}`)}
function aiFormationHtml(){const rec=state.aiFormationRecommendation;if(!rec)return '';const rows=(rec.placements||[]).map(x=>`<div class="rank-row"><div class="rank-no">${x.slot+1}</div><div><b>${esc(x.playerName)}</b><small>${esc(x.role)}</small></div><div class="rank-val">✓</div></div>`).join('');const strengths=rec.strengths?.length?`<div class="notice" style="margin-top:8px"><b>Punti forti:</b><br>${rec.strengths.map(x=>esc(x)).join('<br>')}</div>`:'';const cautions=rec.cautions?.length?`<div class="notice" style="margin-top:8px"><b>Attenzioni:</b><br>${rec.cautions.map(x=>esc(x)).join('<br>')}</div>`:'';const adjustments=rec.adjustments?.length?`<div class="notice" style="margin-top:8px"><b>🔧 Adattamenti automatici:</b><br>${rec.adjustments.map(x=>esc(x)).join('<br>')}</div>`:'';return `<div class="card" style="margin-top:10px"><div class="section-title"><b>🤖 Consiglio formazione IA</b><span class="tag live">${esc(rec.formation)}</span></div><div class="rank-list">${rows}</div><div class="notice" style="margin-top:8px"><b>Perché:</b> ${esc(rec.rationale||'')}</div>${adjustments}${strengths}${cautions}<button class="btn primary" id="applyAIFormation" style="margin-top:9px">✅ Applica questa formazione</button></div>`}

function pitchPage(){const t=state.own;if(!dataReady(t))return shell('CAMPO','Formazione',empty('Carica prima i giocatori.'));const roles=FORM_ROWS[state.formation]||FORM_ROWS['4-1-2-1-2 Narrow'],assigned=state.lineups[state.formation]||{},coords=pitchCoordinates(roles);return shell('CAMPO','Formazione e tattiche',`<div class="notice" style="margin-bottom:10px"><b>Posizioni coerenti con il modulo:</b> le pedine seguono il ruolo previsto dal modulo selezionato.</div><div class="pitch-layout"><div class="pitch-card"><div class="pitch"><div class="box-line top"></div><div class="box-line bottom"></div>${roles.map((role,i)=>{const p=t.players.find(x=>String(x.id)===String(assigned[i])),c=coords[i]||{x:50,y:50};return `<button class="dot" type="button" data-pitch-slot="${i}" style="left:${c.x}%;top:${c.y}%" title="Tocca per cambiare giocatore"><span>${esc(p?.name||role)}</span><em>${esc(role)} · tocca</em></button>`}).join('')}</div></div><div class="card"><div class="field"><label>Modulo</label><select id="formation">${Object.keys(FORM_ROWS).map(f=>`<option value="${esc(f)}" ${f===state.formation?'selected':''}>${esc(f)}</option>`).join('')}</select></div><div class="two-actions" style="margin-top:9px"><button class="btn" id="autoLineup">🎲 Auto-formazione casuale</button><button class="btn" id="clearLineup">Pulisci</button></div><div class="notice" style="margin-top:9px">🎲 La prima usa una selezione casuale ma cerca di mantenere i giocatori nei ruoli compatibili.</div>${roles.map((role,i)=>`<div class="field" style="margin-top:7px"><label>${role}</label><select data-slot="${i}"><option value="">—</option>${t.players.map(p=>`<option value="${esc(p.id)}" ${String(assigned[i])===String(p.id)?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>`).join('')}</div></div>`)}
function matchesPage(){const t=state.own;if(!dataReady(t))return shell('PARTITE','Archivio',empty('Carica i dati della squadra.'));const ms=(t.matches||[]).filter(m=>!state.matchFilter||m.competition===state.matchFilter);const domId=m=>`det_${String(m.competition||'x')}_${String(m.id||'x')}`.replace(/[^a-zA-Z0-9_-]/g,'_');return shell('PARTITE','Archivio completo',`<div class="notice" style="margin-bottom:10px"><b>ARCHIVIO PARTITE:</b> ${t.overall?.matches||0} partite totali nelle categorie realmente caricate. Questa lista è la fonte della finestra U5 e non modifica le statistiche cumulative.</div><div class="toolbar"><div class="field"><label>Competizione</label><select id="matchFilter"><option value="">Tutte</option><option value="league" ${state.matchFilter==='league'?'selected':''}>Campionato</option><option value="playoffs" ${state.matchFilter==='playoffs'?'selected':''}>Playoff</option><option value="friendlies" ${state.matchFilter==='friendlies'?'selected':''}>Amichevoli</option></select></div></div><div class="muted">${ms.length} partite archiviate.</div><div class="match-grid" style="margin-top:9px">${ms.map(m=>{const own=ownClubInMatch(t,m),op=oppClubInMatch(t,m),r=matchResult(t,m),ps=(m.players||[]).filter(p=>!t.club?.id||String(p.clubId)===String(t.club.id)),id=domId(m);return `<article class="match-card"><div class="match-top"><span>${competitionLabel(m.competition)} · ${formatDate(m.timestamp)}</span><span>#${esc(m.id)}</span></div><div class="score-grid"><div class="team-side"><b>${esc(own?.name||t.club.name)}</b></div><strong class="score-big">${num(own?.goals)}-${num(op?.goals)}</strong><div class="team-side"><b>${esc(op?.name||'Avversario')}</b></div></div><span class="result-pill ${resultClass(r)}">${resultLabel(r)}</span>${ps.length?`<button class="btn" data-match="${esc(id)}" style="margin-top:10px;width:100%">Statistiche partita</button><div class="match-detail hidden" id="${esc(id)}"><div class="table-wrap"><table><thead><tr><th>Giocatore</th><th>Gol</th><th>Assist</th><th>Voto</th><th>Tiri</th><th>Pass</th><th>Tackle</th><th>Parate</th><th>Gol subiti</th><th>CS</th><th>Rossi</th><th>Minuti</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.goals||0}</td><td>${p.assists||0}</td><td>${p.rating==null?'—':num(p.rating).toFixed(2)}</td><td>${p.shots==null?'—':num(p.shots)}</td><td>${p.passAttempts?`${p.passesMade}/${p.passAttempts}`:'—'}</td><td>${p.tackleAttempts?`${p.tacklesMade}/${p.tackleAttempts}`:'—'}</td><td>${p.saves==null?'—':num(p.saves)}</td><td>${p.goalsConceded==null?'—':num(p.goalsConceded)}</td><td>${p.cleanSheets==null?'—':num(p.cleanSheets)}</td><td>${p.redcards==null?'—':num(p.redcards)}</td><td>${p.secondsPlayed==null?'—':(num(p.secondsPlayed)/60).toFixed(1)}</td></tr>`).join('')}</tbody></table></div></div>`:''}</article>`}).join('')}</div>`)}
function funPage(){
  const t=state.own;
  if(!dataReady(t)) return shell('FUN','Fun · Club Wrapped',empty('Carica i dati della squadra.'));
  const f=t.fun||{},rec=f.records||[],flags=f.redFlags||[],form=f.form||[],sum=f.recent5Summary||{},impact=f.impactTop3||[],hot=f.recentHot,cold=f.recentCold,streak=f.currentFormStreak;
  const formLabel={W:'V',D:'P',L:'S'};
  return shell('FUN','Fun · Club Wrapped',`
    <div class="hero"><div class="kicker">ISPIRATA A FORM · SUPERLATIVI · RED FLAGS · IMPACT · WRAPPED</div><h2>La pagina dove si scopre chi sta davvero portando il club</h2><p>I record sono calcolati deterministicamente dai file caricati. La IA aggiunge solo interpretazione e banter leggero basato sui numeri.</p></div>
    <div class="card"><div class="section-title"><b>🔥 FORMA ULTIME 5 PARTITE ARCHIVIATE</b><span class="tag">${sum.matches||form.length||0} / 5</span></div><div class="form">${form.length?form.map((x,i)=>`<b class="form-pill ${resultClass(x)}">${formLabel[x]||x}</b>`).join(''):'<span class="muted">Nessuna partita archiviata.</span>'}</div><div class="notice" style="margin-top:9px">${sum.wins||0} vittorie · ${sum.draws||0} pareggi · ${sum.losses||0} sconfitte · ${sum.goals||0}-${sum.against||0}${streak?` · striscia attuale: <b>${streak.count} ${streak.result==='W'?'vittorie':streak.result==='L'?'sconfitte':'pareggi'}</b>`:''}</div></div>
    <div class="stats-grid" style="margin-top:10px">${stat(sum.goals||0,'Gol U5')}${stat(sum.against||0,'Subiti U5')}${stat(sum.winRate?num(sum.winRate).toFixed(1)+'%':'—','Win rate U5')}${stat(sum.playerRatingAverage?num(sum.playerRatingAverage).toFixed(2):'—','Rating medio U5')}</div>
    <div class="card" style="margin-top:10px"><div class="section-title"><b>🏆 Superlativi & record</b><span class="tag">cumulativo + archivio</span></div><div class="grid2">${rec.map(x=>`<div class="rank-row"><div class="rank-no">★</div><div><b>${esc(x.title)}</b><small>${esc(x.subtitle||'')}</small></div><div class="rank-val">${esc(x.value)}</div></div>`).join('')}</div>${!rec.length?empty('Servono più dati per generare i record.'):''}</div>
    <div class="card" style="margin-top:10px"><div class="section-title"><b>💪 Who Carries Who? · Impact Score U5</b><span class="tag">0–100 · metrica interna</span></div><p class="muted">Indice interno costruito su rating, gol+assist, MOM, precisione passaggi/contrasti e contributo difensivo nelle ultime 5. Non è una statistica EA ufficiale.</p><div class="rank-list">${impact.map((x,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div><b>${esc(x.name)}</b><small>${esc(x.position||'')} · ${x.appearances} PG U5 · ${x.goals} gol · ${x.assists} assist</small></div><div class="rank-val">${x.score}</div></div>`).join('')}</div>${!impact.length?empty('Nessun giocatore con presenza attiva nelle ultime 5.'):''}</div>
    <div class="grid2" style="margin-top:10px"><div class="card"><h3>🔥 Hot player U5</h3>${hot?`<div class="hero-mini"><b>${esc(hot.name)}</b><div>${hot.score}/100 impact · rating ${hot.rating==null?'—':num(hot.rating).toFixed(2)}</div></div>`:empty('Non calcolabile')}</div><div class="card"><h3>🧊 Cold player U5</h3>${cold?`<div class="hero-mini"><b>${esc(cold.name)}</b><div>${cold.score}/100 impact · rating ${cold.rating==null?'—':num(cold.rating).toFixed(2)}</div></div>`:empty('Non calcolabile')}</div></div>
    <div class="grid2" style="margin-top:10px"><div class="card"><h3>🚨 Red Flags</h3>${flags.length?`<div class="rank-list">${flags.map(x=>`<div class="rank-row"><div class="rank-no">!</div><div><b>${esc(x.title)}</b><small>${esc(x.subtitle||'')}</small></div><div class="rank-val">${esc(x.value)}</div></div>`).join('')}</div>`:empty('Nessuna red flag rilevata dal dataset.')}</div><div class="card"><h3>🎲 Statistiche da bar</h3><div class="rank-list"><div class="rank-row"><div class="rank-no">⚽</div><div><b>Bomber U5</b><small>solo ultime 5</small></div><div class="rank-val">${esc(f.u5Bomber||'—')}</div></div><div class="rank-row"><div class="rank-no">🎯</div><div><b>Assistman U5</b><small>solo ultime 5</small></div><div class="rank-val">${esc(f.u5Assistman||'—')}</div></div><div class="rank-row"><div class="rank-no">📈</div><div><b>Match più spettacolare</b><small>archivio</small></div><div class="rank-val">${esc((rec.find(x=>x.title==='Partita più spettacolare')||{}).value||'—')}</div></div></div></div></div>
    <div class="card" style="margin-top:10px"><div class="section-title"><b>🤖 Fun generato con IA</b><span class="tag">Gemini</span></div><p class="muted">Gemini usa i record e le ultime 5 già calcolati, senza sostituire i numeri sorgente.</p><button class="btn primary" id="askFunAI">✦ Genera / aggiorna Fun con IA</button><div class="ai-result" id="funAIResult" style="margin-top:9px">${esc(state.aiResults.fun||'')}</div></div>`)
}

function opponentPage(){const t=state.opponent;if(!dataReady(t))return shell('AVVERSARIO','Scouting',`<div class="hero"><div class="kicker">DATASET CONDIVISO</div><h2>Avversario non caricato</h2><p>Carica i file disponibili dell’avversario dalla sezione I tuoi dati.</p><button class="btn primary" data-goto="data">⚙️ Apri I tuoi dati</button></div>`);return shell('AVVERSARIO',t.club?.name||'Avversario',`<div class="grid2 compact-stat-sections"><div class="card"><div class="section-title"><b>📊 TOTALE STORICO</b></div>${totalTable(t)}</div><div class="card"><div class="section-title"><b>🔥 ULTIME 5</b><span class="tag">${t.recent5?.matches?.length||0}</span></div>${totalTable(t,'recent5')}</div></div>${shootingAnalyticsPanel(t)}${teamProfileTables(t)}<div class="analytics-grid" style="margin-top:10px">${trendChart(t)}</div>${u5AnalysisPanel(t)}<div class="card" style="margin-top:10px"><h3>Scouting IA</h3><p class="muted">L’IA usa anche OVR, indice rendimento, statistiche giocatore, carriera, Overall Stats e dati club quando presenti.</p><button class="btn primary" id="askOpponentAI">✦ Analizza avversario</button><div class="ai-result" id="opAIResult" style="margin-top:9px">${esc(state.aiResults.opponent||'')}</div></div>`)}
function aiPage(){const opponentMode=state.aiMode==='opponent',modeKey=opponentMode?'opponent':'normal';return shell('IA','Assistente tattico',`<div class="grid2"><div class="card"><div class="kicker">GEMINI 3.5 FLASH-LITE</div><h3>${opponentMode?'Scouting avversario':'Analisi della squadra'}</h3><div class="two-actions" style="margin-bottom:9px"><button class="btn ${!opponentMode?'primary':''}" id="aiTeamMode">Squadra</button><button class="btn ${opponentMode?'primary':''}" id="aiOppMode">Avversario</button></div><textarea id="aiQ" placeholder="Esempio: confronta statistiche cumulative e ultime 5 senza mescolarle."></textarea><div class="two-actions" style="margin-top:9px"><button class="btn primary" id="askAI">✦ Analizza</button><button class="btn" data-q="Analizza i punti deboli usando le statistiche STAGIONALI/CUMULATIVE del file Giocatori.">Stagione</button><button class="btn" data-q="Analizza esclusivamente le ULTIME 5 partite e indicami i problemi recenti.">Ultime 5</button><button class="btn" data-q="Quali giocatori sono migliori nelle statistiche STAGIONALI/CUMULATIVE e perché?">Giocatori</button><button class="btn" data-q="Confronta la nostra squadra con l’avversario distinguendo archivio, stagione e ultime 5.">Confronto</button></div></div><div class="card"><h3>Risposta</h3><div class="ai-result" id="aiResult">${esc(state.aiResults[modeKey]||'L’IA legge direttamente il dataset centrale e mantiene separati i periodi.')}</div></div></div><div class="notice" style="margin-top:10px">Cumulativo = file Giocatori. U5 = ultime 5 partite archiviate. Archivio = tutte le partite caricate. Questi scope non vengono mescolati.</div>`)}
function dataPage(){return shell('DATI','Archivio centrale',`<div class="hero"><div class="kicker">UNA VOLTA SOLA PER TUTTA LA SQUADRA</div><h2>Carica i dati disponibili</h2><p>Puoi caricare fino a <b>10 file</b>: il sito riconosce automaticamente la struttura e assegna ogni export alla categoria corretta.</p><div class="two-actions"><span class="tag live">File opzionali</span><span class="tag">Archivio condiviso</span></div></div><div class="grid2"><div>${teamDataCard('own','La tua squadra')}</div><div>${teamDataCard('opponent','Avversario')}</div></div><div class="card" style="margin-top:10px"><h3>🧠 Controllo dati</h3><p class="muted">Le ultime 5 derivano dai match caricati. Il totale storico ufficiale viene dal file Dati totali riconosciuto automaticamente e verificato dal sistema.</p><button class="btn primary" id="auditAI">✦ Controlla il dataset con IA</button><div class="ai-result" id="auditAIResult" style="margin-top:9px">${esc(state.aiResults.audit||'')}</div></div><div class="card" style="margin-top:10px"><h3>Come vengono separati i dati</h3><p class="muted"><b>Dati totali</b> = totale storico della squadra. <b>Giocatori</b> = statistiche cumulative dei giocatori. <b>Stagione corrente / Overall Stats / Carriera / Info club / Achievements</b> = sorgenti informative separate. <b>Campionato / Playoff / Amichevoli</b> = archivio delle partite. <b>U5</b> = ultime 5 partite dell’archivio. Nessuna finestra recente modifica il totale storico.</p><p class="muted">I giocatori presenti nelle partite ma assenti dal file Giocatori non vengono scartati: vengono segnalati come <b>match-only</b>.</p></div><div class="card" style="margin-top:10px"><h3>📱 Installa su Android</h3><p class="muted">Su Android puoi installare questo sito come app.</p><button class="btn primary" id="installAndroid">⬇️ Installa / Scarica su Android</button><div id="installAndroidHelp" class="muted" style="margin-top:8px"></div></div><div class="card" style="margin-top:10px"><h3>Note squadra</h3><textarea id="notes" placeholder="Note tattiche, ruoli, cose da provare...">${esc(state.notes)}</textarea><button class="btn" id="saveNotes" style="margin-top:8px">Salva note</button></div>`)}
function teamDataCard(role,title){
  const t=team(role),fs=t?.fileStatus||{},cats=DATA_FILES;
  return `<div class="card sync-card"><div class="section-title"><b>${title}</b><span class="tag ${complete(t)?'live':fileCount(t)?'warn':''}">${fileCount(t)}/${DATA_FILES.length}</span></div><div class="muted" style="margin-bottom:9px">${esc(t?.club?.name||'Nessun dato caricato')}</div><div class="notice" style="margin-bottom:9px"><b>Riconoscimento automatico:</b> il sistema assegna i file alla categoria corretta in base alla struttura reale dell’export.</div><div class="file-slots">${cats.map(([cat,label])=>{const f=fs[cat];return `<div class="file-slot"><div><b>${label}</b><small>${f?.present?esc(f.fileName):'Non caricato'}${f?.aiRecognition?.category?` · IA: ${esc(f.aiRecognition.category)}`:''}</small></div><button class="btn" data-upload-role="${role}">${f?.present?'Aggiorna':'Carica'}</button></div>`}).join('')}</div><div class="two-actions" style="margin-top:10px"><button class="btn primary" data-upload-all="${role}">📦 Carica file · riconoscimento automatico</button><button class="btn danger" data-delete-role="${role}">🗑️ Cancella tutti i dati</button></div><div class="messages" id="${role}Messages"></div></div>`;
}
function updateAICoverage(){}
async function callAI(question,mode='normal',targetId='aiResult'){const target=el(targetId)||el('aiResult'),q=String(question||'').trim();if(!q){if(target)target.textContent='Scrivi una domanda oppure usa uno dei pulsanti rapidi.';return}if(target)target.textContent='⏳ Gemini sta analizzando il dataset centrale…';const normalizedMode=['opponent','fun','audit','fouls','formation'].includes(mode)?mode:'normal';try{const r=await fetch('/api/assistente',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q,mode:normalizedMode,notes:state.notes,formation:state.formation,formationCatalog:FORMATIONS.map(name=>({name,roles:FORM_ROWS[name]})),knowledge:state.knowledge})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.error||`Errore IA HTTP ${r.status}`),{code:d.code,status:r.status});const answer=String(d.answer||'').trim()||'Gemini non ha restituito una risposta.';state.aiResults[normalizedMode]=answer;if(normalizedMode==='formation'){state.aiFormationRecommendation=d.recommendation||null;render();showToast(`✓ Consiglio formazione IA ricevuto · ${d.model||'Gemini'}`);return}if(target)target.textContent=answer;showToast(`✓ Analisi IA completata · ${d.model||'Gemini'}`)}catch(e){const msg=e?.code?`${e.code}: ${e.message||'Errore IA'}`:(e?.message||'Errore durante l’analisi IA.');if(target)target.textContent=`✕ ${msg}`;showToast(msg,true)}}
async function loadSharedData(){state.loadingShared=true;render();try{const r=await fetch('/api/club-data',{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Errore HTTP ${r.status}`);state.own=d.teams?.own||null;state.opponent=d.teams?.opponent||null;state.sharedError=''}catch(e){state.own=null;state.opponent=null;state.sharedError=e.message||'Archivio non disponibile'}finally{state.loadingShared=false;render()}}
async function uploadOne(role,file,forcedCategory=''){if(!file)return;const box=el(`${role}Messages`);if(box)box.innerHTML=`<div class="message">⏳ Analizzo ${esc(file.name)} e salvo la categoria corretta…</div>`;const form=new FormData();form.set('role',role);if(forcedCategory)form.set('category',forcedCategory);form.set('file',file);try{const r=await fetch('/api/club-data',{method:'POST',body:form});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Errore HTTP ${r.status}`);const catLabel={players:'Giocatori',league:'Campionato',playoffs:'Playoff',friendlies:'Amichevoli'}[d.category]||d.category;showToast(`✓ ${file.name} riconosciuto come ${catLabel}`);await loadSharedData()}catch(e){if(box)box.innerHTML=`<div class="message err">✕ ${esc(e.message)}</div>`;showToast(e.message||'Caricamento fallito',true)}}
async function uploadAll(role,files){const list=[...files];if(!list.length || list.length>10){showToast('Seleziona da 1 a 10 file.',true);return}for(const f of list)await uploadOne(role,f)}

async function deleteRole(role){if(!confirm(`Cancellare tutti i 10 file della ${role==='own'?'tua squadra':'squadra avversaria'} dal server?`))return;try{const r=await fetch(`/api/club-data?role=${encodeURIComponent(role)}`,{method:'DELETE'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Errore HTTP ${r.status}`);showToast('✓ Dati cancellati dal server');await loadSharedData()}catch(e){showToast(e.message||'Cancellazione fallita',true)}}
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;const b=el('installAndroid');const h=el('installAndroidHelp');if(b)b.textContent='⬇️ Installa / Scarica su Android';if(h)h.textContent='Pronto: premi il pulsante per installare l’app.'});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;const h=el('installAndroidHelp');if(h)h.textContent='✓ App installata su Android.'});
async function installAndroid(){const b=el('installAndroid'),h=el('installAndroidHelp');if(deferredInstallPrompt){deferredInstallPrompt.prompt();const choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;if(h)h.textContent=choice.outcome==='accepted'?'✓ Installazione avviata.':'Installazione annullata.';return}if(h)h.textContent='Su Android apri il sito con Chrome → menu ⋮ → “Installa app” oppure “Aggiungi a schermata Home”.';if(b)b.disabled=false}
function bind(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render();window.scrollTo({top:0,behavior:'smooth'})});document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.goto;render()});const save=el('saveNotes'),notes=el('notes');if(save&&notes)save.onclick=()=>{state.notes=notes.value;jset(K.notes,state.notes);showToast('✓ Note salvate')};const formation=el('formation');if(formation)formation.onchange=()=>{state.formation=formation.value;jset(K.formation,state.formation);render()};const auto=el('autoLineup');if(auto)auto.onclick=autoLineup;const clear=el('clearLineup');if(clear)clear.onclick=()=>{state.lineups[state.formation]={};jset(K.lineups,state.lineups);render()};document.querySelectorAll('[data-slot]').forEach(s=>s.onchange=()=>{state.lineups[state.formation] ||= {};state.lineups[state.formation][s.dataset.slot]=s.value;jset(K.lineups,state.lineups);render()});document.querySelectorAll('[data-pitch-slot]').forEach(b=>b.onclick=()=>openPitchSlotEditor(Number(b.dataset.pitchSlot)));document.querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>playerModal(b.dataset.player));document.querySelectorAll('[data-match]').forEach(b=>b.onclick=()=>{const x=el(b.dataset.match);if(x)x.classList.toggle('hidden')});document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const q=el('aiQ');if(q)q.value=b.dataset.q});const ask=el('askAI');if(ask)ask.onclick=()=>callAI(el('aiQ')?.value||'',state.aiMode,'aiResult');const aiTeam=el('aiTeamMode');if(aiTeam)aiTeam.onclick=()=>{state.aiMode='normal';render()};const aiOpp=el('aiOppMode');if(aiOpp)aiOpp.onclick=()=>{state.aiMode='opponent';render()};const askOp=el('askOpponentAI');if(askOp)askOp.onclick=()=>callAI('Analizza questo avversario e confrontalo con la nostra squadra: punti forti, punti deboli, giocatori chiave, cosa limitare e come impostare la gara. Distingui chiaramente dati cumulativi, ultime 5 e archivio.','opponent','opAIResult');const askFun=el('askFunAI');if(askFun)askFun.onclick=()=>callAI('Crea la sezione Fun della squadra: superlativi, roast leggeri ma basati sui numeri, chi porta il club, chi è in forma, chi è in difficoltà e tre statistiche divertenti. Usa solo dati reali e specifica sempre U5 oppure cumulativo.','fun','funAIResult');const audit=el('auditAI');if(audit)audit.onclick=()=>callAI('Esegui un controllo qualità del dataset. Cerca incoerenze tra file Giocatori e partite archiviate, giocatori presenti solo nelle partite, giocatori nel roster senza partite, valori impossibili o denominatori mescolati. Non inventare e non proporre di cambiare un numero senza evidenza: elenca solo problemi supportati dai dati e indica da quale scope provengono.','audit','auditAIResult');const ps=el('playerSearch'),pd=el('playerDept');if(ps&&pd){const update=()=>{const q=ps.value.toLowerCase(),d=pd.value;document.querySelectorAll('[data-player-row]').forEach(r=>{const name=r.querySelector('.name')?.textContent.toLowerCase()||'',dep=r.dataset.dep||'';r.style.display=(!q||name.includes(q))&&(!d||dep===d)?'':'none'})};ps.oninput=update;pd.onchange=update}const mf=el('matchFilter');if(mf)mf.onchange=()=>{state.matchFilter=mf.value;render()};document.querySelectorAll('[data-upload-role]').forEach(b=>b.onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='.json,.txt,application/json,text/plain';i.onchange=()=>uploadOne(b.dataset.uploadRole,i.files?.[0]);i.click()});document.querySelectorAll('[data-upload-all]').forEach(b=>b.onclick=()=>{const i=document.createElement('input');i.type='file';i.multiple=true;i.accept='.json,.txt,application/json,text/plain';i.onchange=()=>uploadAll(b.dataset.uploadAll,i.files||[]);i.click()});document.querySelectorAll('[data-delete-role]').forEach(b=>b.onclick=()=>deleteRole(b.dataset.deleteRole));const install=el('installAndroid');if(install)install.onclick=installAndroid}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&el('modalRoot'))el('modalRoot').innerHTML=''});
async function loadKnowledge(){try{const r=await fetch('./knowledge/fc27-knowledge.json',{cache:'no-store'});if(r.ok)state.knowledge=await r.json()}catch{state.knowledgeError='Knowledge non disponibile'}}
function render(){setHeader();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));const t=state.tab;el('content').innerHTML=t==='team'?teamPage():t==='players'?playersPage():t==='top'?topPage():t==='pitch'?pitchPage():t==='matches'?matchesPage():t==='fun'?funPage():t==='opponent'?opponentPage():t==='ai'?aiPage():dataPage();bind()}
function boot(){render();loadSharedData();loadKnowledge()}
boot();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js?v=32.1.8').catch(()=>{});
})();
