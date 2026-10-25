import {placeLabels,leaderLine,intersects} from './scene-labels.js?v=studio-9';
export function createArenaOverlay(stage,players,{selfKey='',onSelect}={}){
 const layer=document.createElement('div');layer.className='arena-overlay';stage.append(layer);
 const tags=new Map();for(const p of players){
  const node=document.createElement('button');node.type='button';node.className='arena-name';node.dataset.key=p.key;node.title=p.name;node.setAttribute('aria-label','Segui '+p.name+(p.key===selfKey?', il tuo giocatore':''));
  const name=document.createElement('span');name.textContent=p.appearance?.nickname||p.name;node.append(name);
  if(p.key===selfKey){node.classList.add('is-self');const badge=document.createElement('b');badge.textContent='TU';node.append(badge);}
  node.onclick=()=>onSelect?.(p.key);layer.append(node);tags.set(p.key,{node,name:p.appearance?.nickname||p.name,w:0,h:0});
 }
 const bubble=document.createElement('aside');bubble.className='arena-speech';bubble.hidden=true;bubble.setAttribute('aria-hidden','true');
 const speaker=document.createElement('b'),text=document.createElement('p');bubble.append(speaker,text);const tail=document.createElementNS('http://www.w3.org/2000/svg','svg');tail.setAttribute('class','arena-speech-tail');const tailPath=document.createElementNS('http://www.w3.org/2000/svg','path');tail.append(tailPath);tail.hidden=true;tail.setAttribute('hidden','');layer.append(tail,bubble);
 let lastText='',lastSpeaker='',previous=new Map(),visibleNames=new Set(),lastSize='',frames=0,bubbleSize={w:225,h:90},destroyed=false;
 function update(frame){
  if(destroyed)return {bubbleVisible:false};const w=frame.width||stage.clientWidth||800,h=frame.height||stage.clientHeight||500,anchors=frame.anchors||[],byKey=new Map(anchors.map(a=>[a.key,a]));
  let changedTeam=false;for(const [key,tag]of tags){const a=byKey.get(key),team=a?.team==null?undefined:String(a.team);if(tag.node.dataset.team!==team){changedTeam=true;if(team===undefined)delete tag.node.dataset.team;else tag.node.dataset.team=team;}tag.node.classList.toggle('is-selected',!!a?.selected);}
  const size=w+':'+h;if(changedTeam||lastSize!==size||++frames%30===0){for(const tag of tags.values()){const cap=Math.min(w<=600?100:120,w-12),wasHidden=tag.node.hidden;tag.node.style.maxWidth=cap+'px';tag.node.hidden=false;const bounds=tag.node.getBoundingClientRect();tag.w=bounds.width||Math.min(cap,14+tag.name.length*4.7+(tag.node.classList.contains('is-self')?18:0));tag.h=bounds.height||(w<=600?18:20);tag.node.hidden=wasHidden;}lastSize=size;}
  const d=frame.dialogue,dialogueText=d?.text||'';
  if(dialogueText!==lastText||d?.speaker!==lastSpeaker){text.textContent=dialogueText;speaker.textContent=d?.name||'';bubble.hidden=!dialogueText;bubble.style.maxWidth=Math.min(270,w-28)+'px';if(dialogueText)bubbleSize={w:bubble.offsetWidth||Math.min(245,w-28),h:bubble.offsetHeight||90};lastText=dialogueText;lastSpeaker=d?.speaker;}
  const anchor=d?byKey.get(d.speaker):null;
  // Identity boxes stay centred above their own head. Never move a name to
  // another row/player merely to fit the screen. In a crowd, retain the own
  // and selected identities first; all members remain available in the roster.
  const bodies=anchors.filter(a=>a.visible).map(a=>({x:a.x-12,y:a.y-1,w:24,h:43}));
  const boxes=[],nextVisible=new Set(),order=[...tags.entries()].map(([key,tag])=>{const a=byKey.get(key);return {key,tag,a,priority:a?.selected?1000:a?.self?900:key===d?.speaker?800:a?.active?100:0};}).sort((a,b)=>b.priority-a.priority+(visibleNames.has(b.key)?10:0)-(visibleNames.has(a.key)?10:0)||(a.key<b.key?-1:a.key>b.key?1:0));
  for(const {key,tag,a}of order){
   tag.node.hidden=true;if(!a?.visible||!Number.isFinite(a.x)||!Number.isFinite(a.y))continue;
   const box={x:Math.round(a.x-tag.w/2),y:Math.round(a.y-tag.h-4),w:tag.w,h:tag.h};
   if(box.x<3||box.x+box.w>w-3||box.y<3||box.y+box.h>h-3||boxes.some(b=>intersects(box,b,2))||(!a.self&&!a.selected&&bodies.some(b=>intersects(box,b,1))))continue;
   boxes.push(box);nextVisible.add(key);tag.node.hidden=false;tag.node.style.transform=`translate(${box.x}px,${box.y}px)`;
  }
  visibleNames=nextVisible;
  const items=dialogueText&&anchor?.visible?[{id:'speech',ax:anchor.x,ay:anchor.y-23,w:bubbleSize.w,h:bubbleSize.h,priority:10000,visible:true}]:[];
  const placed=placeLabels(items,{width:w,height:h,top:8,bottom:8,gap:5,obstacles:[...bodies,...boxes],previous});
  const b=placed.get('speech'),tooFar=b&&!b.hidden&&anchor?.visible&&leaderLine(b,anchor.x,anchor.y-5).length>145;bubble.hidden=!dialogueText||!anchor?.visible||!b||b.hidden||tooFar;tail.hidden=bubble.hidden;tail.toggleAttribute('hidden',tail.hidden);
  if(b&&!b.hidden&&dialogueText){bubble.style.transform=`translate(${Math.round(b.x)}px,${Math.round(b.y)}px)`;bubble.dataset.speaker=d.speaker;if(anchor?.visible){const l=leaderLine(b,anchor.x,anchor.y-5);const px=-Math.sin(l.angle)*5,py=Math.cos(l.angle)*5;tail.setAttribute('viewBox',`0 0 ${w} ${h}`);tailPath.setAttribute('d',`M ${l.x+px} ${l.y+py} L ${anchor.x} ${anchor.y-5} L ${l.x-px} ${l.y-py} Z`);}}
  previous=placed;return {bubbleVisible:!bubble.hidden,speakerVisible:!!anchor?.visible};
 }
 return {update,dispose(){destroyed=true;tags.forEach(t=>t.node.onclick=null);layer.remove();}};
}
