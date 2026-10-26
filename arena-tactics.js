import {attackDirection} from './arena-laws.js?v=arena-9';
export function offsideLine(w,team,b){const d=attackDirection(team),defenders=w.players.filter(p=>p.team===1-team&&!p.rest).map(p=>d*p.z).sort((a,b)=>b-a);return defenders.length<2?Infinity:Math.max(0,d*b.z,defenders[1]);}
export function onside(w,p,b,margin=.45){return p.team==null||attackDirection(p.team)*p.z<=offsideLine(w,p.team,b)-margin||attackDirection(p.team)*p.z<=0;}
export function supportTarget(w,p,b,target){const d=attackDirection(p.team),line=offsideLine(w,p.team,b),safe=Math.max(-1,line-.95);return [target[0],d*Math.min(d*target[1],safe)];}
export function passOptions(w,p,b){return w.players.filter(q=>q!==p&&!q.rest&&q.team===p.team&&onside(w,q,b,.55));}
export function trackReceiver(w,p,k,b){
 if(!k.receiver||!w.match||w.match.ball!==b.id||!['pass','outsidePass','heelPass','cross'].includes(k.type))return true;
 let q=w.players.find(q=>q.key===k.receiver&&!q.rest);
 if(!q||!onside(w,q,b,.25)){
  if(k.stage==='swing')return false;
  const alternatives=passOptions(w,p,b).sort((a,c)=>(a.bot?8:0)+Math.hypot(a.x-p.x,a.z-p.z)-(c.bot?8:0)-Math.hypot(c.x-p.x,c.z-p.z));q=alternatives[0];
  if(!q)return false;k.receiver=q.key;
 }
 // Track during the approach, then freeze the strike direction during its swing.
 if(k.stage==='plant')k.target=[q.x,k.target[1],q.z];return true;
}
