const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,u)=>a+(b-a)*u;
export function skillBodyPose(kind,phase,side=1,power=1){
 const ph=clamp(phase),arc=Math.sin(ph*Math.PI),result={rotation:[0,0,0],drop:0,lean:0,legs:null,arms:null};
 if(kind==='bicycle'||kind==='scissor'){
  const start=smooth(ph/.22),recover=1-smooth((ph-.48)/.52),flight=start*recover;
  result.rotation=kind==='bicycle'?[0,0,1.36*flight]:[side*.90*flight,0,.44*flight];result.drop=-.34*Math.sin(clamp((ph-.39)/.61)*Math.PI);result.lean=-.12*flight;
  const swing=smooth((ph-.08)/.27),returning=smooth((ph-.53)/.47),up=mix(-.85,.48,swing)*(1-returning)-.85*returning;
  result.legs={r:[mix(.35,-.30,swing)*flight,up,.15],l:[-.52*flight,-.74+.45*flight,-.15-side*.10*flight]};result.arms={r:[-.18,.27,.53],l:[-.10,.19,-.53]};
 }else if(kind==='outside'){
  const force=Math.max(.4,Math.min(1,power));result.lean=.09*arc*force;result.legs={r:[.16+.25*Math.sin(ph*Math.PI)*force,-.86+.14*arc,.16+.20*arc*force],l:[-.08,-.94,-.17]};result.arms={r:[-.10,.10,.28+.14*force],l:[.18,.12,-.26-.12*force]};
 }else if(kind==='chip'){
  result.lean=-.10*arc;result.legs={r:[.12+.30*arc,-.90+.23*smooth((ph-.18)/.4),.14],l:[-.08,-.94,-.14]};
 }else if(kind==='heel'){
  result.lean=.12*arc;result.legs={r:[.32-.66*smooth((ph-.18)/.55),-.90+.09*arc,.16],l:[-.04,-.94,-.15]};
 }else if(kind==='stepover'){
  const circle=ph*Math.PI*3;result.legs={r:[.30+Math.cos(circle)*.17,-.87+.18*Math.abs(Math.sin(circle)),.14+Math.sin(circle)*.24],l:[-.03,-.94,-.18]};result.lean=.09*Math.sin(circle);result.arms={r:[-.13,.09,.37],l:[.10,.05,-.37]};
 }else if(kind==='bodyFeint'){
  result.rotation=[side*Math.sin(ph*Math.PI*2)*.18,0,0];result.legs={r:[.18,-.91,.14+side*.16*arc],l:[-.08,-.94,-.16]};
 }else if(kind==='soleRoll'){
  result.legs={r:[.30,-.80,.20+side*.32*Math.sin(ph*Math.PI)],l:[-.08,-.94,-.20]};result.lean=.09*arc;
 }
 return result;
}
