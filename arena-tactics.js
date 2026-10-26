import {attackDirection} from './arena-laws.js?v=arena-10';
import {now,rnd,dist} from './arena-world-state.js?v=arena-10';
import {isKeeper} from './arena-roles.js?v=arena-10';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function offsideLine(w,team,b){const d=attackDirection(team),defenders=w.players.filter(p=>p.team===1-team&&!p.rest).map(p=>d*p.z).sort((a,b)=>b-a);return defenders.length<2?Infinity:Math.max(0,d*b.z,defenders[1]);}
export function onside(w,p,b,margin=.45){return p.team==null||attackDirection(p.team)*p.z<=offsideLine(w,p.team,b)-margin||attackDirection(p.team)*p.z<=0;}
export function supportTarget(w,p,b,target){const d=attackDirection(p.team),line=offsideLine(w,p.team,b),safe=Math.max(-1,line-1.15-Math.max(0,d*p.vz)*.22);return [target[0],d*Math.min(d*target[1],safe)];}
export function passOptions(w,p,b){return w.players.filter(q=>q!==p&&!q.rest&&q.team===p.team&&onside(w,q,b,.55));}
export function trackReceiver(w,p,k,b){
 if(!k.receiver||!w.match||w.match.ball!==b.id||!['pass','outsidePass','heelPass','cross'].includes(k.type))return true;
 let q=w.players.find(q=>q.key===k.receiver&&!q.rest);
 const predictedSafe=q=>attackDirection(q.team)*(q.z+q.vz*.22)<=offsideLine(w,q.team,b)-.42||attackDirection(q.team)*q.z<=0;
 if(!q||!onside(w,q,b,.40)||!predictedSafe(q)){
  if(k.stage==='swing')return false;
  const alternatives=passOptions(w,p,b).filter(predictedSafe).sort((a,c)=>(isKeeper(a)?8:0)+Math.hypot(a.x-p.x,a.z-p.z)-(isKeeper(c)?8:0)-Math.hypot(c.x-p.x,c.z-p.z));q=alternatives[0];
  if(!q)return false;k.receiver=q.key;
 }
 // Track during the approach, then freeze the strike direction during its swing.
 if(k.stage==='plant')k.target=[q.x,k.target[1],q.z];return true;
}

export function segmentDistance(p,a,b){
 const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,u=l?clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/l,0,1):0;
 return Math.hypot(p.x-a.x-dx*u,p.z-a.z-dz*u);
}
export function passClearance(w,p,q){
 let gap=6;for(const opponent of w.players){if(opponent.team!==1-p.team||opponent.rest||opponent.reserveKeeper)continue;const dx=q.x-p.x,dz=q.z-p.z,l=dx*dx+dz*dz,along=l?((opponent.x-p.x)*dx+(opponent.z-p.z)*dz)/l:0;if(along>.08&&along<.94)gap=Math.min(gap,segmentDistance(opponent,p,q));}
 return gap;
}
// Supporting roles are stable within each possession. They do not all chase the ball.
export function offBallTarget(w,p,b,base,holder,presser){
 const m=w.match,d=attackDirection(p.team),list=m.teams[p.team]||[],index=Math.max(0,list.indexOf(p.key)),own=holder?.team===p.team;
 if(m.giveGo?.key===p.key&&now(w)<m.giveGo.until&&own){return supportTarget(w,p,b,[clamp(m.giveGo.x,-14,14),m.giveGo.z]);}
 if(own){
  const side=base[0]<0?-1:1,slot=index%4,band=Math.floor(index/4)*2.4;
  const x=slot===0?clamp(holder.x-side*(4.2+band),-13.5,13.5):slot===1?-12.3+band:slot===3?12.3-band:clamp(holder.x+side*(3.5+band),-12.5,12.5);
  const z=holder.z+d*(slot===0?-3.4-band:slot===2?9.4-band:5.2-band);
  return supportTarget(w,p,b,[x,clamp(base[1]*.18+z*.82,-23,23)]);
 }
 if(holder&&holder.team===1-p.team){
  // Cache identities only. Positions remain live, so this saves sorting at
  // every fixed step without changing the movement/marking result.
  if(m.coverage?.holder!==holder.key)m.coverage={holder:holder.key,keys:w.players.filter(q=>q.team===holder.team&&!q.rest&&!isKeeper(q)&&q!==holder).map(q=>q.key).sort()};
  const keys=m.coverage.keys,mark=keys.length?w.players.find(q=>q.key===keys[index%keys.length]):null;
  if(mark){const ownGoalZ=-d*26,dx=-mark.x,dz=ownGoalZ-mark.z,n=Math.hypot(dx,dz)||1;return [clamp(base[0]*.35+(mark.x+dx/n*1.1)*.65,-14.8,14.8),clamp(base[1]*.28+(mark.z+dz/n*1.1)*.72,-23,23)];}
  if(presser)return [clamp(presser.x*.55+base[0]*.45,-14,14),clamp(presser.z-d*3.8,-23,23)];
 }
 return [clamp(base[0]+b.x*.12,-14.3,14.3),clamp(base[1]*.74+b.z*.34,-22.5,22.5)];
}
export function chooseMatchAction(w,p,b,mates){
 const m=w.match,d=attackDirection(p.team),opponents=w.players.filter(q=>q.team===1-p.team&&!q.rest&&!q.reserveKeeper),pressure=Math.min(20,...opponents.map(q=>dist(p,q))),goalDistance=26-d*p.z;
 const ranked=mates.filter(q=>!isKeeper(q)||mates.length===1).map(q=>{
  const distance=dist(p,q),gap=passClearance(w,p,q),space=Math.min(8,...opponents.map(r=>dist(q,r)));
  return {q,gap,score:d*(q.z-p.z)*.78-Math.abs(distance-8)*.22+Math.min(3,gap)*.85+space*.25+(mRecent(w,q.key)?-1.4:0)+rnd(w)*.6};
 }).sort((a,c)=>c.score-a.score);
 const best=ranked[0],central=ranked.filter(x=>Math.abs(x.q.x)<7.8&&d*x.q.z>8&&x.q!==p).sort((a,c)=>d*c.q.z-d*a.q.z)[0];
 const goal={x:0,z:d*26.4},lane=passClearance(w,p,goal),shotAngle=Math.atan2(3,Math.max(2,goalDistance));
 if(Math.abs(p.x)>9&&d*p.z>5&&central&&(pressure<3.2||goalDistance<13)&&now(w)-(p.lastCross??-20)>5){p.lastCross=now(w);return {kind:'cross',receiver:central.q.key,target:[central.q.x,1.5,central.q.z]};}
 const shotChance=clamp((18-goalDistance)*.04+lane*.075+shotAngle*.35-(pressure<1.1?.20:0),.08,.78);
 if(goalDistance<18&&Math.abs(p.x)<13.2&&rnd(w)<shotChance){return {kind:'shot',target:[(rnd(w)-.5)*5.1,.25+rnd(w)*1.05,d*26.4]};}
 const forward=best&&d*(best.q.z-p.z)>1.4;
 if(best&&(pressure<2.6||forward&&best.score>4.5||now(w)-m.lastChange>2.4)&&best.gap>.55){
  m.giveGo={key:p.key,x:clamp(p.x+(best.q.x>p.x?-3.2:3.2),-14,14),z:clamp(p.z+d*5.5,-23,23),until:now(w)+3.4};m.recentReceivers=[...(m.recentReceivers||[]).slice(-3),best.q.key];
  return {kind:'pass',receiver:best.q.key,target:[best.q.x,.11,best.q.z]};
 }
 if(!mates.length&&goalDistance<21)return {kind:'shot',target:[(rnd(w)-.5)*5,.45,d*26.4]};
 return {kind:'dribble'};
}
function mRecent(w,key){return w.match.recentReceivers?.at(-1)===key;}
