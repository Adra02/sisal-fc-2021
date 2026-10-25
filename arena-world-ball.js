import {DT,clamp} from './arena-motion.js?v=arena-7';
import {PAVILION,BALL_RACK} from './arena-layout.js?v=arena-7';
import {now,actor,handPoint,emit,footPointWorld,rnd,pose} from './arena-world-state.js?v=arena-7';
const G=9.81,R=.14;
const smooth=u=>{u=clamp(u);return u*u*(3-2*u)};
export function stepBalls(w){
 const t=now(w);
 for(const b of w.balls){
  b.previous=[b.x,b.y,b.z];
  if(b.mode==='rack')continue;
  const p=actor(w,b.owner);
  if(b.motion&&p){
   const m=b.motion,u=smooth((t-m.at-(m.type==='pickup'?.45:0))/(m.until-m.at-(m.type==='pickup'?.45:0))),hand=handPoint(p),to=m.type==='pickup'?hand:m.to,from=m.type==='pickup'?m.from:hand;
   [b.x,b.y,b.z]=from.map((v,i)=>v+(to[i]-v)*u);b.vx=b.vy=b.vz=0;
   if(p.action)p.action.handTarget=[b.x,b.y,b.z];
   if(t>=m.until){b.motion=null;if(m.type==='pickup'){b.mode='hand';emit(w,'collect',p,null,b);}else{b.mode='free';b.owner=null;b.lastTouch=p.key;emit(w,'place',p,null,b);}}
   continue;
  }
  if(b.mode==='hand'&&p){let point=handPoint(p,b.handSide||1);if(p.throw){const u=smooth((t-p.throw.at)/.55),to=[p.x+Math.sin(p.heading)*.22,1.82,p.z+Math.cos(p.heading)*.22];point=point.map((v,i)=>v+(to[i]-v)*u);}if(b.grip){const u=smooth((t-b.grip.at)/.75),from=[p.x+b.grip.offset[0],b.grip.offset[1],p.z+b.grip.offset[2]];point=from.map((v,i)=>v+(point[i]-v)*u);if(u>=1)b.grip=null;}[b.x,b.y,b.z]=point;if(p.throw&&p.action)p.action.handTarget=[...point];b.vx=p.vx;b.vz=p.vz;b.vy=0;continue;}
  if(b.mode==='hand'&&!p){b.mode='free';b.owner=null;}
  if(b.net){
   // The full net volume damps a scored ball; it never jumps to a spare spot.
   b.vx*=Math.exp(-4*DT);b.vz*=Math.exp(-5*DT);
   if(Math.abs(b.z)>27.05){b.z=Math.sign(b.z)*27.05;b.vz=-b.vz*.13;}
   b.x=clamp(b.x,-2.78,2.78);
  }
  b.vx+=(b.flight?.curve||0)*DT;b.vy-=G*DT;const oldY=b.y;for(const [pkey,vkey]of [['x','vx'],['y','vy'],['z','vz']])b[pkey]+=b[vkey]*DT;
  const roof=b.x>20.2&&b.x<27.8&&b.z>1.75&&b.z<14.25,roofY=PAVILION.roofY+(b.x-24)*.045;
  if(roof&&oldY>=roofY+R&&b.y<roofY+R&&b.vy<0){b.y=roofY+R;b.vy=-b.vy*.18;b.vx-=G*.045*DT;b.vz*=.995;if(!b.onRoof){b.onRoof=true;emit(w,'roof',b.flight?.from,null,b);}}
  else if(b.onRoof&&roof&&Math.abs(b.y-roofY-R)<.06){b.y=roofY+R;b.vy=0;b.vx-=G*.045*DT;}
  else b.onRoof=false;
  if(b.y<R){b.y=R;if(b.vy<-.85)b.vy=-b.vy*.34;else b.vy=0;const friction=Math.exp(-1.05*DT);b.vx*=friction;b.vz*=friction;if(Math.hypot(b.vx,b.vz)<.035)b.vx=b.vz=0;}
  // Physical posts at both ends, including fast shots swept across a post.
  for(const z of [-26,26])for(const x of [-3,3]){const vx=b.x-b.previous[0],vz=b.z-b.previous[2],l=vx*vx+vz*vz,u=l?clamp(((x-b.previous[0])*vx+(z-b.previous[2])*vz)/l):0,px=b.previous[0]+vx*u,pz=b.previous[2]+vz*u;if(b.y<2.5&&Math.hypot(px-x,pz-z)<.19){const dx=px-x,dz=pz-z,d=Math.hypot(dx,dz)||1,nx=dx/d,nz=dz/d,dot=b.vx*nx+b.vz*nz;b.x=x+nx*.195;b.z=z+nz*.195;b.vx-=1.65*dot*nx;b.vz-=1.65*dot*nz;emit(w,'post',b.flight?.from,null,b);}}
  if(b.x<-31.5||b.x>30.8){b.x=clamp(b.x,-31.5,30.8);b.vx*=-.24;}
  if(Math.abs(b.z)>31){b.z=Math.sign(b.z)*31;b.vz*=-.24;}
  b.spinX+=b.vz*DT/R;b.spinZ-=b.vx*DT/R;b.spinY+=(b.flight?.curve||0)*DT;
  for(const k of ['x','y','z','vx','vy','vz','spinX','spinY','spinZ'])b[k]=Math.round(b[k]*100000)/100000;
 }
}
export function releaseBall(w,p,b,target,type='pass',receiver=null){
 const distance=Math.hypot(target[0]-b.x,target[2]-b.z),high=['cross','corner','throw','throwIn'].includes(type),shot=['shot','penalty','freeKick','volley','header'].includes(type),speed=shot?15+rnd(w)*4:high?9:7.4+rnd(w)*2,duration=high?clamp(distance/12,1.15,2.1):clamp(distance/speed,.22,2.5);
 b.vx=(target[0]-b.x)/duration;b.vz=(target[2]-b.z)/duration;b.vy=high||shot?(target[1]-b.y+.5*G*duration*duration)/duration:0;
 if(type==='freeKick')b.vy+=.8;
 b.mode='free';b.owner=null;b.motion=null;b.lastTouch=p.key;b.net=null;b.flight={from:p.key,team:p.team,type,at:now(w),receiver,destination:[...target],curve:type==='freeKick'?(rnd(w)-.5)*.65:0};
 if(p.action){p.action.contact=now(w);p.action.footTarget=[b.x,b.y,b.z];}
 emit(w,type,p,receiver,b,{team:p.team});
}
export function prepareKick(w,p,b,target,type='pass',receiver=null){
 if(p.kick||b.mode==='hand'||b.motion||(b.owner&&b.owner!==p.key)||b.flight)return false;b.owner=p.key;
 p.kick={ball:b.id,target:[...target],type,receiver,stage:'plant',started:now(w)};return true;
}
export function stepKick(w,p,b){
 const k=p.kick,t=now(w);if(!k||!b)return;
 if(b.owner!==p.key||b.mode==='hand'||b.motion){p.kick=null;return;}
 const h=Math.atan2(k.target[0]-b.x,k.target[2]-b.z),plant=[b.x-Math.sin(h)*.36,b.z-Math.cos(h)*.36];p.aim=h;p.target=plant;
 if(k.stage==='plant'&&Math.hypot(p.x-plant[0],p.z-plant[1])<.11&&Math.hypot(p.vx,p.vz)<.8&&Math.abs(Math.atan2(Math.sin(h-p.heading),Math.cos(h-p.heading)))<.3){k.stage='swing';k.release=t+.28;pose(w,p,k.type==='header'?'header':k.type==='volley'?'volley':k.type==='cross'||k.type==='corner'?'cross':'shot',.85,{contact:k.release,footTarget:[b.x,b.y,b.z]});}
 if(k.stage==='swing'){p.target=[p.x,p.z];p.maxSpeed=0;if(t>=k.release){if(Math.hypot(p.x-b.x,p.z-b.z)<.62){releaseBall(w,p,b,k.target,k.type,k.receiver);}p.kick=null;}}
 if(t-k.started>5.5){p.kick=null;}
}
export function dribble(w,p,b,direction){
 if(b.motion||b.mode==='hand'||p.kick)return;
 const t=now(w),distance=Math.hypot(p.x-b.x,p.z-b.z),speed=Math.hypot(p.vx,p.vz),foot=footPointWorld(p);
 if(b.y<.27&&distance<.64&&t>=(p.nextTouch||0)){
  const [dx,dz]=direction||[Math.sin(p.heading),Math.cos(p.heading)];
  // A real impulse and free rolling interval replace the old glued foot point.
  b.vx=dx*(1.55+speed*.72)+p.vx*.28;b.vz=dz*(1.55+speed*.72)+p.vz*.28;b.vy=0;b.mode='free';b.owner=p.key;b.lastTouch=p.key;b.flight=null;
  p.nextTouch=t+clamp(.48-speed*.025,.30,.48);pose(w,p,'dribble',.34,{contact:t,footTarget:[b.x,b.y,b.z]});emit(w,'touch',p,null,b);
 }
 if(distance>1.10)b.owner=null;
}
export function putInRack(w,b){b.mode='rack';b.owner=null;b.motion=null;b.group=null;b.flight=null;b.vx=b.vy=b.vz=0;b.net=null;emit(w,'rack',null,null,b);}
export function prepareThrow(w,p,b,target,type='throw',receiver=null){if(p.throw||b.mode!=='hand'||b.owner!==p.key)return false;p.throw={at:now(w),release:now(w)+.70,ball:b.id,target,type,receiver};pose(w,p,type,.95,{contact:now(w)+.70});return true;}
export function stepThrow(w,p,b){if(!p.throw)return;const k=p.throw;if(!b||b.owner!==p.key||b.mode!=='hand'){p.throw=null;return;}if(now(w)>=k.release){releaseBall(w,p,b,k.target,k.type,k.receiver);p.throw=null;}}
