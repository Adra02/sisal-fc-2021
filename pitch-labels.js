// Layout only: never changes a formation, player assignment or football statistic.
export function pitchLabelLayout(entries,{width,height,gap=5}={}){
 width=Math.max(160,Number(width)||320);height=Math.max(320,Number(height)||650);
 const compact=width<440,maxWidth=compact?92:116,tokenHeight=compact?86:96;
 const rows=(entries||[]).map(e=>({...e,cx:width*Number(e.x)/100,cy:height*Number(e.y)/100}));
 // Labels share the space halfway between nearby markers. Two short lines use
 // that space, rather than letting an unbroken username reach the next player.
 return rows.map((e,i)=>{
  let half=Math.min(maxWidth/2,e.cx-gap,width-e.cx-gap);
  for(let j=0;j<rows.length;j++)if(i!==j){const other=rows[j],dx=Math.abs(other.cx-e.cx),dy=Math.abs(other.cy-e.cy);
   if(dy<tokenHeight+gap&&dx>1)half=Math.min(half,dx/2-gap/2);
  }
  const labelWidth=Math.max(24,Math.floor(half*2)),fontSize=compact?(labelWidth<49?9:10):11;
  return {slot:e.slot,x:e.x,y:e.y,width:labelWidth,height:tokenHeight,fontSize,lineHeight:compact?12:14,faceSize:Math.min(compact?34:40,labelWidth-4)};
 });
}
export function labelBoxesOverlap(a,b,gap=0){return a.left<b.right+gap&&a.right+gap>b.left&&a.top<b.bottom+gap&&a.bottom+gap>b.top;}
