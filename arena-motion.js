// Fixed-step movement shared by drills and friendly games. Metres and seconds.
// No renderer, storage, service or per-frame network access in this module.
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
export const BENCH_SEATS=Array.from({length:6},(_,i)=>[22,3.9+i*1.65]);
const poles=[[-3,-26],[3,-26],[-3,26],[3,26],[20.4,2.1],[20.4,13.9]];
function obstacles(p){
 for(const [x,z]of poles){let dx=p.x-x,dz=p.z-z,d=Math.hypot(dx,dz);if(d<.395){if(d<.0001){dx=1;dz=0;d=1;}p.x=x+dx/d*.395;p.z=z+dz/d*.395;}}
 for(const b of wallBoxes){if(p.x>b.x0-RADIUS&&p.x<b.x1+RADIUS&&p.z>b.z0-RADIUS&&p.z<b.z1+RADIUS){const q=[{d:p.x-(b.x0-RADIUS),axis:'x',v:b.x0-RADIUS},{d:b.x1+RADIUS-p.x,axis:'x',v:b.x1+RADIUS},{d:p.z-(b.z0-RADIUS),axis:'z',v:b.z0-RADIUS},{d:b.z1+RADIUS-p.z,axis:'z',v:b.z1+RADIUS}].sort((a,b)=>a.d-b.d)[0];p[q.axis]=q.v;}}
 // Back rests are solid; the front of an assigned seat remains reachable.
 if(!p.seatedTarget&&p.x>21.32&&p.x<22.76&&p.z>3.0&&p.z<13.04){const exits=[{d:p.x-21.32,key:'x',value:21.32},{d:22.76-p.x,key:'x',value:22.76},{d:p.z-3,key:'z',value:3},{d:13.04-p.z,key:'z',value:13.04}].sort((a,b)=>a.d-b.d);p[exits[0].key]=exits[0].value;}
 p.x=clamp(p.x,-30.8,26.5);p.z=clamp(p.z,-30.8,30.8);
}
function pairs(players,fn){
 const cells=new Map();for(let i=0;i<players.length;i++){const p=players[i],cx=Math.floor(p.x),cz=Math.floor(p.z);for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const j of cells.get(x+':'+z)||[])fn(players[j],p,j,i);const key=cx+':'+cz;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);}
}
export function separate(players,iterations=6){
 for(let k=0;k<iterations;k++){
  let changed=false;pairs(players,(a,b)=>{let dx=b.x-a.x,dz=b.z-a.z,d=length(dx,dz);if(d>=MIN_DISTANCE-1e-7)return;if(d<1e-8){const ang=hash(a.key+'|'+b.key)/4294967296*Math.PI*2;dx=Math.sin(ang);dz=Math.cos(ang);d=1;}const overlap=(MIN_DISTANCE-(d===1&&length(b.x-a.x,b.z-a.z)<1e-8?0:d))*.501,wa=a.seatedTarget?.01:(a.priority??1),wb=b.seatedTarget?.01:(b.priority??1),total=wa+wb;a.x-=dx/d*overlap*wa/total*2;a.z-=dz/d*overlap*wa/total*2;b.x+=dx/d*overlap*wb/total*2;b.z+=dz/d*overlap*wb/total*2;changed=true;});
  for(const p of players)obstacles(p);if(!changed)break;
 }
}
export function movePlayers(players,targets,dt=DT){
 const old=players.map(p=>[p.x,p.z]);
 for(let i=0;i<players.length;i++){
  const p=players[i];let target=targets[i]||[p.x,p.z];const speed=p.maxSpeed??4.1;
  if(!p.seatedTarget){const crossed=(p.x<21.32&&target[0]>22.76)||(p.x>22.76&&target[0]<21.32),sameBand=p.z>2.7&&p.z<13.35||target[1]>2.7&&target[1]<13.35;if(crossed&&sameBand){const edge=[2.5,13.55].sort((a,b)=>Math.abs(p.z-a)+Math.abs(target[1]-a)-Math.abs(p.z-b)-Math.abs(target[1]-b))[0],side=p.x<21.32?21.0:23.1;if(Math.abs(p.z-edge)>.3)target=[side,edge];else target=[p.x<21.32?23.1:21.0,edge];}}

  let vx=(target[0]-p.x)*2.4,vz=(target[1]-p.z)*2.4,d=length(vx,vz);if(d>speed){vx*=speed/d;vz*=speed/d;}
  p.avoidX=0;p.avoidZ=0;p.wantX=vx;p.wantZ=vz;
 }
 // Reciprocal side steps before the hard capsule separation, so opponents
 // pass each other rather than repeatedly pushing through the same centre.
 pairs(players,(a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,d=length(dx,dz);if(d<.001||d>1.55)return;const closing=(a.wantX-b.wantX)*dx+(a.wantZ-b.wantZ)*dz;if(closing<=.02)return;const side=(hash(a.key<b.key?a.key+'|'+b.key:b.key+'|'+a.key)%2?1:-1),strength=(1.55-d)*1.7,px=-dz/d*strength*side,pz=dx/d*strength*side;a.avoidX+=px;a.avoidZ+=pz;b.avoidX-=px;b.avoidZ-=pz;});
 for(const p of players){let vx=p.wantX+p.avoidX,vz=p.wantZ+p.avoidZ,d=length(vx,vz),top=p.maxSpeed??4.1;if(d>top){vx*=top/d;vz*=top/d;}let ax=vx-p.vx,az=vz-p.vz,acc=length(ax,az),limit=5.4*dt;if(acc>limit){ax*=limit/acc;az*=limit/acc;}p.vx+=ax;p.vz+=az;p.x+=p.vx*dt;p.z+=p.vz*dt;}
 separate(players);
 for(let i=0;i<players.length;i++){const p=players[i],dx=p.x-old[i][0],dz=p.z-old[i][1],distance=length(dx,dz),speed=distance/dt;p.vx=dx/dt;p.vz=dz/dt;p.travel+=distance;p.stride=.99+Math.min(5,speed)*.22;p.cycle+=distance/p.stride;const desired=p.aim??(speed>.13?Math.atan2(dx,dz):p.heading);p.heading=turn(p.heading,desired,dt*(speed>1?4.0:5.8));for(const key of ['x','z','vx','vz','heading','travel','cycle'])p[key]=Math.round(p[key]*100000)/100000;}
}
export function sampleTrack(actor,t){const keys=actor.track||[];if(!keys.length)return [...actor.home];if(t<=keys[0].at)return [...keys[0].p];for(let i=1;i<keys.length;i++)if(t<=keys[i].at){const a=keys[i-1],b=keys[i],v=clamp((t-a.at)/(b.at-a.at)),u=v*v*(3-2*v);return [mix(a.p[0],b.p[0],u),mix(a.p[1],b.p[1],u)];}return [...keys.at(-1).p];}
