/* Visual locomotion only. Distance comes from the unchanged race plan. */
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
function solveLeg(leg,x,y){
 const {upper,lower,upperAngle,lowerAngle,hipX,hipY}=leg.gait;
 const dx=x-hipX,dy=y-hipY,d=clamp(Math.hypot(dx,dy),.05,upper+lower-.0001);
 const bend=(leg.hind?1:-1)*Math.acos(clamp((d*d-upper*upper-lower*lower)/(2*upper*lower),-1,1));
 const hip=Math.atan2(dy,dx)-Math.atan2(lower*Math.sin(bend),upper+lower*Math.cos(bend))-upperAngle;
 return [hip,bend-(lowerAngle-upperAngle)];
}
function lowestSole(leg,hip,shin,bodyY,pitch){
 const r=leg.gait,ch=Math.cos(hip),sh=Math.sin(hip),ck=Math.cos(shin),sk=Math.sin(shin),cp=Math.cos(pitch),sp=Math.sin(pitch);let lowest=Infinity;
 for(const [x,y]of r.solePoints){const dx=x-r.kneeX,dy=y-r.kneeY,kx=ck*dx-sk*dy+r.kneeX-r.hipX,ky=sk*dx+ck*dy+r.kneeY-r.hipY,px=ch*kx-sh*ky+r.hipX,py=sh*kx+ch*ky+r.hipY;lowest=Math.min(lowest,sp*px+cp*py+bodyY);}
 return lowest;
}
export function animateGallop(mount,{distance=0,drive=1,reduced=false,profile={}}={}){
 const power=clamp(drive,0,1),stride=1.65+(profile.stride??.6)*.45;
 const phase=distance/stride*TAU+(profile.phase||0),wave=Math.sin(phase),bodyY=.03+power*(-.115+(reduced?.008:.024)*(1+wave)),pitch=power*(reduced?0:.012*Math.sin(phase-.6));
 const contacts=[],targets=[];
 mount.legs.forEach((leg,i)=>{
  // Four staggered beats. Forelegs flex backwards; hind hocks fold forwards.
  // During contact dx/ddistance=-1: the foot is planted as the body advances.
  const offset=[0,.13,.48,.61][i],cycle=((phase/TAU+offset)%1+1)%1,stance=.30;
  let swing,lift;
  if(cycle<stance){swing=stride*(stance/2-cycle);lift=0;contacts.push(i);}
  else{const t=(cycle-stance)/(1-stance);swing=stride*stance*(ease(t)-.5);lift=Math.sin(Math.PI*t)**1.35*(leg.hind?.47:.39);}
  const rest=leg.gait,worldX=rest.footX+swing,worldY=.04+rest.soleHeight+lift;
  // Compensate trunk heave/pitch so planted hooves stay on the track.
  const x=Math.cos(pitch)*worldX+Math.sin(pitch)*(worldY-bodyY),y=-Math.sin(pitch)*worldX+Math.cos(pitch)*(worldY-bodyY);
  let [hip,shin]=solveLeg(leg,x,y);
  if(cycle<stance&&power>.98){let correction=0;for(let step=0;step<2;step++){correction+=.04-lowestSole(leg,hip,shin,bodyY,pitch);[hip,shin]=solveLeg(leg,x+Math.sin(pitch)*correction,y+Math.cos(pitch)*correction);}}
  leg.hip.rotation.z=hip*power;leg.shin.rotation.z=shin*power;
  targets.push({x:worldX,y:worldY,contact:cycle<stance});
 });
 return {phase,bodyY,pitch,contacts,targets,riderLean:reduced?0:-Math.sin(phase+.65)*.026*power};
}
