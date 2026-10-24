import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {createJockey} from '../jockey-model.js';
import {styleColors} from '../horse-style.js';
import {disposeTree} from '../studio-geometry.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
let checks=0;
for(const beard of ['stubble','full']){
 const model=createJockey({custom:styleColors({beard,hair:'crop',expression:'smirk',helmetVisible:'off'}),standing:true,detail:.25}),api=model.head.userData,face=api.faceMesh,base=Float32Array.from(face.geometry.attributes.position.array),beards=face.parent.children.filter(o=>o.name==='rooted-beard-fibres'||o.name==='beard-volume'),initial=new Map(beards.map(o=>[o,Float32Array.from(o.geometry.attributes.position.array)]));
 for(const expression of ['grin','focused']){
  api.expression(expression,.85);api.blink(.7);const current=face.geometry.attributes.position.array;assert(current.some((v,i)=>Math.abs(v-base[i])>1e-5),'real expression morphs, not just a label');
  for(const o of beards){const roots=o.name==='beard-volume'?o.geometry.attributes.surfaceRoot.array:o.userData.surfaceRoots,stride=o.name==='beard-volume'?1:(o.userData.segments+1)*2,a=o.geometry.attributes.position.array,original=initial.get(o);let changed=0;
   for(let root=0;root<roots.length/3;root+=7){let nearest=0,best=Infinity;for(let i=0;i<base.length;i+=3){const d=(base[i]-roots[root*3])**2+(base[i+1]-roots[root*3+1])**2+(base[i+2]-roots[root*3+2])**2;if(d<best){best=d;nearest=i;}}for(let k=0;k<3;k++){const delta=current[nearest+k]-base[nearest+k];if(Math.abs(delta)>1e-5)changed++;for(let j=0;j<stride;j++){const i=(root*stride+j)*3+k;assert(Math.abs((a[i]-original[i])-delta)<1e-7,'beard root and strand follow the face');checks++;}}}
   if(expression==='grin')assert(changed>0,'mouth expression also moves facial hair');
  }
 }
 api.blink(0);api.expression(null,0);assert.deepEqual(face.geometry.attributes.position.array,base,'restore saved facial identity');for(const o of beards)assert.deepEqual(o.geometry.attributes.position.array,initial.get(o),'beard returns to its rooted baseline');disposeTree(model.rider);
}
console.log(`PASS ${checks} real beard/face vertex comparisons through two expressions and blink; saved face restored exactly. Geometry test, no GPU render.`);
