import {SCENES} from './arena-scenes.js?v=arena-2';
export const EPOCH_MS=1800000,SLOT_SECONDS=30,VERSION=2;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
export function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let x=Math.imul(seed^seed>>>15,1|seed);x^=x+Math.imul(x^x>>>7,61|x);return ((x^x>>>14)>>>0)/4294967296}}
export function shuffle(items,seed){const a=[...items],r=random(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const lerp=(a,b,t)=>a+(b-a)*t;
const mix=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
export function flight(keys,t){if(t<=keys[0].t)return [...keys[0].p];for(let i=1;i<keys.length;i++){const a=keys[i-1],b=keys[i];if(t<=b.t){const u=clamp((t-a.t)/(b.t-a.t)),p=mix(a.p,b.p,u);p[1]+=4*(b.arc||0)*u*(1-u);return p}}return [...keys.at(-1).p]}
export function home(i,n){const cols=Math.min(10,Math.ceil(Math.sqrt(n||1))),rows=Math.ceil(n/cols),row=Math.floor(i/cols),col=i%cols;return [(col-(cols-1)/2)*Math.min(2.7,23/Math.max(1,cols-1)),6+row*Math.min(2.7,13/Math.max(1,rows-1))]}
const point=(p,y=.14)=>[p[0],y,p[1]];
const move=(actor,p,t,a,b)=>{actor.pos=mix(actor.pos,p,smooth((t-a)/(b-a)))};
export function sceneAt(time){
 const serial=Math.floor(time/SLOT_SECONDS),deck=Math.floor(serial/SCENES.length),order=shuffle(SCENES,hash('SISAL-ARENA-1:'+deck));
 return {scene:order[((serial%SCENES.length)+SCENES.length)%SCENES.length],serial,t:((time%SLOT_SECONDS)+SLOT_SECONDS)%SLOT_SECONDS};
}
export function sampleArena(snapshot,time,override){
 const {scene:chosen,serial,t}=sceneAt(time),players=snapshot.players||[];
 const field=players.filter(p=>p.key!==snapshot.keeper),keeper=players.find(p=>p.key===snapshot.keeper)||{key:'__keeper_bot',name:'BOT · Portiere',appearance:{silk:'gold',number:'1'}};
 const order=shuffle(field.map((_,i)=>i),hash('cast:'+Math.floor(serial/3)));
 let scene=override||chosen;if(field.length<3&&!['juggle','shot','rest'].includes(scene.kind))scene={...scene,kind:'juggle',event:'juggle',title:'Palleggi in attesa dei compagni'};
 const actors=field.map((p,i)=>({key:p.key,name:p.name,appearance:p.appearance,pos:home(i,field.length),look:[0,-9],gesture:'idle',phase:0,foot:null,dirty:false,personality:hash(p.key)%3}));
 const k={...keeper,pos:[0,-17.6],look:[0,-10],gesture:'keeper',phase:0,foot:null,personality:0};actors.push(k);
 const ids=order.slice(0,6),cast=ids.map(i=>actors[i]),[a,b,c,d,e,f]=cast;
 const props={net:0,netX:0,bottle:0,spare:false,hidden:false,tennis:scene.kind==='tennis',target:scene.event==='target',stains:[]},sounds=[];
 if(!a)return {actors,balls:[],scene,serial,t,props,sounds,cast:[]};
 const slots=scene.kind==='shot'?[[0,-10.5],[3.5,-10],[-3.5,-13.6],[-.65,-14.5],[.65,-14.5],[4,-14]]:scene.kind==='rest'?[[7,1],[9,1],[8,3],[10,3],[5,3],[5,1]]:scene.kind==='tennis'?[[7,-3],[10,-3],[7,3],[10,3],[12,-1],[12,1]]:[[-3,-7],[3,-7],[3,-12],[-3,-12],[0,-9.5],[0,-14]];
 const transition=smooth(t/4)*(1-smooth((t-26)/4));
 cast.forEach((p,i)=>{p.pos=mix(p.pos,slots[i],transition);p.gesture=t<4||t>26?'walk':'idle'});
 let keys=[{t:0,p:point(a.pos)},{t:5,p:point(slots[0])}],ball=point(a.pos),ballOwner=a, ballContact=false;
 const gesture=(p,g,start=7,end=21)=>{if(p&&t>=start&&t<=end){p.gesture=g;p.phase=(t-start)/(end-start)}};
 const look=(p,target)=>{if(p&&target)p.look=[...target.pos]};
 const pass=(from,to,start,end,arc=0)=>{if(!from||!to)return;keys.push({t:start,p:point(from.pos)},{t:end,p:point(to.pos),arc});if(t>=start-.45&&t<start+.3){from.gesture='kick';from.phase=(t-(start-.45))/.75;from.foot=point(from.pos)}look(from,to);look(to,from);sounds.push({at:start,type:'kick',pos:point(from.pos)});sounds.push({at:end,type:'touch',pos:point(to.pos)});};
 if(scene.kind==='pass'||scene.kind==='square'||scene.kind==='chain'){
  const partners=scene.kind==='chain'?cast:scene.kind==='square'?cast.slice(0,4):cast.slice(0,3);
  if(partners.length>1){for(let j=0;j<partners.length;j++){const start=6+j*12/partners.length;pass(partners[j],partners[(j+1)%partners.length],start,start+12/partners.length-.45,scene.event==='loft'?2.7:scene.event==='behind'?.6:0)}}
  if(['long','accidental','distract'].includes(scene.event)&&b){keys=[{t:0,p:point(a.pos)},{t:6,p:point(slots[0])},{t:8,p:point(slots[1])},{t:10,p:[6,.14,-5]},{t:14,p:[6,.14,-5]},{t:19,p:point(slots[0])}];move(b,[6,-5],t,9,13);gesture(b,'run',9,13);gesture(b,'shrug',14,18)}
  if(scene.event==='oneTwo'&&b){move(a,[-1,-13],t,8,12);keys=[{t:0,p:point(a.pos)},{t:6,p:point(slots[0])},{t:8,p:point(slots[1])},{t:12,p:[-1,.14,-13]},{t:20,p:point(slots[0])}];gesture(a,'run',8,12)}
  if(scene.event==='fake'){look(a,c||b);gesture(a,'point',5,6.5);if(c){move(c,[5,-12],t,6.5,8);gesture(c,'stumble',8,11)}}
  if(scene.event==='dispute'){gesture(a,'point',12,18);gesture(b,'point',12,18);gesture(c,'referee',16,21)}
  if(scene.event==='heel'){gesture(b,'heel',7,9);gesture(b,'bow',13,17)}
  if(scene.event==='ignored'){gesture(b,'handsHips',5,13);gesture(b,'clap',13,16)}
  if(['signal','space'].includes(scene.event))gesture(b,'call',4,6);
  if(scene.event==='behind'){a.look=[-8,-7];if(t>5)a.look=mix([-8,-7],b?.pos||[3,-7],smooth((t-5)/2))}
  if(scene.event==='both'&&b){move(a,[0,-7],t,6,9);move(b,[.8,-7],t,6,9);gesture(a,'brake',9,11);gesture(b,'bow',11,14)}
  if(scene.event==='swap'&&b){move(a,slots[1],t,12,19);move(b,slots[0],t,12,19);gesture(a,'walk',12,19);gesture(b,'walk',12,19)}
  if(scene.kind==='square')cast.slice(0,4).forEach((p,i)=>{move(p,slots[(i+1)%4],t,8+i*2,12+i*2);gesture(p,'run',8+i*2,12+i*2)});
  if(scene.event==='ovation')cast.slice(1).forEach(p=>gesture(p,'celebrate',14,20));
  if(scene.event==='encourage'){gesture(b,'call',5,8);move(b,[-2,-7],t,18,20);gesture(b,'pat',20,24)}
 }
 if(scene.kind==='rondo'||scene.kind==='duel'){
  if(b){pass(a,b,6,8);pass(b,c||a,9,11);pass(c||b,a,13,15);pass(a,b,19,21)}
  const chaser=e||c||b;
  if(chaser){const tx=-Math.cos((t-5)*.55)*1.2,tz=-9.5+Math.sin((t-5)*.55);if(t>5&&t<23){chaser.pos=[tx,tz];chaser.gesture='run';chaser.look=a.pos}}
  if(['nutmeg','revenge','rematch'].includes(scene.event)&&b){
   b.pos=mix(b.pos,[0,-7],smooth((t-4)/2)* (1-smooth((t-23)/3)));keys=[{t:0,p:point(a.pos)},{t:7,p:point(slots[0])},{t:8.5,p:[0,.14,-7]},{t:10,p:[3,.14,-7]},{t:15,p:[3,.14,-7]},{t:18,p:point(slots[0])}];
   gesture(b,'nutmeg',7,10);if(scene.event==='nutmeg'){move(b,[0,-9.5],t,12,17);gesture(b,'walk',12,17);if(chaser&&chaser!==b)move(chaser,slots[1],t,12,17)}
   if(scene.event!=='nutmeg'){gesture(b,'block',7,10);keys[3].p=[-2,.14,-6];gesture(a,'shrug',11,14);keys.push({t:22,p:[3,.14,-7]});gesture(a,'point',22,25)}
  }
  if(scene.event==='sole'&&b){a.pos=mix(a.pos,[-.6,-8],smooth((t-4)/3));b.pos=mix(b.pos,[.6,-8],smooth((t-4)/3));keys=[{t:0,p:point(a.pos)},{t:7,p:[0,.14,-8]},{t:10,p:[-.3,.14,-8]},{t:13,p:[.3,.14,-8]},{t:17,p:[-.4,.14,-8]},{t:22,p:point(slots[0])}];gesture(a,'sole',7,17);gesture(b,'sole',7,17)}
  if(scene.event==='lesson'){gesture(b,'explain',5,9);gesture(a,'stumble',11,14);gesture(b,'kick',16,17);gesture(b,'stumble',18,21);gesture(a,'laugh',21,25)}
  if(scene.event==='balance')gesture(a,'stumble',8,14);
  if(scene.event==='slide'){gesture(a,'slide',9,12);move(a,[-.5,-9],t,9,12);gesture(a,'getUp',12,16);a.dirty=t>10;}
  if(scene.event==='laugh')cast.slice(1).forEach((p,i)=>gesture(p,i%2?'clap':'laugh',12+i*.2,19));
  if(scene.event==='intruder'){keys=[{t:0,p:point(a.pos)},{t:7,p:[-7,.14,-9]},{t:10,p:[0,.14,-9]},{t:12,p:[5,.14,-9]},{t:16,p:[5,.14,-9]},{t:21,p:point(slots[0])}];cast.forEach((p,i)=>{gesture(p,'dodge',9+i*.15,11+i*.15)});if(b){move(b,[5,-9],t,12,16);gesture(b,'sole',16,18)}}
 }
 if(scene.kind==='shot'){
  const event=scene.event,isPost=['post','postLook','crossbar'].includes(event),isSave=['save','saveApplause','read','feint'].includes(event);
  const shotAt=event==='interrupted'?14:8,hitAt=shotAt+1.5;
  const target=event==='crossbar'?[0,2.4,-18.2]:isPost?[2.98,.45,-18.2]:['roof','sky'].includes(event)?[9,3.42,2.5]:event==='bottle'?[9,.35,1]:isSave?[.7,.85,-17.4]:[1.6,.55,-19.13];
  keys=[{t:0,p:point(a.pos)},{t:shotAt,p:[0,.14,-11]},{t:hitAt,p:target,arc:['roof','sky'].includes(event)?4:1.1},
   {t:hitAt+2,p:['roof','sky'].includes(event)?target:isPost?[1,.14,-13]:isSave?[2,.14,-15]:[target[0],.14,Math.max(-19.2,target[2])]}];
  gesture(a,'kick',shotAt-.6,shotAt+.3);a.look=[target[0],target[2]];
  sounds.push({at:shotAt,type:'kick',pos:[0,.15,-11]},{at:hitAt,type:isPost?'metal':event==='bottle'?'plastic':isSave?'save':['roof','sky'].includes(event)?'roof':'net',pos:target});
  if(isPost){gesture(a,'celebrate',shotAt+.4,hitAt);gesture(a,'freeze',hitAt,hitAt+3);gesture(b,'laugh',hitAt+1,hitAt+5)}
  if(['postLook','sky'].includes(event))cast.slice(1).forEach(p=>{if(t>hitAt&&t<hitAt+4)p.look=[target[0],target[2]]});
  if(event==='wall'){gesture(c,'cover',shotAt-.3,hitAt+1);gesture(d,'dodge',shotAt,hitAt+1);gesture(e,'cover',shotAt,hitAt+1)}
  if(isSave){move(k,[.7,-17.4],t,shotAt-.3,hitAt);gesture(k,'dive',shotAt,hitAt+1);gesture(k,'getUp',hitAt+1,hitAt+4);gesture(k,'point',hitAt+4,hitAt+7);gesture(b,'clap',hitAt+2,hitAt+5)}
  if(event==='read')move(k,[.7,-17.4],t,5,7);
  if(event==='feint'){gesture(a,'kick',5,5.6);gesture(k,'handsHips',5.8,7)}
  if(event==='literal'){move(k,[8,-18],t,5,13);gesture(k,'walk',5,13);gesture(b,'call',8,14);move(k,[0,-17.6],t,15,23)}
  if(event==='interrupted'&&b){move(b,[-1,-12],t,5,8);gesture(b,'bend',8,10);move(b,[4,-12],t,10,13);gesture(a,'handsHips',7,13)}
  if(event==='tiny'){keys=[{t:0,p:point(a.pos)},{t:8,p:[0,.14,-11]},{t:10,p:[0,.14,-11.8]}];gesture(a,'run',5,7.5);gesture(a,'shrug',11,17)}
  if(event==='miss'){keys=[{t:0,p:point(a.pos)},{t:8,p:[0,.14,-11]},{t:24,p:[0,.14,-11]}];gesture(a,'kick',7.5,8.3);gesture(a,'lookBoot',9,13)}
  if(event==='target')gesture(a,'point',5,7);
  if(event==='referee')gesture(b,'referee',11,17);
  if(event==='unseen'){cast.slice(1).forEach(p=>p.look=[8,5]);gesture(a,'call',11,19)}
  if(event==='line'&&c){move(c,[1.6,-17.4],t,6,9.2);gesture(c,'slide',8.5,10);keys[2]={t:9.3,p:[1.6,.2,-17.4]};keys[3]={t:12,p:[6,.14,-14],arc:1};gesture(c,'getUp',11,15)}
  if(event==='bottle')props.bottle=smooth((t-hitAt)/.4);
  if(!isSave&&!isPost&&!['tiny','miss','roof','sky','bottle','line'].includes(event)){props.net=Math.exp(-Math.max(0,t-hitAt)*1.7)*Math.sin(Math.max(0,t-hitAt)*17)*.45;props.netX=target[0];}
  if(event==='net'){move(a,[1.6,-19.3],t,11,17);gesture(a,'run',11,17);gesture(a,'sole',17,19);move(a,[2.5,-17.5],t,19,22);gesture(a,'bend',22,24)}
  const onRoof=['roof','sky'].includes(event);props.spare=onRoof&&t>12&&t<21;
  if(onRoof){
   cast.forEach(p=>{if(t>hitAt&&t<14){p.look=[9,2.5];gesture(p,'handsHips',hitAt,14)}});
   if(b){move(b,[8,1],t,12,19);gesture(b,'run',12,19);gesture(b,'bend',19,21);b.look=[8,-1];
    if(t>=21){props.strayBall=[...target];keys=[{t:21,p:[8,.14,1]},{t:24,p:point(slots[0])}];gesture(b,'kick',20.6,21.35);b.look=slots[0];sounds.push({at:21,type:'kick',pos:[8,.14,1]});}
   }
  }
 }
 if(scene.kind==='juggle'||scene.kind==='tennis'){
  if(scene.kind==='tennis'&&c){keys=[{t:0,p:point(a.pos)},{t:6,p:point(slots[0])},{t:9,p:point(slots[2],.8),arc:2},{t:12,p:point(slots[1],.8),arc:2},{t:15,p:point(slots[3]||slots[2],.8),arc:2},{t:18,p:point(slots[0],.8),arc:2}];[a,c,b,d||c].forEach((p,i)=>gesture(p,'kick',6+i*3-.5,6+i*3+.5))}
  else if(scene.event==='volley'&&b){keys=[{t:0,p:point(a.pos)},{t:6,p:point(slots[0],.4)},{t:9,p:point(slots[1],.4),arc:1.8},{t:12,p:point(slots[0],.4),arc:1.8},{t:15,p:point(slots[1],.4),arc:1.8},{t:18,p:point(slots[0],.4),arc:1.8}];gesture(a,'juggle',5,23);gesture(b,'juggle',5,23)}
  else if(scene.event==='chest'){keys=[{t:0,p:point(a.pos)},{t:6,p:point(b?.pos||[3,-7])},{t:9,p:point(slots[0],1.4),arc:1.8},{t:11,p:point(slots[0],.18)},{t:13,p:[1,.8,-18.4],arc:1.4}];gesture(a,'chest',8,10);gesture(a,'kick',10.5,11.3)}
  else if(t>=5&&t<=24){a.look=[a.pos[0],a.pos[1]-3];const phase=(t-5)%1.4,u=phase/1.4;ball=[a.pos[0]+.1,.27+1.1*4*u*(1-u),a.pos[1]-.38];ballContact=true;gesture(a,'juggle',5,24)}
 }
 if(scene.kind==='rest'){
  keys=[{t:0,p:point(a.pos)},{t:6,p:point(slots[0])},{t:23,p:point(slots[0])}];
  gesture(a,'breath',5,24);gesture(b,'drink',8,20);
  if(scene.event==='hiddenLaugh'){gesture(a,'pat',7,11);gesture(a,'laugh',12,19);a.look=[5,5];gesture(b,'handsHips',13,20)}
  if(scene.event==='inspect'){gesture(a,'inspect',7,14);gesture(a,'kick',17,18);gesture(a,'shrug',20,24)}
  if(scene.event==='benchSave'){a.pos=[8,1];gesture(a,'sit',5,24);keys=[{t:0,p:[4,.14,-5]},{t:8,p:[8,.14,.6]},{t:10,p:[8,.14,.6]},{t:15,p:[4,.14,-5]}];gesture(a,'sole',8,11)}
  if(scene.event==='five'){gesture(a,'highFive',7,12);gesture(b,'idle',7,12);if(b)b.look=[10,5];gesture(a,'hair',12,17);gesture(b,'highFive',19,22)}
  if(scene.event==='hide'){gesture(a,'hide',6,19);gesture(b,'search',7,18);gesture(c,'point',16,21);props.hidden=t>6&&t<19}
  if(scene.event==='laces')gesture(a,'laces',6,20);
  if(scene.event==='copy'){gesture(a,a.appearance?.celebration||'celebrate',6,12);gesture(b,a.appearance?.celebration||'celebrate',13,20)}
  if(scene.event==='giveWay'&&b){const u=clamp((t-6)/10);move(a,[8.1+Math.sin(u*Math.PI*4)*.45,2],t,5,9);move(b,[8.8+Math.sin(u*Math.PI*4)*.45,2.7],t,5,9);gesture(a,'dodge',7,15);gesture(b,'dodge',7,15);gesture(a,'bow',16,20)}
  if(scene.event==='collect'){gesture(a,'collect',7,19);keys=[{t:0,p:point(a.pos)},{t:9,p:[7,1,1]},{t:12,p:[8,.14,2]},{t:16,p:[9,.14,2]}];gesture(b,'sole',15,18)}
  if(scene.event==='closing'){cast.forEach((p,i)=>gesture(p,i%2?'wave':'bend',7+i,18+i));props.spare=true}
 }
 if(!ballContact)ball=flight(keys.sort((a,b)=>a.t-b.t),t);
 // Carry the ball into/out of the action rather than teleporting on slot boundaries.
 if(t<5)ball=[a.pos[0],.14+Math.abs(Math.sin(t*5))*.045,a.pos[1]-.38];
 if(t>24)ball=mix(ball,[a.pos[0],.14,a.pos[1]-.38],smooth((t-24)/6));
 if(props.hidden)ball=mix(ball,[a.pos[0],1.05,a.pos[1]+.25],smooth((t-6)/1));
 if(a.gesture==='inspect'&&t>7&&t<14)ball=mix(ball,[a.pos[0],1.15,a.pos[1]-.3],smooth((t-7)/1)*(1-smooth((t-13)/1)));
 // Background players remain active in independent pairs; no extra network updates.
 const extras=order.slice(6),balls=[{pos:ball,visible:!props.hidden}];balls.push({pos:props.strayBall||[9,3.42,2.5],visible:!!props.strayBall});
 for(let j=0;j<extras.length;j+=2){const x=actors[extras[j]],y=actors[extras[j+1]];if(y){const u=(time*.28+j)%2,v=u<1?u:2-u;x.look=y.pos;y.look=x.pos;x.gesture=u<.12?'kick':'idle';y.gesture=u>1&&u<1.12?'kick':'idle';balls.push({pos:[lerp(x.pos[0],y.pos[0],v),.14,lerp(x.pos[1],y.pos[1],v)]})}else{x.gesture='juggle';balls.push({pos:[x.pos[0],.25+Math.abs(Math.sin(time*2))*.8,x.pos[1]-.3]})}}
 if(t>26)actors.filter(p=>p!==k).forEach((p,i)=>{const h=home(i,field.length);p.pos=mix(p.pos,h,smooth((t-26)/4));p.gesture='walk'});
 return {actors,balls,scene,serial,t,props,sounds,cast:cast.map(p=>p.key)};
}
