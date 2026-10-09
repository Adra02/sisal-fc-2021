(function(){'use strict';
const APP_VERSION='v32.1.34';
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
const state={own:null,opponent:null,sharedError:'',loadingShared:false,notes:jget(K.notes,''),lineups:jget(K.lineups,{}),tactics:jget(K.tactics,{lineHeight:55,width:50,build:55,pressure:45,tempo:50}),formation:jget(K.formation,'4-1-2-1-2 Narrow'),knowledge:null,knowledgeError:'',tab:'team',aiMode:'normal',aiResults:{normal:'',opponent:'',fun:'',audit:'',fouls:'',formation:''},aiFormationRecommendation:null,matchFilter:'',numericChanges:{},numericChangesExpires:0};
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
function parseAnimatedNumber(text){
  const raw=String(text??'').trim();
  const m=raw.match(/^([+-]?)(\d+(?:[.,]\d+)?)(%)?$/);
  if(!m)return null;
  const value=Number(m[2].replace(',','.'))*(m[1]==='-'?-1:1);
  if(!Number.isFinite(value))return null;
  const decimals=(m[2].split(/[.,]/)[1]||'').length;
  return {raw,value,decimals,decimalComma:m[2].includes(','),percent:Boolean(m[3]),forcePlus:m[1]==='+'};
}
function numericNodes(root){
  if(!root)return[];
  return [...root.querySelectorAll('strong,b,td,.rank-val,.club-id')].filter(node=>node.childElementCount===0&&parseAnimatedNumber(node.textContent));
}
function formatAnimatedNumber(value,meta){
  const absDecimals=meta.decimals;
  let out=absDecimals?value.toFixed(absDecimals):String(Math.round(value));
  if(meta.decimalComma)out=out.replace('.',',');
  if(meta.forcePlus&&value>0)out='+'+out;
  if(meta.percent)out+='%';
  return out;
}
function animateNumbers(root=el('content')){
  if(!root||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const nodes=numericNodes(root).slice(0,220);
  for(const node of nodes){
    const meta=parseAnimatedNumber(node.textContent);if(!meta||meta.value===0)continue;
    const finalText=meta.raw,target=meta.value,start=performance.now(),duration=560+Math.min(260,Math.abs(target)*2);
    node.classList.add('number-counting');
    const tick=now=>{
      if(!node.isConnected)return;
      const p=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-p,3);
      node.textContent=formatAnimatedNumber(target*ease,meta);
      if(p<1)requestAnimationFrame(tick);else{node.textContent=finalText;node.classList.remove('number-counting')}
    };
    requestAnimationFrame(tick);
  }
}
function numericEntryKey(node,tab,index){
  const card=node.closest('.card,.match-detail,.player-profile-section,.rank-row,tr')||node.parentElement;
  const section=node.closest('.card,.match-detail,.player-profile-section');
  const sectionTitle=section?.querySelector('.table-caption,.section-title b,h3,.player-section-title b')?.textContent?.trim()||'';
  const stat=node.closest('.stat');
  if(stat){const label=stat.querySelector('span')?.textContent?.trim()||'';return `${tab}|${sectionTitle}|stat|${label}`}
  const row=node.closest('tr');
  if(row){
    const cells=[...row.children],cell=node.closest('td,th'),ci=Math.max(0,cells.indexOf(cell));
    const first=cells[0]?.textContent?.trim()||'';
    const table=row.closest('table');
    const head=table?.querySelectorAll('thead th')?.[ci]?.textContent?.trim()||`c${ci}`;
    return `${tab}|${sectionTitle}|table|${first}|${head}`;
  }
  const rank=node.closest('.rank-row');
  if(rank){const name=rank.querySelector('b')?.textContent?.trim()||'';return `${tab}|${sectionTitle}|rank|${name}|${node.className||node.tagName}`}
  const profile=node.closest('.profile-row');
  if(profile){const label=profile.firstElementChild?.textContent?.trim()||'';return `${tab}|${sectionTitle}|profile|${label}`}
  const cardText=card?.querySelector?.('.table-caption,.section-title b,h3')?.textContent?.trim()||sectionTitle;
  return `${tab}|${cardText}|generic|${node.className||node.tagName}|${index}`;
}
function collectNumericEntries(root,tab){
  const out=new Map(),dupes=new Map();
  numericNodes(root).forEach((node,index)=>{
    const meta=parseAnimatedNumber(node.textContent);if(!meta)return;
    let key=numericEntryKey(node,tab,index),n=dupes.get(key)||0;dupes.set(key,n+1);if(n)key+=`#${n}`;
    out.set(key,{text:meta.raw,node});
  });
  return out;
}
function pageHtmlForTab(tab){return tab==='team'?teamPage():tab==='players'?playersPage():tab==='top'?topPage():tab==='pitch'?pitchPage():tab==='matches'?matchesPage():tab==='fun'?funPage():tab==='opponent'?opponentPage():tab==='ai'?aiPage():dataPage()}
function captureAllNumericSnapshots(){
  const tabs=['team','players','top','pitch','matches','fun','opponent','data'],all={};
  for(const tab of tabs){try{const root=document.createElement('div');root.innerHTML=pageHtmlForTab(tab);all[tab]=Object.fromEntries([...collectNumericEntries(root,tab)].map(([k,v])=>[k,v.text]))}catch{all[tab]={}}}
  return all;
}
const NUMERIC_BASELINE_KEY='fc27_numeric_baseline_v32120';
function saveNumericBaseline(snapshots){jset(NUMERIC_BASELINE_KEY,{savedAt:Date.now(),snapshots:snapshots||{}})}
function syncNumericBaseline({compare=true}={}){
  const current=captureAllNumericSnapshots();
  const saved=jget(NUMERIC_BASELINE_KEY,null);
  if(compare&&saved?.snapshots&&Object.keys(saved.snapshots).length)rememberNumericChanges(saved.snapshots,current);
  saveNumericBaseline(current);
  return current;
}
function rememberNumericChanges(before,after){
  const changed={...state.numericChanges};
  for(const [tab,next] of Object.entries(after||{})){
    const prev=before?.[tab]||{},keys=new Set(changed[tab]||[]);
    for(const [key,value] of Object.entries(next||{}))if((key in prev&&prev[key]!==value)||(!(key in prev)&&Object.keys(prev).length))keys.add(key);
    if(keys.size)changed[tab]=[...keys];
  }
  state.numericChanges=changed;state.numericChangesExpires=Date.now()+10*60*1000;
}
function applyNumericChangeFlash(root=el('content')){
  if(!root)return;
  if(state.numericChangesExpires&&Date.now()>state.numericChangesExpires){state.numericChanges={};state.numericChangesExpires=0;return}
  const keys=new Set(state.numericChanges?.[state.tab]||[]);if(!keys.size)return;
  const entries=collectNumericEntries(root,state.tab),seen=[];
  for(const [key,item] of entries)if(keys.has(key)){item.node.classList.remove('number-updated');void item.node.offsetWidth;item.node.classList.add('number-updated');seen.push(key);setTimeout(()=>item.node?.classList?.remove('number-updated'),1900)}
  if(seen.length){const left=(state.numericChanges[state.tab]||[]).filter(k=>!seen.includes(k));if(left.length)state.numericChanges[state.tab]=left;else delete state.numericChanges[state.tab]}
}
function launchWinnerConfetti(){
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const old=document.querySelector('.winner-confetti');if(old)old.remove();
  const box=document.createElement('div');box.className='winner-confetti';box.setAttribute('aria-hidden','true');
  const colors=['#20f26f','#f4fff7','#ffd166','#7dffa8'];
  for(let i=0;i<42;i++){const bit=document.createElement('i'),angle=(-118+Math.random()*236)*Math.PI/180,distance=120+Math.random()*260;bit.style.setProperty('--x',`${Math.cos(angle)*distance}px`);bit.style.setProperty('--y',`${Math.sin(angle)*distance+180}px`);bit.style.setProperty('--r',`${Math.round(Math.random()*900-450)}deg`);bit.style.setProperty('--d',`${(Math.random()*.16).toFixed(2)}s`);bit.style.setProperty('--c',colors[i%colors.length]);box.appendChild(bit)}
  document.body.appendChild(box);setTimeout(()=>box.remove(),1900);
}

const STADIUM_INTRO_KEY='fc27_stadium_intro_day_v1';
const GOAL_EXPLOSION_THRESHOLD=6;
function localDayStamp(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function showDailyStadiumIntro(){
  const today=localDayStamp();
  if(jget(STADIUM_INTRO_KEY,'')===today)return false;
  jset(STADIUM_INTRO_KEY,today);
  const old=document.querySelector('.stadium-intro');if(old)old.remove();
  const overlay=document.createElement('div');overlay.className='stadium-intro';overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML=`<div class="stadium-intro-vignette"></div><div class="stadium-intro-lights stadium-intro-lights-left"></div><div class="stadium-intro-lights stadium-intro-lights-right"></div><div class="stadium-intro-beam beam-a"></div><div class="stadium-intro-beam beam-b"></div><div class="stadium-intro-beam beam-c"></div><div class="stadium-intro-content"><span>FC27 COMMAND CENTER</span><strong>SISAL FC 2021</strong><small>WELCOME TO MATCH NIGHT</small></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add('show'));
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const visibleFor=reduced?560:900;
  setTimeout(()=>overlay.classList.add('exit'),visibleFor);
  setTimeout(()=>overlay.remove(),visibleFor+(reduced?180:360));
  return true;
}
function isGoalExplosionMatch(a,b){return num(a)+num(b)>=GOAL_EXPLOSION_THRESHOLD}
function goalExplosionAttributes(enabled){return enabled?' data-goal-explosion="1" role="button" tabindex="0" title="Gol Explosion · tocca il risultato" aria-label="Gol Explosion: tocca per animare questo risultato"':''}
function launchGoalExplosion(target){
  if(!target||target.dataset.goalExplosionRunning==='1')return;
  target.dataset.goalExplosionRunning='1';
  try{navigator.vibrate?.([18,24,36])}catch{}
  const rect=target.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  const old=document.querySelector('.goal-explosion-layer');if(old)old.remove();
  const layer=document.createElement('div');layer.className='goal-explosion-layer';layer.setAttribute('aria-hidden','true');layer.style.setProperty('--gx',`${x}px`);layer.style.setProperty('--gy',`${y}px`);
  const colors=['#20f26f','#f4fff7','#ffd166','#8affb1','#ffffff'];
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const count=reduced?10:30;
  let particles='';
  for(let i=0;i<count;i++){
    const angle=(Math.PI*2*i/count)+(Math.random()*.22-.11),distance=(reduced?42:68)+Math.random()*(reduced?36:92);
    particles+=`<i class="goal-explosion-particle" style="--dx:${(Math.cos(angle)*distance).toFixed(1)}px;--dy:${(Math.sin(angle)*distance).toFixed(1)}px;--rot:${Math.round(Math.random()*540-270)}deg;--delay:${(Math.random()*.08).toFixed(2)}s;--size:${(4+Math.random()*6).toFixed(1)}px;--gc:${colors[i%colors.length]}"></i>`;
  }
  layer.innerHTML=`<span class="goal-explosion-ring"></span><span class="goal-explosion-flash"></span>${particles}`;
  document.body.appendChild(layer);target.classList.remove('goal-explosion-hit');void target.offsetWidth;target.classList.add('goal-explosion-hit');
  setTimeout(()=>{layer.remove();target.classList.remove('goal-explosion-hit');delete target.dataset.goalExplosionRunning},reduced?520:980);
}
function bindGoalExplosions(){
  document.querySelectorAll('[data-goal-explosion]').forEach(node=>{
    node.onclick=e=>{e.stopPropagation();launchGoalExplosion(node)};
    node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();launchGoalExplosion(node)}};
  });
}
const pullRefreshState={tracking:false,startY:0,distance:0,ready:false};
function setPullRefresh(distance=0,ready=false,label='Trascina per aggiornare la schermata'){
  const box=el('pullRefresh'),text=el('pullRefreshText');if(!box)return;
  box.style.setProperty('--pull',`${Math.max(0,Math.min(96,distance))}px`);box.classList.toggle('visible',distance>2);box.classList.toggle('ready',ready);if(text)text.textContent=label;
}
function finishPullRefresh(){
  pullRefreshState.tracking=false;pullRefreshState.distance=0;pullRefreshState.ready=false;
  const box=el('pullRefresh');if(box){box.classList.remove('refreshing','ready');setPullRefresh(0,false)}
}
function initPullRefresh(){
  const box=el('pullRefresh');if(!box||box.dataset.bound==='1')return;box.dataset.bound='1';
  window.addEventListener('touchstart',event=>{if(window.scrollY>0||event.touches.length!==1||document.querySelector('.player-profile-modal'))return;pullRefreshState.tracking=true;pullRefreshState.startY=event.touches[0].clientY;pullRefreshState.distance=0;pullRefreshState.ready=false},{passive:true});
  window.addEventListener('touchmove',event=>{if(!pullRefreshState.tracking||event.touches.length!==1)return;const dy=event.touches[0].clientY-pullRefreshState.startY;if(dy<=0){finishPullRefresh();return}if(window.scrollY>0){finishPullRefresh();return}event.preventDefault();const visual=Math.min(96,dy*.48);pullRefreshState.distance=dy;pullRefreshState.ready=dy>=118;setPullRefresh(visual,pullRefreshState.ready,pullRefreshState.ready?'Rilascia per aggiornare':'Trascina per aggiornare la schermata')},{passive:false});
  window.addEventListener('touchend',()=>{if(!pullRefreshState.tracking)return;const shouldRefresh=pullRefreshState.ready,pull=shouldRefresh?58:0;pullRefreshState.tracking=false;if(!shouldRefresh){finishPullRefresh();return}const text=el('pullRefreshText');box.classList.add('refreshing');box.classList.remove('ready');setPullRefresh(pull,false,'Aggiorno dalla memoria del dispositivo…');setTimeout(()=>{render();showToast('✓ Schermata aggiornata · 0 operazioni Blob');setTimeout(finishPullRefresh,420)},420)},{passive:true});
  window.addEventListener('touchcancel',finishPullRefresh,{passive:true});
}
function shell(kicker,title,content){return `<div class="kicker">${esc(kicker)}</div><h2 style="margin:6px 0 11px">${esc(title)}</h2>${content}`}
function empty(text){return `<div class="empty">${esc(text)}</div>`}
const TOP3_UNLOCK_KEY='fc27_top3_unlocks_v1';
const TOP3_HORSE_COLORS=['#20f26f','#4da3ff','#ff6b8a','#ffd166','#a970ff','#ff8c42','#2dd4bf','#f472d0','#d4ff5f'];
function hashText(value){let h=2166136261;const text=String(value||'');for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function top3DatasetFingerprint(t){
  const parts=[String(t?.club?.id||'own')];
  for(const [category] of DATA_FILES){
    const f=t?.fileStatus?.[category]||{};
    parts.push([category,f.present?1:0,f.fileName||'',f.uploadedAt||'',f.size||0].join('|'));
  }
  return hashText(parts.join('||'));
}
function top3UnlockState(t){
  const fingerprint=top3DatasetFingerprint(t);
  const saved=jget(TOP3_UNLOCK_KEY,null);
  if(!saved||saved.fingerprint!==fingerprint||!saved.seen||typeof saved.seen!=='object'){
    const fresh={fingerprint,seen:{}};
    jset(TOP3_UNLOCK_KEY,fresh);
    return fresh;
  }
  return saved;
}
function top3WasSeen(t,id){return Boolean(top3UnlockState(t).seen?.[id])}
function markTop3Seen(t,id){const saved=top3UnlockState(t);saved.seen[id]=true;jset(TOP3_UNLOCK_KEY,saved)}
function shuffleCopy(list){const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function horseColorSet(count){return shuffleCopy(TOP3_HORSE_COLORS).slice(0,count)}
const TOP3_RACE_DIRECTOR_KEY='fc27_top3_race_director_v4';
const TOP3_RACE_DIRECTOR_V3_KEY='fc27_top3_race_director_v3';
const TOP3_RACE_VISUAL_LEGACY_KEY='fc27_top3_race_visual_v2';
const RACE_DIRECTOR_DEFAULT={schemaVersion:4,source:'local',variant:0,strideMs:300,dust:.84,glow:.96,trackWarm:.94,gaitPower:.94,headMotion:.92,cameraEnergy:.92,jockeyLean:1,legReach:1,bodyLift:1,sceneIntensity:1,mood:'technical',camera:'broadcast',lighting:'day',weather:'clear',pace:'balanced',finish:'cinematic',crowd:'medium',slowMotion:true};
function raceDirectorQuestion(question,mode){
  const q=String(question||'').trim();
  if(!q||!['normal','opponent'].includes(mode))return q;
  return `${q}\n\nRACE DIRECTOR (stessa richiesta, nessuna analisi extra): dopo la risposta normale aggiungi UNA sola riga finale esatta in questo formato: [[RD:{"m":"intense","c":"tracking","l":"sunset","w":"clear","p":"progressive","f":"cinematic","cr":"high"}]]. Usa solo questi valori: m=calm|intense|dramatic|technical; c=broadcast|low|tracking|finish; l=day|sunset|night|stadium; w=clear|wet|rain; p=balanced|aggressive|progressive|controlled; f=clean|cinematic|slow|photo; cr=low|medium|high. Scegli la combinazione più coerente con l'analisi e non spiegare la riga RD.`;
}
function sanitizeRaceDirectorSpec(raw){
  if(!raw||typeof raw!=='object')return null;
  const pick=(value,allowed,fallback)=>allowed.includes(String(value||''))?String(value):fallback;
  return {
    mood:pick(raw.m??raw.mood,['calm','intense','dramatic','technical'],'technical'),
    camera:pick(raw.c??raw.camera,['broadcast','low','tracking','finish'],'broadcast'),
    lighting:pick(raw.l??raw.lighting,['day','sunset','night','stadium'],'day'),
    weather:pick(raw.w??raw.weather,['clear','wet','rain'],'clear'),
    pace:pick(raw.p??raw.pace,['balanced','aggressive','progressive','controlled'],'balanced'),
    finish:pick(raw.f??raw.finish,['clean','cinematic','slow','photo'],'cinematic'),
    crowd:pick(raw.cr??raw.crowd,['low','medium','high'],'medium')
  };
}
function splitRaceDirectorAnswer(rawAnswer){
  const raw=String(rawAnswer||'').trim();
  const match=raw.match(/\s*\[\[RD:(\{[\s\S]*?\})\]\]\s*$/i);
  if(!match)return {answer:raw,director:null};
  let director=null;
  try{director=sanitizeRaceDirectorSpec(JSON.parse(match[1]))}catch{}
  const answer=raw.slice(0,match.index).trim();
  return {answer:answer||raw,director};
}
function raceDirectorProfileFromSpec(spec,answer=''){
  const d=sanitizeRaceDirectorSpec(spec);if(!d)return null;
  const token=hashText(`${answer}|${JSON.stringify(d)}`),seed=(parseInt(token,36)>>>0)||1;
  const paceMap={
    aggressive:{strideMs:248,gaitPower:1.23,headMotion:1.20,jockeyLean:1.22,legReach:1.25,bodyLift:1.18,dust:1.20},
    progressive:{strideMs:278,gaitPower:1.10,headMotion:1.04,jockeyLean:1.11,legReach:1.14,bodyLift:1.10,dust:1.00},
    controlled:{strideMs:332,gaitPower:.80,headMotion:.66,jockeyLean:.86,legReach:.88,bodyLift:.83,dust:.50},
    balanced:{strideMs:300,gaitPower:.98,headMotion:.92,jockeyLean:1,legReach:1,bodyLift:1,dust:.82}
  };
  const moodEnergy={calm:.74,intense:1.27,dramatic:1.35,technical:.96}[d.mood]||.96;
  const crowdEnergy={low:.60,medium:.98,high:1.32}[d.crowd]||.98;
  const lightWarm={day:1,sunset:1.16,night:.72,stadium:.80}[d.lighting]||1;
  const lightGlow={day:.92,sunset:1.08,night:1.20,stadium:1.34}[d.lighting]||1;
  const p=paceMap[d.pace]||paceMap.balanced;
  const weatherDust=d.weather==='rain'?.30:d.weather==='wet'?.48:1;
  const sceneIntensity=({calm:.90,intense:1.16,dramatic:1.24,technical:1}[d.mood]||1)*({day:.96,sunset:1.12,night:1.14,stadium:1.20}[d.lighting]||1);
  return {
    schemaVersion:4,source:'ai-race-director',seed:token,variant:seed%3,
    strideMs:p.strideMs+(seed%11)-5,dust:p.dust*weatherDust,glow:lightGlow*({low:.93,medium:1,high:1.10}[d.crowd]||1),trackWarm:lightWarm,
    gaitPower:p.gaitPower,headMotion:p.headMotion,cameraEnergy:moodEnergy,jockeyLean:p.jockeyLean,legReach:p.legReach,bodyLift:p.bodyLift,sceneIntensity,
    mood:d.mood,camera:d.camera,lighting:d.lighting,weather:d.weather,pace:d.pace,finish:d.finish,crowd:d.crowd,
    crowdEnergy,slowMotion:['cinematic','slow','photo'].includes(d.finish),updatedAt:Date.now()
  };
}
function raceVisualProfileFromAI(answer){
  const text=String(answer||'').trim();
  if(!text)return {...RACE_DIRECTOR_DEFAULT};
  const lower=text.toLowerCase(),token=hashText(text),seed=(parseInt(token,36)>>>0)||1;
  const aggressive=/(pressing|aggressiv|transizion|vertical|ritmo alto|veloc|intens|attacc|rischio)/i.test(lower);
  const control=/(possesso|controll|equilibr|pazienz|costruzion|gestione|palleggio)/i.test(lower);
  const compact=/(compat|difensiv|blocco basso|prudenz|copertura|attesa)/i.test(lower);
  const variant=aggressive?1:control?2:compact?0:seed%3;
  const pace=aggressive?'aggressive':control?'controlled':compact?'controlled':'balanced';
  const strideMs=aggressive?278+(seed%18):control?306+(seed%17):compact?314+(seed%13):292+(seed%26);
  const dust=aggressive?.98:control?.72:compact?.78:.84+((seed>>>5)%10)/100;
  const glow=aggressive?1.10:control?.94:compact?.86:.90+((seed>>>10)%16)/100;
  const gaitPower=aggressive?1.08:control?.88:compact?.91:.92+((seed>>>13)%13)/100;
  const headMotion=aggressive?1.08:control?.80:compact?.86:.88+((seed>>>16)%15)/100;
  const cameraEnergy=aggressive?1.22:control?.80:compact?.74:.92+((seed>>>19)%18)/100;
  const lighting=['day','sunset','stadium'][seed%3];
  const camera=aggressive?'tracking':control?'broadcast':compact?'low':['broadcast','tracking','finish'][seed%3];
  const mood=aggressive?'intense':control?'technical':compact?'calm':'technical';
  return {schemaVersion:4,source:'ai-analysis-fallback',seed:token,variant,strideMs,dust,glow,gaitPower,headMotion,cameraEnergy,trackWarm:.88+((seed>>>22)%17)/100,jockeyLean:aggressive?1.18:control?.90:.98,legReach:aggressive?1.20:control?.91:1,bodyLift:aggressive?1.14:control?.88:1,sceneIntensity:aggressive?1.18:control?.94:1,mood,camera,lighting,weather:'clear',pace,finish:'cinematic',crowd:aggressive?'high':'medium',crowdEnergy:aggressive?1.1:.94,slowMotion:true,updatedAt:Date.now()};
}
function rememberRaceVisualFromAI(answer,director=null){
  const text=String(answer||'').trim();
  if(text.length<24&&!director)return false;
  const profile=director?raceDirectorProfileFromSpec(director,text):raceVisualProfileFromAI(text);
  return profile?jset(TOP3_RACE_DIRECTOR_KEY,profile):false;
}
function currentRaceVisualProfile(){
  let saved=jget(TOP3_RACE_DIRECTOR_KEY,null);
  if(!saved){
    const v3=jget(TOP3_RACE_DIRECTOR_V3_KEY,null);
    if(v3)saved={...RACE_DIRECTOR_DEFAULT,...v3,schemaVersion:4,source:v3.source||'legacy-ai-profile-v3',sceneIntensity:v3.source==='ai-race-director'?1.12:1};
  }
  if(!saved){const legacy=jget(TOP3_RACE_VISUAL_LEGACY_KEY,null);if(legacy)saved={...RACE_DIRECTOR_DEFAULT,...legacy,schemaVersion:4,source:legacy.source||'legacy-ai-profile'};}
  if(!saved)return {...RACE_DIRECTOR_DEFAULT};
  const pick=(value,allowed,fallback)=>allowed.includes(String(value||''))?String(value):fallback;
  return {...RACE_DIRECTOR_DEFAULT,...saved,schemaVersion:4,
    variant:Math.max(0,Math.min(2,Math.round(num(saved.variant,0)))),strideMs:Math.max(235,Math.min(345,Math.round(num(saved.strideMs,300)))),dust:Math.max(.20,Math.min(1.35,num(saved.dust,.84))),glow:Math.max(.65,Math.min(1.42,num(saved.glow,.96))),trackWarm:Math.max(.68,Math.min(1.20,num(saved.trackWarm,.94))),gaitPower:Math.max(.72,Math.min(1.28,num(saved.gaitPower,.94))),headMotion:Math.max(.55,Math.min(1.30,num(saved.headMotion,.92))),cameraEnergy:Math.max(.65,Math.min(1.42,num(saved.cameraEnergy,.92))),jockeyLean:Math.max(.78,Math.min(1.26,num(saved.jockeyLean,1))),legReach:Math.max(.82,Math.min(1.30,num(saved.legReach,1))),bodyLift:Math.max(.78,Math.min(1.24,num(saved.bodyLift,1))),crowdEnergy:Math.max(.50,Math.min(1.38,num(saved.crowdEnergy,.98))),sceneIntensity:Math.max(.80,Math.min(1.34,num(saved.sceneIntensity,1))),
    mood:pick(saved.mood,['calm','intense','dramatic','technical'],'technical'),camera:pick(saved.camera,['broadcast','low','tracking','finish'],'broadcast'),lighting:pick(saved.lighting,['day','sunset','night','stadium'],'day'),weather:pick(saved.weather,['clear','wet','rain'],'clear'),pace:pick(saved.pace,['balanced','aggressive','progressive','controlled'],'balanced'),finish:pick(saved.finish,['clean','cinematic','slow','photo'],'cinematic'),crowd:pick(saved.crowd,['low','medium','high'],'medium'),slowMotion:Boolean(saved.slowMotion)
  };
}
function injectRaceVisualOverhaulStyles(){
  if(typeof document==='undefined'||document.getElementById('race-overhaul-v32129'))return;
  const style=document.createElement('style');
  style.id='race-overhaul-v32129';
  style.textContent=`
  .top3-race-shell{position:relative;overflow:hidden;border:1px solid rgba(98,126,95,.58);border-radius:26px;background:linear-gradient(180deg,#0b1710,#061009 72%,#040b06);box-shadow:0 26px 64px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.04)}
  .top3-race-kicker{color:#8af2a8;letter-spacing:.19em}.top3-race-head h3{font-size:17px}.race-director-badge{display:inline-flex;margin-top:5px;padding:5px 9px;border-radius:999px;border:1px solid rgba(107,232,145,.20);background:rgba(5,16,9,.78);font-size:9px;font-weight:950;color:#f0fff4}
  .race-commentary{margin:10px 0 0;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.06);background:linear-gradient(180deg,rgba(9,18,12,.86),rgba(4,10,6,.94));font-size:10px;color:#f5fbf7;box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
  .race-director-console{margin:8px 0 9px;padding:8px 9px;gap:5px;border-radius:13px;background:rgba(4,11,7,.82);border:1px solid rgba(255,255,255,.06)}.race-director-console b{padding:4px 6px;border-radius:7px;background:rgba(255,255,255,.045);font-size:6.5px}.race-director-console span{font-size:6.5px}.race-director-console.is-ai{border-color:rgba(52,225,108,.24);box-shadow:0 0 26px rgba(32,242,111,.06)}
  .top3-live-board{margin-top:8px;padding:9px;border-radius:15px;border:1px solid rgba(255,255,255,.055);background:rgba(4,10,7,.76)}.top3-live-slot{padding:8px;border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.018));border:1px solid rgba(255,255,255,.035)}
  .horse-race{position:relative;isolation:isolate;overflow:hidden;perspective:1100px;transform-style:preserve-3d;gap:10px;padding:142px 12px 22px;border-radius:22px;border:1px solid rgba(121,139,105,.56);background:#8c5d38;box-shadow:inset 0 28px 42px rgba(255,255,255,.05),inset 0 -24px 32px rgba(0,0,0,.22),0 18px 36px rgba(0,0,0,.26)}
  .horse-race:before,.horse-race:after{content:none!important}
  .race-environment{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;transform-style:preserve-3d}.race-sky{position:absolute;inset:0 0 auto;height:156px;background:linear-gradient(180deg,#8ec9f6 0,#d6ecfb 58%,#edf0e8 100%)}
  .race-clouds{position:absolute;left:0;right:0;top:18px;height:44px}.race-clouds span{position:absolute;width:88px;height:24px;border-radius:999px;background:rgba(255,255,255,.75);box-shadow:24px -6px 0 4px rgba(255,255,255,.68),54px 2px 0 rgba(255,255,255,.55)}.race-clouds span:nth-child(1){left:8%}.race-clouds span:nth-child(2){left:45%;top:9px;transform:scale(1.15)}.race-clouds span:nth-child(3){right:8%;top:2px;transform:scale(.92)}
  .race-sun-disc,.race-moon-disc{position:absolute;right:12%;top:20px;border-radius:50%}.race-sun-disc{width:42px;height:42px;background:radial-gradient(circle at 32% 32%,#fff6cc,#f6ce67 62%,#d99a36);box-shadow:0 0 0 10px rgba(255,210,103,.11),0 0 28px rgba(255,197,73,.26)}.race-moon-disc{width:28px;height:28px;opacity:0;background:radial-gradient(circle at 35% 35%,#fff,#dbe7f5 64%,#aebfd2);box-shadow:0 0 18px rgba(187,218,255,.22)}.race-stars{position:absolute;inset:0 0 auto;height:150px;opacity:0;background-image:radial-gradient(circle at 12% 22%,#fff 0 1.4px,transparent 1.8px),radial-gradient(circle at 27% 51%,#fff 0 1.2px,transparent 1.6px),radial-gradient(circle at 42% 17%,#dff1ff 0 1.4px,transparent 1.8px),radial-gradient(circle at 63% 44%,#fff 0 1.3px,transparent 1.7px),radial-gradient(circle at 82% 20%,#fff 0 1.5px,transparent 1.8px),radial-gradient(circle at 93% 57%,#dcecff 0 1.3px,transparent 1.7px)}
  .race-hills{position:absolute;bottom:88px;border-radius:50%;filter:saturate(.92)}.hill-a{left:-8%;width:62%;height:105px;background:linear-gradient(180deg,#6c8e5b,#3b5a30)}.hill-b{right:-10%;width:70%;height:115px;background:linear-gradient(180deg,#789967,#47653b)}
  .race-grandstand-3d{position:absolute;left:8%;right:8%;top:67px;height:78px;transform:perspective(760px) rotateX(-8deg) translateZ(-30px);transform-origin:50% 100%;filter:drop-shadow(0 12px 10px rgba(0,0,0,.22));z-index:2}.grandstand-roof-3d{position:absolute;left:-2%;right:-2%;top:0;height:16px;background:linear-gradient(180deg,#3d4e5f,#202a34);clip-path:polygon(3% 100%,7% 0,93% 0,97% 100%)}.grandstand-tier{position:absolute;left:3%;right:3%;border:1px solid rgba(0,0,0,.12);background:repeating-linear-gradient(90deg,#6f8190 0 18px,#536777 18px 36px)}.tier-a{top:14px;height:26px;transform:translateZ(4px)}.tier-b{top:40px;height:28px;background:repeating-linear-gradient(90deg,#7b6858 0 18px,#665244 18px 36px);transform:translateZ(9px)}
  .race-crowd-stand{position:absolute;left:5%;right:5%;top:18px;bottom:8px;z-index:3;transform:translateZ(16px)}.spectator{position:absolute;left:var(--sp-x);top:var(--sp-y);width:6px;height:11px;border-radius:5px 5px 2px 2px;background:#26323b;box-shadow:0 -4px 0 -1px #d7c7b8}.spectator.sp2{background:#305c8b}.spectator.sp3{background:#834e48}.spectator.sp4{background:#4f7445}.spectator.sp5{background:#76649a}.spectator.sp6{background:#86662c}.crowd-cheer .spectator{animation:crowd3dCheer .28s ease}
  .race-infield-3d{position:absolute;left:-8%;right:-8%;top:128px;height:50px;background:linear-gradient(180deg,#548846,#345f2d);transform:perspective(820px) rotateX(54deg) translateZ(-18px);transform-origin:50% 0;box-shadow:inset 0 10px 15px rgba(255,255,255,.08)}
  .race-track-plane{position:absolute;left:-8%;right:-8%;top:154px;bottom:-50px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.045) 0 36px,rgba(0,0,0,.035) 36px 72px),linear-gradient(180deg,#b77a49,#9d6339 54%,#7f4e2f);transform:perspective(900px) rotateX(66deg) translateZ(-62px) scaleY(2.2);transform-origin:50% 0;box-shadow:inset 0 20px 24px rgba(255,255,255,.07),inset 0 -40px 45px rgba(0,0,0,.18)}
  .race-rail{position:absolute;z-index:5;height:8px;background:linear-gradient(180deg,#fffefa,#d7d7cc 44%,#858981 45%,#484e48);box-shadow:0 3px 6px rgba(0,0,0,.20)}.race-rail-top{left:-2%;right:-2%;top:151px;transform:perspective(900px) rotateX(-2deg) translateZ(20px)}.race-rail-bottom{left:-2%;right:-2%;bottom:8px}
  .horse-lane{position:relative;height:112px;z-index:4;overflow:visible;border-radius:17px;background:linear-gradient(180deg,rgba(255,255,255,.11),rgba(255,255,255,.018) 26%,rgba(0,0,0,.055)),repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 34px,rgba(0,0,0,.045) 34px 68px),linear-gradient(180deg,#b87948,#9a6038 55%,#84502f);box-shadow:inset 0 1px 0 rgba(255,255,255,.19),inset 0 -18px 24px rgba(0,0,0,.15),0 0 0 1px rgba(255,255,255,.04);transform-style:preserve-3d}.horse-lane[data-lane="0"]{transform:translateZ(16px) scale(1.015)}.horse-lane[data-lane="1"]{transform:translateZ(6px)}.horse-lane[data-lane="2"]{transform:translateZ(-4px) scale(.988)}
  .lane-badge{top:10px;left:10px;min-width:34px;height:24px;padding:0 9px;border-radius:999px;background:rgba(5,14,8,.86);border:1px solid rgba(255,255,255,.10);font-size:9px;font-weight:1000;color:#eefcf2;box-shadow:0 7px 14px rgba(0,0,0,.18)}
  .start-line,.finish-line{top:8px;bottom:8px;width:16px;border-radius:9px;background:repeating-linear-gradient(180deg,#fff 0 8px,#171717 8px 16px);box-shadow:0 0 0 2px rgba(255,255,255,.05)}.finish-line{right:16px}.start-line i,.finish-line i{top:-18px;padding:3px 7px;border-radius:999px;background:rgba(5,12,8,.86);font-size:7px;color:#fff}
  .starting-gate{left:46px;bottom:13px;width:84px;height:60px;border-radius:11px;background:linear-gradient(180deg,#eef2f4,#aeb8c0 45%,#707d86 46%,#525b63);border:1px solid rgba(0,0,0,.18);box-shadow:0 8px 12px rgba(0,0,0,.14)}.gate-door{top:9px;bottom:9px;width:18px;background:linear-gradient(180deg,#fafcfd,#b8c2c9 50%,#626d75)}
  .horse-runner{left:20px;bottom:6px;width:176px;z-index:7;will-change:transform;transform-style:preserve-3d}.horse-name{max-width:168px;margin:0 auto 2px;padding:5px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.15);background:linear-gradient(180deg,rgba(7,15,10,.88),rgba(3,8,5,.94));font-size:9px;font-weight:1000;color:#fff;box-shadow:0 8px 16px rgba(0,0,0,.20)}.horse-color-dot{width:8px;height:8px}.horse-visual{position:relative;height:84px;perspective:520px;transform-style:preserve-3d}.horse-shadow{left:26px;right:22px;bottom:3px;height:12px;background:radial-gradient(ellipse,rgba(0,0,0,.44),rgba(0,0,0,.10) 67%,transparent 72%);filter:blur(3px)}
  .horse-3d-model{position:absolute;left:50%;bottom:4px;width:158px;height:78px;transform:translateX(-50%) rotateY(-13deg) rotateX(1deg);transform-style:preserve-3d;filter:drop-shadow(0 12px 10px rgba(0,0,0,.19));--stride:var(--race-stride,300ms)}
  .horse3d-depth,.horse3d-chest,.horse3d-rump,.horse3d-neck,.horse3d-head,.horse3d-mane,.horse3d-saddle,.horse3d-jockey,.horse3d-tail,.horse3d-leg{position:absolute;transform-style:preserve-3d}
  .body-back{left:31px;top:27px;width:91px;height:35px;border-radius:50%;background:linear-gradient(155deg,var(--coat-dark),var(--coat));transform:translateZ(-10px) scale(.96);box-shadow:inset -10px -7px 12px rgba(0,0,0,.20)}.body-core{left:29px;top:24px;width:96px;height:39px;border-radius:50%;background:radial-gradient(circle at 34% 25%,var(--coat-light) 0 4%,var(--coat2) 23%,var(--coat) 62%,var(--coat-dark) 100%);transform:translateZ(0);box-shadow:inset 8px 4px 10px rgba(255,255,255,.11),inset -12px -8px 15px rgba(0,0,0,.20)}.body-front{left:39px;top:27px;width:76px;height:30px;border-radius:50%;background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,0) 42%);transform:translateZ(10px)}
  .horse3d-chest{left:105px;top:30px;width:35px;height:31px;border-radius:48% 55% 50% 46%;background:radial-gradient(circle at 34% 28%,var(--coat2),var(--coat) 62%,var(--coat-dark));transform:translateZ(4px) rotateZ(-5deg)}.horse3d-rump{left:20px;top:29px;width:36px;height:31px;border-radius:55%;background:radial-gradient(circle at 32% 30%,var(--coat2),var(--coat) 62%,var(--coat-dark));transform:translateZ(2px)}
  .horse3d-neck{left:109px;top:14px;width:50px;height:24px;border-radius:58% 45% 48% 52%;background:linear-gradient(135deg,var(--coat2),var(--coat) 58%,var(--coat-dark));transform:translateZ(5px) rotateZ(-37deg);transform-origin:15% 80%;box-shadow:inset 4px 2px 5px rgba(255,255,255,.10)}
  .horse3d-head{left:137px;top:7px;width:30px;height:22px;border-radius:53% 58% 48% 43%;background:radial-gradient(circle at 36% 28%,var(--coat-light),var(--coat2) 18%,var(--coat) 62%,var(--coat-dark));transform:translateZ(9px) rotateZ(5deg);box-shadow:inset -5px -3px 6px rgba(0,0,0,.16)}.horse3d-head.blaze:before{content:'';position:absolute;left:8px;top:1px;width:4px;height:16px;border-radius:4px;background:#eee9db;transform:rotate(-7deg);opacity:.92}.horse3d-eye{position:absolute;right:7px;top:6px;width:3px;height:3px;border-radius:50%;background:#080808;box-shadow:0 0 0 1px rgba(255,255,255,.55)}.horse3d-muzzle{position:absolute;right:-6px;bottom:1px;width:13px;height:9px;border-radius:50%;background:linear-gradient(135deg,var(--muzzle),#695044);box-shadow:inset -2px -1px 3px rgba(0,0,0,.2)}.horse3d-ear{position:absolute;top:-8px;width:5px;height:11px;border-radius:80% 0 80% 0;background:var(--coat-dark);transform-origin:bottom}.ear-a{left:8px;transform:rotate(-15deg)}.ear-b{left:16px;transform:rotate(8deg)}
  .horse3d-mane{left:118px;top:8px;width:36px;height:9px;border-radius:60% 20% 60% 20%;background:repeating-linear-gradient(90deg,var(--mane) 0 4px,rgba(255,255,255,.07) 4px 5px);transform:translateZ(2px) rotateZ(-34deg);transform-origin:left center}
  .horse3d-tail{left:9px;top:29px;width:34px;height:32px;transform:translateZ(-2px);transform-origin:90% 20%;animation:tail3d var(--stride) ease-in-out infinite alternate}.horse3d-tail i{position:absolute;left:0;top:6px;width:34px;height:7px;border-radius:999px;background:linear-gradient(90deg,var(--mane),rgba(20,14,11,.84));transform-origin:right center}.horse3d-tail i:nth-child(1){transform:rotate(18deg)}.horse3d-tail i:nth-child(2){top:13px;transform:rotate(6deg)}.horse3d-tail i:nth-child(3){top:20px;transform:rotate(-9deg)}
  .horse3d-saddle{left:64px;top:17px;width:54px;height:23px;border-radius:48% 48% 20% 20%;background:linear-gradient(155deg,var(--silk),color-mix(in srgb,var(--silk),#000 28%));transform:translateZ(12px) rotateZ(1deg);box-shadow:0 3px 0 rgba(0,0,0,.22)}.horse3d-bib{position:absolute;left:10px;top:11px;width:34px;height:22px;border-radius:3px;background:linear-gradient(145deg,var(--bib),#c9b990);border:1px solid rgba(0,0,0,.34);transform:translateZ(1px)}
  .horse3d-jockey{left:78px;top:-6px;width:55px;height:50px;transform:translateZ(18px) rotateZ(11deg);transform-origin:45% 75%;animation:jockey3d var(--stride) ease-in-out infinite alternate}.jockey-torso{position:absolute;left:14px;top:13px;width:27px;height:25px;border-radius:52% 52% 35% 35%;background:linear-gradient(145deg,#fff 0 5%,var(--silk) 6% 64%,color-mix(in srgb,var(--silk),#000 26%));box-shadow:inset -4px -4px 5px rgba(0,0,0,.16)}.jockey-head{position:absolute;left:28px;top:0;width:14px;height:14px;border-radius:50%;background:#d8b395;box-shadow:inset -2px -2px 3px rgba(0,0,0,.18)}.jockey-cap{position:absolute;left:25px;top:-4px;width:19px;height:9px;border-radius:12px 12px 4px 4px;background:var(--silk);box-shadow:inset -3px -2px 3px rgba(0,0,0,.18)}.jockey-arm,.jockey-leg{position:absolute;display:block;height:5px;border-radius:999px;background:#2f251f;transform-origin:left center}.jockey-arm{width:26px}.jockey-arm.arm-a{left:34px;top:22px;transform:rotate(24deg)}.jockey-arm.arm-b{left:34px;top:28px;transform:rotate(12deg)}.jockey-leg{width:29px}.jockey-leg.leg-a{left:12px;top:34px;transform:rotate(38deg)}.jockey-leg.leg-b{left:21px;top:36px;transform:rotate(54deg)}
  .horse3d-leg{width:12px;height:48px;top:48px;transform-origin:50% 0;z-index:-1}.horse3d-leg .upper,.horse3d-leg .lower{position:absolute;left:2px;width:9px;border-radius:999px;background:linear-gradient(180deg,var(--coat2),var(--coat-dark));transform-origin:50% 0;box-shadow:inset 2px 0 2px rgba(255,255,255,.08)}.horse3d-leg .upper{top:0;height:27px}.horse3d-leg .lower{top:23px;height:25px}.horse3d-leg .hoof{position:absolute;left:-2px;bottom:-3px;width:15px;height:6px;border-radius:8px;background:#161512}.hind-near{left:42px;transform:translateZ(8px);animation:leg3dA var(--stride) ease-in-out infinite alternate}.hind-far{left:64px;transform:translateZ(-7px);animation:leg3dB var(--stride) ease-in-out infinite alternate}.front-near{left:119px;transform:translateZ(9px);animation:leg3dB var(--stride) ease-in-out infinite alternate}.front-far{left:137px;transform:translateZ(-6px);animation:leg3dA var(--stride) ease-in-out infinite alternate}
  .speed-lines{left:-10px;top:34px;width:66px;height:22px;opacity:.34}.hoof-dust{bottom:11px;width:21px;height:13px;background:radial-gradient(circle,rgba(236,213,173,.54),rgba(180,132,89,.18) 70%,transparent);filter:blur(1px)}
  .race-countdown{background:radial-gradient(circle,rgba(5,17,9,.44),rgba(1,6,3,.84));backdrop-filter:blur(4px)}.race-countdown span{min-width:86px;height:86px;font-size:36px;background:radial-gradient(circle at 35% 30%,#f2d57f,#86600f 72%);border-color:#fff2b7}
  .replay-banner{top:16px;padding:8px 14px;border-radius:999px;background:rgba(5,13,20,.90);border:1px solid rgba(205,237,255,.22);font-size:10px}.winner-ceremony-horse{height:100px}.winner-ceremony-horse .horse-3d-model{position:relative;left:auto;bottom:auto;margin:0 auto;transform:scale(1.12) rotateY(-12deg);transform-origin:center center}.winner-ceremony-card{border-radius:20px}
  .top3-race-shell.race-light-sunset .race-sky{background:linear-gradient(180deg,#ffca78,#ff9f61 52%,#f6d6a9)}.top3-race-shell.race-light-sunset .race-sun-disc{opacity:1}.top3-race-shell.race-light-sunset .race-moon-disc,.top3-race-shell.race-light-sunset .race-stars{opacity:0}.top3-race-shell.race-light-sunset .horse-race{background:#975c34}.top3-race-shell.race-light-night .race-sky,.top3-race-shell.race-light-stadium .race-sky{background:linear-gradient(180deg,#0f2135,#203a55 52%,#455266)}.top3-race-shell.race-light-night .race-sun-disc,.top3-race-shell.race-light-stadium .race-sun-disc{opacity:0}.top3-race-shell.race-light-night .race-moon-disc,.top3-race-shell.race-light-stadium .race-moon-disc{opacity:1}.top3-race-shell.race-light-night .race-stars,.top3-race-shell.race-light-stadium .race-stars{opacity:.9}.top3-race-shell.race-light-night .horse-race,.top3-race-shell.race-light-stadium .horse-race{background:#75543e}.top3-race-shell.race-light-stadium .race-light-beam{opacity:.6}.top3-race-shell.race-light-stadium .race-floodlight{opacity:1}
  .top3-race-shell.race-weather-wet .race-track-plane,.top3-race-shell.race-weather-rain .race-track-plane{filter:saturate(.58) brightness(.72);box-shadow:inset 0 20px 26px rgba(225,244,255,.12),inset 0 -40px 45px rgba(0,0,0,.25)}.top3-race-shell.race-weather-wet .horse-lane,.top3-race-shell.race-weather-rain .horse-lane{filter:saturate(.70) brightness(.84)}.top3-race-shell.race-weather-rain .hoof-dust{opacity:.14!important}.top3-race-shell.race-weather-rain .horse-race{filter:saturate(.84) contrast(1.03)}
  .top3-race-shell.race-camera-low .horse-3d-model{transform:translateX(-50%) rotateY(-17deg) rotateX(3deg) scale(1.08)}.top3-race-shell.race-camera-finish .horse-3d-model{transform:translateX(-50%) rotateY(-9deg) scale(1.04)}.top3-race-shell.race-pace-aggressive .horse-3d-model{filter:drop-shadow(0 12px 10px rgba(0,0,0,.19)) saturate(1.07)}.top3-race-shell.race-pace-aggressive .speed-lines{opacity:.66;width:82px}.top3-race-shell.race-pace-aggressive .hoof-dust{opacity:.92;transform:scale(1.22)}.top3-race-shell.race-pace-controlled .speed-lines{opacity:.10}.top3-race-shell.race-pace-controlled .hoof-dust{opacity:.35}
  .horse-winner .horse-name{border-color:#f0df84;background:linear-gradient(180deg,rgba(67,56,12,.96),rgba(18,15,6,.96));box-shadow:0 0 22px rgba(240,227,119,.18),0 10px 20px rgba(0,0,0,.26)}
  @keyframes leg3dA{0%{rotate:-36deg}100%{rotate:42deg}}@keyframes leg3dB{0%{rotate:38deg}100%{rotate:-34deg}}@keyframes tail3d{0%{transform:translateZ(-2px) rotate(-8deg)}100%{transform:translateZ(-2px) rotate(11deg)}}@keyframes jockey3d{0%{transform:translateZ(18px) rotateZ(8deg) translateY(0)}100%{transform:translateZ(18px) rotateZ(13deg) translateY(-2px)}}@keyframes crowd3dCheer{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @media(max-width:480px){.top3-race-shell{border-radius:20px}.horse-race{padding:120px 7px 16px;gap:7px}.race-sky{height:132px}.race-grandstand-3d{left:4%;right:4%;top:61px;height:68px}.race-infield-3d{top:113px}.race-track-plane{top:137px}.race-rail-top{top:134px}.horse-lane{height:96px}.horse-runner{left:15px;width:138px}.horse-name{max-width:132px;padding:4px 8px;font-size:7.4px}.horse-visual{height:70px}.horse-3d-model{width:132px;height:68px;transform:translateX(-50%) rotateY(-13deg) scale(.84);transform-origin:50% 85%}.starting-gate{left:30px;width:68px;height:50px}.finish-line{right:12px}.race-director-console b,.race-director-console span{font-size:5.8px}.race-commentary{font-size:9px}.winner-ceremony-horse .horse-3d-model{transform:scale(.94) rotateY(-12deg)}}
  @media(max-width:360px){.horse-race{padding-top:112px}.horse-lane{height:91px}.horse-runner{width:124px}.horse-3d-model{transform:translateX(-50%) rotateY(-13deg) scale(.77)}.horse-name{max-width:118px;font-size:6.8px}}
  `;
  document.head.appendChild(style);
}
function raceVisualVars(profile){
  const p=profile||RACE_DIRECTOR_DEFAULT;
  return `--race-stride:${Math.round(p.strideMs)}ms;--race-dust-ms:${Math.round(p.strideMs*2.35)}ms;--race-dust-alpha:${Number(p.dust).toFixed(2)};--race-glow:${Number(p.glow).toFixed(2)};--race-track-warm:${Number(p.trackWarm).toFixed(2)};--race-gait-power:${Number(p.gaitPower).toFixed(2)};--race-crowd-energy:${Number(p.crowdEnergy||.98).toFixed(2)};--race-scene-intensity:${Number(p.sceneIntensity||1).toFixed(2)}`;
}
function raceDirectorLabel(profile){
  const p=profile||RACE_DIRECTOR_DEFAULT;
  if(p.source!=='ai-race-director')return 'REGIA LOCALE';
  const labels={broadcast:'BROADCAST',low:'LOW CAM',tracking:'TRACKING',finish:'FINISH CAM',day:'DAY',sunset:'SUNSET',night:'NIGHT',stadium:'STADIUM'};
  return `✦ AI DIRECTOR · ${labels[p.camera]||'BROADCAST'} · ${labels[p.lighting]||'DAY'}`;
}
function raceDirectorOpening(profile){
  const p=profile||RACE_DIRECTOR_DEFAULT;
  if(p.source!=='ai-race-director')return 'I cavalli entrano nei box…';
  if(p.mood==='dramatic')return '🎬 Regia IA: atmosfera da grande finale.';
  if(p.mood==='intense')return '⚡ Regia IA: ritmo alto, camera pronta a inseguire.';
  if(p.mood==='calm')return '🎥 Regia IA: partenza controllata, immagini pulite.';
  return '📺 Regia IA: impostazione broadcast e lettura tecnica della gara.';
}

function raceDirectorHud(profile){
  const p=profile||RACE_DIRECTOR_DEFAULT;
  const ai=p.source==='ai-race-director'||p.source==='ai-analysis-fallback';
  const labels={broadcast:'BROADCAST',low:'LOW CAM',tracking:'TRACKING',finish:'FINISH CAM',day:'GIORNO',sunset:'TRAMONTO',night:'NOTTE',stadium:'STADIUM',clear:'ASCIUTTO',wet:'BAGNATO',rain:'PIOGGIA',balanced:'EQUILIBRATO',aggressive:'AGGRESSIVO',progressive:'PROGRESSIVO',controlled:'CONTROLLATO',clean:'CLEAN',cinematic:'CINEMA',slow:'SLOW-MO',photo:'PHOTO'};
  return `<div class="race-director-console ${ai?'is-ai':'is-local'}"><span>${ai?'✦ AI DIRECTOR ATTIVO':'REGIA LOCALE'}</span><b>🎥 ${labels[p.camera]||p.camera}</b><b>💡 ${labels[p.lighting]||p.lighting}</b><b>🌦 ${labels[p.weather]||p.weather}</b><b>🏇 ${labels[p.pace]||p.pace}</b><b>🏁 ${labels[p.finish]||p.finish}</b></div>`;
}
function raceSceneDecor(scene,visual){
  const crowdCount=visual?.crowd==='high'?30:visual?.crowd==='low'?12:20;
  const crowd=`<div class="race-crowd-stand" aria-hidden="true">${Array.from({length:crowdCount}).map((_,i)=>`<span class="spectator sp${(i%6)+1}" style="--sp-x:${(i*37)%100}%;--sp-y:${8+((i*23)%62)}%"></span>`).join('')}</div>`;
  const rain=scene.weather==='rain'?`<div class="race-rain-layer">${Array.from({length:34}).map((_,i)=>`<i style="--rain-x:${(i*29)%101}%;--rain-delay:-${((i*13)%90)/100}s;--rain-speed:${.54+((i*7)%40)/100}s"></i>`).join('')}</div>`:'';
  return `<div class="race-environment" aria-hidden="true"><div class="race-sky"></div><div class="race-clouds"><span></span><span></span><span></span></div><span class="race-sun-disc"></span><span class="race-moon-disc"></span><div class="race-stars"></div><div class="race-hills hill-a"></div><div class="race-hills hill-b"></div><div class="race-grandstand-3d"><div class="grandstand-roof-3d"></div><div class="grandstand-tier tier-a"></div><div class="grandstand-tier tier-b"></div>${crowd}</div><div class="race-infield-3d"></div><div class="race-track-plane"></div><span class="race-floodlight fl-a"></span><span class="race-floodlight fl-b"></span><div class="race-light-beam beam-a"></div><div class="race-light-beam beam-b"></div><div class="race-wet-sheen"></div>${rain}<div class="race-cinematic-vignette"></div></div>`;
}
function horseSvg(color,variant=0){
  const c=esc(color);
  const v=Math.max(0,Math.min(2,Math.round(num(variant,0))));
  const seed=(parseInt(hashText(c+String(v)),36)>>>0)||1;
  const coats=[
    {body:'#6f4128',body2:'#9b603c',dark:'#241713',light:'#d39a66',mane:'#1b1410',muzzle:'#b8977e'},
    {body:'#894a28',body2:'#b36b3d',dark:'#2b1811',light:'#df9a5b',mane:'#25140e',muzzle:'#c5a085'},
    {body:'#2e2c2a',body2:'#56524e',dark:'#111110',light:'#85807a',mane:'#0d0d0d',muzzle:'#93877d'},
    {body:'#85827c',body2:'#aaa69e',dark:'#3f3d39',light:'#d6d0c5',mane:'#4a4743',muzzle:'#d9cdc1'}
  ];
  const coat=coats[seed%coats.length];
  const silk=c;
  const bib=v===1?'#e0c96a':v===2?'#cce7ff':'#f2efe6';
  const faceMark=seed%3===0?' blaze':'';
  return `<div class="horse-3d-model horse-3d-v${v}" style="--coat:${coat.body};--coat2:${coat.body2};--coat-dark:${coat.dark};--coat-light:${coat.light};--mane:${coat.mane};--muzzle:${coat.muzzle};--silk:${silk};--bib:${bib}">
    <div class="horse3d-depth body-back"></div>
    <div class="horse3d-depth body-core"></div>
    <div class="horse3d-depth body-front"></div>
    <div class="horse3d-chest"></div>
    <div class="horse3d-rump"></div>
    <div class="horse3d-neck"></div>
    <div class="horse3d-head${faceMark}"><span class="horse3d-eye"></span><span class="horse3d-muzzle"></span><span class="horse3d-ear ear-a"></span><span class="horse3d-ear ear-b"></span></div>
    <div class="horse3d-mane"></div>
    <div class="horse3d-tail"><i></i><i></i><i></i></div>
    <div class="horse3d-saddle"><span class="horse3d-bib"></span></div>
    <div class="horse3d-jockey"><span class="jockey-torso"></span><span class="jockey-arm arm-a"></span><span class="jockey-arm arm-b"></span><span class="jockey-head"></span><span class="jockey-cap"></span><span class="jockey-leg leg-a"></span><span class="jockey-leg leg-b"></span></div>
    <div class="horse3d-leg hind-near"><span class="upper"></span><span class="lower"></span><i class="hoof"></i></div>
    <div class="horse3d-leg hind-far"><span class="upper"></span><span class="lower"></span><i class="hoof"></i></div>
    <div class="horse3d-leg front-near"><span class="upper"></span><span class="lower"></span><i class="hoof"></i></div>
    <div class="horse3d-leg front-far"><span class="upper"></span><span class="lower"></span><i class="hoof"></i></div>
  </div>`;
}
function horseMotionParts(runner){
  const svg=runner?.querySelector('.horse-svg');
  if(!svg)return null;
  const legs={};
  svg.querySelectorAll('[data-horse-leg]').forEach(el=>{legs[el.dataset.horseLeg]={upper:el,lower:el.querySelector('[data-horse-lower]')}});
  return {core:svg.querySelector('[data-horse-core]'),body:svg.querySelector('[data-horse-body]'),neck:svg.querySelector('[data-horse-neck]'),head:svg.querySelector('[data-horse-head]'),jockey:svg.querySelector('[data-horse-jockey]'),tail:svg.querySelector('[data-horse-tail]'),shadow:runner.querySelector('.horse-shadow'),legs};
}
function rotateHorsePart(el,deg,extra=''){if(el)el.style.transform=`${extra}${extra?' ':''}rotate(${deg.toFixed(2)}deg)`}
function animateHorseMotion(item,elapsed,velocity,f,visual){
  const parts=item.motion;if(!parts)return;
  const moving=f<1,boost=Math.min(1,Math.max(.28,velocity*190));
  const power=(visual?.gaitPower||.94)*(moving?(.72+.28*boost):.18);
  const stride=Math.max(250,(item.strideMs||300)*(1.04-.12*boost));
  const phase=((elapsed/stride)+(item.index*.137))%1,tau=Math.PI*2;
  const wave=Math.sin(phase*tau),susp=Math.max(0,Math.sin((phase-.05)*tau));
  const bob=(-2.4*susp+0.65*Math.max(0,-wave))*power*(visual?.bodyLift||1);
  const pitch=(1.35*Math.sin((phase+.08)*tau))*power;
  if(parts.core)parts.core.style.transform=`translateY(${bob.toFixed(2)}px) rotate(${pitch.toFixed(2)}deg)`;
  if(parts.body)parts.body.style.transform=`scaleY(${(1+Math.sin((phase+.18)*tau)*.006*power).toFixed(4)})`;
  rotateHorsePart(parts.neck,(-1.8+Math.sin((phase+.16)*tau)*2.8*(visual?.headMotion||.92))*power);
  rotateHorsePart(parts.head,(1.2+Math.sin((phase+.31)*tau)*3.1*(visual?.headMotion||.92))*power);
  rotateHorsePart(parts.jockey,(((-pitch*.62)+(Math.sin((phase+.42)*tau)*.8*power))*(visual?.jockeyLean||1)),`translateY(${(-bob*.45).toFixed(2)}px)`);
  rotateHorsePart(parts.tail,(-8+Math.sin((phase+.58)*tau)*13)*power);
  const configs=[['hind-near',0,true],['hind-far',.18,true],['front-far',.47,false],['front-near',.66,false]];
  for(const [name,offset,hind] of configs){
    const leg=parts.legs[name];if(!leg)continue;
    const lp=((phase+offset)%1)*tau,s=Math.sin(lp),c2=Math.cos(lp);
    const reach=visual?.legReach||1;
    const upper=(hind?(-7+37*s):(5+40*s))*power*reach;
    const fold=Math.max(0,hind?c2:-c2);
    const lower=(hind?(10+34*fold):(-8+42*fold))*power*reach;
    rotateHorsePart(leg.upper,upper);
    rotateHorsePart(leg.lower,lower);
  }
  if(parts.shadow){const lift=Math.max(0,-bob);parts.shadow.style.transform=`scaleX(${(1.02-lift*.018).toFixed(3)}) scaleY(${(.96-lift*.012).toFixed(3)})`;parts.shadow.style.opacity=String(Math.max(.24,.58-lift*.06));}
}
function top3Rankings(t){
  const p=t?.recent5?.players||[];
  const eligible=p.filter(x=>num(x.appearances||x.games)>0);
  const pass=[...eligible].map(x=>({...x,passAccuracy:x.passAttempts>0?pct(x.passesMade,x.passAttempts):x.passAccuracy})).filter(x=>x.passAccuracy!=null).sort((a,b)=>num(b.passAccuracy)-num(a.passAccuracy));
  const tackle=[...eligible].map(x=>({...x,tackleSuccess:x.tackleAttempts>0?pct(x.tacklesMade,x.tackleAttempts):x.tackleSuccess})).filter(x=>x.tackleSuccess!=null).sort((a,b)=>num(b.tackleSuccess)-num(a.tackleSuccess));
  return [
    {id:'goals',title:'⚽ Gol U5',arr:[...eligible].sort((a,b)=>num(b.goals)-num(a.goals)),key:'goals',unit:'',decimals:0},
    {id:'assists',title:'🎯 Assist U5',arr:[...eligible].sort((a,b)=>num(b.assists)-num(a.assists)),key:'assists',unit:'',decimals:0},
    {id:'rating',title:'⭐ Rating U5',arr:[...eligible].filter(x=>num(x.appearances)>=2&&x.rating!=null).sort((a,b)=>num(b.rating)-num(a.rating)),key:'rating',unit:'',decimals:2},
    {id:'passes',title:'🎯 Pass accuracy U5',arr:pass,key:'passAccuracy',unit:'%',decimals:1},
    {id:'tackles',title:'🛡️ Tackle success U5',arr:tackle,key:'tackleSuccess',unit:'%',decimals:1}
  ];
}
// Dense ranking, using exactly the positive value printed in this category.
function top3Placements(cfg){
  const sorted=cfg.arr.map((player,index)=>({player,index,value:Number(num(player[cfg.key]).toFixed(cfg.decimals))})).filter(e=>Number.isFinite(e.value)&&e.value>0).sort((a,b)=>b.value-a.value||a.index-b.index);
  const counts=new Map();for(const e of sorted)counts.set(e.value,(counts.get(e.value)||0)+1);
  let previous=null,place=0;
  // Dense ranking: 1,1,2 and 1,2,2. This is the rule used by the race and
  // intentionally differs from competition ranking (1,1,3).
  return sorted.map((e,i)=>{if(i===0||e.value!==previous)place+=1;previous=e.value;return {...e,place,tied:counts.get(e.value)>1,tieCount:counts.get(e.value),score:e.value.toFixed(cfg.decimals)+cfg.unit}}).filter(e=>e.place<=3);
}
function top3RankRows(cfg){
  const rows=top3Placements(cfg);if(!rows.length)return empty('Nessun valore superiore a zero in questa categoria U5. Nessuna corsa da avviare.');
  const medals=['🥇','🥈','🥉'];
  return `<div class="rank-list top3-final-list">${rows.map(({player:x,place,tied,score})=>`<div class="rank-row top3-final-row top3-final-${place}"><div class="rank-no" aria-label="${place}° posto">${medals[place-1]}<small>${place}°</small></div><div><button class="player-rank-link" data-player="${esc(x.id||x.name||'')}"><b>${esc(x.name)}</b><small>${esc(x.position||'')} · ULTIME 5${tied?' · PARI MERITO':''}</small></button></div><div class="rank-val">${esc(score)}</div></div>`).join('')}</div>${rows.some(e=>e.tied)?'<p class="sr-tie-note">Stesso valore, stesso posto e stessa medaglia. I pari merito sono inclusi anche oltre tre giocatori.</p>':''}`;
}

function top3Card(t,cfg){
  if(!top3Placements(cfg).length)return `<div class="card top3-race-card"><h3>${cfg.title}</h3>${top3RankRows(cfg)}</div>`;
  if(top3WasSeen(t,cfg.id))return `<div class="card top3-race-card top3-revealed"><div class="top3-revealed-head"><h3>${cfg.title}</h3><span>🏁 RISULTATO</span></div>${top3RankRows(cfg)}<button type="button" class="btn ghost sr-replay" data-top3-race="${esc(cfg.id)}">↻ Rivedi la corsa 3D</button></div>`;
  return `<div class="card top3-race-card top3-locked"><button class="top3-lock-button" type="button" data-top3-race="${esc(cfg.id)}" aria-label="Scopri ${esc(cfg.title)}"><span class="top3-lock-kicker">SISAL FC · RACE REVEAL</span><span class="top3-lock-icon">🔒</span><strong>${cfg.title}</strong><small>Tocca per far partire la gara</small><span class="top3-lock-cta">🏇 SCOPRI LA TOP 3</span></button></div>`;
}
function top3RaceSceneProfile(visual){const p=visual||RACE_DIRECTOR_DEFAULT;if(p.source==='ai-race-director'||p.source==='ai-analysis-fallback')return {night:['night','stadium'].includes(p.lighting),lighting:p.lighting,weather:p.weather};const weatherRoll=Math.random();const night=Math.random()<.1;return {night,lighting:night?'night':'day',weather:weatherRoll<.10?'rain':weatherRoll<.18?'wet':'clear'}}
function top3RaceMarkup(cfg){
  const ranked=top3Placements(cfg);
  const lanes=shuffleCopy(ranked);
  const colors=horseColorSet(lanes.length);
  const visual=currentRaceVisualProfile();
  const visualVars=raceVisualVars(visual);
  const scene=top3RaceSceneProfile(visual);
  const liveSlots=ranked.map((_,i)=>`<div class="top3-live-slot" data-live-pos="${i+1}"><span class="live-medal">${['🥇','🥈','🥉'][i]||`${i+1}°`}</span><div><b>—</b><small>IN ATTESA</small></div><span class="live-dot"></span></div>`).join('');
  return `<div class="top3-race-shell race-visual-v${visual.variant} ${scene.night?'race-scene-night':'race-scene-day'} race-light-${scene.lighting} race-weather-${scene.weather} race-camera-${visual.camera} race-mood-${visual.mood} race-pace-${visual.pace} race-finish-${visual.finish} race-crowd-${visual.crowd}" data-race-weather="${scene.weather}" data-race-night="${scene.night?'1':'0'}" data-race-visual-source="${esc(visual.source||'local')}" style="${visualVars}"><div class="top3-race-head"><div><span class="top3-race-kicker">RACE ENGINE 3D · LIVE · ULTIME 5</span><h3>${cfg.title}</h3><span class="race-director-badge">${esc(raceDirectorLabel(visual))}</span></div><span class="top3-race-status"><i></i><span data-race-status-text>Preparati…</span></span></div><div class="race-commentary" data-race-commentary>${esc(raceDirectorOpening(visual))}</div>${raceDirectorHud(visual)}<div class="top3-live-board" data-live-board style="--race-count:${lanes.length}">${liveSlots}</div><div class="horse-race" data-race-stage style="--race-count:${lanes.length}">${raceSceneDecor(scene,visual)}<div class="race-track-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="race-countdown" data-race-countdown><div class="start-lights">${[0,1,2].map(i=>`<span class="start-light" data-start-light="${i}"></span>`).join('')}</div><span>3</span></div><div class="photo-finish-overlay" data-photo-finish><b>📸 PHOTO FINISH</b><small>Controllo del fotofinish…</small></div><div class="replay-banner" data-replay-banner>📺 REPLAY · ULTIMI 2 SECONDI</div><div class="winner-ceremony" data-winner-ceremony></div><div class="race-rail race-rail-top"></div><div class="race-rail race-rail-bottom"></div><div class="finish-flag" aria-hidden="true"><span class="flag-pole"></span><span class="flag-cloth">SISAL</span></div>${lanes.map((entry,laneIndex)=>`<div class="horse-lane" data-lane="${laneIndex}"><span class="lane-badge">C${laneIndex+1}</span><span class="start-line" aria-hidden="true"><i>START</i></span><span class="finish-line" aria-hidden="true"><i>FINISH</i></span><div class="starting-gate" data-gate aria-hidden="true"><span class="gate-door gate-left"></span><span class="gate-door gate-right"></span></div><div class="horse-runner" data-race-place="${entry.place}" data-lane="${laneIndex}" data-race-name="${esc(entry.player.name)}" data-race-color="${esc(colors[laneIndex])}"><div class="horse-name"><span class="horse-color-dot" style="background:${esc(colors[laneIndex])}"></span>${esc(entry.player.name)}</div><div class="horse-visual">${horseSvg(colors[laneIndex],visual.variant)}<span class="horse-shadow"></span><span class="speed-lines"></span><span class="hoof-dust dust-a"></span><span class="hoof-dust dust-b"></span><span class="hoof-dust dust-c"></span></div></div></div>`).join('')}<div class="race-finish-result" data-race-result></div></div></div>`;
}
function raceProgressFrames(place){
  const times=[0,.11,.23,.36,.49,.62,.74,.84,.92,1];
  const points=[];let last=0;
  for(let i=0;i<times.length;i++){
    if(i===0){points.push({t:0,p:0});continue}
    if(i===times.length-1){points.push({t:1,p:1});continue}
    let target=times[i]+(Math.random()-.5)*.20;
    if(i===times.length-2){const closing=place===1?.94:place===2?.91:.875;target=Math.max(target,closing)}
    const ceiling=i===times.length-2?.965:.91;
    target=Math.min(ceiling,Math.max(last+.035,target));
    last=target;points.push({t:times[i],p:target});
  }
  return points;
}
function raceInterpolate(points,f){
  const x=Math.max(0,Math.min(1,f));
  for(let i=1;i<points.length;i++){
    if(x<=points[i].t){const a=points[i-1],b=points[i],span=Math.max(.0001,b.t-a.t),raw=(x-a.t)/span,eased=raw*raw*(3-2*raw);return a.p+(b.p-a.p)*eased}
  }
  return 1;
}

function raceSleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

function shareSlug(value){return String(value||'riquadro').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'riquadro'}
function shareTitleForTarget(target){
  const explicit=target?.dataset?.shareTitle?.trim();
  if(explicit)return explicit;
  if(target?.classList?.contains('match-detail')){
    const match=target.closest('.match-card');
    const meta=match?.querySelector('.match-top span')?.textContent?.trim()||'Partita';
    const score=match?.querySelector('.score-big')?.textContent?.trim()||'';
    return `Statistiche partita · ${meta}${score?` · ${score}`:''}`;
  }
  const candidates=[target?.querySelector('.top3-revealed-head h3'),target?.querySelector('.section-title b'),target?.querySelector('.table-caption'),target?.querySelector('h3'),target?.querySelector('h2')].filter(Boolean);
  return (candidates[0]?.textContent||'Riquadro Sisal FC 2021').replace(/\s+/g,' ').trim()||'Riquadro Sisal FC 2021';
}
function isShareableCard(card){
  if(!card)return false;
  if(card.classList.contains('top3-locked')||card.classList.contains('top3-racing'))return false;
  if(card.classList.contains('top3-race-card')&&!card.classList.contains('top3-revealed'))return false;
  const dataSelectors=['table','.rank-list','.profile-list','.stats-grid','.analytics-kpis','.compact-total','.trend-wrap','.form'];
  if(dataSelectors.some(sel=>card.querySelector(sel)))return true;
  if(card.querySelector('.section-title')&&!card.querySelector('input,textarea,select'))return true;
  return false;
}
function appendShareButton(target,title){
  if(!target||target.querySelector(':scope > .share-actions'))return;
  target.dataset.shareableTarget='1';
  target.dataset.shareTitle=title;
  const actions=document.createElement('div');
  actions.className='share-actions share-exclude';
  const btn=document.createElement('button');
  btn.type='button';btn.className='share-btn';btn.dataset.shareTarget='1';
  btn.setAttribute('aria-label',`Condividi ${title}`);
  btn.innerHTML='📤 <span>Condividi questa tabella</span>';
  actions.appendChild(btn);target.appendChild(actions);
}
function decorateShareables(){
  document.querySelectorAll('#content .card').forEach(card=>{if(isShareableCard(card))appendShareButton(card,shareTitleForTarget(card))});
  document.querySelectorAll('#content .match-detail').forEach(detail=>{if(detail.querySelector('table'))appendShareButton(detail,shareTitleForTarget(detail))});
}
function cleanShareText(value){return String(value??'').replace(/\s+/g,' ').trim()}
function directText(el){
  if(!el)return '';
  return cleanShareText(el.textContent);
}
function shareSections(target){
  const sections=[];
  const candidates=[...target.querySelectorAll('table,.stats-grid,.player-stat-grid,.analytics-kpis,.profile-list,.rank-list,.form')];
  for(const node of candidates){
    if(node.closest('.share-actions'))continue;
    if(candidates.some(other=>other!==node&&other.contains(node)))continue;
    if(node.tagName==='TABLE'){
      const rows=[...node.querySelectorAll('tr')].map(tr=>[...tr.children].map(cell=>directText(cell))).filter(r=>r.some(Boolean));
      if(rows.length)sections.push({type:'table',rows});
      continue;
    }
    if(node.classList.contains('stats-grid')||node.classList.contains('player-stat-grid')||node.classList.contains('analytics-kpis')){
      const items=[...node.querySelectorAll('.stat')].map(s=>({value:directText(s.querySelector('strong')),label:directText(s.querySelector('span'))})).filter(x=>x.value||x.label);
      if(items.length)sections.push({type:'stats',items});
      continue;
    }
    if(node.classList.contains('profile-list')){
      const rows=[...node.querySelectorAll('.profile-row')].map(r=>[...r.children].map(directText)).filter(r=>r.length);
      if(rows.length)sections.push({type:'pairs',rows});
      continue;
    }
    if(node.classList.contains('rank-list')){
      const rows=[...node.querySelectorAll('.rank-row')].map(r=>{
        const rank=directText(r.querySelector('.rank-no'));
        const name=directText(r.querySelector('b'))||directText(r.children?.[1]);
        const small=directText(r.querySelector('small'));
        const val=directText(r.querySelector('.rank-val'));
        return [rank,[name,small].filter(Boolean).join(' · '),val];
      }).filter(r=>r.some(Boolean));
      if(rows.length)sections.push({type:'rank',rows});
      continue;
    }
    if(node.classList.contains('form')){
      const items=[...node.children].map(directText).filter(Boolean);
      if(items.length)sections.push({type:'chips',items});
    }
  }
  if(!sections.length){
    const lines=[...target.querySelectorAll('p,.muted,.notice,.message')].map(directText).filter(Boolean).slice(0,12);
    if(lines.length)sections.push({type:'text',items:lines});
  }
  return sections;
}
function roundRect(ctx,x,y,w,h,r,fill,stroke){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.roundRect(x,y,w,h,rr);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}
}
function canvasWrap(ctx,text,maxWidth){
  const raw=cleanShareText(text);if(!raw)return [''];
  const words=raw.split(' '),lines=[];let line='';
  for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width<=maxWidth||!line)line=test;else{lines.push(line);line=word}}
  if(line)lines.push(line);return lines.slice(0,4);
}
function shareModelMetrics(sections){
  let maxCols=3,rowCount=0;
  for(const s of sections){if(s.rows){maxCols=Math.max(maxCols,...s.rows.map(r=>r.length));rowCount+=s.rows.length}else if(s.items)rowCount+=Math.ceil(s.items.length/3)}
  return {maxCols,rowCount};
}
function buildShareCanvas(target){
  const title=shareTitleForTarget(target),sections=shareSections(target),metrics=shareModelMetrics(sections);
  const width=Math.max(1080,Math.min(2600,metrics.maxCols*170));
  const pad=54,inner=width-pad*2,headerH=150,sectionGap=26;
  const probe=document.createElement('canvas').getContext('2d');probe.font='600 25px system-ui, sans-serif';
  let estimated=headerH+100;
  for(const s of sections){
    if(s.type==='stats')estimated+=Math.ceil(s.items.length/3)*112+sectionGap;
    else if(s.type==='chips')estimated+=Math.ceil(s.items.length/4)*72+sectionGap;
    else if(s.type==='text')estimated+=s.items.length*62+sectionGap;
    else if(s.rows)estimated+=s.rows.length*74+sectionGap+22;
  }
  const height=Math.max(460,Math.min(9000,estimated+110));
  const scale=width>1800?1:1.35;
  const canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
  const grad=ctx.createLinearGradient(0,0,width,height);grad.addColorStop(0,'#07170d');grad.addColorStop(.55,'#031008');grad.addColorStop(1,'#010603');ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
  ctx.fillStyle='rgba(32,242,111,.07)';ctx.beginPath();ctx.arc(width-120,80,250,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8dffb4';ctx.font='900 22px system-ui, sans-serif';ctx.fillText('SISAL FC 2021 · FC27 COMMAND CENTER',pad,50);
  ctx.fillStyle='#f4fff7';ctx.font='900 38px system-ui, sans-serif';const titleLines=canvasWrap(ctx,title,inner);titleLines.forEach((line,i)=>ctx.fillText(line,pad,94+i*44));
  let y=headerH+(titleLines.length-1)*44;
  ctx.strokeStyle='#21452f';ctx.beginPath();ctx.moveTo(pad,y-12);ctx.lineTo(width-pad,y-12);ctx.stroke();
  const colors={panel:'#07130b',panel2:'#0b1d12',line:'#21452f',text:'#f4fff7',muted:'#91aa9b',green:'#20f26f'};
  for(const s of sections){
    y+=sectionGap;
    if(s.type==='stats'){
      const cols=3,gap=16,cw=(inner-gap*(cols-1))/cols;
      s.items.forEach((it,i)=>{const col=i%cols,row=Math.floor(i/cols),x=pad+col*(cw+gap),yy=y+row*112;roundRect(ctx,x,yy,cw,94,14,'#06130b','#21452f');ctx.fillStyle=colors.text;ctx.font='900 31px system-ui, sans-serif';ctx.fillText(cleanShareText(it.value).slice(0,28),x+18,yy+39);ctx.fillStyle=colors.muted;ctx.font='800 17px system-ui, sans-serif';canvasWrap(ctx,it.label,cw-36).slice(0,2).forEach((line,j)=>ctx.fillText(line,x+18,yy+67+j*20));});
      y+=Math.ceil(s.items.length/cols)*112;continue;
    }
    if(s.type==='chips'){
      const cols=4,gap=14,cw=(inner-gap*(cols-1))/cols;
      s.items.forEach((txt,i)=>{const col=i%cols,row=Math.floor(i/cols),x=pad+col*(cw+gap),yy=y+row*68;roundRect(ctx,x,yy,cw,52,999,'#0a2113','#285638');ctx.fillStyle=colors.text;ctx.font='900 18px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText(cleanShareText(txt).slice(0,28),x+cw/2,yy+33);ctx.textAlign='left'});y+=Math.ceil(s.items.length/cols)*68;continue;
    }
    if(s.type==='text'){
      for(const txt of s.items){roundRect(ctx,pad,y,inner,52,12,'#06130b','#21452f');ctx.fillStyle=colors.text;ctx.font='600 19px system-ui, sans-serif';canvasWrap(ctx,txt,inner-34).slice(0,2).forEach((line,j)=>ctx.fillText(line,pad+17,y+29+j*22));y+=62}continue;
    }
    if(s.rows){
      const rows=s.rows,cols=Math.max(...rows.map(r=>r.length),1),gap=0,cw=inner/cols;
      for(let ri=0;ri<rows.length;ri++){
        const row=rows[ri];let rowH=64;
        ctx.font=(ri===0&&s.type==='table'?'900':'650')+' 18px system-ui, sans-serif';
        const cellLines=row.map((cell,ci)=>canvasWrap(ctx,cell,cw-24));rowH=Math.max(rowH,...cellLines.map(ls=>Math.max(1,ls.length)*22+24));
        const bg=ri===0&&s.type==='table'?'#0b2918':ri%2===0?'#07130b':'#051009';
        for(let ci=0;ci<cols;ci++){
          const x=pad+ci*cw;ctx.fillStyle=bg;ctx.fillRect(x,y,cw,rowH);ctx.strokeStyle=colors.line;ctx.strokeRect(x,y,cw,rowH);
          ctx.fillStyle=ri===0&&s.type==='table'?colors.green:colors.text;ctx.font=(ri===0&&s.type==='table'?'900':'650')+' 18px system-ui, sans-serif';
          (cellLines[ci]||['']).forEach((line,li)=>ctx.fillText(line,x+12,y+28+li*22));
        }
        y+=rowH;
      }
      continue;
    }
  }
  y+=36;ctx.fillStyle=colors.muted;ctx.font='700 16px system-ui, sans-serif';ctx.fillText('Condiviso dalla web app Sisal FC 2021',pad,Math.min(height-34,y));
  return {canvas,title};
}
function dataUrlToBlob(dataUrl){const [head,body]=dataUrl.split(',');const mime=(head.match(/data:([^;]+)/)||[])[1]||'image/png';const bin=atob(body);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new Blob([bytes],{type:mime})}
function downloadShareFile(file){const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
async function shareTargetFromButton(btn){
  const target=btn.closest('[data-shareable-target]');if(!target)return;
  btn.disabled=true;
  try{
    const built=buildShareCanvas(target);const dataUrl=built.canvas.toDataURL('image/png',.96);const blob=dataUrlToBlob(dataUrl);const file=new File([blob],`${shareSlug(built.title)}.png`,{type:'image/png'});const text=`Sisal FC 2021 — ${built.title}`;
    let canFiles=true;try{if(navigator.canShare)canFiles=navigator.canShare({files:[file]})}catch{canFiles=false}
    if(navigator.share&&canFiles){
      try{await navigator.share({files:[file],title:text,text});showToast('✓ Tabella condivisa');return}catch(e){if(e?.name==='AbortError'){showToast('Condivisione annullata');return}}
    }
    downloadShareFile(file);
    try{await navigator.clipboard?.writeText(text)}catch{}
    showToast('✓ Immagine salvata · testo della classifica copiato');
  }catch(e){console.error('share-target-error',e);showToast('Immagine non condivisibile su questo browser: ho evitato modifiche ai dati.',true)}finally{btn.disabled=false}
}
let raceAudioCtx=null;
function getRaceAudioCtx(){
  try{
    raceAudioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    if(raceAudioCtx.state==='suspended')raceAudioCtx.resume().catch(()=>{});
    return raceAudioCtx;
  }catch{return null}
}
function audioEnvelope(ctx,when,duration,startGain=.04,endGain=.0001){
  const gain=ctx.createGain();
  gain.gain.setValueAtTime(.0001,when);
  gain.gain.linearRampToValueAtTime(startGain,when+.01);
  gain.gain.exponentialRampToValueAtTime(endGain,when+duration);
  gain.connect(ctx.destination);
  return gain;
}
function playGallopHit(ctx,when,freq=88,accent=1){
  const osc=ctx.createOscillator();
  osc.type='triangle';
  osc.frequency.setValueAtTime(freq,when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.55),when+.07);
  const gain=audioEnvelope(ctx,when,.09,.05*accent,.0001);
  osc.connect(gain);
  osc.start(when);
  osc.stop(when+.11);
  const noiseLen=ctx.sampleRate*.08;
  const buffer=ctx.createBuffer(1,noiseLen,ctx.sampleRate);
  const ch=buffer.getChannelData(0);
  for(let i=0;i<noiseLen;i++)ch[i]=(Math.random()*2-1)*(1-i/noiseLen);
  const noise=ctx.createBufferSource();noise.buffer=buffer;
  const nGain=audioEnvelope(ctx,when,.055,.016*accent,.0001);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(620,when);
  noise.connect(filter);filter.connect(nGain);noise.start(when);noise.stop(when+.07);
}
function startGallopAudio(){
  const ctx=getRaceAudioCtx();
  if(!ctx)return ()=>{};
  let stopped=false;
  const pulse=()=>{
    if(stopped)return;
    const now=ctx.currentTime+.01;
    [0,.11,.28,.39].forEach((d,i)=>playGallopHit(ctx,now+d,i%2===0?92:78,i<2?1:.86));
  };
  pulse();
  const id=setInterval(pulse,510);
  return ()=>{stopped=true;clearInterval(id)};
}
function playWinnerTrumpet(){
  const ctx=getRaceAudioCtx();
  if(!ctx)return;
  const now=ctx.currentTime+.02;
  const notes=[392,523.25,659.25,783.99,659.25,783.99];
  notes.forEach((freq,i)=>{
    const start=now+(i*.145);
    const osc=ctx.createOscillator();
    osc.type='sawtooth';
    osc.frequency.setValueAtTime(freq,start);
    const gain=audioEnvelope(ctx,start,.22,.05,.0001);
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(1700,start);
    osc.connect(filter);filter.connect(gain);
    osc.start(start);osc.stop(start+.24);
    const osc2=ctx.createOscillator();osc2.type='square';osc2.frequency.setValueAtTime(freq*2,start);
    const gain2=audioEnvelope(ctx,start,.15,.016,.0001);osc2.connect(gain2);osc2.start(start);osc2.stop(start+.16);
  });
}
function playCountdownDrum(step='3'){
  const ctx=getRaceAudioCtx();
  if(!ctx)return;
  const now=ctx.currentTime+.01;
  const osc=ctx.createOscillator();
  osc.type=step==='VIA!'?'sawtooth':'triangle';
  const base=step==='VIA!'?96:62;
  osc.frequency.setValueAtTime(base,now);
  osc.frequency.exponentialRampToValueAtTime(step==='VIA!'?52:38,now+(step==='VIA!'?.17:.11));
  const gain=audioEnvelope(ctx,now,step==='VIA!'?.2:.13,step==='VIA!'?.08:.055,.0001);
  osc.connect(gain);osc.start(now);osc.stop(now+(step==='VIA!'?.22:.15));
  const len=Math.floor(ctx.sampleRate*(step==='VIA!'?.12:.08));
  const buffer=ctx.createBuffer(1,len,ctx.sampleRate);const ch=buffer.getChannelData(0);
  for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*(1-i/len);
  const noise=ctx.createBufferSource();noise.buffer=buffer;
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(step==='VIA!'?1200:520,now);
  const nGain=audioEnvelope(ctx,now,step==='VIA!'?.1:.07,step==='VIA!'?.03:.018,.0001);
  noise.connect(filter);filter.connect(nGain);noise.start(now);noise.stop(now+(step==='VIA!'?.11:.08));
}
function playGateBurst(){
  const ctx=getRaceAudioCtx();
  if(!ctx)return;
  const now=ctx.currentTime+.01;
  const osc=ctx.createOscillator();osc.type='square';osc.frequency.setValueAtTime(280,now);osc.frequency.exponentialRampToValueAtTime(120,now+.09);
  const gain=audioEnvelope(ctx,now,.1,.035,.0001);osc.connect(gain);osc.start(now);osc.stop(now+.11);
  const len=Math.floor(ctx.sampleRate*.12);const buffer=ctx.createBuffer(1,len,ctx.sampleRate);const ch=buffer.getChannelData(0);
  for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.8);
  const noise=ctx.createBufferSource();noise.buffer=buffer;const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.setValueAtTime(1700,now);const nGain=audioEnvelope(ctx,now,.12,.026,.0001);noise.connect(filter);filter.connect(nGain);noise.start(now);noise.stop(now+.13);
}
function setRaceCommentary(card,msg){
  const line=card?.querySelector('[data-race-commentary]');
  if(!line||!msg)return;
  line.textContent=msg;
  line.classList.remove('pop');void line.offsetWidth;line.classList.add('pop');
}
function triggerCrowdCheer(card){
  if(!card)return;
  card.classList.add('crowd-cheer');
  setTimeout(()=>card.classList.remove('crowd-cheer'),360);
}
function showPhotoFinish(card){
  const overlay=card?.querySelector('[data-photo-finish]');
  if(!overlay)return;
  overlay.classList.add('show');
  card.classList.add('photo-finish-active');
  setTimeout(()=>{overlay.classList.remove('show');card.classList.remove('photo-finish-active')},680);
}
async function playRaceReplay(card,history,raceData,statusText,raceVisual=null){
  if(!card?.isConnected||!Array.isArray(history)||history.length<4)return;
  const banner=card.querySelector('[data-replay-banner]');
  const result=card.querySelector('[data-race-result]');
  const last=history[history.length-1]?.t||0;
  const startCut=Math.max(0,last-2000);
  const frames=history.filter(x=>x.t>=startCut);
  if(frames.length<2)return;
  const finishStyle=raceVisual?.finish||'cinematic';
  const replayDivisor=finishStyle==='slow'?1.45:finishStyle==='photo'?1.7:finishStyle==='clean'?2.15:1.9;
  const replayDuration=Math.min(1450,Math.max(780,(frames[frames.length-1].t-frames[0].t)/replayDivisor));
  if(result)result.classList.remove('show');
  banner?.classList.add('show');
  card.classList.add('race-replay');
  if(statusText)statusText.textContent='Replay finale';
  setRaceCommentary(card,'📺 Replay degli ultimi metri');
  let done=false;
  try{
    const animation=new Promise(resolve=>{
      const t0=performance.now();
      const step=now=>{
        try{
          if(done||!card.isConnected){resolve();return}
          const raw=Math.min(1,(now-t0)/replayDuration);
          const idx=Math.max(0,Math.min(frames.length-1,Math.floor(raw*(frames.length-1))));
          const frame=frames[idx]||frames[frames.length-1];
          if(!frame){resolve();return}
          for(const snap of frame.items||[]){
            const item=raceData[snap.index];
            if(!item?.runner?.isConnected)continue;
            const p=Math.max(0,Math.min(1,num(snap.p,0)));
            item.runner.style.transform=`translate3d(${(item.distance*p).toFixed(2)}px,0px,0) scale(1.02)`;
          }
          if(raw>=1){resolve();return}
          requestAnimationFrame(step);
        }catch(_){resolve()}
      };
      requestAnimationFrame(step);
    });
    const safety=raceSleep(replayDuration+650);
    await Promise.race([animation,safety]);
  }finally{
    done=true;
    banner?.classList.remove('show');
    card.classList.remove('race-replay');
    for(const item of raceData||[]){if(item?.runner?.isConnected)item.runner.style.transform=`translate3d(${item.distance.toFixed(2)}px,0px,0)`}
    if(result&&result.innerHTML.trim())result.classList.add('show');
  }
}
async function showWinnerCeremony(card,winner,variant,statusText){
  const panel=card?.querySelector('[data-winner-ceremony]');
  if(!panel||!winner)return;
  panel.innerHTML=`<div class="winner-ceremony-card"><span class="winner-ceremony-kicker">🏆 CERIMONIA DEL VINCITORE</span><div class="winner-ceremony-horse">${horseSvg(winner.color,variant)}</div><strong>${esc(winner.name)}</strong><small>1° classificato · numero uno della Top 3</small><span class="winner-ceremony-cup">🏆</span></div>`;
  panel.classList.add('show');
  card.classList.add('winner-spotlight');
  if(statusText)statusText.textContent=`Onore a ${winner.name}`;
  setRaceCommentary(card,`🏆 ${winner.name} trionfa sul traguardo!`);
  await raceSleep(2000);
  panel.classList.remove('show');
}
function top3LiveOrder(runners,progress){
  return runners.map(r=>({runner:r,name:r.dataset.raceName||'Giocatore',place:num(r.dataset.racePlace,3),color:r.dataset.raceColor||'#20f26f',progress:progress.get(r)||0,arrived:r.dataset.arrived==='1'})).sort((a,b)=>{if(a.arrived&&b.arrived)return a.place-b.place;if(a.arrived)return-1;if(b.arrived)return 1;return b.progress-a.progress||a.place-b.place});
}
function updateTop3LiveBoard(board,runners,progress){
  if(!board)return [];
  const ordered=top3LiveOrder(runners,progress);
  ordered.forEach((entry,index)=>{const slot=board.querySelector(`[data-live-pos="${index+1}"]`);if(!slot)return;slot.classList.toggle('is-leader',index===0);slot.classList.toggle('is-arrived',entry.arrived);const name=slot.querySelector('b'),small=slot.querySelector('small'),dot=slot.querySelector('.live-dot');if(name)name.textContent=entry.name;if(small)small.textContent=entry.arrived?'ARRIVATO':index===0?'IN TESTA':'INSEGUIMENTO';if(dot)dot.style.background=entry.color});
  return ordered;
}
async function top3Countdown(card,statusText){
  const overlay=card.querySelector('[data-race-countdown]'),value=overlay?.querySelector('span');
  const lights=[...card.querySelectorAll('[data-start-light]')];
  const gates=[...card.querySelectorAll('[data-gate]')];
  const raceVisual=currentRaceVisualProfile();
  const aiDirector=raceVisual.source==='ai-race-director'||raceVisual.source==='ai-analysis-fallback';
  setRaceCommentary(card,aiDirector?raceDirectorOpening(raceVisual):'I cavalli entrano nei cancelli di partenza…');
  if(aiDirector&&overlay){
    overlay.classList.add('director-intro');
    if(value){value.innerHTML='<small>✦ AI RACE DIRECTOR</small><b>'+esc(String(raceVisual.camera).toUpperCase())+' · '+esc(String(raceVisual.lighting).toUpperCase())+'</b>';value.classList.add('director-card')}
    await raceSleep(900);
    overlay.classList.remove('director-intro');
    value?.classList.remove('director-card');
  }
  for(const [index,item] of ['3','2','1','VIA!'].entries()){
    if(!card.isConnected||state.tab!=='top')return false;
    if(value){value.textContent=item;value.classList.remove('pop');void value.offsetWidth;value.classList.add('pop')}
    if(item!=='VIA!')lights[index]?.classList.add('is-on');
    if(item==='VIA!'){
      playCountdownDrum(item);playGateBurst();
      gates.forEach(g=>g.classList.add('is-open'));
      card.classList.add('race-live');
      if(statusText)statusText.textContent='Partiti!';
      setRaceCommentary(card,'🥁 VIA! I cancelli si aprono!');
    }else{
      playCountdownDrum(item);
      if(statusText)statusText.textContent=`Partenza in ${item}`;
      setRaceCommentary(card,`🥁 ${item}…`);
    }
    await raceSleep(item==='VIA!'?520:620);
  }
  overlay?.classList.add('is-hidden');
  return true;
}
async function startTop3Race(button,id){
  const t=state.own;if(!dataReady(t))return;
  const cfg=top3Rankings(t).find(x=>x.id===id);if(!cfg||!top3Placements(cfg).length)return;
  const card=button.closest('.top3-race-card');if(!card||card.dataset.racing==='1')return;
  // One active WebGL scene. Other cards can still be read.
  if(document.querySelector('.sr-host')){showToast('Termina la corsa in corso prima di avviarne un’altra.');return}
  card.dataset.racing='1';card.classList.remove('top3-locked','top3-revealed');card.classList.add('top3-racing','sr-card');
  card.innerHTML=`<div class="sr-header"><div><small>SISAL RACING CLUB</small><h3>${cfg.title}</h3></div><span>3D · WEBGL</span></div><div class="sr-host"><p class="sr-loading">Preparazione ippodromo 3D…</p></div><p class="sr-footnote">Animazione della classifica U5 · pubblico e audio locali · nessuna richiesta a Blob durante la corsa</p>`;
  const host=card.querySelector('.sr-host');
  const audio=window.SisalRaceAudio?.create(); // Unlock synchronously inside the user's click.
  try{
    const module=await import('./race-3d.js?v=32.1.34');
    const colors=['#37bc91','#e4b861','#659bdd'];
    const entries=shuffleCopy(top3Placements(cfg)).map((e,i)=>({name:String(e.player.name||'Giocatore'),place:e.place,tied:e.tied,score:e.score,color:colors[i%colors.length]}));
    if(!card.isConnected){audio?.dispose();return}
    host.querySelector('.sr-loading')?.remove();
    const completed=await module.runRace(host,entries,{profile:currentRaceVisualProfile(),audio,title:cfg.title});
    if(!card.isConnected||state.tab!=='top')return;
    if(!completed)showToast('3D non disponibile o interrotto: ecco la classifica.');
  }catch(error){audio?.dispose();host.replaceChildren();console.warn('race-3d-unavailable',error);if(!card.isConnected)return;showToast('Il 3D non è disponibile su questo browser. Ecco la classifica.',true)}
  audio?.dispose();
  if(card.isConnected&&state.tab==='top'){markTop3Seen(t,id);render()}
}

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
function technicalAnalyticsCard(t,title,scope){
  const recent=scope==='recent5';
  const data=recent?(t?.technical?.recent5||{}):(t?.technical?.historical||{});
  const matches=finiteValue(recent?t?.recent5?.team?.matches:displayTeamTotals(t)?.matches);
  const pass=data?.passes||{};
  const tackle=data?.tackles||{};
  const fmtCount=v=>finiteValue(v)==null?'—':shootingCount(v);
  const fmtRate=v=>finiteValue(v)==null?'—':finiteValue(v).toFixed(1)+'%';
  const fmtPer=(v,m)=>finiteValue(v)!=null&&m>0?(finiteValue(v)/m).toFixed(2):'—';
  const sourceBits=[];
  if(recent){
    if(pass.complete) sourceBits.push('Passaggi: '+(pass.estimated?'calcolati in parte':'dati partita reali'));
    else if(pass.totalMatches) sourceBits.push('Passaggi: copertura '+pass.knownMatches+'/'+pass.totalMatches);
    if(tackle.complete) sourceBits.push('Tackle: '+(tackle.estimated?'calcolati in parte':'dati partita reali'));
    else if(tackle.totalMatches) sourceBits.push('Tackle: copertura '+tackle.knownMatches+'/'+tackle.totalMatches);
  }else{
    if(pass.sourceLabel) sourceBits.push('Passaggi: '+pass.sourceLabel);
    if(tackle.sourceLabel) sourceBits.push('Tackle: '+tackle.sourceLabel);
  }
  const rows=[
    shootingMetricRow('Passaggi riusciti',fmtCount(pass.made)),
    shootingMetricRow('Passaggi tentati',fmtCount(pass.attempts)),
    shootingMetricRow('Precisione passaggi',fmtRate(pass.successRate)),
    shootingMetricRow('Passaggi riusciti / partita',fmtPer(pass.made,matches)),
    shootingMetricRow('Tentativi passaggio / partita',fmtPer(pass.attempts,matches)),
    shootingMetricRow('Tackle riusciti',fmtCount(tackle.made)),
    shootingMetricRow('Tackle tentati',fmtCount(tackle.attempts)),
    shootingMetricRow('Tackle riusciti %',fmtRate(tackle.successRate)),
    shootingMetricRow('Tackle riusciti / partita',fmtPer(tackle.made,matches)),
    shootingMetricRow('Tentativi tackle / partita',fmtPer(tackle.attempts,matches))
  ].join('');
  return '<div class="card rich-card"><div class="table-caption">'+esc(title)+'</div><div class="profile-list">'+rows+'</div><div class="analytics-note">'+esc(sourceBits.join(' · ')||'Valori ricavati dai JSON disponibili senza chiamate IA durante la visualizzazione.')+'</div></div>';
}
function technicalAnalyticsPanel(t){
  if(!t)return '';
  return '<div class="rich-grid" style="margin-top:10px"><div class="grid2">'+
    technicalAnalyticsCard(t,'🎯 Passaggi e tackle · STORICO','overall')+
    technicalAnalyticsCard(t,'🧱 Passaggi e tackle · ULTIME 5','recent5')+
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
function matchMetricRow(t,m){const own=ownClubInMatch(t,m),opp=oppClubInMatch(t,m),ps=(m.players||[]).filter(p=>!t.club?.id||!p.clubId||String(p.clubId)===String(t.club.id));let passM=0,passA=0,tackleM=0,tackleA=0,rateSum=0,rateN=0,assists=0;for(const p of ps){passM+=num(p.passesMade);passA+=p.passAttempts==null?0:num(p.passAttempts);tackleM+=num(p.tacklesMade);tackleA+=p.tackleAttempts==null?0:num(p.tackleAttempts);assists+=num(p.assists);if(p.rating!=null&&num(p.rating)>0){rateSum+=num(p.rating);rateN++;}}const aggregate=m?.aggregate?.[String(own?.id)];if(aggregate?.passStatsKnown){passM=num(aggregate.passesMade);passA=num(aggregate.passAttempts);}if(aggregate?.tackleStatsKnown){tackleM=num(aggregate.tacklesMade);tackleA=num(aggregate.tackleAttempts);}const shots=matchShotsValue(t,m);return {date:shortDate(m.timestamp),opponent:opp?.name||'—',result:matchResult(t,m),score:`${num(own?.goals)}-${num(opp?.goals)}`,pass:passA?`${(100*passM/passA).toFixed(1)}%`:'—',tackle:tackleA?`${(100*tackleM/tackleA).toFixed(1)}%`:'—',rating:rateN?(rateSum/rateN).toFixed(2):'—',shots:shots==null?'—':shootingCount(shots),assists};}
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
  ${shootingAnalyticsPanel(t)}${technicalAnalyticsPanel(t)}
  ${teamProfileTables(t)}
  <div class="analytics-grid" style="margin-top:10px">${trendChart(t)}</div>
  ${u5AnalysisPanel(t)}
  <div class="grid3" style="margin-top:10px">${['league','playoffs','friendlies'].map(k=>`<div class="card"><div class="section-title"><b>${competitionLabel(k)}</b><span class="tag">${parts[k]?.matches||0}</span></div><div class="muted">${parts[k]?.wins||0}V · ${parts[k]?.draws||0}P · ${parts[k]?.losses||0}S · ${parts[k]?.goals||0}-${parts[k]?.against||0}</div></div>`).join('')}</div>
  <div class="grid2" style="margin-top:10px"><div class="card"><h3>👥 Riconciliazione rosa</h3><div class="stats-grid">${stat(t.players?.length||0,'Giocatori visibili')}${stat(rq.matchOnlyCount||0,'Match-only')}${stat(rq.rosterOnlyCount||0,'Roster-only')}</div><div class="notice" style="margin-top:9px">I giocatori presenti nelle partite ma non nel file Giocatori <b>non vengono scartati</b>.${platforms.length?` Piattaforme lette: <b>${esc(platforms.join(' · '))}</b>.`:''}</div>${rq.matchOnlyPlayers?.length?`<div class="muted" style="margin-top:8px">Match-only: ${rq.matchOnlyPlayers.map(x=>esc(x.name)).join(', ')}</div>`:''}</div><div class="card"><h3>🛡️ Controllo automatico</h3><div class="section-title"><b>Affidabilità strutturale</b><span class="tag ${dq.ok?'live':'warn'}">${dq.score??'—'}/100</span></div>${dq.errors?.length?`<div class="message err">${dq.errors.map(x=>esc(x)).join('<br>')}</div>`:'<div class="message ok">✓ Nessun errore strutturale trovato nei dati caricati.</div>'}${dq.warnings?.length?`<div class="message" style="margin-top:7px">${dq.warnings.map(x=>esc(x)).join('<br>')}</div>`:''}</div></div>`
  )
}
function renderRecent(t,n=5,filter=''){
  const source=filter?(t?.matches||[]).filter(m=>m.competition===filter):(t?.matches||[]),ms=source.slice(0,n);
  if(!ms.length)return empty('Nessuna partita disponibile.');
  return `<div class="rank-list">${ms.map(m=>{const own=ownClubInMatch(t,m),op=oppClubInMatch(t,m),r=matchResult(t,m),ownGoals=num(own?.goals),oppGoals=num(op?.goals),boom=isGoalExplosionMatch(ownGoals,oppGoals);return `<div class="rank-row"><div class="rank-no ${r==='W'?'f-win':r==='L'?'f-loss':'f-draw'}">${r}</div><div><b>${esc(op?.name||'Avversario')}</b><small>${competitionLabel(m.competition)} · ${shortDate(m.timestamp)}</small></div><div class="rank-val${boom?' goal-explosion-trigger':''}"${goalExplosionAttributes(boom)}>${ownGoals}-${oppGoals}</div></div>`}).join('')}</div>`;
}
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
  const calculatedRows=ps.map(p=>({player:rowName(p),gpg:p.goalsPerGame==null?null:num(p.goalsPerGame).toFixed(2),apg:p.assistsPerGame==null?null:num(p.assistsPerGame).toFixed(2),gipg:p.goalInvolvementPerGame==null?null:num(p.goalInvolvementPerGame).toFixed(2),spg:p.shotsPerGame==null?null:num(p.shotsPerGame).toFixed(2),shpg:p.shots!=null&&num(p.goals)>0?(num(p.shots)/num(p.goals)).toFixed(2):null,conv:num(p.shots)>0?((100*num(p.goals)/num(p.shots)).toFixed(1)+'%'):null,ppg:p.passPerGame==null?null:num(p.passPerGame).toFixed(2),papg:p.passAttemptsPerGame==null?null:num(p.passAttemptsPerGame).toFixed(2),tpg:p.tacklePerGame==null?null:num(p.tacklePerGame).toFixed(2),tapg:p.tackleAttemptsPerGame==null?null:num(p.tackleAttemptsPerGame).toFixed(2),csr:p.cleanSheetRate==null?null:(num(p.cleanSheetRate).toFixed(1)+'%'),u5g:Array.isArray(p.previousGoals)?p.previousGoals.slice(0,5).join(' · '):null}));
  const exportRows=ps.map(p=>({player:rowName(p),ovr:p.ovr==null?null:num(p.ovr),games:p.games==null?null:num(p.games),win:p.winRate==null?null:`${num(p.winRate)}%`,goals:num(p.goals),assists:num(p.assists),rating:p.rating==null?null:num(p.rating).toFixed(2),shots:p.shots==null?null:(p.shotsEstimated?`~${num(p.shots)}`:num(p.shots)),shotPct:p.shotAccuracy==null?null:`${num(p.shotAccuracy)}%`,passMade:num(p.passesMade),passAtt:p.passAttempts==null?null:(p.passAttemptsEstimated?`~${num(p.passAttempts)}`:num(p.passAttempts)),passPct:p.passAccuracy==null?null:`${num(p.passAccuracy)}%`,tackleMade:num(p.tacklesMade),tackleAtt:p.tackleAttempts==null?null:(p.tackleAttemptsEstimated?`~${num(p.tackleAttempts)}`:num(p.tackleAttempts)),tacklePct:p.tackleSuccess==null?null:`${num(p.tackleSuccess)}%`,saves:num(p.saves),csDef:p.cleanSheetsDef==null?null:num(p.cleanSheetsDef),csGK:p.cleanSheetsGK==null?null:num(p.cleanSheetsGK),mom:num(p.mom),reds:num(p.redcards),fouls:p.fouls==null?null:num(p.fouls),u5g:Array.isArray(p.previousGoals)?p.previousGoals.slice(0,5).join(' · '):null}));
  return shell('GIOCATORI','Statistiche individuali',`
    <div class="toolbar"><div class="field"><label>Ricerca</label><input id="playerSearch" placeholder="Nome giocatore..."></div><div class="field"><label>Reparto</label><select id="playerDept"><option value="">Tutti</option><option value="GK">Portieri</option><option value="DEF">Difensori</option><option value="MID">Centrocampisti</option><option value="ATT">Attaccanti</option></select></div></div>
    <div class="notice" style="margin-bottom:10px"><b>STAGIONE / CUMULATIVO:</b> dati dal file Giocatori. L'OVR è quello esportato dal file, mentre l'Indice è un indicatore interno 0–100.</div>
    ${t.teamProfile?.playerPositionCount?`<div class="card rich-card" style="margin-bottom:10px"><div class="table-caption">🧩 Composizione rosa dal file Giocatori</div>${profileRows(Object.entries(t.teamProfile.playerPositionCount).map(([k,v])=>[k,v]))}</div>`:''}
    <div class="card rich-card"><div class="table-caption">👤 Prestazioni principali + indice</div>${richTable(seasonRows,{keys:['player','ovr','games','win','goals','assists','ga','rating','idx','form','mom','reds','u5g'],labels:{player:'Giocatore',ovr:'OVR',games:'PG',win:'Win %',goals:'Gol',assists:'Assist',ga:'G+A/PG',rating:'Voto',idx:'Indice',form:'Forma U5',mom:'MOTM',reds:'Rossi',u5g:'Forma gol export (5)'}})}<div class="analytics-note">Indice 0–100: 60% cumulativo + 40% U5 quando disponibile; pesi adattati al reparto. Non è l'OVR EA.</div></div>
    <div class="card rich-card" style="margin-top:10px"><div class="table-caption">🎯 Tecnica e difesa · ultime 5 partite</div>${richTable(techRows,{keys:['player','apps','shots','conversion','pass','passPct','tackles','tacklePct','saves','cleanDef','cleanGK','clean','reds','fouls'],labels:{player:'Giocatore',apps:'PG U5',shots:'Tiri U5',conversion:'Gol/Tiri %',pass:'Passaggi U5',passPct:'Pass % U5',tackles:'Contrasti U5',tacklePct:'Tackle % U5',saves:'Parate U5',cleanDef:'CS dif. U5',cleanGK:'CS GK U5',clean:'CS tot. U5',reds:'Rossi U5',fouls:'Falli U5'}})}<div class="analytics-note">Solo le ultime 5 partite archiviate. Tiri, passaggi, contrasti, parate e clean sheet sono aggregati dalle gare U5; le percentuali di passaggi e tackle sono ricalcolate dai tentativi U5. “Gol/Tiri %” è la realizzazione U5, non la percentuale di precisione al tiro del file cumulativo. Quando un giocatore non compare nelle U5 viene mostrato “—”, non “0”.</div></div>
    <div class="card rich-card" style="margin-top:10px"><div class="table-caption">🧮 Rapporti per partita</div>${richTable(calculatedRows,{keys:['player','gpg','apg','gipg','spg','shpg','conv','ppg','papg','tpg','tapg','csr','u5g'],labels:{player:'Giocatore',gpg:'Gol/PG',apg:'Assist/PG',gipg:'G+A/PG',spg:'Tiri/PG',shpg:'Tiri/Gol',conv:'Realizzazione %',ppg:'Pass riusciti/PG',papg:'Pass tent./PG',tpg:'Tackle riusciti/PG',tapg:'Tackle tent./PG',csr:'CS/PG',u5g:'Forma gol export (5)'}})}<div class="analytics-note">Rapporti calcolati nello stesso scope delle statistiche di base.</div></div>
    <div class="card rich-card" style="margin-top:10px"><div class="table-caption">📋 Tutti i principali valori dell'export giocatori</div>${richTable(exportRows,{keys:['player','ovr','games','win','goals','assists','rating','shots','shotPct','passMade','passAtt','passPct','tackleMade','tackleAtt','tacklePct','saves','csDef','csGK','mom','reds','fouls','u5g'],labels:{player:'Giocatore',ovr:'OVR',games:'PG',win:'Win %',goals:'Gol',assists:'Assist',rating:'Voto',shots:'Tiri',shotPct:'Realizzazione export %',passMade:'Pass riusciti',passAtt:'Tentativi',passPct:'Pass %',tackleMade:'Tackle riusciti',tackleAtt:'Tentativi',tacklePct:'Tackle %',saves:'Parate',csDef:'CS dif.',csGK:'CS GK',mom:'MOTM',reds:'Rossi',fouls:'Falli',u5g:'Forma gol export (5)'}})}<div class="analytics-note">Questa tabella raccoglie i principali campi numerici presenti nell'export reale. I 5 valori di forma mostrati derivano dai primi 5 campi prevGoals dell'export, senza reinterpretarne l'ordine. I codici non interpretati restano nei dati sorgente per l'IA.</div></div>
    <div class="card rich-card" style="margin-top:10px"><div class="table-caption">🧬 Profilo Pro</div>${richTable(profileRowsData,{keys:['player','pro','posCode','style','height','nationality','favorite','platform'],labels:{player:'Giocatore',pro:'Pro name',posCode:'ProPos',style:'ProStyle',height:'Altezza',nationality:'Nazionalità',favorite:'Posizione',platform:'Piattaforma'}})}<div class="source-note">I codici ProPos/ProStyle/Nazionalità vengono mostrati come presenti nel file.</div></div>
    <div class="card rich-card" style="margin-top:10px"><div class="table-caption">📈 Carriera giocatori</div>${richTable(careerRows,{keys:['player','games','goals','assists','mom','rating','position','proPos'],labels:{player:'Giocatore',games:'PG carriera',goals:'Gol',assists:'Assist',mom:'MOTM',rating:'Rating',position:'Posizione',proPos:'ProPos'}})}</div>
    <div class="notice" style="margin:12px 0 10px"><b>ULTIME 5 PARTITE:</b> solo le cinque gare archiviate più recenti.</div>
    <div class="card rich-card">${richTable(recentRows,{keys:['player','games','goals','assists','rating','shots','passes','tackles','saves','clean','mom','reds','minutes'],labels:{player:'Giocatore',games:'PG U5',goals:'Gol U5',assists:'Assist U5',rating:'Voto',shots:'Tiri',passes:'Pass',tackles:'Tackle',saves:'Parate',clean:'CS',mom:'MOTM',reds:'Rossi',minutes:'Minuti'}})}</div>`);
}
function topPage(){const t=state.own;if(!dataReady(t))return shell('TOP 3','Classifiche',empty('Carica i dati della squadra.'));const rankings=top3Rankings(t);top3UnlockState(t);return shell('TOP 3','Classifiche · ultime 5 partite',`<div class="notice" style="margin-bottom:10px"><b>SOLO ULTIME 5:</b> questa sezione usa esclusivamente le 5 partite archiviate più recenti. Ogni nuova versione dei JSON della squadra riblocca le classifiche solo su questo dispositivo.</div><div class="grid2">${rankings.map(cfg=>top3Card(t,cfg)).join('')}</div>`)}
function playerInitials(name){const parts=String(name||'').trim().split(/\s+/).filter(Boolean);if(!parts.length)return'FC';if(parts.length===1)return parts[0].slice(0,2).toUpperCase();return (parts[0][0]+parts[parts.length-1][0]).toUpperCase()}
function playerRoleGroup(position){const d=department(position||'');return d||'PRO'}
function playerHeroSvg(){return `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="pg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#2cff7b"/><stop offset="1" stop-color="#087f3a"/></linearGradient></defs><circle cx="60" cy="60" r="58" fill="#06150a" stroke="#2a6a42" stroke-width="2"/><circle cx="60" cy="42" r="18" fill="url(#pg)"/><path d="M27 97c4-24 18-36 33-36s29 12 33 36" fill="url(#pg)"/><path d="M42 42c3-11 10-17 18-17s15 6 18 17" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2"/><path d="M37 84c8-9 15-13 23-13s15 4 23 13" fill="none" stroke="rgba(255,255,255,.24)" stroke-width="2"/></svg>`}
function playerPhotoKey(p){return String(p?.id||p?.name||'unknown')}
const PLAYER_PHOTO_DB='sisal-fc-player-photos-v1';
const sharedPlayerPhotoCache=new Map();
function legacyPlayerPhotoDb(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('indexeddb-unavailable'));return}
    const req=indexedDB.open(PLAYER_PHOTO_DB,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos')};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('indexeddb-error'));
  });
}
async function legacyPlayerPhotoGet(p){
  try{const db=await legacyPlayerPhotoDb();return await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readonly');const req=tx.objectStore('photos').get(playerPhotoKey(p));req.onsuccess=()=>resolve(req.result||'');req.onerror=()=>reject(req.error)});}catch{return ''}
}
async function legacyPlayerPhotoDelete(p){
  try{const db=await legacyPlayerPhotoDb();await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').delete(playerPhotoKey(p));tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)});return true}catch{return false}
}
async function fetchSharedPlayerPhoto(p,{force=false}={}){
  const key=playerPhotoKey(p);
  if(!force&&sharedPlayerPhotoCache.has(key))return sharedPlayerPhotoCache.get(key)||'';
  const r=await fetch(`/api/player-photo?playerKey=${encodeURIComponent(key)}`,{cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||`Errore foto HTTP ${r.status}`);
  const data=typeof d.dataUrl==='string'?d.dataUrl:'';
  sharedPlayerPhotoCache.set(key,data);
  return data;
}
async function saveSharedPlayerPhoto(p,dataUrl){
  const key=playerPhotoKey(p);
  const r=await fetch('/api/player-photo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'save',playerKey:key,playerName:String(p?.name||key),dataUrl})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||`Errore foto HTTP ${r.status}`);
  sharedPlayerPhotoCache.set(key,dataUrl);
  await legacyPlayerPhotoDelete(p);
  return true;
}
async function removeSharedPlayerPhoto(p){
  const key=playerPhotoKey(p);
  const r=await fetch('/api/player-photo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'remove',playerKey:key})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||`Errore foto HTTP ${r.status}`);
  sharedPlayerPhotoCache.set(key,'');
  await legacyPlayerPhotoDelete(p);
  return true;
}
async function playerPhotoGet(p){
  try{
    const shared=await fetchSharedPlayerPhoto(p);
    if(shared)return shared;
  }catch(e){
    const legacy=await legacyPlayerPhotoGet(p);
    if(legacy)return legacy;
    throw e;
  }
  const legacy=await legacyPlayerPhotoGet(p);
  if(legacy){
    try{
      await saveSharedPlayerPhoto(p,legacy);
      showToast('✓ Foto esistente trasferita e condivisa con tutta la squadra');
    }catch{}
    return legacy;
  }
  return '';
}
async function playerPhotoSet(p,dataUrl){return saveSharedPlayerPhoto(p,dataUrl)}
async function playerPhotoDelete(p){return removeSharedPlayerPhoto(p)}
async function preparePlayerPhoto(file){
  if(!file||!String(file.type||'').startsWith('image/'))throw new Error('Scegli un file immagine.');
  if(file.size>12*1024*1024)throw new Error('Immagine troppo grande. Usa una foto sotto 12 MB.');
  const raw=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Lettura immagine fallita'));reader.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const x=new Image();x.onload=()=>resolve(x);x.onerror=()=>reject(new Error('Immagine non valida'));x.src=raw});
  const side=Math.min(img.naturalWidth||img.width,img.naturalHeight||img.height),sx=((img.naturalWidth||img.width)-side)/2,sy=((img.naturalHeight||img.height)-side)/2;
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,sx,sy,side,side,0,0,480,480);
  return canvas.toDataURL('image/jpeg',.84);
}
async function loadPlayerPhotoIntoModal(p){
  const wrap=el('modalRoot');if(!wrap)return;const img=wrap.querySelector('[data-player-photo-img]'),art=wrap.querySelector('[data-player-avatar-art]'),remove=wrap.querySelector('[data-player-photo-remove]'),status=wrap.querySelector('[data-player-photo-status]');if(!img||!art)return;
  try{
    if(status)status.textContent='Caricamento foto condivisa…';
    const data=await playerPhotoGet(p);if(!wrap.contains(img))return;
    if(data){img.src=data;img.hidden=false;art.hidden=true;if(remove)remove.hidden=false;if(status)status.textContent='Foto condivisa · visibile a tutti'}else{img.removeAttribute('src');img.hidden=true;art.hidden=false;if(remove)remove.hidden=true;if(status)status.textContent='Nessuna foto condivisa'}
  }catch(e){
    img.removeAttribute('src');img.hidden=true;art.hidden=false;if(remove)remove.hidden=true;if(status)status.textContent='Foto condivisa non disponibile';
  }
}
async function choosePlayerPhoto(p){
  const input=document.createElement('input');input.type='file';input.accept='image/*';
  input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{showToast('Preparazione e caricamento foto condivisa…');const data=await preparePlayerPhoto(file);await playerPhotoSet(p,data);await loadPlayerPhotoIntoModal(p);showToast('✓ Foto condivisa: ora è visibile su tutti i dispositivi')}catch(e){showToast(e.message||'Impossibile salvare la foto condivisa.',true)}};
  input.click();
}
function playerModal(id){
  const t=state.own;if(!t)return;
  const p=(t.players||[]).find(x=>String(x.id)===String(id))||(t.players||[]).find(x=>String(x.name)===String(id));if(!p)return;
  const r=p.recent5||null,c=p.career||null,prev=Array.isArray(p.previousGoals)?p.previousGoals.filter(v=>v!=null).join(' · '):'';
  const initials=playerInitials(p.name),role=playerRoleGroup(p.position||p.favoritePosition||''),ovr=p.ovr==null?'—':num(p.ovr),rating=p.rating==null?'—':num(p.rating).toFixed(2);
  const seasonStats=`<div class="player-stat-grid">${stat(p.games==null?'—':num(p.games),'PG stagione')}${stat(num(p.goals),'Gol')}${stat(num(p.assists),'Assist')}${stat(rating,'Rating')}${stat(p.winRate==null?'—':num(p.winRate)+'%','Win rate')}${stat(p.shots==null?'—':num(p.shots),p.shotsEstimated?'Tiri stimati':'Tiri')}${stat(num(p.shots)>0?(100*num(p.goals)/num(p.shots)).toFixed(1)+'%':'—','Realizzazione')}${stat(p.passAccuracy==null?'—':num(p.passAccuracy)+'%','Pass %')}${stat(p.tackleSuccess==null?'—':num(p.tackleSuccess)+'%','Tackle %')}${stat(num(p.cleanSheets),'Clean sheet')}${stat(num(p.mom),'MOTM')}${stat(num(p.redcards),'Rossi')}</div>`;
  const recentStats=r?`<div class="player-profile-section"><div class="player-section-title"><span>🔥</span><div><b>Ultime 5</b><small>Forma recente</small></div></div><div class="player-stat-grid">${stat(r.appearances,'PG U5')}${stat(r.goals,'Gol U5')}${stat(r.assists,'Assist U5')}${stat(r.rating==null?'—':num(r.rating).toFixed(2),'Rating U5')}${stat(r.shots,'Tiri U5')}${stat(r.passAttempts?`${r.passesMade}/${r.passAttempts}`:'—','Pass U5')}${stat(r.tackleAttempts?`${r.tacklesMade}/${r.tackleAttempts}`:'—','Tackle U5')}${stat(r.saves,'Parate U5')}${stat(r.cleanSheets,'CS U5')}${stat(r.mom,'MOTM U5')}${stat(r.redcards,'Rossi U5')}${stat(r.secondsPlayed==null?'—':(num(r.secondsPlayed)/60).toFixed(1),'Minuti U5')}</div></div>`:'';
  const careerStats=c?`<div class="player-profile-section"><div class="player-section-title"><span>📈</span><div><b>Carriera</b><small>Statistiche cumulative</small></div></div><div class="player-stat-grid">${stat(c.games==null?'—':num(c.games),'PG carriera')}${stat(c.goals,'Gol carriera')}${stat(c.assists,'Assist carriera')}${stat(c.mom,'MOTM carriera')}${stat(c.rating==null?'—':num(c.rating).toFixed(2),'Rating carriera')}</div></div>`:'';
  el('modalRoot').innerHTML=`<div class="modal player-profile-modal"><div class="modal-inner player-profile-card" data-shareable-target="1" data-share-title="Scheda giocatore · ${esc(p.name)}"><button class="close player-profile-close share-exclude" id="closeModal" aria-label="Chiudi">✕</button><div class="player-profile-hero"><div class="player-avatar"><img class="player-photo" data-player-photo-img alt="Foto di ${esc(p.name)}" hidden><div class="player-avatar-art" data-player-avatar-art>${playerHeroSvg()}</div><span>${esc(initials)}</span></div><div class="player-identity"><div class="kicker">SISAL FC 2021 · PLAYER CARD</div><h2>${esc(p.name)}</h2><div class="player-chips"><span>${esc(role)}</span><span>OVR ${esc(ovr)}</span>${p.platform?`<span>${esc(p.platform)}</span>`:''}</div>${p.proName?`<div class="player-pro-name">${esc(p.proName)}</div>`:''}</div><div class="player-ovr-badge"><strong>${esc(ovr)}</strong><small>OVR</small></div><div class="player-photo-actions share-exclude"><button type="button" class="btn player-photo-btn" data-player-photo-add>📷 Aggiungi / cambia foto condivisa</button><button type="button" class="btn ghost player-photo-remove" data-player-photo-remove hidden>🗑️ Rimuovi foto</button><small class="player-photo-status" data-player-photo-status>Caricamento foto condivisa…</small></div></div><div class="player-profile-section"><div class="player-section-title"><span>⚽</span><div><b>Stagione</b><small>Statistiche principali</small></div></div>${seasonStats}</div>${recentStats}${careerStats}<div class="player-profile-section player-profile-extra"><div class="player-section-title"><span>🧾</span><div><b>Profilo Pro</b><small>Dati esportati</small></div></div>${profileRows([['Posizione preferita',p.favoritePosition||p.position||null],['Pro name',p.proName||null],['Altezza',p.proHeight==null?null:num(p.proHeight)+' cm'],['Nazionalità codice',p.proNationality],['Piattaforma',p.platform],['Goal precedenti',prev||null]])}</div><div class="share-actions share-exclude"><button type="button" class="share-btn" data-share-player="1">📤 <span>Condividi scheda giocatore</span></button></div></div></div>`;
  const close=()=>{el('modalRoot').innerHTML=''};
  if(el('closeModal'))el('closeModal').onclick=close;
  el('modalRoot').onclick=e=>{if(e.target?.classList?.contains('modal'))close()};
  const share=el('modalRoot').querySelector('[data-share-player]');if(share)share.onclick=()=>shareTargetFromButton(share);
  const addPhoto=el('modalRoot').querySelector('[data-player-photo-add]');if(addPhoto)addPhoto.onclick=()=>choosePlayerPhoto(p);
  const removePhoto=el('modalRoot').querySelector('[data-player-photo-remove]');if(removePhoto)removePhoto.onclick=async()=>{try{await playerPhotoDelete(p);await loadPlayerPhotoIntoModal(p);showToast('✓ Foto condivisa rimossa per tutti')}catch(e){showToast(e.message||'Impossibile rimuovere la foto condivisa.',true)}};
  loadPlayerPhotoIntoModal(p);
}

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
function matchesPage(){const t=state.own;if(!dataReady(t))return shell('PARTITE','Archivio',empty('Carica i dati della squadra.'));const ms=(t.matches||[]).filter(m=>!state.matchFilter||m.competition===state.matchFilter);const domId=m=>`det_${String(m.competition||'x')}_${String(m.id||'x')}`.replace(/[^a-zA-Z0-9_-]/g,'_');return shell('PARTITE','Archivio completo',`<div class="notice" style="margin-bottom:10px"><b>ARCHIVIO PARTITE:</b> ${t.overall?.matches||0} partite totali nelle categorie realmente caricate. Questa lista è la fonte della finestra U5 e non modifica le statistiche cumulative.</div><div class="toolbar"><div class="field"><label>Competizione</label><select id="matchFilter"><option value="">Tutte</option><option value="league" ${state.matchFilter==='league'?'selected':''}>Campionato</option><option value="playoffs" ${state.matchFilter==='playoffs'?'selected':''}>Playoff</option><option value="friendlies" ${state.matchFilter==='friendlies'?'selected':''}>Amichevoli</option></select></div></div><div class="muted">${ms.length} partite archiviate.</div><div class="match-grid" style="margin-top:9px">${ms.map(m=>{const own=ownClubInMatch(t,m),op=oppClubInMatch(t,m),r=matchResult(t,m),ps=(m.players||[]).filter(p=>!t.club?.id||String(p.clubId)===String(t.club.id)),id=domId(m),ownGoals=num(own?.goals),oppGoals=num(op?.goals),boom=isGoalExplosionMatch(ownGoals,oppGoals);return `<article class="match-card"><div class="match-top"><span>${competitionLabel(m.competition)} · ${formatDate(m.timestamp)}</span><span>#${esc(m.id)}</span></div><div class="score-grid"><div class="team-side"><b>${esc(own?.name||t.club.name)}</b></div><strong class="score-big${boom?' goal-explosion-trigger':''}"${goalExplosionAttributes(boom)}>${ownGoals}-${oppGoals}</strong><div class="team-side"><b>${esc(op?.name||'Avversario')}</b></div></div><span class="result-pill ${resultClass(r)}">${resultLabel(r)}</span>${ps.length?`<button class="btn" data-match="${esc(id)}" style="margin-top:10px;width:100%">Statistiche partita</button><div class="match-detail hidden" id="${esc(id)}"><div class="table-wrap"><table><thead><tr><th>Giocatore</th><th>Gol</th><th>Assist</th><th>Voto</th><th>Tiri</th><th>Pass</th><th>Tackle</th><th>Parate</th><th>Gol subiti</th><th>CS</th><th>Rossi</th><th>Minuti</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.goals||0}</td><td>${p.assists||0}</td><td>${p.rating==null?'—':num(p.rating).toFixed(2)}</td><td>${p.shots==null?'—':num(p.shots)}</td><td>${p.passAttempts?`${p.passesMade}/${p.passAttempts}`:'—'}</td><td>${p.tackleAttempts?`${p.tacklesMade}/${p.tackleAttempts}`:'—'}</td><td>${p.saves==null?'—':num(p.saves)}</td><td>${p.goalsConceded==null?'—':num(p.goalsConceded)}</td><td>${p.cleanSheets==null?'—':num(p.cleanSheets)}</td><td>${p.redcards==null?'—':num(p.redcards)}</td><td>${p.secondsPlayed==null?'—':(num(p.secondsPlayed)/60).toFixed(1)}</td></tr>`).join('')}</tbody></table></div></div>`:''}</article>`}).join('')}</div>`)}
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

function opponentPage(){const t=state.opponent;if(!dataReady(t))return shell('AVVERSARIO','Scouting',`<div class="hero"><div class="kicker">DATASET CONDIVISO</div><h2>Avversario non caricato</h2><p>Carica i file disponibili dell’avversario dalla sezione I tuoi dati.</p><button class="btn primary" data-goto="data">⚙️ Apri I tuoi dati</button></div>`);return shell('AVVERSARIO',t.club?.name||'Avversario',`<div class="grid2 compact-stat-sections"><div class="card"><div class="section-title"><b>📊 TOTALE STORICO</b></div>${totalTable(t)}</div><div class="card"><div class="section-title"><b>🔥 ULTIME 5</b><span class="tag">${t.recent5?.matches?.length||0}</span></div>${totalTable(t,'recent5')}</div></div>${shootingAnalyticsPanel(t)}${technicalAnalyticsPanel(t)}${teamProfileTables(t)}<div class="analytics-grid" style="margin-top:10px">${trendChart(t)}</div>${u5AnalysisPanel(t)}<div class="card" style="margin-top:10px"><h3>Scouting IA</h3><p class="muted">L’IA usa anche OVR, indice rendimento, statistiche giocatore, carriera, Overall Stats e dati club quando presenti.</p><button class="btn primary" id="askOpponentAI">✦ Analizza avversario</button><div class="ai-result" id="opAIResult" style="margin-top:9px">${esc(state.aiResults.opponent||'')}</div></div>`)}
function aiPage(){const opponentMode=state.aiMode==='opponent',modeKey=opponentMode?'opponent':'normal';return shell('IA','Assistente tattico',`<div class="grid2"><div class="card"><div class="kicker">GEMINI 3.5 FLASH-LITE</div><h3>${opponentMode?'Scouting avversario':'Analisi della squadra'}</h3><div class="two-actions" style="margin-bottom:9px"><button class="btn ${!opponentMode?'primary':''}" id="aiTeamMode">Squadra</button><button class="btn ${opponentMode?'primary':''}" id="aiOppMode">Avversario</button></div><textarea id="aiQ" placeholder="Esempio: confronta statistiche cumulative e ultime 5 senza mescolarle."></textarea><div class="two-actions" style="margin-top:9px"><button class="btn primary" id="askAI">✦ Analizza</button><button class="btn" data-q="Analizza i punti deboli usando le statistiche STAGIONALI/CUMULATIVE del file Giocatori.">Stagione</button><button class="btn" data-q="Analizza esclusivamente le ULTIME 5 partite e indicami i problemi recenti.">Ultime 5</button><button class="btn" data-q="Quali giocatori sono migliori nelle statistiche STAGIONALI/CUMULATIVE e perché?">Giocatori</button><button class="btn" data-q="Confronta la nostra squadra con l’avversario distinguendo archivio, stagione e ultime 5.">Confronto</button></div></div><div class="card"><h3>Risposta</h3><div class="ai-result" id="aiResult">${esc(state.aiResults[modeKey]||'L’IA legge direttamente il dataset centrale e mantiene separati i periodi.')}</div></div></div><div class="notice" style="margin-top:10px">Cumulativo = file Giocatori. U5 = ultime 5 partite archiviate. Archivio = tutte le partite caricate. Questi scope non vengono mescolati.</div>`)}
function dataPage(){return shell('DATI','Archivio centrale',`<div class="hero"><div class="kicker">UNA VOLTA SOLA PER TUTTA LA SQUADRA</div><h2>Carica i dati disponibili</h2><p>Puoi caricare fino a <b>10 file</b>: il sito riconosce automaticamente la struttura e assegna ogni export alla categoria corretta.</p><div class="two-actions"><span class="tag live">File opzionali</span><span class="tag">Archivio condiviso</span></div></div><div class="grid2"><div>${teamDataCard('own','La tua squadra')}</div><div>${teamDataCard('opponent','Avversario')}</div></div><div class="card" style="margin-top:10px"><h3>🧠 Controllo dati</h3><p class="muted">Le ultime 5 derivano dai match caricati. Il totale storico ufficiale viene dal file Dati totali riconosciuto automaticamente e verificato dal sistema.</p><button class="btn primary" id="auditAI">✦ Controlla il dataset con IA</button><div class="ai-result" id="auditAIResult" style="margin-top:9px">${esc(state.aiResults.audit||'')}</div></div><div class="card" style="margin-top:10px"><h3>Come vengono separati i dati</h3><p class="muted"><b>Dati totali</b> = totale storico della squadra. <b>Giocatori</b> = statistiche cumulative dei giocatori. <b>Stagione corrente / Overall Stats / Carriera / Info club / Achievements</b> = sorgenti informative separate. <b>Campionato / Playoff / Amichevoli</b> = archivio delle partite. <b>U5</b> = ultime 5 partite dell’archivio. Nessuna finestra recente modifica il totale storico.</p><p class="muted">I giocatori presenti nelle partite ma assenti dal file Giocatori non vengono scartati: vengono segnalati come <b>match-only</b>.</p></div><div class="card" style="margin-top:10px"><h3>📱 Installa su Android</h3><p class="muted">Su Android puoi installare questo sito come app.</p><button class="btn primary" id="installAndroid">⬇️ Installa / Scarica su Android</button><div id="installAndroidHelp" class="muted" style="margin-top:8px"></div></div><div class="card" style="margin-top:10px"><h3>Note squadra</h3><textarea id="notes" placeholder="Note tattiche, ruoli, cose da provare...">${esc(state.notes)}</textarea><button class="btn" id="saveNotes" style="margin-top:8px">Salva note</button></div>`)}
function teamDataCard(role,title){
  const t=team(role),fs=t?.fileStatus||{},cats=DATA_FILES;
  return `<div class="card sync-card"><div class="section-title"><b>${title}</b><span class="tag ${complete(t)?'live':fileCount(t)?'warn':''}">${fileCount(t)}/${DATA_FILES.length}</span></div><div class="muted" style="margin-bottom:9px">${esc(t?.club?.name||'Nessun dato caricato')}</div><div class="notice" style="margin-bottom:9px"><b>Riconoscimento automatico:</b> il sistema assegna i file alla categoria corretta in base alla struttura reale dell’export.</div><div class="file-slots">${cats.map(([cat,label])=>{const f=fs[cat];return `<div class="file-slot"><div><b>${label}</b><small>${f?.present?esc(f.fileName):'Non caricato'}${f?.aiRecognition?.category?` · IA: ${esc(f.aiRecognition.category)}`:''}</small></div><button class="btn" data-upload-role="${role}">${f?.present?'Aggiorna':'Carica'}</button></div>`}).join('')}</div><div class="two-actions" style="margin-top:10px"><button class="btn primary" data-upload-all="${role}">📦 Carica file · riconoscimento automatico</button><button class="btn danger" data-delete-role="${role}">🗑️ Cancella tutti i dati</button></div><div class="messages" id="${role}Messages"></div></div>`;
}
function updateAICoverage(){}
async function callAI(question,mode='normal',targetId='aiResult'){
  const target=el(targetId)||el('aiResult'),q=String(question||'').trim();
  if(!q){if(target)target.textContent='Scrivi una domanda oppure usa uno dei pulsanti rapidi.';return}
  if(target)target.textContent='⏳ Gemini sta analizzando il dataset centrale…';
  const normalizedMode=['opponent','fun','audit','fouls','formation'].includes(mode)?mode:'normal';
  const outboundQuestion=raceDirectorQuestion(q,normalizedMode);
  try{
    const r=await fetch('/api/assistente',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:outboundQuestion,mode:normalizedMode,notes:state.notes,formation:state.formation,formationCatalog:FORMATIONS.map(name=>({name,roles:FORM_ROWS[name]})),knowledge:state.knowledge})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Object.assign(new Error(d.error||`Errore IA HTTP ${r.status}`),{code:d.code,status:r.status});
    const parsed=splitRaceDirectorAnswer(String(d.answer||''));
    const answer=String(parsed.answer||'').trim()||'Gemini non ha restituito una risposta.';
    state.aiResults[normalizedMode]=answer;
    if(['normal','opponent','formation'].includes(normalizedMode))rememberRaceVisualFromAI(answer,parsed.director);
    if(normalizedMode==='formation'){
      state.aiFormationRecommendation=d.recommendation||null;render();showToast(`✓ Consiglio formazione IA ricevuto · ${d.model||'Gemini'}`);return
    }
    if(target)target.textContent=answer;
    showToast(parsed.director?`✓ Analisi IA + Race Director aggiornato · ${d.model||'Gemini'}`:`✓ Analisi IA completata · ${d.model||'Gemini'}`)
  }catch(e){
    const msg=e?.code?`${e.code}: ${e.message||'Errore IA'}`:(e?.message||'Errore durante l’analisi IA.');
    if(target)target.textContent=`✕ ${msg}`;showToast(msg,true)
  }
}
async function loadSharedData(){state.loadingShared=true;render();let loaded=false;try{const r=await fetch('/api/club-data',{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Errore HTTP ${r.status}`);state.own=d.teams?.own||null;state.opponent=d.teams?.opponent||null;state.sharedError='';loaded=true}catch(e){state.own=null;state.opponent=null;state.sharedError=e.message||'Archivio non disponibile'}finally{state.loadingShared=false;if(loaded)syncNumericBaseline({compare:true});render()}}
async function uploadOne(role,file,forcedCategory=''){if(!file)return;const beforeSnapshots=captureAllNumericSnapshots();const box=el(`${role}Messages`);if(box)box.innerHTML=`<div class="message">⏳ Analizzo ${esc(file.name)} e salvo la categoria corretta…</div>`;const form=new FormData();form.set('role',role);if(forcedCategory)form.set('category',forcedCategory);form.set('file',file);try{const r=await fetch('/api/club-data',{method:'POST',body:form});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Errore HTTP ${r.status}`);const catLabel={players:'Giocatori',league:'Campionato',playoffs:'Playoff',friendlies:'Amichevoli'}[d.category]||d.category;if(d.team){if(role==='opponent')state.opponent=d.team;else state.own=d.team;state.sharedError='';const afterSnapshots=captureAllNumericSnapshots();rememberNumericChanges(beforeSnapshots,afterSnapshots);saveNumericBaseline(afterSnapshots);render()}showToast(`✓ ${file.name} riconosciuto come ${catLabel}`)}catch(e){if(box)box.innerHTML=`<div class="message err">✕ ${esc(e.message)}</div>`;showToast(e.message||'Caricamento fallito',true)}}
async function uploadAll(role,files){const list=[...files];if(!list.length || list.length>10){showToast('Seleziona da 1 a 10 file.',true);return}for(const f of list)await uploadOne(role,f)}

async function deleteRole(role){if(!confirm(`Cancellare tutti i 10 file della ${role==='own'?'tua squadra':'squadra avversaria'} dal server?`))return;const beforeSnapshots=captureAllNumericSnapshots();try{const r=await fetch(`/api/club-data?role=${encodeURIComponent(role)}`,{method:'DELETE'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Errore HTTP ${r.status}`);if(d.team){if(role==='opponent')state.opponent=d.team;else state.own=d.team;state.sharedError='';const afterSnapshots=captureAllNumericSnapshots();rememberNumericChanges(beforeSnapshots,afterSnapshots);saveNumericBaseline(afterSnapshots);render()}showToast('✓ Dati cancellati dal server')}catch(e){showToast(e.message||'Cancellazione fallita',true)}}
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;const b=el('installAndroid');const h=el('installAndroidHelp');if(b)b.textContent='⬇️ Installa / Scarica su Android';if(h)h.textContent='Pronto: premi il pulsante per installare l’app.'});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;const h=el('installAndroidHelp');if(h)h.textContent='✓ App installata su Android.'});
async function installAndroid(){const b=el('installAndroid'),h=el('installAndroidHelp');if(deferredInstallPrompt){deferredInstallPrompt.prompt();const choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;if(h)h.textContent=choice.outcome==='accepted'?'✓ Installazione avviata.':'Installazione annullata.';return}if(h)h.textContent='Su Android apri il sito con Chrome → menu ⋮ → “Installa app” oppure “Aggiungi a schermata Home”.';if(b)b.disabled=false}
function launchLogoEasterEgg(){
  if(document.querySelector('.sisal-easter'))return;
  try{navigator.vibrate?.([35,45,75])}catch{}
  const lines=['SISAL FC 2021','CLUB MODE ATTIVATA','CHI MOLLA NON È DEL SISAL'];
  const overlay=document.createElement('div');overlay.className='sisal-easter';
  overlay.innerHTML=`<div class="sisal-easter-backdrop"></div><div class="sisal-easter-core"><div class="sisal-easter-ring"></div><img src="./assets/sisal-branding.png" alt="Sisal FC 2021"><span>${lines[1]}</span><strong>${lines[0]}</strong><small>${lines[2]}</small></div><div class="sisal-easter-particles">${Array.from({length:22},(_,i)=>`<i style="--i:${i};--x:${(i*37)%100};--d:${(i%7)*.08}s"></i>`).join('')}</div>`;
  document.body.appendChild(overlay);requestAnimationFrame(()=>overlay.classList.add('show'));
  const close=()=>{overlay.classList.remove('show');setTimeout(()=>overlay.remove(),420)};
  overlay.onclick=close;setTimeout(close,3200);
}
function bindLogoEasterEgg(){
  const brand=document.querySelector('.club-brand');if(!brand||brand.dataset.easterBound==='1')return;brand.dataset.easterBound='1';
  const img=brand.querySelector('img');if(img){img.draggable=false;img.addEventListener('dragstart',e=>e.preventDefault())}
  brand.addEventListener('click',e=>{e.preventDefault();launchLogoEasterEgg()});
}
function bind(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render();window.scrollTo({top:0,behavior:'smooth'})});document.querySelectorAll('[data-top3-race]').forEach(b=>b.onclick=()=>startTop3Race(b,b.dataset.top3Race));document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.goto;render()});const save=el('saveNotes'),notes=el('notes');if(save&&notes)save.onclick=()=>{state.notes=notes.value;jset(K.notes,state.notes);showToast('✓ Note salvate')};const formation=el('formation');if(formation)formation.onchange=()=>{state.formation=formation.value;jset(K.formation,state.formation);render()};const auto=el('autoLineup');if(auto)auto.onclick=autoLineup;const clear=el('clearLineup');if(clear)clear.onclick=()=>{state.lineups[state.formation]={};jset(K.lineups,state.lineups);render()};document.querySelectorAll('[data-slot]').forEach(s=>s.onchange=()=>{state.lineups[state.formation] ||= {};state.lineups[state.formation][s.dataset.slot]=s.value;jset(K.lineups,state.lineups);render()});document.querySelectorAll('[data-pitch-slot]').forEach(b=>b.onclick=()=>openPitchSlotEditor(Number(b.dataset.pitchSlot)));document.querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>playerModal(b.dataset.player));document.querySelectorAll('[data-match]').forEach(b=>b.onclick=()=>{const x=el(b.dataset.match);if(x)x.classList.toggle('hidden')});document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const q=el('aiQ');if(q)q.value=b.dataset.q});const ask=el('askAI');if(ask)ask.onclick=()=>callAI(el('aiQ')?.value||'',state.aiMode,'aiResult');const aiTeam=el('aiTeamMode');if(aiTeam)aiTeam.onclick=()=>{state.aiMode='normal';render()};const aiOpp=el('aiOppMode');if(aiOpp)aiOpp.onclick=()=>{state.aiMode='opponent';render()};const askOp=el('askOpponentAI');if(askOp)askOp.onclick=()=>callAI('Analizza questo avversario e confrontalo con la nostra squadra: punti forti, punti deboli, giocatori chiave, cosa limitare e come impostare la gara. Distingui chiaramente dati cumulativi, ultime 5 e archivio.','opponent','opAIResult');const askFun=el('askFunAI');if(askFun)askFun.onclick=()=>callAI('Crea la sezione Fun della squadra: superlativi, roast leggeri ma basati sui numeri, chi porta il club, chi è in forma, chi è in difficoltà e tre statistiche divertenti. Usa solo dati reali e specifica sempre U5 oppure cumulativo.','fun','funAIResult');const audit=el('auditAI');if(audit)audit.onclick=()=>callAI('Esegui un controllo qualità del dataset. Cerca incoerenze tra file Giocatori e partite archiviate, giocatori presenti solo nelle partite, giocatori nel roster senza partite, valori impossibili o denominatori mescolati. Non inventare e non proporre di cambiare un numero senza evidenza: elenca solo problemi supportati dai dati e indica da quale scope provengono.','audit','auditAIResult');const ps=el('playerSearch'),pd=el('playerDept');if(ps&&pd){const update=()=>{const q=ps.value.toLowerCase(),d=pd.value;document.querySelectorAll('[data-player-row]').forEach(r=>{const name=r.querySelector('.name')?.textContent.toLowerCase()||'',dep=r.dataset.dep||'';r.style.display=(!q||name.includes(q))&&(!d||dep===d)?'':'none'})};ps.oninput=update;pd.onchange=update}const mf=el('matchFilter');if(mf)mf.onchange=()=>{state.matchFilter=mf.value;render()};document.querySelectorAll('[data-upload-role]').forEach(b=>b.onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='.json,.txt,application/json,text/plain';i.onchange=()=>uploadOne(b.dataset.uploadRole,i.files?.[0]);i.click()});document.querySelectorAll('[data-upload-all]').forEach(b=>b.onclick=()=>{const i=document.createElement('input');i.type='file';i.multiple=true;i.accept='.json,.txt,application/json,text/plain';i.onchange=()=>uploadAll(b.dataset.uploadAll,i.files||[]);i.click()});document.querySelectorAll('[data-delete-role]').forEach(b=>b.onclick=()=>deleteRole(b.dataset.deleteRole));document.querySelectorAll('[data-share-target]').forEach(b=>b.onclick=()=>shareTargetFromButton(b));const install=el('installAndroid');if(install)install.onclick=installAndroid}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&el('modalRoot'))el('modalRoot').innerHTML=''});
async function loadKnowledge(){try{const r=await fetch('./knowledge/fc27-knowledge.json',{cache:'no-store'});if(r.ok)state.knowledge=await r.json()}catch{state.knowledgeError='Knowledge non disponibile'}}
function render(){setHeader();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));const content=el('content');content.innerHTML=pageHtmlForTab(state.tab);decorateShareables();applyNumericChangeFlash(content);animateNumbers(content);bind();bindGoalExplosions()}
function boot(){injectRaceVisualOverhaulStyles();showDailyStadiumIntro();render();bindLogoEasterEgg();initPullRefresh();loadSharedData();loadKnowledge()}
boot();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js?v=32.1.29').catch(()=>{});
})();
