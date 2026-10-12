// Canvas locale: nessuna rete oltre alle risorse statiche del sito.
export function wrapLines(ctx,text,width){
 const lines=[];
 for(const paragraph of text.replace(/\r\n?/g,'\n').split('\n')){
  if(!paragraph){lines.push('');continue;}
  let line='';
  const tokens=paragraph.match(/\S+\s*|\s+/gu)||[];
  for(const token of tokens){
   if(ctx.measureText(line+token).width<=width){line+=token;continue;}
   if(line.trim()){lines.push(line.trimEnd());line='';}
   for(const char of Array.from(token)){
    if(line&&ctx.measureText(line+char).width>width){lines.push(line.trimEnd());line='';}
    line+=char;
   }
  }
  if(line)lines.push(line.trimEnd());
 }
 return lines;
}
function image(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Immagine non disponibile per l’esportazione. Riprova quando sei connesso.'));i.src=src;});}
function fit(ctx,img,x,y,w,h){const scale=Math.min(w/img.width,h/img.height);ctx.drawImage(img,x+(w-img.width*scale)/2,y,img.width*scale,img.height*scale);return img.height*scale;}
export async function exportNewspaper(post){
 await document.fonts.ready;
 const logo=await image('./assets/sisal-branding.png');
 const photo=post.image?await image(post.image):null;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const c=canvas.getContext('2d');
 if(!c)throw Error('Esportazione non supportata dal browser.');
 const date=new Date(post.created_at).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
 let titleSize=62,title;do{c.font=`bold ${titleSize}px Georgia`;title=wrapLines(c,post.title,916);if(title.length<=6||titleSize<=36)break;titleSize-=2;}while(true);const titleHeight=Math.ceil(titleSize*1.13);
 c.font='34px Georgia';const body=wrapLines(c,post.body,916);
 const pages=[];let index=0;let first=true;
 // Calcolo prima il contenuto di ogni pagina; poi disegno con numerazione definitiva.
 while(index<body.length||first){
  let y=310+(first?title.length*titleHeight:56)+35;
  const photoHeight=first&&photo?Math.max(0,Math.min(400,1100-y-35,photo.height*(916/photo.width))):0;
  if(photoHeight)y+=photoHeight+35;
  const count=Math.max(1,Math.floor((1220-y)/50));
  pages.push({first,y,photoHeight,lines:body.slice(index,index+count)});index+=count;first=false;
 }
 const files=[];
 for(let n=0;n<pages.length;n++){
  const p=pages[n];c.fillStyle='#f5f0e4';c.fillRect(0,0,1080,1440);
  c.fillStyle='#174b35';c.fillRect(0,0,1080,18);fit(c,logo,355,45,370,110);
  c.textAlign='center';c.fillStyle='#174b35';c.font='bold 19px sans-serif';c.fillText('SISAL FC 2021 — COMUNICATI',540,195);
  c.strokeStyle='#222b26';c.lineWidth=3;c.beginPath();c.moveTo(82,217);c.lineTo(998,217);c.stroke();c.lineWidth=1;c.beginPath();c.moveTo(82,224);c.lineTo(998,224);c.stroke();
  c.fillStyle='#59645c';c.font='20px sans-serif';c.fillText(date,540,262);c.textAlign='left';c.fillStyle='#222b26';
  let y=310;c.textBaseline='top';
  if(p.first){c.font=`bold ${titleSize}px Georgia`;for(const line of title){c.fillText(line,82,y);y+=titleHeight;}}
  else {c.font='italic 32px Georgia';c.fillText('Comunicati · continua',82,y);y+=56;}
  y+=35;
  if(p.photoHeight)fit(c,photo,82,y,916,p.photoHeight);
  c.font='34px Georgia';y=p.y;for(const line of p.lines){c.fillText(line,82,y);y+=50;}
  c.strokeStyle='#a6ae9c';c.beginPath();c.moveTo(82,1275);c.lineTo(998,1275);c.stroke();
  c.font='italic 27px Georgia';c.fillText('Sisal FC 2021',82,1305);c.textAlign='right';c.font='20px sans-serif';c.fillText(`${n+1} / ${pages.length}`,998,1308);
  c.textAlign='left';c.textBaseline='alphabetic';
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Impossibile creare l’immagine.')),'image/png'));
  files.push(new File([blob],`Sisal-comunicato-${post.id.slice(0,8)}-${n+1}.png`,{type:'image/png'}));
 }
 canvas.width=canvas.height=1;return files;
}
