(function(){'use strict';
const APP_VERSION='v32.1.22';
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
const TOP3_RACE_VISUAL_KEY='fc27_top3_race_visual_v1';
const RACE_VISUAL_DEFAULT={schemaVersion:1,source:'local',variant:0,strideMs:305,dust:.82,glow:.94,trackWarm:.94};
function raceVisualProfileFromAI(answer){
  const text=String(answer||'').trim();
  if(!text)return RACE_VISUAL_DEFAULT;
  const lower=text.toLowerCase(),token=hashText(text),seed=(parseInt(token,36)>>>0)||1;
  const aggressive=/(pressing|aggressiv|transizion|vertical|ritmo alto|veloc|intens)/i.test(lower);
  const control=/(possesso|controll|equilibr|pazienz|costruzion|gestione)/i.test(lower);
  const compact=/(compat|difensiv|blocco basso|prudenz|copertura)/i.test(lower);
  const variant=aggressive?1:control?2:compact?0:seed%3;
  const strideMs=aggressive?286+(seed%17):control?309+(seed%16):compact?316+(seed%12):296+(seed%27);
  const dust=aggressive?.94:control?.70:compact?.76:.82+((seed>>>5)%10)/100;
  const glow=aggressive?1.08:control?.92:compact?.84:.88+((seed>>>10)%16)/100;
  return {
    schemaVersion:1,
    source:'ai-existing-analysis',
    seed:token,
    variant,
    strideMs,
    dust,
    glow,
    trackWarm:.88+((seed>>>15)%17)/100,
    updatedAt:Date.now()
  };
}
function rememberRaceVisualFromAI(answer){
  const text=String(answer||'').trim();
  if(text.length<24)return false;
  return jset(TOP3_RACE_VISUAL_KEY,raceVisualProfileFromAI(text));
}
function currentRaceVisualProfile(){
  const saved=jget(TOP3_RACE_VISUAL_KEY,null);
  if(!saved||saved.schemaVersion!==1)return {...RACE_VISUAL_DEFAULT};
  return {
    ...RACE_VISUAL_DEFAULT,
    ...saved,
    variant:Math.max(0,Math.min(2,Math.round(num(saved.variant,0)))),
    strideMs:Math.max(280,Math.min(330,Math.round(num(saved.strideMs,305)))),
    dust:Math.max(.65,Math.min(1,num(saved.dust,.82))),
    glow:Math.max(.75,Math.min(1.15,num(saved.glow,.94))),
    trackWarm:Math.max(.82,Math.min(1.08,num(saved.trackWarm,.94)))
  };
}
function raceVisualVars(profile){
  const p=profile||RACE_VISUAL_DEFAULT;
  return `--race-stride:${Math.round(p.strideMs)}ms;--race-dust-ms:${Math.round(p.strideMs*2.35)}ms;--race-dust-alpha:${Number(p.dust).toFixed(2)};--race-glow:${Number(p.glow).toFixed(2)};--race-track-warm:${Number(p.trackWarm).toFixed(2)}`;
}
function horseSvg(color,variant=0){
  const c=esc(color);
  const v=Math.max(0,Math.min(2,Math.round(num(variant,0))));
  const saddle=v===1?'#f4d66d':v===2?'#bfe9ff':'#f5f7f6';
  const silk=v===1?'#15251b':v===2?'#12243a':'#0d1711';
  return `<svg class="horse-svg horse-svg-v${v}" viewBox="0 0 240 126" aria-hidden="true" shape-rendering="geometricPrecision">
    <g class="horse-tail-swing">
      <path d="M51 64 C38 57 29 47 22 35 C23 49 18 61 10 70" fill="none" stroke="#101812" stroke-width="6.3" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>
      <path d="M50 64 C38 57 30 48 24 37 C24 49 20 59 13 68" fill="none" stroke="${c}" stroke-width="3.8" stroke-linecap="round" opacity=".96"/>
      <path d="M16 68 C23 65 30 66 37 70" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    </g>
    <g class="horse-body-shell">
      <path d="M44 64 C49 50 62 42 82 42 C96 35 122 34 145 39 C162 42 177 50 183 61 C188 70 184 79 175 84 C164 90 146 91 126 89 L88 90 C68 90 52 84 45 75 C42 71 41 67 44 64 Z" fill="${c}" stroke="#0a120d" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M58 55 C80 43 112 42 145 47 C158 49 169 54 176 61" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="4" stroke-linecap="round"/>
      <path d="M62 78 C83 85 113 85 140 82 C156 80 167 76 177 69" fill="none" stroke="rgba(0,0,0,.20)" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="67" cy="63" rx="22" ry="22" fill="rgba(0,0,0,.05)"/>
      <path d="M144 45 C157 44 167 48 174 55 C179 61 180 68 176 74 L163 73 C163 60 156 50 144 45 Z" fill="${c}" stroke="#0a120d" stroke-width="2.2" stroke-linejoin="round"/>
    </g>
    <g class="horse-neck-head horse-head-nod">
      <path d="M158 51 C169 45 178 38 187 32 C197 25 209 25 217 31 C222 35 224 40 222 44 C229 44 235 47 238 51 C233 56 224 59 215 57 L202 53 C191 54 181 62 174 72 L161 71 C166 62 165 56 158 51 Z" fill="${c}" stroke="#0a120d" stroke-width="2.1" stroke-linejoin="round"/>
      <path d="M199 28 L201 20 L206 29" fill="${c}" stroke="#0a120d" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M208 29 L213 22 L214 32" fill="${c}" stroke="#0a120d" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M188 33 L180 40 L184 42 L176 48 L179 50 L169 58" fill="none" stroke="#101812" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" opacity=".82"/>
      <path d="M190 35 C183 41 177 49 173 58" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2.1" stroke-linecap="round"/>
      <circle cx="212" cy="35" r="1.75" fill="#050a07"/>
      <ellipse cx="231" cy="50" rx="2" ry="1.1" fill="#050a07"/>
      <path d="M220 54 C225 55 229 54 233 52" fill="none" stroke="#07100a" stroke-width="1.2" stroke-linecap="round" opacity=".75"/>
      <path d="M198 50 C204 49 210 50 216 53" fill="none" stroke="rgba(255,255,255,.19)" stroke-width="1.9" stroke-linecap="round"/>
    </g>
    <g class="horse-tack">
      <path d="M103 42 C113 39 128 39 139 43 L135 57 C124 54 112 54 102 57 Z" fill="${saddle}" stroke="#0b120d" stroke-width="1.7"/>
      <path d="M107 55 L102 75 M134 55 L139 73" stroke="#1c2b20" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M188 36 C197 34 207 34 216 32" fill="none" stroke="#eaf2ec" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>
    </g>
    <g class="horse-jockey">
      <path d="M111 33 L121 22 L136 27 L132 45 L117 47 Z" fill="${silk}" stroke="#f7fff9" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M119 24 L128 31 L134 27" fill="none" stroke="${saddle}" stroke-width="3"/>
      <circle cx="126" cy="17" r="7.1" fill="#e9bb93" stroke="#f8fff9" stroke-width="1"/>
      <path d="M120 16 C122 7 133 7 139 13 L137 18 H120 Z" fill="${saddle}" stroke="#0b120d" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M115 42 L100 52" fill="none" stroke="#e9bb93" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M131 31 L149 38" fill="none" stroke="#e9bb93" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M148 38 C161 37 175 37 188 36" fill="none" stroke="#dfe9e2" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M119 46 L109 62 M131 45 L143 61" fill="none" stroke="#111a14" stroke-width="3.6" stroke-linecap="round"/>
    </g>
    <g class="horse-back-leg leg-a">
      <path d="M69 82 C61 93 56 103 49 112" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
      <path d="M49 112 L43 121" fill="none" stroke="${c}" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M38 122 L49 122" fill="none" stroke="#111713" stroke-width="5.2" stroke-linecap="round"/>
    </g>
    <g class="horse-back-leg leg-b">
      <path d="M91 83 C98 94 104 101 111 110" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
      <path d="M111 110 L116 120" fill="none" stroke="${c}" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M112 122 L123 122" fill="none" stroke="#111713" stroke-width="5.2" stroke-linecap="round"/>
    </g>
    <g class="horse-front-leg leg-c">
      <path d="M146 80 C138 92 133 102 130 112" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
      <path d="M130 112 L126 121" fill="none" stroke="${c}" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M121 122 L132 122" fill="none" stroke="#111713" stroke-width="5.2" stroke-linecap="round"/>
    </g>
    <g class="horse-front-leg leg-d">
      <path d="M168 76 C178 87 187 96 196 105" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
      <path d="M196 105 L203 117" fill="none" stroke="${c}" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M200 120 L212 120" fill="none" stroke="#111713" stroke-width="5.2" stroke-linecap="round"/>
    </g>
    <path d="M52 75 C61 81 70 84 81 85" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2.3" stroke-linecap="round"/>
  </svg>`}
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
function top3RankRows(cfg){const rows=cfg.arr.slice(0,3);if(!rows.length)return empty('Nessun dato disponibile per questa classifica.');const medals=['🥇','🥈','🥉'];return `<div class="rank-list top3-final-list">${rows.map((x,i)=>`<div class="rank-row top3-final-row top3-final-${i+1}"><div class="rank-no">${medals[i]||i+1}</div><div><button class="player-rank-link" data-player="${esc(x.id||x.name||'')}"><b>${esc(x.name)}</b><small>${esc(x.position||'')} · ULTIME 5</small></button></div><div class="rank-val">${num(x[cfg.key]).toFixed(cfg.decimals)}${cfg.unit}</div></div>`).join('')}</div>`}
function top3Card(t,cfg){
  if(!cfg.arr.length)return `<div class="card top3-race-card"><h3>${cfg.title}</h3>${top3RankRows(cfg)}</div>`;
  if(top3WasSeen(t,cfg.id))return `<div class="card top3-race-card top3-revealed"><div class="top3-revealed-head"><h3>${cfg.title}</h3><span>🏁 RISULTATO</span></div>${top3RankRows(cfg)}</div>`;
  return `<div class="card top3-race-card top3-locked"><button class="top3-lock-button" type="button" data-top3-race="${esc(cfg.id)}" aria-label="Scopri ${esc(cfg.title)}"><span class="top3-lock-kicker">SISAL FC · RACE REVEAL</span><span class="top3-lock-icon">🔒</span><strong>${cfg.title}</strong><small>Tocca per far partire la gara</small><span class="top3-lock-cta">🏇 SCOPRI LA TOP 3</span></button></div>`;
}
function top3RaceMarkup(cfg){
  const ranked=cfg.arr.slice(0,3).map((player,index)=>({player,place:index+1}));
  const lanes=shuffleCopy(ranked);
  const colors=horseColorSet(lanes.length);
  const visual=currentRaceVisualProfile();
  const visualVars=raceVisualVars(visual);
  const liveSlots=ranked.map((_,i)=>`<div class="top3-live-slot" data-live-pos="${i+1}"><span class="live-medal">${['🥇','🥈','🥉'][i]||`${i+1}°`}</span><div><b>—</b><small>IN ATTESA</small></div><span class="live-dot"></span></div>`).join('');
  return `<div class="top3-race-shell race-visual-v${visual.variant}" data-race-visual-source="${esc(visual.source||'local')}" style="${visualVars}"><div class="top3-race-head"><div><span class="top3-race-kicker">LIVE RACE · ULTIME 5</span><h3>${cfg.title}</h3></div><span class="top3-race-status"><i></i><span data-race-status-text>Preparati…</span></span></div><div class="top3-live-board" data-live-board style="--race-count:${lanes.length}">${liveSlots}</div><div class="horse-race" data-race-stage style="--race-count:${lanes.length}"><div class="race-track-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="race-countdown" data-race-countdown><span>3</span></div><div class="race-rail race-rail-top"></div><div class="race-rail race-rail-bottom"></div>${lanes.map((entry,laneIndex)=>`<div class="horse-lane" data-lane="${laneIndex}"><span class="lane-badge">C${laneIndex+1}</span><span class="start-line" aria-hidden="true"><i>START</i></span><span class="finish-line" aria-hidden="true"><i>FINISH</i></span><div class="horse-runner" data-race-place="${entry.place}" data-lane="${laneIndex}" data-race-name="${esc(entry.player.name)}" data-race-color="${esc(colors[laneIndex])}"><div class="horse-name"><span class="horse-color-dot" style="background:${esc(colors[laneIndex])}"></span>${esc(entry.player.name)}</div><div class="horse-visual">${horseSvg(colors[laneIndex],visual.variant)}<span class="horse-shadow"></span><span class="speed-lines"></span><span class="hoof-dust dust-a"></span><span class="hoof-dust dust-b"></span><span class="hoof-dust dust-c"></span></div></div></div>`).join('')}<div class="race-finish-result" data-race-result></div></div></div>`;
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
  for(const item of ['3','2','1','VIA!']){
    if(!card.isConnected||state.tab!=='top')return false;
    if(value){value.textContent=item;value.classList.remove('pop');void value.offsetWidth;value.classList.add('pop')}
    if(statusText)statusText.textContent=item==='VIA!'?'Partiti!':`Partenza in ${item}`;
    await raceSleep(item==='VIA!'?420:520);
  }
  overlay?.classList.add('is-hidden');
  return true;
}
async function startTop3Race(button,id){
  const t=state.own;if(!dataReady(t))return;
  const cfg=top3Rankings(t).find(x=>x.id===id);if(!cfg||!cfg.arr.length)return;
  if(top3WasSeen(t,id)){render();return}
  const card=button.closest('.top3-race-card');if(!card||card.dataset.racing==='1')return;
  card.dataset.racing='1';card.classList.remove('top3-locked');card.classList.add('top3-racing');card.innerHTML=top3RaceMarkup(cfg);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const runners=[...card.querySelectorAll('.horse-runner')],board=card.querySelector('[data-live-board]'),statusText=card.querySelector('[data-race-status-text]'),progress=new Map(runners.map(r=>[r,0]));
  if(!await top3Countdown(card,statusText))return;
  const stopGallop=startGallopAudio();
  const base=9600+Math.floor(Math.random()*700);
  const finishTimes={1:base,2:base+650+Math.floor(Math.random()*300),3:base+1300+Math.floor(Math.random()*420)};
  const raceData=runners.map((runner,index)=>{const lane=runner.closest('.horse-lane'),distance=Math.max(100,lane.clientWidth-runner.offsetWidth-38),place=num(runner.dataset.racePlace,3);return {runner,index,distance,place,duration:finishTimes[place]||finishTimes[3],profile:raceProgressFrames(place)}});
  const startTime=performance.now();let lastBoardUpdate=0,lastLeader='';
  const completed=await new Promise(resolve=>{
    const tick=now=>{
      if(!card.isConnected||state.tab!=='top'){stopGallop();resolve(false);return}
      const elapsed=now-startTime;let allDone=true;
      for(const item of raceData){
        const f=Math.min(1,elapsed/item.duration);if(f<1)allDone=false;
        const p=raceInterpolate(item.profile,f);progress.set(item.runner,p);
        const stridePulse=Math.sin((elapsed/150)+(item.index*1.35));
        const bob=f<1?stridePulse*1.05:0;
        const lean=f<1?Math.sin((elapsed/580)+(item.index*.75))*.28:0;
        item.runner.style.transform=`translate3d(${(item.distance*p).toFixed(2)}px,${bob.toFixed(2)}px,0) rotate(${lean.toFixed(2)}deg)`;
        if(f>=1&&item.runner.dataset.arrived!=='1'){
          item.runner.dataset.arrived='1';
          item.runner.classList.add('horse-arrived');
          if(item.place===1){
            item.runner.classList.add('horse-winner');
            if(!card.dataset.winnerShown){
              card.dataset.winnerShown='1';
              stopGallop();
              playWinnerTrumpet();
              launchWinnerConfetti();
              if(statusText)statusText.textContent='Winner!';
              const winnerName=item.runner.dataset.raceName||'Vincitore';
              const resultBox=card.querySelector('[data-race-result]');
              if(resultBox){
                resultBox.innerHTML=`<span class="winner-kicker">🏆 WINNER</span><strong class="winner-name">${esc(winnerName)}</strong><small class="winner-sub">1° classificato</small>`;
                resultBox.classList.add('show','winner-reveal');
              }
            }
          }
        }
      }
      if(now-lastBoardUpdate>110||allDone){const ordered=updateTop3LiveBoard(board,runners,progress);const leader=ordered[0]?.name||'';if(leader&&leader!==lastLeader&&statusText){statusText.textContent=`${leader} è in testa`;lastLeader=leader}lastBoardUpdate=now}
      if(allDone){resolve(true);return}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  stopGallop();
  if(!completed||!card.isConnected||state.tab!=='top')return;
  const finalOrder=[...cfg.arr.slice(0,3)];
  const result=card.querySelector('[data-race-result]');
  if(statusText)statusText.textContent='Traguardo!';
  card.classList.add('race-finished');
  if(result){result.innerHTML=`<span>🏁 ARRIVO UFFICIALE</span><strong>${finalOrder.map((p,i)=>`${i+1}° ${esc(p.name)}`).join(' · ')}</strong>`;result.classList.remove('winner-reveal');result.classList.add('show')}
  await raceSleep(1700);
  if(!card.isConnected||state.tab!=='top')return;
  markTop3Seen(t,id);
  render();
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
async function callAI(question,mode='normal',targetId='aiResult'){const target=el(targetId)||el('aiResult'),q=String(question||'').trim();if(!q){if(target)target.textContent='Scrivi una domanda oppure usa uno dei pulsanti rapidi.';return}if(target)target.textContent='⏳ Gemini sta analizzando il dataset centrale…';const normalizedMode=['opponent','fun','audit','fouls','formation'].includes(mode)?mode:'normal';try{const r=await fetch('/api/assistente',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q,mode:normalizedMode,notes:state.notes,formation:state.formation,formationCatalog:FORMATIONS.map(name=>({name,roles:FORM_ROWS[name]})),knowledge:state.knowledge})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.error||`Errore IA HTTP ${r.status}`),{code:d.code,status:r.status});const answer=String(d.answer||'').trim()||'Gemini non ha restituito una risposta.';state.aiResults[normalizedMode]=answer;if(['normal','opponent','formation'].includes(normalizedMode))rememberRaceVisualFromAI(answer);if(normalizedMode==='formation'){state.aiFormationRecommendation=d.recommendation||null;render();showToast(`✓ Consiglio formazione IA ricevuto · ${d.model||'Gemini'}`);return}if(target)target.textContent=answer;showToast(`✓ Analisi IA completata · ${d.model||'Gemini'}`)}catch(e){const msg=e?.code?`${e.code}: ${e.message||'Errore IA'}`:(e?.message||'Errore durante l’analisi IA.');if(target)target.textContent=`✕ ${msg}`;showToast(msg,true)}}
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
function boot(){showDailyStadiumIntro();render();bindLogoEasterEgg();initPullRefresh();loadSharedData();loadKnowledge()}
boot();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js?v=32.1.21').catch(()=>{});
})();
