// Rotation-invariant flight helpers shared by physics and interception planning.
// Coordinates are metres; curve is lateral acceleration, never a world-axis bias.
export function curveAcceleration(ball){
 const speed=Math.hypot(ball.vx,ball.vz),curve=ball.flight?.curve||0;
 if(speed<.05||!curve)return [0,0];
 return [ball.vz/speed*curve,-ball.vx/speed*curve];
}
export function predictBall(ball,seconds){
 const [ax,az]=curveAcceleration(ball);
 return [ball.x+ball.vx*seconds+.5*ax*seconds*seconds,Math.max(.11,ball.y+ball.vy*seconds-4.905*seconds*seconds-4.905/24*seconds),ball.z+ball.vz*seconds+.5*az*seconds*seconds];
}
export function strikingFoot(player,ball){
 const lateral=(ball.x-player.x)*Math.cos(player.heading)-(ball.z-player.z)*Math.sin(player.heading);
 return Math.abs(lateral)>.075?Math.sign(lateral):(player.personality%5===0?-1:1);
}
