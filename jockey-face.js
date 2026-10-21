/* Anatomical head topology and shape deltas: MakeHuman CC0, assets/studio/LICENSES.md. */
import * as T from './vendor/three.module.min.js';
import {microTexture} from './studio-materials.js';
import data from './assets/studio/human-head.js?v=studio-2';
import {geometry,mesh,tube,material,smooth,surface} from './studio-geometry.js?v=studio-2';
const faceTargets={oval:{'head-oval':.35},round:{'head-round':.7,'head-fat-incr':.15},square:{'head-square':.65},heart:{'head-triangular':.35,'chin-triangle':.35},angular:{'head-diamond':.4,'head-fat-decr':.3},narrow:{'head-scale-horiz-decr':.3}};
const jawTargets={soft:{},defined:{'chin-bones-incr':.4},square:{'chin-width-incr':.5},tapered:{'chin-triangle':.5}};
const noseTargets={straight:{},button:{'nose-scale-depth-decr':.4,'nose-point-up':.25},aquiline:{'nose-curve-convex':.5},broad:{'nose-scale-horiz-incr':.4,'nose-width1-incr':.2},rounded:{'nose-scale-horiz-incr':.18,'nose-width1-incr':.22},upturned:{'nose-point-up':.4}};
export function facePositions(s,blink=0){
 const p=Float32Array.from(data.position),m={...faceTargets[s.face],...jawTargets[s.jaw],...noseTargets[s.nose]};
 for(const side of ['l','r']){
  if(s.cheeks==='full')m[side+'-cheek-volume-incr']=.45;
  if(s.cheeks==='lean')m[side+'-cheek-volume-decr']=.35;
  if(s.cheeks==='high')m[side+'-cheek-bones-incr']=.45;
  if(s.ears==='small')m[side+'-ear-scale-decr']=.4;
  if(s.ears==='large')m[side+'-ear-scale-incr']=.4;
  if(s.ears==='prominent')m[side+'-ear-wing-incr']=.4;
  if(s.eyeShape==='wide')m[side+'-eye-scale-incr']=.25;
  if(s.eyeShape==='narrow')m[side+'-eye-scale-decr']=.2;
  if(s.eyeShape==='round')m[side+'-eye-scale-incr']=.12;
 }
 if(s.mouth==='wide')m['mouth-scale-horiz-incr']=.35;
 if(s.mouth==='narrow')m['mouth-scale-horiz-decr']=.35;
 if(s.mouth==='full'){m['mouth-upperlip-volume-incr']=.35;m['mouth-lowerlip-volume-incr']=.35;}
 if(s.expression==='smile'||s.expression==='relaxed')m['mouth-corner-puller']=s.expression==='smile'?.55:.2;
 if(s.expression==='grin'){m['mouth-corner-puller']=.6;m['mouth-open']=.12;}
 if(s.expression==='smirk')m['mouth-upward-retraction']=.25;
 if(['focused','determined','serious'].includes(s.expression)){const amount=s.expression==='determined'?.4:s.expression==='serious'?.12:.24;m['eyebrows-left-down']=amount;m['eyebrows-right-down']=amount;m['mouth-compression']=amount*.8;}
 if(s.expression==='surprised'){m['mouth-open']=.35;m['eyebrows-left-up']=.4;m['eyebrows-right-up']=.4;}
 m['eye-left-closure']=Math.max(blink,s.expression==='wink'?.85:0);m['eye-right-closure']=blink;
 for(const [key,amount]of Object.entries(m))for(const [i,x,y,z]of data.targets[key]||[]){p[i*3]+=x*amount;p[i*3+1]+=y*amount;p[i*3+2]+=z*amount;}
 return p;
}
export function buildFace(head,{s,showHelmet=true}){
 const p=facePositions(s),color=[],skin=new T.Color(s.skinColor),lip=new T.Color(s.lipColor||s.skinColor).lerp(new T.Color('#8e4850'),.38),hair=material(s.hairHex||'#65432d',{roughness:.82,sheen:.35,sheenRoughness:.75}),beardColor=s.beardHex||s.hairHex;
 for(let i=0;i<p.length;i+=3){const x=p[i],y=p[i+1],z=p[i+2];const c=skin.clone();const lipMask=x>.155&&y<-.036&&y>-.091&&Math.abs(z)<.06*(1-Math.abs(y+.061)*12);if(lipMask)c.lerp(lip,.65);
  const warm=Math.exp(-(((y+.015)/.05)**2+((Math.abs(z)-.07)/.03)**2));c.lerp(new T.Color('#b65e50'),warm*.075);
  const noise=Math.sin(i*17.31)*Math.sin(i*2.73);c.multiplyScalar(1+noise*.014);
  const freckle=s.freckles!=='none'&&y>-.025&&y<.043&&x>.12&&Math.abs(z)<.1&&Math.sin(i*41.7)>(s.freckles==='dense'?.85:.95);if(freckle)c.multiplyScalar(.7);
  if(s.beautyMark!=='none'&&x>.14&&((y+.026)**2+(z-(s.beautyMark==='left'?-.073:.073))**2)<.000018)c.multiplyScalar(.35);
  color.push(c.r,c.g,c.b);
 }
 const uv=[];for(let i=0;i<p.length;i+=3)uv.push(.5+Math.atan2(p[i+2],p[i])/(Math.PI*2),(p[i+1]+.21)/.46);const g=geometry({position:Array.from(p),index:data.index,color,uv});const face=mesh(head,g,material('#ffffff',{vertexColors:true,roughness:.62,clearcoat:.025,bumpMap:microTexture('skin'),bumpScale:.0012}), 'anatomical-face');
 head.userData.faceMesh=face;head.userData.baseFace=p;head.userData.blink=t=>{const target=facePositions(s,t);g.attributes.position.array.set(target);g.attributes.position.needsUpdate=true;g.computeVertexNormals();};
 const eyeMat=material('#eee9df',{roughness:.22,clearcoat:1,clearcoatRoughness:.08});const eyes=[];
 for(let n=0;n<2;n++){const pos=data.eyeCenters[n],eye=new T.Group();eye.position.set(...pos);head.add(eye);mesh(eye,new T.SphereGeometry(.024,24,16),eyeMat,'eyeball');
  const iris=mesh(eye,new T.SphereGeometry(.0108,24,16),material(s.eyeColor||'#644c2c',{roughness:.23,clearcoat:1}),'iris');iris.position.x=.0223;iris.scale.x=.22;
  const pupil=mesh(eye,new T.SphereGeometry(.005,16,10),material('#0a0c0b',{roughness:.1}),'pupil');pupil.position.x=.025;pupil.scale.x=.2;eyes.push(eye);
  const sign=n?1:-1,weight={fine:.0018,medium:.003,bold:.0044}[s.browWeight]||.003;
  const b=[];for(let k=0;k<=12;k++){const u=k/12,z=sign*(.019+u*.065);let y=.104+Math.sin(u*Math.PI)*.008;if(s.brow==='arched')y+=Math.sin(u*Math.PI)*.01;if(s.brow==='angled')y+=u*.01;if(s.brow==='soft')y+=Math.sin(u*Math.PI)*.003;if(s.brow==='flat')y-=.01;b.push([.166-u*.025,y,z]);}
  tube(head,hair,b,weight,18).name='brow';
 }
 head.userData.eyes=eyes;
 // Scalp follows the anatomical skull. It is a connected surface, not separate balls.
 if(s.hair!=='bald'){
  const hp=[],hi=[],map=new Map(),len={buzz:.001,crop:.01,side:.016,quiff:.037,curly:.024,waves:.023,long:.025,ponytail:.022,braids:.018,mohawk:.03,bob:.025}[s.hair]||.012;
  const mask=(a)=>{const[x,y,z]=a;return Math.min(y-(.02+.092*smooth(-.04,.10,x)),s.hair==='mohawk'?.035-Math.abs(z):1);};
  // Clip each scalp triangle at the hairline so the edge follows the skull without spikes.
  for(let j=0;j<data.index.length;j+=3){let poly=data.index.slice(j,j+3).map(i=>Array.from(p.slice(i*3,i*3+3)));const clipped=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ma=mask(a),mb=mask(b);if(ma>=0)clipped.push(a);if((ma>=0)!==(mb>=0)){const t=ma/(ma-mb);clipped.push(a.map((x,k)=>x+(b[k]-x)*t));}}if(clipped.length<3)continue;const base=hp.length/3;for(const[x,y,z]of clipped){const wave=s.hairTexture==='coiled'||s.hair==='curly'?Math.sin(z*330)*Math.cos(y*290)*.004:s.hairTexture==='textured'||s.hair==='waves'?Math.sin(z*130+y*70)*.003:0;const partShift=s.hairPart==='left'?-.012:s.hairPart==='right'?.012:0;const partDip=s.hairPart==='center'?Math.exp(-((z/.006)**2))*.005:s.hairPart!=='none'?Math.exp(-(((z-partShift)/.005)**2))*.004:0;hp.push(x+(x<0?-.004:.002),y+len+wave-partDip,z+Math.sign(z)*.004);}for(let k=1;k<clipped.length-1;k++)hi.push(base,base+k,base+k+1);}
  const huv=[];for(let i=0;i<hp.length;i+=3)huv.push(.5+Math.atan2(hp[i+2],hp[i])/(Math.PI*2),(hp[i+1]+.02)/.29);hair.bumpMap=microTexture('hair');hair.bumpScale=.0018;const hairGeom=geometry({position:hp,index:hi,uv:huv});const buckets=new Map();for(let i=0;i<hp.length;i+=3){const k=hp.slice(i,i+3).map(v=>Math.round(v*1e5)).join(',');const bucket=buckets.get(k)||[];bucket.push(i/3);buckets.set(k,bucket);}for(const ids of buckets.values()){const n=new T.Vector3();for(const i of ids)n.add(new T.Vector3().fromBufferAttribute(hairGeom.attributes.normal,i));n.normalize();for(const i of ids)hairGeom.attributes.normal.setXYZ(i,n.x,n.y,n.z);}const hairMesh=mesh(head,hairGeom,hair,'scalp-hair');head.userData.hair=hairMesh;
  // Fine directional strands catch the rim light; deterministic and identical across devices.
  for(let k=0;k<30;k++){const a=(k/30)*Math.PI*2,z=Math.sin(a)*.105,x=Math.cos(a)*.11;const pts=[];for(let j=0;j<8;j++){const t=j/7,yy=.14+Math.sin(t*Math.PI*.8)*.086;pts.push([x*(1-t*.7)-.015,yy+len,z*(1-t*.7)+(s.hairPart==='left'?-.01:s.hairPart==='right'?.01:0)]);}tube(head,hair,pts,.0008,12);}
  addGroom(head,hairGeom,hair,s.hair==='curly'||s.hairTexture==='coiled',s.hair==='curly'?1100:680,s.hair==='buzz'?.002:s.hair==='curly'?.019:.011);
  if(['long','bob','ponytail','braids'].includes(s.hair)){
   const length=s.hair==='bob'?.28:.45;
   if(s.hair==='long'||s.hair==='bob'){
    const locks=surface(head,hair,(u,v)=>{const a=Math.PI*(.33+u*1.34),r=.145+Math.sin(v*Math.PI)*.013,fold=Math.sin(u*68+v*3)*.003;return [Math.cos(a)*(r+fold)-.012,.17-v*length,Math.sin(a)*(r+fold)];},64,30);locks.name='layered-long-hair';addGroom(head,locks.geometry,hair,s.hairTexture==='coiled',420,.02);
   }else{
    const n=s.hair==='braids'?10:30;for(let k=0;k<n;k++){const z=(k/(n-1)-.5)*(s.hair==='ponytail'?.07:.22),off=s.hair==='braids'?Math.sin(k*1.7)*.012:0;tube(head,hair,[[-.11,.14,z],[-.16,.02,z+off],[-.14,-length*.42,z*.8],[-.13,-length*.66,z*.45]],s.hair==='braids'?.006:.0025,24);}
   }
  }

 }
 if(s.beard!=='none'){
  // Feather the hairline over the real face surface. Do not cover the lips or
  // discard whole triangles at the edge (the old beard looked like a mask).
  const density=s.beard==='stubble'?.48:s.beard==='full'?.94:.84;
  const coverage=(x,y,z)=>{
   const az=Math.abs(z),upper=-.061+.037*smooth(.025,.10,az);
   const jaw=smooth(.005,.033,x)*smooth(-.165,-.145,y)*(1-smooth(upper-.008,upper+.008,y));
   const moustache=smooth(.12,.16,x)*smooth(-.057,-.045,y)*(1-smooth(-.032,-.020,y))*(1-smooth(.047,.067,az));
   const lipHole=Math.exp(-(((y+.068)/.023)**2+((z/.057)**4)))*smooth(.13,.165,x);
   let mask=Math.max(jaw,moustache)*(1-lipHole);
   if(s.beard==='moustache')mask=moustache*(1-lipHole);
   if(s.beard==='goatee')mask*=1-smooth(.050,.073,az);
   if(s.beard==='chin')mask*=1-smooth(-.110,-.090,y);
   if(s.beard==='sideburns')mask*=smooth(.083,.108,az)*smooth(-.10,-.065,y);
   if(s.beard==='anchor')mask*=Math.max(1-smooth(.035,.060,az),1-smooth(-.12,-.10,y));
   return mask;
  };
  const bp=[],bi=[],bc=[],bn=[],beardTint=new T.Color(beardColor||'#503523'),normal=g.attributes.normal;
  for(let j=0;j<data.index.length;j+=3){const poly=data.index.slice(j,j+3).map(i=>({p:Array.from(p.slice(i*3,i*3+3)),n:new T.Vector3().fromBufferAttribute(normal,i)})),clipped=[];
   for(let i=0;i<3;i++){const a=poly[i],b=poly[(i+1)%3],ma=coverage(...a.p)-.025,mb=coverage(...b.p)-.025;if(ma>=0)clipped.push(a);if((ma>=0)!==(mb>=0)){const t=ma/(ma-mb);clipped.push({p:a.p.map((v,k)=>v+(b.p[k]-v)*t),n:a.n.clone().lerp(b.n,t).normalize()});}}
   if(clipped.length<3)continue;const first=bp.length/3;
   for(const a of clipped){const mask=coverage(...a.p),extra=.0005+mask*(s.beard==='full'?.010:s.beard==='short'?.0024:.0011),v=new T.Vector3(...a.p).addScaledVector(a.n,extra),c=skin.clone().lerp(beardTint,mask*density);bp.push(...v.toArray());bn.push(...a.n.toArray());bc.push(c.r,c.g,c.b);}
   for(let k=1;k<clipped.length-1;k++)bi.push(first,first+k,first+k+1);
  }
  const bg=geometry({position:bp,index:bi,color:bc});bg.setAttribute('normal',new T.Float32BufferAttribute(bn,3));const beardMesh=mesh(head,bg,material('#fff',{vertexColors:true,roughness:.91}),'beard');beardMesh.castShadow=false;
  const fibreMat=material(beardColor||'#503523',{roughness:.88});addGroom(head,bg,fibreMat,false,420,s.beard==='full'?.010:s.beard==='stubble'?.0013:.0035);fibreMat.dispose();
 }
 if(s.scar!=='none'){const z=s.scar==='browLeft'?-.055:.055,y=s.scar==='cheek'?-.01:.11;tube(head,material(s.skinColor).clone(),[[.17,y-.014,z-.005],[.173,y,z],[.17,y+.014,z+.005]],.0015,10);}
 if(s.wrinkles!=='none')for(let k=0;k<3;k++)tube(head,material(s.skinColor,{roughness:.8}),[[.168,.125+k*.013,-.045],[.174,.128+k*.013,0],[.168,.125+k*.013,.045]],s.wrinkles==='defined'?.0009:.00045,18);
 if(s.goggles!=='none')for(const z of [-.05,.05]){const ring=mesh(head,new T.TorusGeometry(.034,.003,8,32),material('#2b302d'),'goggle-frame');ring.rotation.y=Math.PI/2;ring.position.set(.163,.06,z);const glass=mesh(head,new T.CircleGeometry(.031,32),material(s.goggles==='amber'?'#b97f2c':s.goggles==='dark'?'#15201b':'#d1eff2',{transparent:true,opacity:s.goggles==='dark'?.85:.28,side:T.DoubleSide,roughness:.08}));glass.rotation.y=Math.PI/2;glass.position.copy(ring.position);glass.position.x+=.001;}
 return {face,eyes};
}

function addGroom(parent,g,m,curly,count,length){
 const p=g.attributes.position,n=g.attributes.normal,pos=[],idx=[],colors=[];if(!p?.count)return;
 const seen=new Set();for(let k=0;k<count;k++){const i=Math.floor((k*.61803398875%1)*p.count),root=new T.Vector3().fromBufferAttribute(p,i),id=root.toArray().map(v=>Math.round(v*1000)).join(',');if(seen.has(id))continue;seen.add(id);const normal=new T.Vector3().fromBufferAttribute(n,i).normalize(),flow=new T.Vector3(-.7,-.1,Math.sin(k*3)*.15).addScaledVector(normal,.8).normalize(),side=new T.Vector3().crossVectors(normal,flow).normalize();if(side.length()<.1)side.set(0,0,1);const start=pos.length/3;
  const steps=curly?14:6,around=new T.Vector3().crossVectors(normal,side).normalize(),tint=m.color.clone().multiplyScalar(.82+.27*(.5+.5*Math.sin(k*2.57)));
  for(let j=0;j<=steps;j++){
   const t=j/steps,point=root.clone();
   if(curly){const phase=k*1.73+t*Math.PI*3.4,r=length*.21;point.addScaledVector(normal,.001+t*length*.50).addScaledVector(side,(Math.sin(phase)-Math.sin(k*1.73))*r).addScaledVector(around,(Math.cos(phase)-Math.cos(k*1.73))*r);}
   else point.addScaledVector(normal,.001+Math.sin(t*Math.PI)*length*.45).addScaledVector(flow,t*length);
   const width=(curly?.0009:.00055)*(1-t*.80);pos.push(...point.clone().addScaledVector(side,width).toArray(),...point.clone().addScaledVector(side,-width).toArray());colors.push(tint.r,tint.g,tint.b,tint.r,tint.g,tint.b);if(j<steps){const a=start+j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
 }
 const strands=mesh(parent,geometry({position:pos,index:idx,color:colors}),m.clone(),'hair-fibres');strands.material.color.set('#fff');strands.material.vertexColors=true;strands.material.side=T.DoubleSide;strands.material.bumpMap=null;strands.material.roughness=.82;strands.castShadow=false;
}
