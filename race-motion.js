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
export function spectatorProfile(random,index){
  return {phase:random()*Math.PI*2+index*.013,speed:.65+random()*.95,
    width:.8+random()*.42,height:.87+random()*.25,
    cycle:3.5+random()*4.5+index*.00017,delay:random()*2.5,
    action:Math.floor(random()*6),energy:.6+random()*.65,
    hair:Math.floor(random()*4),hat:random()<.16,skin:random(),shirt:random(),trousers:random()};
}
