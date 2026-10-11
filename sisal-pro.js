/* Local presentation: no fetch, API, Blob, tracking or external assets. */
(() => {
  'use strict';
  const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  const icons = {
    team:'<path d="M12 3 3 7v6c0 4 9 8 9 8s9-4 9-8V7Z"/><path d="m8 12 3 3 5-6"/>',
    players:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
    top:'<path d="M8 3h8v6a4 4 0 0 1-8 0Zm0 2H4v3a4 4 0 0 0 5 4m7-7h4v3a4 4 0 0 1-5 4M12 13v5m-4 3h8m-6-3h4v3h-4Z"/>',
    pitch:'<rect x="3" y="2" width="18" height="20" rx="2"/><path d="M3 12h18M8 2v4h8V2M8 22v-4h8v4"/><circle cx="12" cy="12" r="3"/>',
    matches:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2m-8 3h2"/>',
    fun:'<path d="m4 20 4-12 8 8ZM8 8l8 8M13 3v3m5-1-2 3m5 4h-3M5 14l5 5"/><circle cx="19" cy="19" r="1"/>',
    opponent:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6m-3-3v6"/>',
    ai:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
    data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>'
  };
  const ball = '<circle cx="12" cy="12" r="10"/><path d="m12 7 4.8 3.5-1.8 5.6H9l-1.8-5.6ZM12 7V2m4.8 8.5 4.7-1.6M15 16.1l3 4M9 16.1l-3 4m1.2-9.6L2.5 8.9"/>';
  const tactical = '<circle cx="5" cy="18" r="2"/><circle cx="18" cy="5" r="2"/><path d="M7 18c8 0-4-13 8-13m-3-3 3 3-3 3M17 15l5 5m0-5-5 5"/>';
  const jersey = '<path d="m8 3-5 3-2 5 4 2 2-3v11h10V10l2 3 4-2-2-5-5-3c0 4-8 4-8 0Z"/><path d="M10 10h4v6m-4 0h8"/>';
  const preferenceKey='sisal_visual_motion_v1';
  let enabled=true,activeRitual=null;
  try { enabled=localStorage.getItem(preferenceKey)!=='off'; } catch {}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function pauseAmbient(){
    document.body.classList.toggle('sisal-ambient-paused',!enabled||document.hidden||reduced.matches||Boolean(document.querySelector('.sr-host,.sisal-ritual')));
  }
  function createAtmosphere(){
    const layer=document.createElement('div');layer.className='sisal-atmosphere';layer.setAttribute('aria-hidden','true');
    const symbols=[ball,tactical,ball,jersey,icons.pitch,ball,tactical,ball];
    symbols.forEach((shape,i)=>{
      const element=document.createElement('div');element.className='sisal-float';
      // Randomness is cosmetic only. Never reads or changes match data/rankings.
      const x=i%2===0?Math.random()*19:73+Math.random()*20;
      const variables={'--x':`${x}%`,'--y':`${(i*14+Math.random()*10)%94}%`,'--size':`${54+Math.random()*64}px`,'--duration':`${35+Math.random()*30}s`,'--delay':`${-Math.random()*40}s`,'--dx':`${(Math.random()-.5)*90}px`,'--dy':`${50+Math.random()*110}px`};
      Object.entries(variables).forEach(([key,value])=>element.style.setProperty(key,value));
      element.innerHTML=svg(shape);layer.appendChild(element);
    });document.body.prepend(layer);
    const footer=document.querySelector('.footer');
    if(footer){
      const wrap=document.createElement('div');wrap.style.marginTop='10px';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='btn ghost';toggle.style.fontSize='11px';
      const update=()=>{toggle.textContent=reduced.matches?'Movimenti ridotti dal dispositivo':`Sfondo animato: ${enabled?'attivo':'in pausa'}`;toggle.setAttribute('aria-pressed',String(enabled&&!reduced.matches));toggle.disabled=reduced.matches;};
      toggle.onclick=()=>{enabled=!enabled;try{localStorage.setItem(preferenceKey,enabled?'on':'off')}catch{}update();pauseAmbient();};
      reduced.addEventListener?.('change',()=>{update();pauseAmbient();});update();wrap.appendChild(toggle);footer.appendChild(wrap);
    }
    document.addEventListener('visibilitychange',pauseAmbient);
    // Watch insertions/removals only; do not observe animation styles or frame updates.
    let pending=false;
    new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;pauseAmbient();});}).observe(document.body,{childList:true,subtree:true});
    pauseAmbient();
  }
  function decorateNavigation(){
    const nav=document.querySelector('.bottomnav');if(!nav)return;nav.setAttribute('aria-label','Sezioni del club');
    nav.querySelectorAll('[data-tab]').forEach(button=>{
      const label=button.querySelector('span');if(!label)return;
      const symbol=document.createElementNS('http://www.w3.org/2000/svg','svg');symbol.setAttribute('viewBox','0 0 24 24');symbol.setAttribute('aria-hidden','true');symbol.setAttribute('focusable','false');symbol.classList.add('sisal-nav-icon');symbol.innerHTML=icons[button.dataset.tab]||icons.team;
      button.replaceChildren(symbol,label);button.type='button';
      const update=()=>{button.setAttribute('aria-current',button.classList.contains('active')?'page':'false');};
      new MutationObserver(update).observe(button,{attributes:true,attributeFilter:['class']});update();
    });
    nav.addEventListener('click',event=>{const button=event.target.closest('[data-tab]');if(!button)return;const x=button.offsetLeft-(nav.clientWidth-button.offsetWidth)/2;nav.scrollTo({left:Math.max(0,x),behavior:reduced.matches?'instant':'smooth'});});
    const brand=document.querySelector('.club-brand');
    if(brand){brand.tabIndex=0;brand.setAttribute('role','button');brand.setAttribute('aria-label','Apri la celebrazione Sisal FC 2021');brand.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();brand.click();}});}
  }
  function openRitual(){
    if(activeRitual)return;
    const previousFocus=document.activeElement,previousOverflow=document.body.style.overflow;
    const panel=document.createElement('div');panel.className='sisal-ritual';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','sisal-ritual-title');
    panel.innerHTML=`<span class="sisal-ritual-mark">SISAL / CLUB EXPERIENCE</span><button type="button" class="sisal-ritual-close" aria-label="Chiudi celebrazione">Chiudi <span aria-hidden="true">×</span></button><div class="sisal-ritual-beams" aria-hidden="true">${[9,31,58,81].map((left,i)=>`<i style="--left:${left}%;--delay:-${i*1.7}s"></i>`).join('')}</div><div class="sisal-ritual-floor" aria-hidden="true"></div><div class="sisal-ritual-dust" aria-hidden="true">${Array.from({length:24},(_,i)=>`<i style="--x:${(i*37)%100}%;--duration:${5+i%5}s;--delay:-${i*.7}s"></i>`).join('')}</div><div class="sisal-ritual-stage"><div class="sisal-ritual-label">SISAL FC 2021 · CLUB MODE</div><div class="sisal-ritual-emblem"><img src="./assets/sisal-branding.png" alt="Sisal FC 2021" draggable="false"></div><h2 id="sisal-ritual-title">UNA SQUADRA.<span>UN’IDENTITÀ.</span></h2><p>CHI MOLLA NON È DEL SISAL.</p><div class="sisal-ritual-baseline">CLUB MODE / SISAL FC 2021</div></div><span class="sisal-ritual-hint">Tocca lo sfondo per tornare al club</span><div class="sisal-ritual-progress" aria-hidden="true"></div>`;
    const blocked=[...document.querySelectorAll('.app,.bottomnav,#modalRoot')].map(node=>({node,inert:node.inert}));blocked.forEach(({node})=>{node.inert=true;});
    document.body.style.overflow='hidden';document.body.appendChild(panel);activeRitual=panel;
    const closeButton=panel.querySelector('button');let timer=0,closed=false,openingFrame=0;
    function close(){if(closed)return;closed=true;clearTimeout(timer);cancelAnimationFrame(openingFrame);document.removeEventListener('keydown',keys,true);document.removeEventListener('visibilitychange',onVisibility);panel.classList.add('is-closing');panel.classList.remove('is-open');setTimeout(()=>{panel.remove();blocked.forEach(({node,inert})=>{node.inert=inert;});document.body.style.overflow=previousOverflow;activeRitual=null;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});pauseAmbient();},reduced.matches?0:350);}
    function keys(event){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}else if(event.key==='Tab'){event.preventDefault();closeButton.focus();}}
    function onVisibility(){if(document.hidden)close();}
    closeButton.onclick=close;panel.addEventListener('click',event=>{if(event.target===panel||event.target.classList.contains('sisal-ritual-hint'))close();});
    document.addEventListener('keydown',keys,true);document.addEventListener('visibilitychange',onVisibility);
    openingFrame=requestAnimationFrame(()=>{panel.classList.add('is-open');closeButton.focus({preventScroll:true});});
    timer=setTimeout(close,8000);pauseAmbient();
  }
  window.SisalPresentation=Object.freeze({openRitual});
  function boot(){createAtmosphere();decorateNavigation();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
