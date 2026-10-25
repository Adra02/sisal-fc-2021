// Geometric playing rules for the existing reduced-size club pitch.
// No scores, identities, account data or EA statistics are inferred here.
import {FIELD as F} from './arena-layout.js?v=arena-8';
export const attackDirection=team=>team===0?-1:1;
export const ownGoalSign=team=>-attackDirection(team);
export const pointDistance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function inPenaltyArea(x,z,team,pad=0){return Math.abs(x)<F.penaltyHalfWidth+pad&&ownGoalSign(team)*z>F.halfLength-F.penaltyDepth-pad;}
export function restartSpot(type,team,point){
 const d=attackDirection(team),[x,z]=point;
 if(type==='kickoff')return [0,0];
 if(type==='penalty')return [0,d*(F.halfLength-F.penaltyDistance)];
 if(type==='goalKick')return [clamp(x,-F.goalAreaHalfWidth+.5,F.goalAreaHalfWidth-.5),ownGoalSign(team)*(F.halfLength-2)];
 if(type==='corner')return [Math.sign(x||1)*(F.halfWidth-.45),Math.sign(z||d)*(F.halfLength-.45)];
 if(type==='throwIn')return [Math.sign(x||1)*F.halfWidth,clamp(z,-F.halfLength+.2,F.halfLength-.2)];
 return [clamp(x,-F.halfWidth+.3,F.halfWidth-.3),clamp(z,-F.halfLength+.3,F.halfLength-.3)];
}
export function kickoffPosition(p,m,base){
 const d=attackDirection(p.team),kicking=m.deadTeam??0;
 if(p.key===m.taker||p.key===m.holder&&m.phase==='gather')return [0,-d*.36];
 const x=clamp(base[0],-14,14),index=m.teams[p.team]?.indexOf(p.key)??0;
 let z=-d*Math.max(3,Math.abs(base[1])*.78+2+(index%2)*.6);
 if(p.team!==kicking&&Math.hypot(x,z)<F.centreRadius+.7)z=-d*Math.sqrt((F.centreRadius+.7)**2-x*x);
 return [x,clamp(z,-23,23)];
}
export function legalRestartPosition(point,p,m,{margin=0}={}){
 const [x,z]=point,spot=m.spot||[0,0],type=m.restart||'kickoff',d=attackDirection(m.deadTeam??0),taker=p.key===(m.taker||m.holder),opponent=p.team!==m.deadTeam;
 if(taker)return true;
 if(type==='kickoff')return attackDirection(p.team)*z<=-.04&&(opponent?Math.hypot(x,z)>=F.centreRadius+margin:true);
 if(type==='throwIn')return !opponent||pointDistance(point,spot)>=2+margin;
 if(type==='goalKick')return !opponent||!inPenaltyArea(x,z,m.deadTeam,margin);
 if(type==='penalty'){
  if(p.bot&&opponent)return Math.abs(z-d*F.halfLength)<.12&&Math.abs(x)<F.goalWidth/2-.2;
  return pointDistance(point,spot)>=9.15+margin&&d*(z-spot[1])<=-.15&&!inPenaltyArea(x,z,1-m.deadTeam,margin);
 }
 if(opponent&&['freeKick','indirect','corner'].includes(type))return pointDistance(point,spot)>=9.15+margin;
 return true;
}
export function restartPosition(p,m,base){
 const spot=m.spot||[0,0],type=m.restart||'kickoff',d=attackDirection(m.deadTeam??0),index=Math.max(0,m.teams[p.team]?.indexOf(p.key)??0);
 if(p.key===(m.taker||m.holder))return type==='throwIn'?[Math.sign(spot[0])*(F.halfWidth+.28),spot[1]]:[spot[0],spot[1]-attackDirection(p.team)*.36];
 if(type==='kickoff')return kickoffPosition(p,m,base);
 if(type==='penalty'&&p.bot&&p.team!==m.deadTeam)return [clamp(spot[0],-1.4,1.4),d*F.halfLength];
 if(legalRestartPosition(base,p,m,{margin:.7}))return [...base];
 const candidates=[];
 for(const x of [-14,-10,-6,-2,2,6,10,14])for(const z of [-23,-19,-14,-9,-4,4,9,14,19,23]){
  const q=[x+(index%2)*.4,z];if(legalRestartPosition(q,p,m,{margin:1}))candidates.push(q);
 }
 candidates.sort((a,b)=>pointDistance(a,base)-pointDistance(b,base));return candidates[0]||[base[0],-d*5];
}
export function restartLayout(w,m,shape){
 const people=w.players.filter(p=>p.team!=null&&!p.rest).sort((a,b)=>(a.key===m.taker?-2:a.bot?-1:0)-(b.key===m.taker?-2:b.bot?-1:0)||(a.key<b.key?-1:1)),result=new Map(),occupied=[];
 for(const p of people){
  const base=p.bot?[0,ownGoalSign(p.team)*24.8]:shape(p,m);let point=restartPosition(p,m,base);
  if(p.key!==m.taker&&!p.bot&&occupied.some(q=>pointDistance(q,point)<1.15)){
   let candidate=null;
   for(const radius of [1.3,2.6,3.9]){for(let i=0;i<12;i++){const a=i*Math.PI/6,q=[point[0]+Math.cos(a)*radius,point[1]+Math.sin(a)*radius];if(Math.abs(q[0])>16||Math.abs(q[1])>24||!legalRestartPosition(q,p,m,{margin:.5})||occupied.some(r=>pointDistance(q,r)<1.15))continue;candidate=q;break;}if(candidate)break;}
   if(candidate)point=candidate;
  }
  result.set(p.key,point);occupied.push(point);
 }
 return result;
}
export function readyToRestart(w,m,b){
 if(b.motion||b.mode==='hand'||Math.hypot(b.vx,b.vz)>.20||Math.abs(b.vy)>.20||Math.abs(b.y-F.ballRadius)>.035)return false;
 if(pointDistance([b.x,b.z],m.spot||[0,0])>.12)return false;
 for(const p of w.players){if(p.rest||p.team==null)continue;
  if(!legalRestartPosition([p.x,p.z],p,m))return false;
  if((m.restart==='kickoff'||m.phase==='gather')&&!p.bot&&p.key!==(m.taker||m.holder)&&p.target&&pointDistance([p.x,p.z],p.target)>1.5)return false;
 }
 return true;
}
export function crossedGoal(b){
 const before=b.previous||[b.x,b.y,b.z];
 for(const sign of [-1,1]){
  const plane=sign*(F.halfLength+F.ballRadius),den=b.z-before[2];if(!den||sign*before[2]>F.halfLength+F.ballRadius||sign*b.z<F.halfLength+F.ballRadius)continue;
  const u=(plane-before[2])/den;if(u<0||u>1)continue;
  const x=before[0]+(b.x-before[0])*u,y=before[1]+(b.y-before[1])*u;
  if(Math.abs(x)+F.ballRadius<F.goalWidth/2-F.postRadius&&y+F.ballRadius<F.goalHeight-F.postRadius)return sign;
 }
 return 0;
}
export function outOfPlay(b,lastTeam){
 const r=F.ballRadius;
 if(Math.abs(b.z)>F.halfLength+r){const end=Math.sign(b.z),defending=end<0?1:0,corner=lastTeam===defending;return {type:corner?'corner':'goalKick',team:corner?1-defending:defending,point:[Math.sign(b.x||1)*(F.halfWidth-.45),end*F.halfLength]};}
 if(Math.abs(b.x)>F.halfWidth+r)return {type:'throwIn',team:1-lastTeam,point:[Math.sign(b.x)*F.halfWidth,clamp(b.z,-F.halfLength+.2,F.halfLength-.2)]};
 return null;
}
export function offsideAtRelease(w,kicker,b,type){
 if(!w.match||w.match.ball!==b.id||['throwIn','goalKick','corner'].includes(type)||kicker.team==null)return [];
 const d=attackDirection(kicker.team),opponents=w.players.filter(p=>p.team===1-kicker.team&&!p.rest).map(p=>d*p.z).sort((a,b)=>b-a);if(opponents.length<2)return [];
 const line=Math.max(d*b.z,opponents[1]);return w.players.filter(p=>p.team===kicker.team&&!p.rest&&p!==kicker&&d*p.z>0&&d*p.z>line+.20).map(p=>p.key);
}
