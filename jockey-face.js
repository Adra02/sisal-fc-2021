/* Anatomical head topology and shape deltas: MakeHuman CC0, assets/studio/LICENSES.md. */
import * as T from './vendor/three.module.min.js';
import {microTexture} from './studio-materials.js';
import {buildGroom,beardCoverage} from './jockey-groom.js?v=studio-3';
import data from './assets/studio/human-head.js?v=studio-3';
import {geometry,mesh,tube,material,smooth,surface} from './studio-geometry.js?v=studio-3';
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
  const beardMask=beardCoverage(s,x,y,z);if(beardMask)c.lerp(new T.Color(beardColor||'#503523'),beardMask*(s.beard==='stubble'?.25:s.beard==='full'?.78:.55));
  color.push(c.r,c.g,c.b);
 }
 const uv=[];for(let i=0;i<p.length;i+=3)uv.push(.5+Math.atan2(p[i+2],p[i])/(Math.PI*2),(p[i+1]+.21)/.46);const g=geometry({position:Array.from(p),index:data.index,color,uv});const face=mesh(head,g,material('#ffffff',{vertexColors:true,roughness:.62,clearcoat:.025,bumpMap:microTexture('skin'),bumpScale:.0012}), 'anatomical-face');
 head.userData.faceMesh=face;head.userData.baseFace=p;head.userData.blink=t=>{const target=facePositions(s,t);g.attributes.position.array.set(target);g.attributes.position.needsUpdate=true;g.computeVertexNormals();};
 const browProbe=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide})),browRay=new T.Raycaster();browProbe.updateMatrixWorld(true);
 const eyeMat=material('#eee9df',{roughness:.22,clearcoat:1,clearcoatRoughness:.08});const eyes=[];
 for(let n=0;n<2;n++){const pos=data.eyeCenters[n],eye=new T.Group();eye.position.set(...pos);head.add(eye);mesh(eye,new T.SphereGeometry(.024,24,16),eyeMat,'eyeball');
  const iris=mesh(eye,new T.SphereGeometry(.0108,24,16),material(s.eyeColor||'#644c2c',{roughness:.23,clearcoat:1}),'iris');iris.position.x=.0223;iris.scale.x=.22;
  const pupil=mesh(eye,new T.SphereGeometry(.005,16,10),material('#0a0c0b',{roughness:.1}),'pupil');pupil.position.x=.025;pupil.scale.x=.2;eyes.push(eye);
  const sign=n?1:-1,weight={fine:.0018,medium:.003,bold:.0044}[s.browWeight]||.003;
  const b=[];for(let k=0;k<=12;k++){const u=k/12,z=sign*(.019+u*.065);let y=.104+Math.sin(u*Math.PI)*.008;if(s.brow==='arched')y+=Math.sin(u*Math.PI)*.01;if(s.brow==='angled')y+=u*.01;if(s.brow==='soft')y+=Math.sin(u*Math.PI)*.003;if(s.brow==='flat')y-=.01;browRay.set(new T.Vector3(.45,y,z),new T.Vector3(-1,0,0));const hit=browRay.intersectObject(browProbe)[0];b.push([hit?hit.point.x+.00015:.166-u*.025,y,z]);}
  const brow=tube(head,hair,b,weight,18),curve=new T.CatmullRomCurve3(b.map(v=>new T.Vector3(...v))),bp=brow.geometry.attributes.position;brow.name='surface-brow';for(let ring=0;ring<=18;ring++){const center=curve.getPointAt(ring/18),taper=.16+.84*Math.sin(Math.PI*ring/18)**.45;for(let side=0;side<=6;side++){const i=ring*7+side,v=new T.Vector3().fromBufferAttribute(bp,i).sub(center).multiplyScalar(taper).add(center);bp.setXYZ(i,...v);}}brow.geometry.computeVertexNormals();
 }
 browProbe.material.dispose();head.userData.eyes=eyes;
 buildGroom(head,g,s);
 if(s.scar!=='none'){const z=s.scar==='browLeft'?-.055:.055,y=s.scar==='cheek'?-.01:.11;tube(head,material(s.skinColor).clone(),[[.17,y-.014,z-.005],[.173,y,z],[.17,y+.014,z+.005]],.0015,10);}
 if(s.wrinkles!=='none')for(let k=0;k<3;k++)tube(head,material(s.skinColor,{roughness:.8}),[[.168,.125+k*.013,-.045],[.174,.128+k*.013,0],[.168,.125+k*.013,.045]],s.wrinkles==='defined'?.0009:.00045,18);
 if(s.goggles!=='none')for(const z of [-.05,.05]){const ring=mesh(head,new T.TorusGeometry(.034,.003,8,32),material('#2b302d'),'goggle-frame');ring.rotation.y=Math.PI/2;ring.position.set(.163,.06,z);const glass=mesh(head,new T.CircleGeometry(.031,32),material(s.goggles==='amber'?'#b97f2c':s.goggles==='dark'?'#15201b':'#d1eff2',{transparent:true,opacity:s.goggles==='dark'?.85:.28,side:T.DoubleSide,roughness:.08}));glass.rotation.y=Math.PI/2;glass.position.copy(ring.position);glass.position.x+=.001;}
 return {face,eyes};
}
