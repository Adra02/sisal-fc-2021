// Stable editorial camera: don't fit the whole team whenever a ball goes out.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function actionFraming(frame,aspect=1){
 const balls=frame.balls||[],focusPoint=frame.focus?.[0],focused=focusPoint?balls.reduce((best,b)=>!best||Math.hypot(b.pos[0]-focusPoint[0],b.pos[2]-focusPoint[1])<Math.hypot(best.pos[0]-focusPoint[0],best.pos[2]-focusPoint[1])?b:best,null):null,ball=balls.find(b=>b.id===frame.technique?.ball)||focused||balls.find(b=>b.mode!=='rack'&&b.visible!==false)||balls[0];
 const focus=ball?[ball.pos[0],ball.pos[2]]:frame.focus?.[0]||[0,0],actors=(frame.actors||[]).filter(p=>p.active&&!p.seated&&Math.hypot(p.pos[0]-focus[0],p.pos[1]-focus[1])<8.5).sort((a,b)=>Math.hypot(a.pos[0]-focus[0],a.pos[1]-focus[1])-Math.hypot(b.pos[0]-focus[0],b.pos[1]-focus[1])).slice(0,3);
 const points=[focus,...actors.map(p=>p.pos)],xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),mx=(Math.min(...xs)+Math.max(...xs))/2,mz=(Math.min(...zs)+Math.max(...zs))/2;
 // Project extents into the camera axes; portrait devices retain a readable
 // action window rather than zooming out until every participant fits.
 const az=.55,s=Math.sin(az),c=Math.cos(az),projected=points.map(p=>(p[0]-mx)*c-(p[1]-mz)*s),span=Math.max(...projected)-Math.min(...projected);
 const radius=clamp((span+5.2)/(2*Math.tan(43*Math.PI/360)*Math.max(.55,aspect)),aspect<.8?15:12.5,aspect<.8?25:23);
 const velocity=frame.playing?frame.ballVelocity||[0,0,0]:[0,0,0];
 return {center:[mx+clamp(velocity[0]*.10,-.8,.8),clamp(.85+(ball?.pos[1]||0)*.10,.85,1.3),mz+clamp(velocity[2]*.10,-.8,.8)],radius};
}
export function smoothRadius(current,target,dt){
 const change=(target-current)*(1-Math.exp(-Math.max(0,dt)*1.35));
 return current+clamp(change,-2.8*dt,4.2*dt);
}
export function fullAvatarDetail(distance,viewportHeight,{low=false,selected=false,fov=43,minPixels=45}={}){
 if(selected)return true;
 if(low)return false;
 const pixels=1.55*viewportHeight/(2*Math.max(.1,distance)*Math.tan(fov*Math.PI/360));
 return pixels>=minPixels;
}
