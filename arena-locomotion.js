// Visual biomechanics only. Distances/timing come from the shared world;
// nothing in this module changes an event, a destination or a match result.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export function locomotion(speed,cycle,stride,pivot=0){
 const run=clamp((speed-1.4)/2.2),weight=clamp(Math.max(speed,pivot*.20)/.55),stance=.62-.22*run;
 const feet={};
 for(const [side,offset]of [['l',0],['r',.5]]){
  const phase=((cycle+offset)%1+1)%1,planted=phase<stance,u=clamp((phase-stance)/(1-stance)),span=stride*weight;
  // Hermite tangents continue the backward movement at toe-off and landing.
  // Early heel recovery bends the knee before the thigh drives forward.
  const h00=2*u*u*u-3*u*u+1,h10=u*u*u-2*u*u+u,h01=-2*u*u*u+3*u*u,h11=u*u*u-u*u;
  const x=planted?(stance/2-phase)*span:h00*(-stance/2*span)+h10*(-span*(1-stance))+h01*(stance/2*span)+h11*(-span*(1-stance));
  const recovery=Math.sin(Math.PI*Math.pow(u,.72));
  const lift=planted?0:Math.max(0,recovery)*(.075+.30*run+.035*clamp(speed/1.5))*weight;
  const toe=planted?-.25*run*smooth((phase/stance-.62)/.38):(.20+.24*run)*Math.sin(u*Math.PI)-.10*smooth((u-.80)/.20);
  feet[side]={phase,stance:planted,x,lift,toe};
 }
 return {feet,run,weight,stance,bob:Math.cos(cycle*Math.PI*4)*(.005+.010*run)*weight,sway:Math.sin(cycle*Math.PI*2)*(.012-.005*run)*weight,twist:Math.sin(cycle*Math.PI*2)*(.025+.035*run)*weight};
}

export function transitionWeight(age,duration=.14){return 1-smooth(age/duration)}
