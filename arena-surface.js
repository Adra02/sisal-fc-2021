// Locally painted materials; no downloads, generated AI images or remote costs.
const fract=x=>x-Math.floor(x),noise=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
const smooth=x=>x*x*(3-2*x),mix=(a,b,u)=>a+(b-a)*u;
function fieldNoise(x,y){const ix=Math.floor(x),iy=Math.floor(y),u=smooth(fract(x)),v=smooth(fract(y));return mix(mix(noise(ix,iy),noise(ix+1,iy),u),mix(noise(ix,iy+1),noise(ix+1,iy+1),u),v)}
let pitchCache=null;
export function paintPitch(ctx,w,h){
 if(pitchCache?.width===w&&pitchCache?.height===h){ctx.putImageData(pitchCache,0,0);return;}
 const img=ctx.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/w,v=y/h,i=(y*w+x)*4,grain=noise(x,y)-.5,cloud=fieldNoise(u*15,v*21)-.5,large=fieldNoise(u*4,v*6)-.5;
  const band=Math.tanh(Math.sin(v*Math.PI*16)*7)*2.4,blade=Math.sin(x*1.7+y*.32)*.65;
  const goalWear=Math.exp(-(((u-.5)/.09)**2))*(Math.exp(-(((v-.045)/.035)**2))+Math.exp(-(((v-.955)/.035)**2))),centreWear=Math.exp(-(((u-.5)/.075)**2+((v-.5)/.05)**2));
  const wear=goalWear*12+centreWear*3;
  img.data[i]=48+cloud*9+large*7+grain*5+band+wear;
  img.data[i+1]=105+cloud*15+large*10+grain*10+band*1.4+blade-wear*.48;
  img.data[i+2]=49+cloud*8+large*7+grain*5+band*.65-wear*.28;img.data[i+3]=255;
 }
 ctx.putImageData(img,0,0);
 pitchCache=img;
}
export function paintSky(ctx,w,h){
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#5288a9');g.addColorStop(.55,'#8fb7cc');g.addColorStop(.82,'#c7d9df');g.addColorStop(1,'#e5e6d8');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
}
