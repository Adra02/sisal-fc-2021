import {DT,clamp} from './arena-motion.js?v=arena-10';
import {PAVILION,BALL_RACK,FIELD} from './arena-layout.js?v=arena-10';
import {now,actor,handPoint,emit,footPointWorld,rnd,pose} from './arena-world-state.js?v=arena-10';
import {offsideAtRelease} from './arena-laws.js?v=arena-10';
import {trackReceiver} from './arena-tactics.js?v=arena-10';
import {TECHNIQUES} from './arena-technique-data.js?v=arena-10';
import {isShot} from './arena-practice.js?v=arena-10';
import {isKeeper} from './arena-roles.js?v=arena-10';
import {curveAcceleration,strikingFoot} from './arena-ball-flight.js?v=arena-10';
const G=9.81,R=FIELD.ballRadius,ROLL=1.35;
const smooth=u=>{u=clamp(u);return u*u*(3-2*u)};
function circleEntry(x,z,dx,dz,r){const a=dx*dx+dz*dz,c=x*x+z*z-r*r;if(a<1e-12)return null;const b=2*(x*dx+z*dz),d=b*b-4*a*c;if(d<0)return null;const u=c<0?0:(-b-Math.sqrt(d))/(2*a);return u>=0&&u<=1?u:null;}
function goalFrameContact(w,b){
 const start=b.previous,delta=[b.x-start[0],b.y-start[1],b.z-start[2]],radius=R+FIELD.postRadius,hits=[];
 for(const sign of [-1,1]){
  const z=sign*FIELD.halfLength;
  for(const x of [-FIELD.goalWidth/2,FIELD.goalWidth/2]){
   const u=circleEntry(start[0]-x,start[2]-z,delta[0],delta[2],radius);if(u==null)continue;const y=start[1]+delta[1]*u;if(y<0||y>FIELD.goalHeight)continue;
   const nx=start[0]+delta[0]*u-x,nz=start[2]+delta[2]*u-z,n=Math.hypot(nx,nz)||1;hits.push({u,nx:nx/n,ny:0,nz:nz/n,surface:'post'});
  }
  const u=circleEntry(start[1]-FIELD.goalHeight,start[2]-z,delta[1],delta[2],radius);
  if(u!=null&&Math.abs(start[0]+delta[0]*u)<=FIELD.goalWidth/2){const ny=start[1]+delta[1]*u-FIELD.goalHeight,nz=start[2]+delta[2]*u-z,n=Math.hypot(ny,nz)||1;hits.push({u,nx:0,ny:ny/n,nz:nz/n,surface:'crossbar'});}
 }
 const hit=hits.filter(h=>b.vx*h.nx+b.vy*h.ny+b.vz*h.nz<-.02).sort((a,c)=>a.u-c.u)[0];if(!hit)return;
 const dot=b.vx*hit.nx+b.vy*hit.ny+b.vz*hit.nz,impact=Math.abs(dot),rest=1-hit.u;
 b.vx-=1.68*dot*hit.nx;b.vy-=1.68*dot*hit.ny;b.vz-=1.68*dot*hit.nz;
 b.x=start[0]+delta[0]*hit.u+hit.nx*.003+b.vx*DT*rest;b.y=start[1]+delta[1]*hit.u+hit.ny*.003+b.vy*DT*rest;b.z=start[2]+delta[2]*hit.u+hit.nz*.003+b.vz*DT*rest;
 if(now(w)-(b.frameHitAt??-10)>.08){emit(w,'post',b.flight?.from,null,b,{surface:hit.surface,intensity:clamp(impact/18,.12,1)});b.frameHitAt=now(w);}
}
function wallContact(w,b){
 const ranges=[[26.99-R,27.21+R],[0,2.96+R],[1.5-R,14.5+R]],start=b.previous,delta=[b.x-start[0],b.y-start[1],b.z-start[2]];let enter=0,exit=1,axis=-1,normal=0;
 for(let i=0;i<3;i++){const [lo,hi]=ranges[i],s=start[i],v=delta[i];if(Math.abs(v)<1e-8){if(s<lo||s>hi)return;continue;}let a=(lo-s)/v,c=(hi-s)/v,n=-1;if(a>c){[a,c]=[c,a];n=1;}if(a>enter){enter=a;axis=i;normal=n;}exit=Math.min(exit,c);if(enter>exit)return;}
 if(axis<0||enter<0||enter>1)return;
 const keys=['x','y','z'],vel=['vx','vy','vz'],impact=Math.abs(b[vel[axis]]);for(let i=0;i<3;i++)b[keys[i]]=start[i]+delta[i]*enter+(i===axis?normal*.002:0);b[vel[axis]]*=-.38;
 if(impact>1)emit(w,'bounce',b.lastTouch,null,b,{surface:'wall',intensity:clamp(impact/20,.12,.7)});
}
export function stepBalls(w){
 const t=now(w);
 for(const b of w.balls){
  b.previous=[b.x,b.y,b.z];
  if(b.mode==='rack')continue;
  const p=actor(w,b.owner);
  if(b.motion&&p){
   const m=b.motion,u=smooth((t-m.at-(m.type==='pickup'?.25:0))/(m.until-m.at-(m.type==='pickup'?.25:0))),hand=handPoint(p),to=m.type==='pickup'?hand:m.to,from=m.type==='pickup'?m.from:hand;
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
  const [ax,az]=curveAcceleration(b);b.vx+=ax*DT;b.vz+=az*DT;
  const drag=b.y>R+.025?Math.exp(-.025*DT):1;b.vx*=drag;b.vz*=drag;
  b.vy-=G*DT;const oldY=b.y;for(const [pkey,vkey]of [['x','vx'],['y','vy'],['z','vz']])b[pkey]+=b[vkey]*DT;
  const roof=b.x>20.2&&b.x<27.8&&b.z>1.75&&b.z<14.25,roofY=PAVILION.roofY+(b.x-24)*.045;
  if(roof&&oldY>=roofY+R&&b.y<roofY+R&&b.vy<0){b.y=roofY+R;b.vy=-b.vy*.18;b.vx-=G*.045*DT;b.vz*=.995;if(!b.onRoof){b.onRoof=true;emit(w,'roof',b.flight?.from,null,b);}}
  else if(b.onRoof&&roof&&Math.abs(b.y-roofY-R)<.06){b.y=roofY+R;b.vy=0;b.vx-=G*.045*DT;}
  else b.onRoof=false;
  if(b.y<R){const impact=-b.vy;b.y=R;if(b.vy<-1.1){b.vy=-b.vy*.26;b.vx*=.94;b.vz*=.94;if(impact>1.8)emit(w,'bounce',b.lastTouch,null,b,{intensity:clamp(impact/9,.1,.8)});}else b.vy=0;const v=Math.hypot(b.vx,b.vz),next=Math.max(0,v-ROLL*DT);if(v){b.vx*=next/v;b.vz*=next/v;}}
  wallContact(w,b);goalFrameContact(w,b);
  if(b.x<-31.5||b.x>30.8){b.x=clamp(b.x,-31.5,30.8);b.vx*=-.24;}
  if(Math.abs(b.z)>31){b.z=Math.sign(b.z)*31;b.vz*=-.24;}
  b.spinX+=b.vz*DT/R;b.spinZ-=b.vx*DT/R;b.spinY+=(b.flight?.curve||0)*DT;
  for(const k of ['x','y','z','vx','vy','vz','spinX','spinY','spinZ'])b[k]=Math.round(b[k]*100000)/100000;
 }
}
export function releaseBall(w,p,b,target,type='pass',receiver=null){
 const distance=Math.hypot(target[0]-b.x,target[2]-b.z),high=['cross','corner','throw','throwIn'].includes(type),shot=isShot(type),speed=type==='heelPass'?8:shot?19+rnd(w)*5:high?13:10.5+rnd(w)*1.6,duration=type==='chip'?clamp(distance/10,.7,1.6):high?clamp(distance/15,.80,1.8):clamp(distance/speed,.18,2.5),initial=high||shot?distance/duration:distance/duration+.5*ROLL*duration,factor=distance?initial/distance:0;
 b.vx=(target[0]-b.x)*factor;b.vz=(target[2]-b.z)*factor;b.vy=high||shot?(target[1]-b.y+.5*G*duration*duration)/duration:0;
 if(type==='freeKick')b.vy+=.8;
 const outside=['outsidePass','outsideShot'].includes(type),curve=outside?(p.personality%2?1:-1)*(type==='outsideShot'?2.8:1.5):type==='freeKick'?(rnd(w)-.5)*.65:0;
 if(curve&&distance){const sideX=(target[2]-b.z)/distance,sideZ=-(target[0]-b.x)/distance;b.vx-=sideX*curve*duration*.5;b.vz-=sideZ*curve*duration*.5;}
 b.mode='free';b.owner=null;b.motion=null;b.lastTouch=p.key;b.net=null;b.pendingFinish=null;b.flight={from:p.key,team:p.team,type,at:now(w),receiver,destination:[...target],curve,offside:offsideAtRelease(w,p,b,type),shotBy:shot?p.key:null};
 if(type==='cross'&&!w.match){const drill=w.groups.find(g=>g.ball===b.id&&g.stage==='play');if(drill){drill.crosses=(drill.crosses||0)+1;const choices=['volley','bicycle','scissor'].filter(k=>k!==drill.lastFinish);b.flight.finishPreference=choices[Math.floor(rnd(w)*choices.length)];drill.lastFinish=b.flight.finishPreference;}}
 if(w.match?.ball===b.id&&['kickoff','goalKick','corner','freeKick','indirect','penalty','throwIn'].includes(type))b.restartGuard={type,kicker:p.key,team:p.team};
 if(w.match?.ball===b.id&&type==='throw'&&isKeeper(p))b.restartGuard={type:'keeperThrow',kicker:p.key,team:p.team};
 if(p.action){p.action.contact=now(w);p.action.footTarget=[b.x,b.y,b.z];p.action.foot??=strikingFoot(p,b);}
 emit(w,type,p,receiver,b,{team:p.team,intensity:clamp(initial/24,.20,1)});
}
export function prepareKick(w,p,b,target,type='pass',receiver=null){
 if(p.kick||p.skill||p.aerial||b.mode==='hand'||b.motion||(b.owner&&b.owner!==p.key)||b.flight)return false;b.owner=p.key;
 p.kick={ball:b.id,target:[...target],type,receiver,foot:strikingFoot(p,b),stage:'plant',started:now(w)};return true;
}
export function stepKick(w,p,b){
 const k=p.kick,t=now(w);if(!k||!b)return;
 if(b.owner!==p.key||b.mode==='hand'||b.motion){p.kick=null;return;}
 if(!trackReceiver(w,p,k,b)){p.kick=null;return;}
 const h=Math.atan2(k.target[0]-b.x,k.target[2]-b.z)+(k.type==='heelPass'?Math.PI:0),plant=[b.x-Math.sin(h)*.36,b.z-Math.cos(h)*.36];p.aim=h;p.target=plant;
 if(k.stage==='plant'&&Math.hypot(p.x-b.x,p.z-b.z)<.65){b.vx*=Math.exp(-8*DT);b.vz*=Math.exp(-8*DT);}
 if(k.stage==='plant'&&Math.hypot(p.x-plant[0],p.z-plant[1])<.15&&Math.hypot(p.vx,p.vz)<1.15&&Math.abs(Math.atan2(Math.sin(h-p.heading),Math.cos(h-p.heading)))<.35){k.stage='swing';const short=['pass','kickoff','indirect','goalKick'].includes(k.type),spec=TECHNIQUES[k.type];k.release=t+(spec?.wind??(short?.17:.23));pose(w,p,spec?.gesture||(k.type==='cross'||k.type==='corner'?'cross':short?'pass':'shot'),spec?.duration??(short?.50:.70),{ball:b.id,foot:k.foot,contact:k.release,footTarget:[b.x,b.y,b.z],strength:['pass','outsidePass','heelPass'].includes(k.type)?.45:1,technique:k.type});if(spec)emit(w,'techniqueSetup',p,null,b,{technique:k.type});}
 if(k.stage==='swing'){p.target=[p.x,p.z];p.maxSpeed=0;if(t>=k.release){if(Math.hypot(p.x-b.x,p.z-b.z)<.62){releaseBall(w,p,b,k.target,k.type,k.receiver);}p.kick=null;}}
 if(t-k.started>3.0){p.kick=null;}
}
export function dribble(w,p,b,direction){
 if(b.motion||b.mode==='hand'||p.kick||p.skill||p.aerial)return;
 const t=now(w),distance=Math.hypot(p.x-b.x,p.z-b.z),speed=Math.hypot(p.vx,p.vz),foot=footPointWorld(p);
 if(b.y<.27&&distance<.64&&t>=(p.nextTouch||0)){
  const [dx,dz]=direction||[Math.sin(p.heading),Math.cos(p.heading)];
  // A real impulse and free rolling interval replace the old glued foot point.
  b.vx=dx*(1.55+speed*.72)+p.vx*.28;b.vz=dz*(1.55+speed*.72)+p.vz*.28;b.vy=0;b.mode='free';b.owner=p.key;b.lastTouch=p.key;b.flight=null;
  p.nextTouch=t+clamp(.40-speed*.025,.24,.40);pose(w,p,'dribble',.30,{ball:b.id,foot:strikingFoot(p,b),contact:t,footTarget:[b.x,b.y,b.z]});emit(w,'touch',p,null,b,{intensity:.22+Math.min(.18,speed*.04)});
 }
 if(distance>1.10)b.owner=null;
}
export function putInRack(w,b){b.mode='rack';b.owner=null;b.motion=null;b.group=null;b.flight=null;b.vx=b.vy=b.vz=0;b.net=null;b.pendingFinish=null;emit(w,'rack',null,null,b);}
export function prepareThrow(w,p,b,target,type='throw',receiver=null){if(p.throw||b.mode!=='hand'||b.owner!==p.key)return false;p.throw={at:now(w),release:now(w)+.70,ball:b.id,target,type,receiver};pose(w,p,type,.95,{contact:now(w)+.70});return true;}
export function stepThrow(w,p,b){if(!p.throw)return;const k=p.throw;if(!b||b.owner!==p.key||b.mode!=='hand'){p.throw=null;return;}if(now(w)>=k.release){releaseBall(w,p,b,k.target,k.type,k.receiver);p.throw=null;}}
