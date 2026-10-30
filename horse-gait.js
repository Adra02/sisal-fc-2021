/* Visual four-beat gallop. Distance is supplied by the existing race plan.
 * Hoof contacts are solved in world space; ranking, progress and clocks stay upstream. */
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const OFFSETS=[0,.86,.58,.44]; // hind, hind, fore, fore; gathered suspension follows
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
function solveLeg(leg,x,y){
 const {upper,lower,upperAngle,lowerAngle,hipX,hipY}=leg.gait;
 const dx=x-hipX,dy=y-hipY,d=clamp(Math.hypot(dx,dy),.05,upper+lower-.0001);
 const bend=(leg.hind?1:-1)*Math.acos(clamp((d*d-upper*upper-lower*lower)/(2*upper*lower),-1,1));
 return [Math.atan2(dy,dx)-Math.atan2(lower*Math.sin(bend),upper+lower*Math.cos(bend))-upperAngle,bend-(lowerAngle-upperAngle)];
}
export function animateGallop(mount,{distance=0,drive=1,reduced=false,profile={}}={}){
 const power=clamp(drive,0,1),stride=1.65+(profile.stride??.6)*.45;
 const phase=distance/stride*TAU+(profile.phase||0),lap=((phase/TAU)%1+1)%1;
 const flight=lap>.76?Math.sin((lap-.76)/.24*Math.PI)**2:0;
 // Pelvis rises in suspension and settles into the next support, rather than
 // sliding on a fixed-height torso. Reduced motion keeps the contact solution.
 const impactDistance=((lap-.055+.5)%1+1)%1-.5;
 const bounce=reduced?.22:1,impact=Math.exp(-((impactDistance/.065)**2));
 const bodyY=.03+power*(-.105+bounce*(.046*flight-.009*impact+.009*Math.sin(phase-.4)));
 const pitch=power*bounce*(.012*Math.sin(phase-.75)+.007*flight);
 const nose=mount.group.userData.locomotion?.(phase,power,reduced)||{x:2.13,y:2.37};
 const cp=Math.cos(pitch),sp=Math.sin(pitch),noseOffset=nose.x*cp-nose.y*sp,noseShift=2.13-noseOffset,contacts=[],targets=[];
 mount.legs.forEach((leg,i)=>{
  const rest=leg.gait,cycle=((phase/TAU+OFFSETS[i])%1+1)%1,stance=leg.hind?.22:.20,contact=cycle<stance;
  let swing,lift=0,footPitch=0;
  if(contact){
   // Backwards at precisely the travelled ground speed throughout support.
   swing=stride*(stance/2-cycle);
   footPitch=(leg.hind?.035:-.028)*Math.sin(cycle/stance*Math.PI)**2*power;
   contacts.push(i);
  }else{
   const t=(cycle-stance)/(1-stance),t2=t*t,t3=t2*t;
   // Position AND velocity meet the support at both ends of the swing.
   swing=stride*((2*t3-3*t2+1)*(-stance/2)+(-2*t3+3*t2)*(stance/2)+(2*t3-3*t2+t)*(-(1-stance)));
   const fold=Math.sin(Math.PI*t)**2;
   lift=fold*(leg.hind?.46:.48);
   footPitch=fold*(leg.hind?.38:-.68)*power;
  }
  if(!power){leg.hip.rotation.z=leg.shin.rotation.z=leg.hoof.rotation.z=0;targets.push({x:rest.footX,y:rest.footY+.03,z:rest.footZ,contact:true,footPitch:0});return;}
  const cf=Math.cos(footPitch),sf=Math.sin(footPitch),floorOffset=Math.min(...rest.solePoints.map(([x,y])=>sf*(x-rest.footX)+cf*(y-rest.footY)));
  const worldX=rest.footX+swing*power-noseShift,worldY=.04-floorOffset+lift*power;
  const ankleX=worldX+cf*(rest.ankleX-rest.footX)-sf*(rest.ankleY-rest.footY),ankleY=worldY+sf*(rest.ankleX-rest.footX)+cf*(rest.ankleY-rest.footY);
  const [hip,shin]=solveLeg(leg,cp*ankleX+sp*(ankleY-bodyY),-sp*ankleX+cp*(ankleY-bodyY));
  const settle=smooth(power/.15);leg.hip.rotation.z=hip*settle;leg.shin.rotation.z=shin*settle;leg.hoof.rotation.z=(footPitch-pitch-hip-shin)*settle;
  targets.push({x:worldX,y:worldY,z:rest.footZ,contact,footPitch});
 });
 return {phase,bodyY,pitch,noseOffset,contacts,targets,suspension:flight,riderLift:-power*bounce*(.016*flight+.009*Math.sin(phase-.4)),riderLean:reduced?0:-Math.sin(phase+.65)*.009*power};
}
// Dust starts at completed touchdowns; seeks/replays recreate the same particles.
export function dustSample(mount,distance,profile,j){
 const stride=1.65+(profile.stride??.6)*.45,leg=j%4,offset=OFFSETS[leg],phase=(profile.phase||0)/TAU,slot=Math.floor(j/4),cycle=distance/stride+phase+offset;
 const eventDistance=(Math.floor(cycle)-phase-offset-Math.floor(slot/4))*stride;
 const age=(distance-eventDistance)/(stride*.85),rest=mount.legs[leg].gait,n=Math.sin(j*127.1+leg*53.7)*43758.54,random=n-Math.floor(n);
 return {visible:eventDistance>.20&&age>=0&&age<1,x:eventDistance+rest.footX+stride*.11+(random-.5)*age*.38,y:.052+Math.sin(age*Math.PI)*(.10+random*.16),z:rest.footZ+Math.sin(j*34.2)*age*.26,age};
}
