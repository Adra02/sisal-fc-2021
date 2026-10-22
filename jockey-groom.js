/* Surface-rooted hair and facial hair. Cosmetic geometry only; no network/state. */
import * as T from './vendor/three.module.min.js';
import {geometry,mesh,material,smooth,surface} from './studio-geometry.js?v=studio-3';
import {microTexture} from './studio-materials.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const noise=n=>{const x=Math.sin(n*127.1+19.7)*43758.5453;return x-Math.floor(x);};
export function beardCoverage(s,x,y,z){
 if(s.beard==='none')return 0;
 const az=Math.abs(z),upper=-.061+.037*smooth(.025,.10,az);
 const jaw=smooth(.005,.033,x)*smooth(-.165,-.145,y)*(1-smooth(upper-.012,upper+.009,y));
 const moustache=smooth(.12,.16,x)*smooth(-.057,-.046,y)*(1-smooth(-.032,-.023,y))*(1-smooth(.047,.065,az));
 const lips=Math.exp(-(((y+.068)/.021)**2+((z/.057)**4)))*smooth(.13,.165,x);
 let mask=Math.max(jaw,moustache)*(1-lips);
 if(s.beard==='moustache')mask=moustache*(1-lips);
 if(s.beard==='goatee')mask*=1-smooth(.042,.070,az);
 if(s.beard==='chin')mask*=1-smooth(-.113,-.087,y);
 if(s.beard==='sideburns')mask*=smooth(.077,.106,az)*smooth(-.10,-.065,y);
 if(s.beard==='anchor')mask*=Math.max(1-smooth(.031,.060,az),1-smooth(-.12,-.10,y));
 return clamp(mask);
}
// Keep scalp boundaries on the real skull. Style volume grows inward from the
// hairline along surface normals; it must never translate the whole scalp up.
export function scalpDistance(s,x,y,z){
 const front=smooth(-.04,.10,x),temple=Math.exp(-(((Math.abs(z)-.10)/.027)**2));
 const line=.018+.094*front+.009*temple*front;
 return Math.min(y-line,s.hair==='mohawk'?.032-Math.abs(z):1);
}
function clippedSurface(g,distance,displace,tint,detailBand=.03){
 const p=g.attributes.position,n=g.attributes.normal,positions=[],normals=[],indices=[],roots=[],colors=[],offsets=[],uv=[];
 function emit(poly,level=0){
  const distances=poly.map(a=>distance(...a.p));if(Math.max(...distances)<0)return;
  if(level<2&&Math.min(...distances)<detailBand){const mid=(a,b)=>({p:a.p.clone().lerp(b.p,.5),n:a.n.clone().lerp(b.n,.5).normalize()}),[a,b,c]=poly,ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);for(const t of [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]])emit(t,level+1);return;}
  const clipped=[];
  for(let k=0;k<3;k++){const a=poly[k],b=poly[(k+1)%3],ma=distance(...a.p),mb=distance(...b.p);if(ma>=0)clipped.push(a);if((ma>=0)!==(mb>=0)){const t=ma/(ma-mb);clipped.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize()});}}
  if(clipped.length<3)return;const first=positions.length/3;
  for(const a of clipped){const depth=Math.max(0,distance(...a.p)),offset=displace(a.p,depth),v=a.p.clone().addScaledVector(a.n,offset),c=tint(a.p,depth);positions.push(...v);normals.push(...a.n);roots.push(...a.p);offsets.push(offset);colors.push(c.r,c.g,c.b);uv.push(.5+Math.atan2(v.z,v.x)/(Math.PI*2),(v.y+.02)/.3);}
  for(let k=1;k<clipped.length-1;k++)indices.push(first,first+k,first+k+1);
 }
 for(let j=0;j<g.index.count;j+=3)emit([0,1,2].map(k=>{const i=g.index.getX(j+k);return {p:new T.Vector3().fromBufferAttribute(p,i),n:new T.Vector3().fromBufferAttribute(n,i)};}));
 const result=geometry({position:positions,index:indices,color:colors,uv});
 // Duplicate edge vertices share normals. No faceted silhouette on clipped faces.
 const buckets=new Map();for(let i=0;i<positions.length;i+=3){const key=positions.slice(i,i+3).map(v=>Math.round(v*1e5)).join(',');const ids=buckets.get(key)||[];ids.push(i/3);buckets.set(key,ids);}
 for(const ids of buckets.values()){const normal=new T.Vector3();for(const i of ids)normal.add(new T.Vector3().fromBufferAttribute(result.attributes.normal,i));normal.normalize();for(const i of ids)result.attributes.normal.setXYZ(i,...normal);}
 result.setAttribute('surfaceRoot',new T.Float32BufferAttribute(roots,3));result.setAttribute('surfaceOffset',new T.Float32BufferAttribute(offsets,1));return result;
}
// Area-weighted barycentric sampling: roots lie on triangles, not in an arbitrary
// sphere around the head and not only on a handful of topology vertices.
function sampler(g){
 const p=g.attributes.position,n=g.attributes.normal,cdf=[],tri=[];let total=0;
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(let i=0;i<g.index.count;i+=3){const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);const area=b.sub(a).cross(c.sub(a)).length()/2;if(area<1e-10)continue;total+=area;cdf.push(total);tri.push(ids);}
 return k=>{if(!total)return null;const q=noise(k*1.87+.7)*total;let l=0,r=cdf.length-1;while(l<r){const m=(l+r)>>1;if(cdf[m]<q)l=m+1;else r=m;}const ids=tri[l],u=Math.sqrt(noise(k*2.19+5)),v=noise(k*3.41+6),w=[1-u,u*(1-v),u*v],point=new T.Vector3(),normal=new T.Vector3();for(let j=0;j<3;j++){point.addScaledVector(a.fromBufferAttribute(p,ids[j]),w[j]);normal.addScaledVector(a.fromBufferAttribute(n,ids[j]),w[j]);}return {point,normal:normal.normalize()};};
}
function groom(parent,g,{color,count=1500,length=.012,curly=false,beard=false,coverage=()=>1,flow=null,name='rooted-hair-fibres'}){
 const sample=sampler(g),p=[],ix=[],cols=[],roots=[];const tint=new T.Color(color);
 for(let k=0;k<count;k++){const sampled=sample(k);if(!sampled)continue;const {point:root,normal}=sampled,mask=coverage(...root);if(noise(k*7.03)>.15+.85*mask||mask<.02)continue;
  const direction=flow?flow(root):new T.Vector3(beard?-.1:-1,beard?-1:-.12,Math.sign(root.z)*.08);
  direction.addScaledVector(normal,-direction.dot(normal)).normalize();if(direction.lengthSq()<.2)direction.set(0,0,1).addScaledVector(normal,-normal.z).normalize();
  const side=new T.Vector3().crossVectors(normal,direction).normalize(),steps=curly?10:5,len=length*(.65+.5*noise(k+26))*(beard?(.4+.6*mask):1),width=beard?.00019:curly?.00038:.00017,first=p.length/3,c=tint.clone().multiplyScalar(.72+.43*noise(k+57));
  roots.push(...root);
  for(let j=0;j<=steps;j++){const t=j/steps,v=root.clone();
   if(curly){const phase=t*Math.PI*3.7,r=len*.19;v.addScaledVector(normal,t*len*.38).addScaledVector(side,Math.sin(phase)*r).addScaledVector(direction,(1-Math.cos(phase))*r+t*len*.14);}
   else v.addScaledVector(direction,t*len).addScaledVector(normal,Math.sin(t*Math.PI)*len*.18+t*len*.055);
   const w=width*(1-t*.94);p.push(...v.clone().addScaledVector(side,w),...v.clone().addScaledVector(side,-w));cols.push(c.r,c.g,c.b,c.r,c.g,c.b);if(j<steps){const a=first+j*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
 }
 if(!ix.length)return null;
 const fibres=mesh(parent,geometry({position:p,index:ix,color:cols}),material('#fff',{vertexColors:true,side:T.DoubleSide,roughness:.76,sheen:.38,sheenRoughness:.72}),name);fibres.castShadow=false;fibres.userData.surfaceRoots=Float32Array.from(roots);fibres.userData.segments=curly?10:5;return fibres;
}
function hairTexture(curly){
 const canvas=globalThis.document?.createElement('canvas');if(!canvas)return null;canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d');if(!c?.createImageData)return null;
 const image=c.createImageData(1024,512);for(let y=0;y<512;y++)for(let x=0;x<1024;x++){const k=(y*1024+x)*4,v=202+24*noise(x+y*1024);image.data[k]=image.data[k+1]=image.data[k+2]=v;image.data[k+3]=255;}c.putImageData(image,0,0);
 for(let i=0;i<(curly?5400:2400);i++){const x=noise(i+72)*1024,y=noise(i+810)*512,v=105+Math.floor(noise(i+190)*120);c.strokeStyle=`rgb(${v},${v},${v})`;c.lineWidth=curly?.65:.5;c.beginPath();if(curly)c.ellipse(x,y,2+noise(i+71)*3,3+noise(i+17)*4,noise(i+222)*Math.PI,0,Math.PI*(1.2+noise(i+23)*.7));else{c.moveTo(x,y);c.bezierCurveTo(x-2,y+9,x+2,y+22,x-4,y+34);}c.stroke();}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map;
}
export function buildGroom(head,g,s){
 const skin=new T.Color(s.skinColor),hairColor=new T.Color(s.hairHex||'#65432d');
 if(s.hair!=='bald'){
  const length={buzz:.0006,crop:.008,side:.013,quiff:.029,curly:.018,waves:.014,long:.012,ponytail:.011,braids:.009,mohawk:.035,bob:.014}[s.hair]||.008;
  const distance=(...p)=>scalpDistance(s,...p),volume=(p,depth)=>{
   const fade=smooth(0,.027,depth),top=smooth(.1,.21,p.y),front=smooth(-.05,.13,p.x),part=s.hairPart==='center'?0:s.hairPart==='left'?-.044:s.hairPart==='right'?.044:9;
   const partDip=1-.65*Math.exp(-(((p.z-part)/.006)**2))*top;
   const clumps=s.hair==='curly'||s.hairTexture==='coiled'?.68+.32*Math.sin(p.x*300+Math.sin(p.z*190))*Math.sin(p.z*290+p.y*110):s.hair==='waves'||s.hairTexture==='textured'?.89+.11*Math.sin(p.x*170+p.z*90):1;
   const shape=s.hair==='quiff'?.3+.7*front*top:s.hair==='mohawk'?.5+.5*top:.52+.48*top;
   return .00018+length*fade*shape*partDip*clumps;
  };
  const hg=clippedSurface(g,distance,volume,(p,d)=>skin.clone().lerp(hairColor,smooth(0,.010,d)));
  const texture=hairTexture(s.hair==='curly'||s.hairTexture==='coiled');
  const hm=material('#fff',{vertexColors:true,roughness:.86,sheen:.3,sheenRoughness:.84,map:texture,bumpMap:texture,bumpScale:s.hair==='curly'?.0024:.0010});
  const scalp=mesh(head,hg,hm,'scalp-hair');head.userData.hair=scalp;
  groom(head,hg,{color:s.hairHex,count:s.hair==='buzz'?1100:1900,length:s.hair==='buzz'?.0013:s.hair==='curly'?.024:.012,curly:s.hair==='curly'||s.hairTexture==='coiled',coverage:(x,y,z)=>smooth(0,.01,scalpDistance(s,x,y,z)),flow:p=>new T.Vector3(-1,-.15,(s.hairPart==='left'?.5:s.hairPart==='right'?-.5:Math.sign(p.z)*.22))});
  if(['long','bob','ponytail','braids'].includes(s.hair))longHair(head,scalp,s,hairColor);
 }
 if(s.beard!=='none'){
  // Stubble/short-beard roots are exactly on the face. A full beard alone has
  // an inner volume, tapering continuously to zero at cheek and lip boundaries.
  const coverage=(...p)=>beardCoverage(s,...p),full=s.beard==='full';
  const bg=clippedSurface(g,(...p)=>coverage(...p)-.02,(p,d)=>full?.00010+.012*smooth(0,.7,d)*smooth(-.02,-.13,p.y):.00006,(p,d)=>skin.clone().lerp(new T.Color(s.beardHex||s.hairHex),smooth(0,.38,d)),.45);
  if(full){const bm=mesh(head,bg,material('#fff',{vertexColors:true,roughness:.92,bumpMap:microTexture('hair'),bumpScale:.0007}),'beard-volume');bm.castShadow=false;}
  const fibres=groom(head,bg,{name:'rooted-beard-fibres',color:s.beardHex||s.hairHex,count:full?2400:s.beard==='stubble'?1600:2200,length:full?.012:s.beard==='stubble'?.0014:s.beard==='short'?.004:.006,beard:true,coverage});
  if(fibres)fibres.userData.beardStyle=s.beard;
  if(!full)bg.dispose();
 }
}
function longHair(head,scalp,s,color){
 const mat=material(color,{roughness:.82,sheen:.35,map:hairTexture(false),bumpMap:microTexture('hair',256),bumpScale:.0009,side:T.DoubleSide});const probe=new T.Mesh(scalp.geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));probe.updateMatrixWorld(true);
 const ray=new T.Raycaster(),anchors=[];
 for(let k=0;k<=56;k++){const a=Math.PI*(.34+k/56*1.32),dir=new T.Vector3(Math.cos(a),0,Math.sin(a));ray.set(dir.clone().multiplyScalar(.4).add(new T.Vector3(0,.12,0)),dir.clone().negate());const hit=ray.intersectObject(probe)[0];anchors.push(hit?hit.point.clone():new T.Vector3(Math.cos(a)*.13,.12,Math.sin(a)*.13));}
 probe.material.dispose();
 if(s.hair==='long'||s.hair==='bob'){
  const len=s.hair==='bob'?.22:.35;
  const locks=surface(head,mat,(u,v)=>{const a=u*56,k=Math.min(55,Math.floor(a)),root=anchors[k].clone().lerp(anchors[k+1],a-k),radial=new T.Vector3(root.x,0,root.z).normalize(),length=len+.015*Math.sin(u*83)+.008*Math.sin(u*193),y=root.y-v*length,earClearance=.045*Math.exp(-(((y-.018)/.065)**2))*smooth(0,.12,v),fold=Math.sin(u*183+v*.7)*.0035*Math.sin(Math.PI*v);return root.addScaledVector(radial,earClearance+Math.sin(v*Math.PI)*.019+v*.010+fold).add(new T.Vector3(-v*v*.025,-v*length,0)).toArray();},112,32);locks.name='rooted-long-hair';
  groom(head,locks.geometry,{color:color,count:1000,length:.021,flow:()=>new T.Vector3(-.05,-1,0)});
 }else{
  // Gather at the nape with the first ring intersecting the anatomical scalp.
  const root=anchors[28].clone(),tailEnd=s.hair==='braids'?.29:.32,braids=s.hair==='braids'?3:1;
  const curve=new T.CatmullRomCurve3([root.clone().add(new T.Vector3(.003,0,0)),root.clone().add(new T.Vector3(-.043,-.045,0)),root.clone().add(new T.Vector3(-.05,-.17,0)),root.clone().add(new T.Vector3(-.025,-tailEnd,0))]);
  for(let braid=0;braid<braids;braid++){
   const strand=surface(head,mat,(u,v)=>{const a=u*Math.PI*2,phase=v*34+braid*Math.PI*2/3,r=(s.hair==='braids'?.007:.018)*(1-v*.84),spread=s.hair==='braids'?.011*smooth(0,.14,v):0,center=curve.getPoint(v),tangent=curve.getTangent(v),across=new T.Vector3(0,0,1),normal=new T.Vector3().crossVectors(tangent,across).normalize();return center.addScaledVector(normal,Math.cos(a)*r+Math.cos(phase)*spread).addScaledVector(across,Math.sin(a)*r+Math.sin(phase)*spread).toArray();},12,32);strand.name='rooted-tied-hair';groom(head,strand.geometry,{color:color,count:250,length:.012,flow:()=>new T.Vector3(-.03,-1,0)});
  }
 }
}
