import {environmentTexture} from './studio-materials.js?v=studio-5';
import * as T from './vendor/three.module.min.js';
import {createJockey} from './jockey-model.js?v=studio-5';
import {styleColors,paintSilks,nameKey} from './horse-style.js?v=studio-5';
import {disposeTree} from './studio-geometry.js?v=studio-5';
const cache=new Map();
export function portraitImage(subject,options={}){
 if(!subject||nameKey(subject.name)!==subject.key)return null;
 const live=globalThis.window?.SisalAccount?.styleFor?.(subject.name);
 const appearance={...subject.appearance,...(live?.helmetVisible?{helmetVisible:live.helmetVisible}:{})};
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
 }catch{return null;}finally{disposeTree(scene);resources.forEach(r=>r?.dispose());renderer?.dispose();renderer?.forceContextLoss();}
}
export async function fillPortraits(root=document){
 for(const figure of root.querySelectorAll('[data-paper-portrait]:not([data-ready])')){
  // Render only the visible page. No animation loop, camera or external image requests.
  if(figure.closest('[hidden]')||(figure.closest('details')&&!figure.closest('details').open))continue;
  figure.dataset.ready='true';let subject;try{subject=JSON.parse(figure.dataset.paperPortrait)}catch{continue;}
  const url=portraitImage(subject);if(!url){figure.querySelector('[data-portrait-image]').textContent='Ritratto non disponibile su questo dispositivo';continue;}
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
