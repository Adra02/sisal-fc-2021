import {pitchLabelLayout} from './pitch-labels.js?v=club-55';
const tracked=new Map();let queued=false;
function layout(pitch){
 if(!pitch.isConnected)return;let {width,height}=pitch.getBoundingClientRect();if(!width||!height)return;const boardHeight=width<440?680:740;if(pitch.style.getPropertyValue('--pitch-board-height')!==boardHeight+'px'){pitch.style.setProperty('--pitch-board-height',boardHeight+'px');height=pitch.getBoundingClientRect().height;}
 const buttons=[...pitch.querySelectorAll('[data-pitch-slot]')];
 const entries=buttons.map(b=>({slot:b.dataset.pitchSlot,x:parseFloat(b.style.left),y:parseFloat(b.style.top)}));
 for(const item of pitchLabelLayout(entries,{width,height})){
  const b=buttons.find(n=>n.dataset.pitchSlot===item.slot);if(!b)continue;
  for(const [key,value]of Object.entries({'--pitch-label-width':item.width+'px','--pitch-token-height':item.height+'px','--pitch-label-font':item.fontSize+'px','--pitch-label-line':item.lineHeight+'px','--pitch-face-size':item.faceSize+'px'}))b.style.setProperty(key,value);
  const name=b.querySelector('.sisal-token-name');if(name){name.title=name.textContent;b.title=name.textContent+' · '+(b.querySelector('em')?.textContent||'')+' · cambia giocatore';}
 }
 pitch.dataset.labelsReady='true';
}
const resize='ResizeObserver'in window?new ResizeObserver(items=>items.forEach(e=>layout(e.target))):null;
function refresh(){queued=false;for(const [p]of tracked)if(!p.isConnected){resize?.unobserve(p);tracked.delete(p);}for(const p of document.querySelectorAll('.sisal-pitch')){if(!tracked.has(p)){tracked.set(p,true);resize?.observe(p);}layout(p);}}
function schedule(){if(!queued){queued=true;requestAnimationFrame(refresh);}}
window.addEventListener('sisal-content-rendered',schedule);window.addEventListener('sisal-workspace-layout',schedule);window.addEventListener('resize',schedule,{passive:true});
await window.sisalAccountReady;schedule();
