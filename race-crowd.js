/* Local spectator gestures. Same profiles/random draws; no gameplay influence. */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
export function spectatorPose(p,time,cheer,reduced=false){
 const clock=time*p.speed+p.phase,cycle=(time+p.delay)/(p.cycle*1.65),step=Math.floor(cycle);
 const mix=ease((cycle-step)*p.cycle*1.65/1.15),action=(p.action+step*p.gestureStep)%6,previous=(action-p.gestureStep+6)%6;
 const excitement=ease((cheer-p.delay*.09)/.82),motion=reduced?.08:1,beat=Math.sin(clock*4.8),wave=Math.sin(clock*1.7);
 const rest=[-1,1].map(sign=>({elbow:[sign*.24,.36,.10],hand:[sign*.15,.18,.32]}));
 function pose(a){
  const hands=rest.map(h=>({elbow:[...h.elbow],hand:[...h.hand]}));let rise=0,lean=Math.sin(clock*.65)*.004*motion;
  // Calm watching occupies half the idle cycle. Cheers grow near the finish,
  // with individual thresholds instead of a synchronised stadium-wide jump.
  if(a===0){lean=.07*motion;}
  if(a===1||a===4){const burst=.45+.55*ease((Math.sin(clock*.36+p.phase)+.35)/1.35),clap=(1+Math.sin(clock*(5.0+p.wave)))/2*burst;for(let j=0;j<2;j++){const sign=j?1:-1;hands[j]={elbow:[sign*.26,.43,.13],hand:[sign*(.025+.10*clap),.53,.34]};}}
  if(a===2){for(let j=0;j<2;j++){const sign=j?1:-1;hands[j]={elbow:[sign*.29,.65,.05],hand:[sign*(.27+.04*wave),.96+.035*beat,.12]};}rise=.12*excitement;}
  if(a===3){hands[1]={elbow:[.29,.66,.05],hand:[.25+.08*wave,1.01,.12]};}
  if(a===5){lean=.12*motion;hands[0]={elbow:[-.22,.40,.18],hand:[-.12,.62,.24]};}
  const intensity=motion*(a===0||a===5?.65:(.22+excitement*.78)*(.82+.18*Math.sin(clock*.24+p.phase)));
  return {rise:rise*motion,lean,hands:hands.map((h,j)=>({elbow:h.elbow.map((v,k)=>rest[j].elbow[k]+(v-rest[j].elbow[k])*intensity),hand:h.hand.map((v,k)=>rest[j].hand[k]+(v-rest[j].hand[k])*intensity)}))};
 }
 const a=pose(previous),b=pose(action),lerp=(x,y)=>x+(y-x)*mix;
 return {clock,beat,action,rise:lerp(a.rise,b.rise),lean:lerp(a.lean,b.lean),sway:Math.sin(clock*.72)*.014*p.energy*motion,look:Math.sin(clock*.31)*.07*motion,
  hands:a.hands.map((h,j)=>({elbow:h.elbow.map((v,k)=>lerp(v,b.hands[j].elbow[k])),hand:h.hand.map((v,k)=>lerp(v,b.hands[j].hand[k]))}))};
}

// Preserve segment lengths. An optional reusable result avoids per-frame garbage.
export function fitLimb(start,target,hint,upper,lower,out={joint:[0,0,0],end:[0,0,0]}){
 let dx=target[0]-start[0],dy=target[1]-start[1],dz=target[2]-start[2],length=Math.hypot(dx,dy,dz);
 if(length<.000001){dx=0;dy=-1;dz=0;length=1;}
 dx/=length;dy/=length;dz/=length;
 const reach=clamp(length,Math.abs(upper-lower)+.0001,upper+lower-.0001);
 let bx=hint[0]-start[0],by=hint[1]-start[1],bz=hint[2]-start[2];const projection=bx*dx+by*dy+bz*dz;
 bx-=dx*projection;by-=dy*projection;bz-=dz*projection;
 let size=Math.hypot(bx,by,bz);
 if(size<.0001){const ax=Math.abs(dz)<.9?0:1,az=Math.abs(dz)<.9?1:0,p=ax*dx+az*dz;bx=ax-dx*p;by=-dy*p;bz=az-dz*p;size=Math.hypot(bx,by,bz);}
 const along=(upper*upper-lower*lower+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,upper*upper-along*along))/size;
 out.joint[0]=start[0]+dx*along+bx*height;out.joint[1]=start[1]+dy*along+by*height;out.joint[2]=start[2]+dz*along+bz*height;
 out.end[0]=start[0]+dx*reach;out.end[1]=start[1]+dy*reach;out.end[2]=start[2]+dz*reach;return out;
}
// Cached low-rate gesture samples, interpolated into one reusable pose each frame.
// Only local profile state is cached; a replay seek always rebuilds its interval.
export function sampleSpectator(p,time,cheer,reduced,rate){
 const tick=Math.floor(time*rate),blend=time*rate-tick;
 let cache=p.poseCache;
 if(!cache){cache=p.poseCache={tick:NaN,rate:0,reduced:null,a:null,b:null,out:{hands:[{elbow:[0,0,0],hand:[0,0,0]},{elbow:[0,0,0],hand:[0,0,0]}]}};}
 if(cache.tick!==tick||cache.rate!==rate||cache.reduced!==reduced){
  cache.a=cache.tick===tick-1&&cache.rate===rate&&cache.reduced===reduced?cache.b:spectatorPose(p,tick/rate,cheer,reduced);
  cache.b=spectatorPose(p,(tick+1)/rate,cheer,reduced);cache.tick=tick;cache.rate=rate;cache.reduced=reduced;
 }
 const a=cache.a,b=cache.b,out=cache.out;
 for(const key of ['clock','beat','sway','rise','lean','look'])out[key]=a[key]+(b[key]-a[key])*blend;
 out.action=a.action;
 for(let j=0;j<2;j++)for(let k=0;k<3;k++){out.hands[j].elbow[k]=a.hands[j].elbow[k]+(b.hands[j].elbow[k]-a.hands[j].elbow[k])*blend;out.hands[j].hand[k]=a.hands[j].hand[k]+(b.hands[j].hand[k]-a.hands[j].hand[k])*blend;}
 return out;
}
