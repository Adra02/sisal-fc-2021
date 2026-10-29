import {environmentTexture} from './studio-materials.js?v=studio-9';
import * as T from './vendor/three.module.min.js';
import {createJockey} from './jockey-model.js?v=club-53';
import {styleColors,paintSilks,nameKey} from './horse-style.js?v=studio-9';
import {disposeTree} from './studio-geometry.js?v=studio-9';
const cache=new Map();let gpuUnavailable=false;
function portraitAppearance(subject){const live=globalThis.window?.SisalAccount?.styleFor?.(subject.name);return {...subject.appearance,...(live?.helmetVisible?{helmetVisible:live.helmetVisible}:{})};}
export function portraitImage(subject,options={}){
 if(!subject||nameKey(subject.name)!==subject.key||gpuUnavailable)return null;
 const appearance=portraitAppearance(subject);
 const key=JSON.stringify([subject,options,appearance.helmetVisible]);if(cache.has(key))return cache.get(key);
 let renderer,scene;const resources=[];
 try{
  const custom=styleColors(appearance);scene=new T.Scene();scene.environment=environmentTexture({studio:true});scene.environmentIntensity=.30;resources.push(scene.environment);scene.background=new T.Color('#18372d');
  renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(640,520);renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;
  const camera=new T.PerspectiveCamera(33,640/520,.1,20);camera.position.set(1.75,.88,1.35);camera.lookAt(.02,.53,0);if(options.closeup){const angles={front:[.92,.78,0],three:[.86,.79,.53],side:[.08,.79,.96]};camera.position.set(...(angles[options.angle]||angles.three));camera.lookAt(.02,.77,0);}
  const own=x=>(resources.push(x),x),mat=(color,extra={})=>own(new T.MeshStandardMaterial({color,roughness:.7,...extra}));
  const sphere=own(new T.SphereGeometry(1,24,16));
  const ball=(parent,m,pos,scale)=>{const o=new T.Mesh(sphere,m);o.position.set(...pos);o.scale.set(...scale);parent.add(o);return o;};
  const link=(parent,m,a,b,r1,r2=r1)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const o=new T.Mesh(own(new T.CylinderGeometry(r2,r1,d.length(),10)),m);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());parent.add(o);return o;};
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;paintSilks(canvas.getContext('2d'),128,128,custom);
  const tex=own(new T.CanvasTexture(canvas));tex.colorSpace=T.SRGBColorSpace;
  const silk=mat('#ffffff',{map:tex}),mats={black:mat('#181819'),skin:mat('#cfa17d'),dark:mat('#182b2a')};
  const {rider}=createJockey({ball,link,mat,mats,silk,breeches:mat(custom.breechesColor),gloves:mat(custom.glovesColor),helmet:mat(custom.helmetColor),custom,standing:true,showHelmet:custom.helmetVisible!=='off'&&options.helmet!==false});
  scene.add(rider);scene.add(new T.HemisphereLight('#f5f1df','#18372d',2));const keyLight=new T.DirectionalLight('#fff0d4',3);keyLight.position.set(2,4,4);scene.add(keyLight);const rim=new T.DirectionalLight('#9bddbb',2);rim.position.set(-3,1,-2);scene.add(rim);
  renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/png');cache.set(key,url);if(cache.size>15)cache.delete(cache.keys().next().value);return url;
 }catch(e){if(!renderer&&/webgl|context/i.test(e.message||''))gpuUnavailable=true;return null;}finally{disposeTree(scene);resources.forEach(r=>r?.dispose());renderer?.dispose();renderer?.forceContextLoss();}
}
// Local illustrated fallback for browsers without WebGL; always the same subject.
// It is explicitly labelled as an illustration, never as a rendered 3D photograph.
export function portraitFallback(subject){
 if(!subject||nameKey(subject.name)!==subject.key)return null;
 try{
  const appearance=portraitAppearance(subject),key='illustration:'+JSON.stringify([subject,appearance.helmetVisible]);if(cache.has(key))return cache.get(key);
  const s=styleColors(appearance),c=document.createElement('canvas');c.width=640;c.height=520;const x=c.getContext('2d');if(!x)return null;
  const bg=x.createLinearGradient(0,0,640,520);bg.addColorStop(0,'#163f31');bg.addColorStop(1,'#061910');x.fillStyle=bg;x.fillRect(0,0,640,520);
  x.strokeStyle='#7ad6a025';x.lineWidth=1;for(let i=0;i<640;i+=40){x.beginPath();x.moveTo(i,0);x.lineTo(i,520);x.stroke();}
  const ellipse=(cx,cy,rx,ry,fill)=>{x.fillStyle=fill;x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);x.fill();};
  ellipse(320,509,186,16,'#0005');
  x.save();x.beginPath();x.moveTo(125,520);x.quadraticCurveTo(120,367,229,345);x.lineTo(411,345);x.quadraticCurveTo(520,367,515,520);x.closePath();x.clip();paintSilks(x,640,520,s);x.restore();
  x.fillStyle=s.glovesColor;ellipse(151,505,32,24,s.glovesColor);ellipse(489,505,32,24,s.glovesColor);
  x.fillStyle=s.skinColor;x.fillRect(283,290,74,75);ellipse(320,347,37,18,s.skinColor);ellipse(222,227,15,26,s.skinColor);ellipse(418,227,15,26,s.skinColor);
  ellipse(320,220,96,125,s.skinColor);
  if(s.hair!=='bald'){ellipse(320,117,91,32,s.hairHex);x.fillStyle=s.hairHex;x.fillRect(226,129,13,72);x.fillRect(401,129,13,72);if(['long','curly','afro','dreads','braids'].includes(s.hair)){ellipse(224,209,15,70,s.hairHex);ellipse(417,209,15,70,s.hairHex);}}
  x.strokeStyle=s.hairHex;x.lineWidth=7;x.lineCap='round';for(const cx of [278,362]){x.beginPath();x.moveTo(cx-17,200);x.quadraticCurveTo(cx,192,cx+17,200);x.stroke();}
  for(const cx of [279,361]){ellipse(cx,220,20,10,'#eeeae1');ellipse(cx,220,8,9,s.eyeColor);ellipse(cx,220,3.5,6,'#13231a');ellipse(cx-2,218,2,2,'#fff');}
  x.strokeStyle='#6c493547';x.lineWidth=3;x.beginPath();x.moveTo(320,223);x.lineTo(311,260);x.lineTo(326,261);x.stroke();
  if(s.beard!=='none'){x.save();x.globalAlpha=.82;x.strokeStyle=s.beardHex;x.lineWidth=s.beard==='stubble'?6:17;x.beginPath();x.moveTo(245,259);x.quadraticCurveTo(253,328,320,330);x.quadraticCurveTo(389,326,396,259);x.stroke();x.restore();}
  x.strokeStyle=s.lipColor;x.lineWidth=4;x.beginPath();x.moveTo(292,285);x.quadraticCurveTo(320,s.expression==='smile'?307:291,348,285);x.stroke();
  if(s.helmetVisible!=='off'){x.fillStyle=s.helmetColor;x.beginPath();x.ellipse(320,135,105,50,0,Math.PI,Math.PI*2);x.lineTo(425,151);x.lineTo(215,151);x.closePath();x.fill();x.fillStyle=s.accentColor;x.fillRect(215,140,210,10);x.fillStyle=s.helmetColor;x.fillRect(212,150,236,10);}
  const url=c.toDataURL('image/png');cache.set(key,url);if(cache.size>15)cache.delete(cache.keys().next().value);return url;
 }catch{return null;}
}
export async function fillPortraits(root=document){
 for(const figure of root.querySelectorAll('[data-paper-portrait]:not([data-ready])')){
  // Render only the visible page. No animation loop, camera or external image requests.
  if(!figure.isConnected||(figure.closest('dialog')&&!figure.closest('dialog').open)||figure.closest('[hidden]')||(figure.closest('details')&&!figure.closest('details').open))continue;
  figure.dataset.ready='true';let subject;try{subject=JSON.parse(figure.dataset.paperPortrait)}catch{continue;}
  const rendered=portraitImage(subject),url=rendered||portraitFallback(subject);const mode=figure.querySelector('[data-portrait-mode]');if(mode)mode.textContent=rendered?'Ritratto 3D · aspetto dell’edizione':'Illustrazione locale · 3D non disponibile';if(!url){figure.querySelector('[data-portrait-image]').textContent='Ritratto non disponibile su questo dispositivo';continue;}
  const img=new Image();img.src=url;img.alt='Fantino di '+subject.name+' · tenuta al momento dell’edizione';figure.querySelector('[data-portrait-image]').replaceChildren(img);
  await new Promise(r=>setTimeout(r,0));
 }
}

if(globalThis.window?.addEventListener)window.addEventListener('sisal-appearance-saved',()=>{
 for(const figure of document.querySelectorAll('[data-paper-portrait][data-ready]')){
  try{const subject=JSON.parse(figure.dataset.paperPortrait);if(subject.key===nameKey(window.SisalAccount?.user?.display_name))figure.removeAttribute('data-ready');}catch{}
 }
 fillPortraits();
});
