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
  if(a===2){for(let j=0;j<2;j++){const sign=j?1:-1;hands[j]={elbow:[sign*.29,.65,.05],hand:[sign*(.27+.04*wave),.96+.035*beat,.12]};}rise=.22*excitement;}
  if(a===3){hands[1]={elbow:[.29,.66,.05],hand:[.25+.08*wave,1.01,.12]};}
  if(a===5){lean=.12*motion;hands[0]={elbow:[-.22,.40,.18],hand:[-.12,.62,.24]};}
  const intensity=motion*(a===0||a===5?.65:(.22+excitement*.78)*(.82+.18*Math.sin(clock*.24+p.phase)));
  return {rise:rise*motion,lean,hands:hands.map((h,j)=>({elbow:h.elbow.map((v,k)=>rest[j].elbow[k]+(v-rest[j].elbow[k])*intensity),hand:h.hand.map((v,k)=>rest[j].hand[k]+(v-rest[j].hand[k])*intensity)}))};
 }
 const a=pose(previous),b=pose(action),lerp=(x,y)=>x+(y-x)*mix;
 return {clock,beat,action,rise:lerp(a.rise,b.rise),lean:lerp(a.lean,b.lean),sway:Math.sin(clock*.72)*.014*p.energy*motion,look:Math.sin(clock*.31)*.07*motion,
  hands:a.hands.map((h,j)=>({elbow:h.elbow.map((v,k)=>lerp(v,b.hands[j].elbow[k])),hand:h.hand.map((v,k)=>lerp(v,b.hands[j].hand[k]))}))};
}
