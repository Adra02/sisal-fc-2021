// Fixed-step movement shared by drills and friendly games. Metres and seconds.
// No renderer, storage, service or per-frame network access in this module.
import {BENCH} from './arena-layout.js?v=arena-12';
export const DT=1/24,RADIUS=.34,MIN_DISTANCE=RADIUS*2;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const mix=(a,b,u)=>a+(b-a)*u;
export const length=(x,z)=>Math.hypot(x,z);
export function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;}
export function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let x=Math.imul(seed^seed>>>15,1|seed);x^=x+Math.imul(x^x>>>7,61|x);return ((x^x>>>14)>>>0)/4294967296;};}
export function shuffle(items,seed){const a=[...items],r=random(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function turn(a,b,max){return a+clamp(Math.atan2(Math.sin(b-a),Math.cos(b-a)),-max,max);}
export function footPoint(p,heading=p.heading){return [p.x+Math.sin(heading)*.40,.14,p.z+Math.cos(heading)*.40];}
export function bodyState(player,pos){return {...player,x:pos[0],z:pos[1],vx:0,vz:0,heading:Math.PI,travel:0,cycle:hash(player.key)%997/997,action:null,elevation:0};}
const wallBoxes=[{x0:26.75,x1:27.45,z0:1.5,z1:14.5}];
export const BENCH_SEATS=BENCH.seats;
const poles=[[-3,-26],[3,-26],[-3,26],[3,26],[20.4,2.1],[20.4,13.9]];
function obstacles(p){
 for(const [x,z]of poles){let dx=p.x-x,dz=p.z-z,d=Math.hypot(dx,dz);if(d<.395){if(d<.0001){dx=1;dz=0;d=1;}p.x=x+dx/d*.395;p.z=z+dz/d*.395;}}
 for(const b of wallBoxes){if(p.x>b.x0-RADIUS&&p.x<b.x1+RADIUS&&p.z>b.z0-RADIUS&&p.z<b.z1+RADIUS){const q=[{d:p.x-(b.x0-RADIUS),axis:'x',v:b.x0-RADIUS},{d:b.x1+RADIUS-p.x,axis:'x',v:b.x1+RADIUS},{d:p.z-(b.z0-RADIUS),axis:'z',v:b.z0-RADIUS},{d:b.z1+RADIUS-p.z,axis:'z',v:b.z1+RADIUS}].sort((a,b)=>a.d-b.d)[0];p[q.axis]=q.v;}}
 // Back rests are solid; the front of an assigned seat remains reachable.
 if(!p.seatedTarget&&p.x>21.32&&p.x<22.76&&p.z>3.0&&p.z<13.04){const exits=[{d:p.x-21.32,key:'x',value:21.32},{d:22.76-p.x,key:'x',value:22.76},{d:p.z-3,key:'z',value:3},{d:13.04-p.z,key:'z',value:13.04}].sort((a,b)=>a.d-b.d);p[exits[0].key]=exits[0].value;}
 p.x=clamp(p.x,-31.2,31.2);p.z=clamp(p.z,-31.2,31.2);
}
function pairs(players,fn,cellSize=1){
 const cells=new Map();for(let i=0;i<players.length;i++){const p=players[i],cx=Math.floor(p.x/cellSize),cz=Math.floor(p.z/cellSize);for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const j of cells.get(x+':'+z)||[])fn(players[j],p,j,i);const key=cx+':'+cz;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);}
}
export function separate(players,iterations=6){
 for(let k=0;k<iterations;k++){
  let changed=false;pairs(players,(a,b)=>{let dx=b.x-a.x,dz=b.z-a.z,d=length(dx,dz);if(d>=MIN_DISTANCE-1e-7)return;if(d<1e-8){const ang=hash(a.key+'|'+b.key)/4294967296*Math.PI*2;dx=Math.sin(ang);dz=Math.cos(ang);d=1;}const overlap=(MIN_DISTANCE-(d===1&&length(b.x-a.x,b.z-a.z)<1e-8?0:d))*.501,wa=a.seatedTarget?.01:(a.priority??1),wb=b.seatedTarget?.01:(b.priority??1),total=wa+wb;a.x-=dx/d*overlap*wa/total*2;a.z-=dz/d*overlap*wa/total*2;b.x+=dx/d*overlap*wb/total*2;b.z+=dz/d*overlap*wb/total*2;changed=true;});
  for(const p of players)obstacles(p);if(!changed)break;
 }
}
export function movePlayers(players,targets,dt=DT){
 const old=players.map(p=>[p.x,p.z,p.vx,p.vz,p.heading]);
 for(let i=0;i<players.length;i++){
  const p=players[i];let target=targets[i]||[p.x,p.z];const speed=p.maxSpeed??4.1;
  const crossWall=(p.x<26.43&&target[0]>27.76)||(p.x>27.76&&target[0]<26.43);if(crossWall&&((p.z>1.1&&p.z<14.9)||(target[1]>1.1&&target[1]<14.9))){const edge=p.z<8?1:15,side=p.x<26.43?26.25:27.95;target=Math.abs(p.z-edge)>.20?[side,edge]:[p.x<26.43?27.95:26.25,edge];}
  if(!p.seatedTarget){const crossed=(p.x<21.33&&target[0]>22.75)||(p.x>22.75&&target[0]<21.33),sameBand=p.z>2.7&&p.z<13.35||target[1]>2.7&&target[1]<13.35;if(crossed&&sameBand){const edge=[2.5,13.55].sort((a,b)=>Math.abs(p.z-a)+Math.abs(target[1]-a)-Math.abs(p.z-b)-Math.abs(target[1]-b))[0],side=p.x<21.33?21.0:23.1;if(Math.abs(p.z-edge)>.3)target=[side,edge];else target=[p.x<21.33?23.1:21.0,edge];}}

  const tx=target[0]-p.x,tz=target[1]-p.z,distance=length(tx,tz),oldSpeed=length(p.vx,p.vz);
  let cap=Math.min(speed,Math.sqrt(2*6.2*Math.max(0,distance-.012)));
  if(oldSpeed>1.8&&distance>.10){const alignment=(tx*p.vx+tz*p.vz)/(distance*oldSpeed);cap*=.45+.55*Math.sqrt(Math.max(0,(1+alignment)/2));}
  if(p.faceLock&&!p.seatedTarget&&distance>.10){const forward=(tx*Math.sin(p.heading)+tz*Math.cos(p.heading))/distance;cap*=forward<-.25?.66:forward<.4?.84:1;}
  let vx=tx*3.6,vz=tz*3.6,d=length(vx,vz);if(d>cap){vx*=cap/d;vz*=cap/d;}
  p.avoidX=0;p.avoidZ=0;p.wantX=vx;p.wantZ=vz;p.moveTarget=target;
 }
 // Yield only when the intended paths actually collide. Mere proximity to a
 // teammate is not an instruction to circle them. Stop the prediction at each
 // destination: projecting through a stopping point made a stationary wall
 // sidestep forever even though its assigned places were safely separated.
 pairs(players,(a,b)=>{
  const dx=b.x-a.x,dz=b.z-a.z,d=length(dx,dz);if(d<.001||d>1.65)return;
  const av=length(a.wantX,a.wantZ),bv=length(b.wantX,b.wantZ),ad=length(a.moveTarget[0]-a.x,a.moveTarget[1]-a.z),bd=length(b.moveTarget[0]-b.x,b.moveTarget[1]-b.z);
  // A shared/overlapping destination has no passing lane. Let the capsule
  // solver form a stable cluster instead of circulating around an occupied goal.
  if(length(a.moveTarget[0]-b.moveTarget[0],a.moveTarget[1]-b.moveTarget[1])<MIN_DISTANCE+.08)return;
  const vx=a.wantX-b.wantX,vz=a.wantZ-b.wantZ,closing=vx*dx+vz*dz,v2=vx*vx+vz*vz;if(closing<=.02||v2<.001)return;
  const horizon=clamp(closing/v2,0,.65),at=av?Math.min(horizon,ad/av):0,bt=bv?Math.min(horizon,bd/bv):0;
  const separation=length(dx+b.wantX*bt-a.wantX*at,dz+b.wantZ*bt-a.wantZ*at);if(separation>=MIN_DISTANCE+.06)return;
  // Side-step across the intended travel direction, not tangentially around
  // the other body. A tangent to their changing position creates an orbit.
  const strength=(1.65-d)*2.0,n=Math.sqrt(v2),px=vz/n*strength,pz=-vx/n*strength,wa=ad<.10?.02:(a.priority??1),wb=bd<.10?.02:(b.priority??1),total=wa+wb;
  a.avoidX+=px*wa/total*2;a.avoidZ+=pz*wa/total*2;b.avoidX-=px*wb/total*2;b.avoidZ-=pz*wb/total*2;
 },1.65);
 for(const p of players){
  let vx=p.wantX+p.avoidX,vz=p.wantZ+p.avoidZ,d=length(vx,vz),top=p.maxSpeed??4.1;
  if(d>top){vx*=top/d;vz*=top/d;}
  const braking=vx*p.vx+vz*p.vz<length(p.vx,p.vz)**2,limit=braking?9.4:p.faceLock?7.4:8.2;
  const nearTarget=length(p.moveTarget[0]-p.x,p.moveTarget[1]-p.z)<.85&&length(p.vx,p.vz)<2;
  let ax=nearTarget?(p.moveTarget[0]-p.x)*22-p.vx*9.5+p.avoidX*3:(vx-p.vx)/dt,az=nearTarget?(p.moveTarget[1]-p.z)*22-p.vz*9.5+p.avoidZ*3:(vz-p.vz)/dt,acc=length(ax,az);if(acc>limit){ax*=limit/acc;az*=limit/acc;}
  // Ease acceleration itself: the body brakes and plants before reversing.
  const previous=p.motorAcceleration||[0,0],jx=ax-previous[0],jz=az-previous[1],jerk=length(jx,jz),step=46*dt;
  if(jerk>step){ax=previous[0]+jx/jerk*step;az=previous[1]+jz/jerk*step;}
  p.motorAcceleration=[ax,az];p.vx+=ax*dt;p.vz+=az*dt;
  if(length(vx-p.vx,vz-p.vz)<.12&&length(vx,vz)<.05){p.vx=vx;p.vz=vz;p.motorAcceleration=[0,0];}
  p.x+=p.vx*dt;p.z+=p.vz*dt;
 }
 for(const p of players)p.brace=(p.brace||0)*Math.exp(-dt*7);
 pairs(players,(a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,d=length(dx,dz),relative=length(a.vx-b.vx,a.vz-b.vz),closing=(a.vx-b.vx)*dx+(a.vz-b.vz)*dz;if(d<MIN_DISTANCE+.035&&d>.001&&relative>1.3&&closing>.08){for(const [p,side]of [[a,1],[b,-1]]){p.brace=Math.max(p.brace,Math.min(.65,relative*.09));p.braceSide=Math.sign((dx*Math.cos(p.heading)-dz*Math.sin(p.heading))*side)||1;}}});
 separate(players);
 for(let i=0;i<players.length;i++){const p=players[i],dx=p.x-old[i][0],dz=p.z-old[i][1],distance=length(dx,dz),speed=distance/dt;p.vx=dx/dt;p.vz=dz/dt;p.acceleration=[clamp((p.vx-old[i][2])/dt,-12,12),clamp((p.vz-old[i][3])/dt,-12,12)];p.travel+=distance;p.stride=1.08+Math.min(6,speed)*.21;p.cycle+=distance/p.stride;const travelling=speed>.85&&!p.faceLock&&!p.seatedTarget,desired=travelling?Math.atan2(dx,dz):p.aim??(speed>.13?Math.atan2(dx,dz):p.heading);p.heading=turn(p.heading,desired,dt*(p.faceLock?6.0:speed>3?4.0:speed>1?5.0:4.5));p.turnRate=Math.atan2(Math.sin(p.heading-old[i][4]),Math.cos(p.heading-old[i][4]))/dt;p.pivot=clamp(Math.abs(p.turnRate)*.22,0,1)*(1-clamp(speed/.65,0,1));if(speed<.12)p.cycle+=Math.abs(p.turnRate)*dt*.13;for(const key of ['x','z','vx','vz','heading','travel','cycle'])p[key]=Math.round(p[key]*100000)/100000;}
}
export function sampleTrack(actor,t){const keys=actor.track||[];if(!keys.length)return [...actor.home];if(t<=keys[0].at)return [...keys[0].p];for(let i=1;i<keys.length;i++)if(t<=keys[i].at){const a=keys[i-1],b=keys[i],v=clamp((t-a.at)/(b.at-a.at)),u=v*v*(3-2*v);return [mix(a.p[0],b.p[0],u),mix(a.p[1],b.p[1],u)];}return [...keys.at(-1).p];}
