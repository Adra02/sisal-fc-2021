/* Pure local motion, independent of graphics and network. */
export function randomSource(seed){
  let state=seed>>>0;
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
}
export function raceSeed(){
  const bytes=new Uint32Array(1);
  if(globalThis.crypto?.getRandomValues){globalThis.crypto.getRandomValues(bytes);return bytes[0]}
  return (Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;
}
export function motionProfile(random,index){
  return {phase:random()*Math.PI*2+index*.731,speed:13.8+random()*2.5,
    frequency:7+random()*4,amplitude:.021+random()*.010,
    stride:.54+random()*.10,bounce:.025+random()*.022,
    riderPhase:random()*Math.PI*2,tailPhase:random()*Math.PI*2};
}
export function raceProgress(f,profile){
  if(f<=0)return 0;if(f>=1)return 1;
  // Endpoint deviation and its derivative vanish: independent surges, equal arrival.
  // |deviation derivative| <= .031 * (PI + 11) < 1, so motion never reverses.
  return f+profile.amplitude*Math.sin(Math.PI*f)**2*Math.sin(profile.frequency*f+profile.phase);
}
// Shared race choreography. Intermediate leaders are independent of the result;
// only the last segment resolves the ranking. Monotone Hermite interpolation
// keeps velocity continuous and positive, including through each overtake.
export function racePlan(entries,random,duration){
  const times=[0,.14,.29,.44,.59,.73,.84,.91,.965];
  const order=entries.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  const points=entries.map(()=>[0]);
  let leader=0;
  for(let k=1;k<times.length;k++){
    leader=(leader+1+Math.floor(random()*Math.max(1,entries.length-1)))%entries.length;
    let pack=order.slice(leader).concat(order.slice(0,leader));
    // Give a challenger the advantage at the last waypoint, not the winner.
    if(k===times.length-1)pack.sort((a,b)=>entries[b].place-entries[a].place);
    const width=k===times.length-1?.008:k>=6?.019:.035;
    pack.forEach((i,j)=>points[i].push(times[k]+(entries.length===1?0:width*(.5-j/(entries.length-1)))));
  }
  return entries.map((entry,i)=>{
    const gap=(entry.place-1)*.008,finishAt=duration*(1+gap);
    const x=times.map(t=>t*duration),y=points[i];
    x.push(duration);y.push(1-gap);
    if(gap){x.push(finishAt);y.push(1);}
    const d=y.slice(1).map((v,j)=>(v-y[j])/(x[j+1]-x[j]));
    const slopes=y.map((_,j)=>{
      if(j===0)return d[0];if(j===y.length-1)return d[d.length-1];
      const a=x[j]-x[j-1],b=x[j+1]-x[j],w1=2*b+a,w2=b+2*a;
      return (w1+w2)/(w1/d[j-1]+w2/d[j]);
    });
    return {x,y,slopes,finishAt};
  });
}
export function plannedProgress(time,plan){
  if(time<=0)return 0;if(time>=plan.finishAt)return 1;
  let k=0;while(time>plan.x[k+1])k++;
  const h=plan.x[k+1]-plan.x[k],t=(time-plan.x[k])/h,t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*plan.y[k]+(t3-2*t2+t)*h*plan.slopes[k]
    +(-2*t3+3*t2)*plan.y[k+1]+(t3-t2)*h*plan.slopes[k+1];
}
// Continuous crossfades between individual gestures, no frozen idle pose.
export function spectatorPose(p,time,cheer,reduced=false){
  const clock=time*p.speed+p.phase,beat=Math.sin(clock*4.5);
  const cycle=(time+p.delay)/p.cycle,step=Math.floor(cycle);
  const blend=Math.min(1,(cycle-step)*p.cycle/.85),mix=blend*blend*(3-2*blend);
  const action=(p.action+step*p.gestureStep)%6,previous=(action-p.gestureStep+6)%6;
  const energy=(.55+cheer*.45)*p.energy;
  function pose(a){
    const rise=(a===1||a===2)?(reduced?.05:.2)*energy:0;
    const hands=[-1,1].map(sign=>{
      const wave=Math.sin(clock*(2.1+p.wave)+sign*p.asymmetry);
      if(a===0)return {elbow:[sign*.29,.43,.17],hand:[sign*(.045+.12*(beat+1)/2),.53+.04*wave,.32]};
      if(a===1)return {elbow:[sign*.32,.8+.05*wave,0],hand:[sign*(.28+.17*wave),1.14+.09*beat,.03+.08*wave]};
      if(a===2)return {elbow:[sign*.3,.67+.09*wave,.06],hand:[sign*.31,.95+.2*wave,.08]};
      if(a===3)return {elbow:[sign*.27,.54,.18],hand:[sign*(.27+.09*wave),.63+sign*.14*wave,.4]};
      if(a===4)return {elbow:[sign*.28,.48+.07*wave,.1],hand:[sign*.16,.71+.1*wave,.24+.09*beat]};
      return sign===1?{elbow:[.3,.79,.12],hand:[.2+.18*wave,1.03+.1*beat,.12]}:{elbow:[-.28,.4,.12],hand:[-.18,.46+.12*wave,.3]};
    });
    return {rise:rise+(a===2&&!reduced?Math.max(0,beat)*.09*energy:0),hands};
  }
  const a=pose(previous),b=pose(action);
  const lerp=(v,w)=>v+(w-v)*mix;
  return {action,beat,clock,rise:lerp(a.rise,b.rise),sway:Math.sin(clock)*.055*p.energy*(reduced?.4:1),
    hands:a.hands.map((h,j)=>({elbow:h.elbow.map((v,k)=>lerp(v,b.hands[j].elbow[k])),hand:h.hand.map((v,k)=>lerp(v,b.hands[j].hand[k]))}))};
}
export function spectatorProfile(random,index){
  return {phase:random()*Math.PI*2+index*.013,speed:.65+random()*.95,
    width:.8+random()*.42,height:.87+random()*.25,
    cycle:3.5+random()*4.5+index*.00017,delay:random()*2.5,
    action:Math.floor(random()*6),gestureStep:random()<.5?1:5,wave:random()*.8,asymmetry:random()*2,energy:.6+random()*.65,
    hair:Math.floor(random()*4),hat:random()<.16,skin:random(),shirt:random(),trousers:random()};
}
