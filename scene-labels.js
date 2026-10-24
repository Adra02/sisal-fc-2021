// Pixel-space layout shared by the race and Arena. A final clamp must never
// reintroduce a collision: every candidate is validated after clamping.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const intersects=(a,b,gap=4)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
export function placeLabels(items,{width,height,top=8,bottom=8,left=8,right=8,gap=5,obstacles=[],previous=new Map()}={}){
 const placed=[],result=new Map(),order=[...items].filter(i=>i.visible!==false).sort((a,b)=>(b.priority||0)-(a.priority||0)||a.ay-b.ay||String(a.id).localeCompare(String(b.id)));
 for(const item of order){
  const w=Math.min(item.w,width-left-right),h=item.h,minX=left,maxX=width-right-w,minY=top,maxY=height-bottom-h;
  if(w<25||maxY<minY){result.set(item.id,{hidden:true});continue;}
  const desired={x:clamp(item.ax-w/2,minX,maxX),y:clamp(item.ay-h-12,minY,maxY)},prior=previous.get(item.id),xs=[desired.x],ys=[desired.y];
  if(prior&&!prior.hidden){xs.push(clamp(prior.x,minX,maxX));ys.push(clamp(prior.y,minY,maxY));}
  for(let d=1;d<=Math.ceil((maxY-minY)/(h+gap))+1;d++)ys.push(clamp(desired.y-d*(h+gap),minY,maxY),clamp(desired.y+d*(h+gap),minY,maxY));
  for(let d=1;d<=Math.ceil((maxX-minX)/(w+gap))+1;d++)xs.push(clamp(desired.x-d*(w+gap),minX,maxX),clamp(desired.x+d*(w+gap),minX,maxX));
  let best=null,score=Infinity;
  for(const y of new Set(ys))for(const x of new Set(xs)){
   const box={x,y,w,h};if(placed.some(b=>intersects(box,b,gap))||obstacles.some(b=>intersects(box,b,gap)))continue;
   const s=Math.pow(x-desired.x,2)+Math.pow(y-desired.y,2)*1.25+(prior&&!prior.hidden?(Math.pow(x-prior.x,2)+Math.pow(y-prior.y,2))*.18:0);
   if(s<score){best=box;score=s;}
  }
  if(best){placed.push(best);result.set(item.id,{...best,hidden:false});}else result.set(item.id,{hidden:true});
 }
 for(const item of items)if(!result.has(item.id))result.set(item.id,{hidden:true});return result;
}
export function leaderLine(box,ax,ay){
 let x=clamp(ax,box.x+3,box.x+box.w-3),y=clamp(ay,box.y+3,box.y+box.h-3);
 if(ax>=box.x&&ax<=box.x+box.w&&ay>=box.y&&ay<=box.y+box.h){const d=[ax-box.x,box.x+box.w-ax,ay-box.y,box.y+box.h-ay],i=d.indexOf(Math.min(...d));if(i===0)x=box.x;else if(i===1)x=box.x+box.w;else if(i===2)y=box.y;else y=box.y+box.h;}
 return {x,y,length:Math.hypot(ax-x,ay-y),angle:Math.atan2(ay-y,ax-x)};
}
