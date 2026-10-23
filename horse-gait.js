/* Distance-driven visual locomotion. Race progression and finish times stay upstream. */
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function solveLeg(leg,x,y){
 const {upper,lower,upperAngle,lowerAngle,hipX,hipY}=leg.gait;
 const dx=x-hipX,dy=y-hipY,d=clamp(Math.hypot(dx,dy),.05,upper+lower-.0001);
 const bend=(leg.hind?1:-1)*Math.acos(clamp((d*d-upper*upper-lower*lower)/(2*upper*lower),-1,1));
 return [Math.atan2(dy,dx)-Math.atan2(lower*Math.sin(bend),upper+lower*Math.cos(bend))-upperAngle,bend-(lowerAngle-upperAngle)];
}
export function animateGallop(mount,{distance=0,drive=1,reduced=false,profile={}}={}){
 const power=clamp(drive,0,1),stride=1.65+(profile.stride??.6)*.45,phase=distance/stride*TAU+(profile.phase||0);
 const bodyY=.03+power*(-.105+(reduced?.006:.019)*(1+Math.sin(phase))),pitch=power*(reduced?0:.010*Math.sin(phase-.6));
 const nose=mount.group.userData.locomotion?.(phase,power,reduced)||{x:2.13,y:2.37},cp=Math.cos(pitch),sp=Math.sin(pitch),noseOffset=nose.x*cp-nose.y*sp,noseShift=2.13-noseOffset,contacts=[],targets=[];
 mount.legs.forEach((leg,i)=>{
  const rest=leg.gait,cycle=((phase/TAU+[0,.13,.48,.61][i])%1+1)%1,stance=.30,contact=cycle<stance;
  let swing,lift=0,footPitch=0;
  if(contact){swing=stride*(stance/2-cycle);contacts.push(i);}
  else{
   const t=(cycle-stance)/(1-stance),t2=t*t,t3=t2*t;
   // Hermite arc matches ground-relative velocity at both ends of swing.
   swing=stride*((2*t3-3*t2+1)*(-stance/2)+(-2*t3+3*t2)*(stance/2)+(2*t3-3*t2+t)*(-(1-stance)));
   lift=Math.sin(Math.PI*t)**2*(leg.hind?.49:.43);footPitch=Math.sin(Math.PI*t)**2*(leg.hind?.28:-.55)*power;
  }
  if(!power){leg.hip.rotation.z=leg.shin.rotation.z=leg.hoof.rotation.z=0;targets.push({x:rest.footX,y:rest.footY+.03,z:rest.footZ,contact:true});return;}
  const cf=Math.cos(footPitch),sf=Math.sin(footPitch),floorOffset=Math.min(...rest.solePoints.map(([x,y])=>sf*(x-rest.footX)+cf*(y-rest.footY)));
  const worldX=rest.footX+swing*power-noseShift,worldY=.04-floorOffset+lift*power;
  const ankleX=worldX+cf*(rest.ankleX-rest.footX)-sf*(rest.ankleY-rest.footY),ankleY=worldY+sf*(rest.ankleX-rest.footX)+cf*(rest.ankleY-rest.footY);
  const [hip,shin]=solveLeg(leg,cp*ankleX+sp*(ankleY-bodyY),-sp*ankleX+cp*(ankleY-bodyY));
  const ramp=clamp(power/.15,0,1),settle=ramp*ramp*(3-2*ramp);leg.hip.rotation.z=hip*settle;leg.shin.rotation.z=shin*settle;leg.hoof.rotation.z=(footPitch-pitch-hip-shin)*settle;
  targets.push({x:worldX,y:worldY,z:rest.footZ,contact,footPitch});
 });
 return {phase,bodyY,pitch,noseOffset,contacts,targets,riderLean:reduced?0:-Math.sin(phase+.65)*.012*power};
}
// Puffs follow completed touchdowns; distance history reproduces during seeks.
export function dustSample(mount,distance,profile,j){
 const stride=1.65+(profile.stride??.6)*.45,leg=j%4,offset=[0,.13,.48,.61][leg],phase=(profile.phase||0)/TAU,slot=Math.floor(j/4),cycle=distance/stride+phase+offset;
 const eventDistance=(Math.floor(cycle)-phase-offset-Math.floor(slot/4))*stride;
 const age=(distance-eventDistance)/(stride*1.05),rest=mount.legs[leg].gait,n=Math.sin(j*127.1+leg*53.7)*43758.54,random=n-Math.floor(n);
 return {visible:eventDistance>.20&&age>=0&&age<1,x:eventDistance+rest.footX+stride*.15+(random-.5)*age*.3,y:.052+Math.sin(age*Math.PI)*(.12+random*.2),z:rest.footZ+Math.sin(j*34.2)*age*.28,age};
}
