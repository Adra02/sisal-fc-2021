import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {createCanvas} from '@napi-rs/canvas';import {environment} from './account-test-dom.mjs';
import * as Three from '../vendor/three.module.min.js';
// Actual geometry and choreography; only the GPU renderer and browser DOM are simulated.
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'sisal-race-qa-'));
let source=await fs.readFile(new URL('../race-3d.js',import.meta.url),'utf8');
source=source.replace("import * as T from './vendor/three.module.min.js';",`import * as Three from '${new URL('../vendor/three.module.min.js',import.meta.url)}';\nimport {FakeRenderer} from '${new URL('./account-test-renderer.mjs',import.meta.url)}';\nconst T={...Three,WebGLRenderer:FakeRenderer};`);
source=source.replace(/from '(\.\/[^']+)'/g,(_,s)=>'from '+JSON.stringify(new URL('../'+s.slice(2),import.meta.url).href));
const runtime=path.join(folder,'race.mjs');await fs.writeFile(runtime,source);const {runRace}=await import(pathToFileURL(runtime));
const cryptoDescriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:a=>{a.fill(328794);return a;}}});
try {
const cases=[{places:[1,2,3],weather:'clear'},{places:[1,1,2,3],weather:'rain'},{places:[1,1,1,1,1,1],weather:'wet'},{places:[1],weather:'clear',skip:true},{places:[1,2,3],weather:'clear',skipIntro:true},{places:[1,2,3],weather:'clear',introOff:true},{places:[1,2,3],weather:'clear',cancel:true},{places:[1,2,3],weather:'clear',reduced:true},{places:[1,1,2,3],weather:'rain',touch:true},{places:[1,1,1,1,1,1],weather:'clear',touch:true,width:320}];
let baseline;
for(const test of process.env.SISAL_QA_RESULT_ONLY?[{places:[1,2,3],weather:'clear',baseline:true}]:[...cases,{places:[1,2,3],weather:'clear',baseline:true},{places:[1,2,3],weather:'clear',compare:true}]){
 const env=environment();env.media.matches=Boolean(test.reduced);for(const key of ['document','window','matchMedia','MutationObserver','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','CustomEvent'])globalThis[key]=env[key];globalThis.devicePixelRatio=1;globalThis.matchMedia=query=>({matches:query.includes('pointer')?Boolean(test.touch):Boolean(test.reduced)});
 const original=env.document.createElement.bind(env.document);env.document.createElement=tag=>tag==='canvas'?createCanvas(1,1):original(tag);
 const host=original('div');host.className='sr-host';if(test.touch){host.clientWidth=test.width||390;host.clientHeight=500;}env.document.body.appendChild(host);const arrivals=[];host.addEventListener('sisal-race-arrival',e=>arrivals.push(e.detail));
 const entries=test.places.map((place,i)=>({name:'Giocatore '+i,place,color:['#37bc91','#e4b861','#659bdd'][i%3],score:'98765 gol · RISULTATO_RISERVATO',appearance:test.baseline?undefined:{coat:'black',mane:'silver',silk:'burgundy',accent:'gold',pattern:'chevron',saddle:'tan',helmet:'ivory',marking:'blaze',entrance:['salute','arms','bow','crowd'][i%4],celebration:['crowd','bow','arms','salute'][i%4],nickname:'Pilota '+i}}));let ended=false;
 const hoofTravel=new Map();let gaitFrame=0;const poses=new Set();let sawIntro=false,inspectCount=0;const introduced=new Set(),celebrated=new Set();
 globalThis.__raceInspect=(scene,h,camera)=>{
  const panel=Math.min(152,Math.max(120,Math.round(h.clientHeight*.27))),stage=h.dataset.raceStage;
  assert.equal(parseFloat(h.querySelector('canvas-view').style.height),h.clientHeight-panel,'one stable canvas, separate controls');
  if(stage==='race'&&gaitFrame++%12===0){scene.updateMatrixWorld(true);for(const root of scene.children.filter(o=>o.name?.startsWith('horse-subject-')&&o.position.x>8&&o.position.x<35)){const horse=root.getObjectByName('equine-continuous-surface');horse.skeleton.update();let ids=horse.userData.qaHooves;if(!ids){const g=horse.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;ids=horse.skeleton.bones.map((b,i)=>[b,i]).filter(([b])=>/^hoof-/.test(b.name)).map(([b,bone])=>{for(let i=0;i<g.attributes.position.count;i++)if(g.attributes.position.getY(i)<.08&&[0,1,2,3].some(k=>si.array[i*4+k]===bone&&sw.array[i*4+k]>.7))return i;});horse.userData.qaHooves=ids;}ids.forEach((id,j)=>{const p=horse.applyBoneTransform(id,new Three.Vector3().fromBufferAttribute(horse.geometry.attributes.position,id)),key=root.name+':'+j,path=hoofTravel.get(key)||[];path.push(p);hoofTravel.set(key,path);});}}
  if(stage==='intro'){
   sawIntro=true;introduced.add(h.querySelector('.sr-intro strong').textContent);
   assert(!h.querySelector('.sr-intro').textContent.includes('RISULTATO_RISERVATO'),'no statistics or result spoiler');
   const roots=scene.children.filter(o=>o.name?.startsWith('horse-subject-'));
   assert.equal(roots.filter(o=>o.visible).length,1,'only the presented participant');
   for(let i=0;i<roots.length;i++){assert.equal(roots[i].position.x,0,'horse already at the start');assert.equal(roots[i].position.z,(i-(roots.length-1)/2)*3.3,'horse in its own lane');}
  }
  if(stage==='signature'){
   celebrated.add(h.querySelector('.sr-intro strong').textContent);assert(!h.querySelector('.sr-intro').hidden);assert(h.querySelector('.sr-intro button').hidden);
   assert.equal(scene.children.filter(o=>o.name?.startsWith('horse-subject-')&&o.visible).length,1,'one winner per close-up');
  }
  if(['intro','signature'].includes(stage))scene.traverse(o=>{if(o.name?.startsWith('jockey-arm-')&&o.rotation.distanceTo===undefined){if(Math.abs(o.rotation.x)+Math.abs(o.rotation.y)+Math.abs(o.rotation.z)>.3)poses.add('arm');}});
  if(['intro','signature'].includes(stage)&&inspectCount++%40===0){
   scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const root=scene.children.find(o=>o.name?.startsWith('horse-subject-')&&o.visible),p=new Three.Vector3();
   root.traverse(o=>{if(!o.isMesh)return;let parent=o;while(parent&&parent!==root){if(!parent.visible)return;parent=parent.parent;}if(o.isSkinnedMesh)o.skeleton.update();const a=o.geometry.attributes.position;
    for(let i=0;i<a.count;i+=17){p.fromBufferAttribute(a,i);if(o.isSkinnedMesh)o.applyBoneTransform(i,p);p.applyMatrix4(o.matrixWorld).project(camera);assert(Math.abs(p.x)<.985&&Math.abs(p.y)<.985,'entire subject within '+stage+' viewport: '+o.name+' '+p.toArray());}
   });
  }
 };
 const result=runRace(host,entries,{profile:{weather:test.weather,lighting:'sunset'},introduction:!test.introOff});result.then(()=>ended=true,error=>{console.error(error);ended=true;});
 if(test.skip)host.querySelector('[data-skip]').click();
 for(let frame=0;frame<5000&&!ended;frame++){
 if(frame===20&&test.skipIntro)host.querySelector('.sr-intro button').click();
 if(frame===20&&test.cancel)host.remove();
 if(frame===30&&!test.cancel){env.document.hidden=true;env.document.handlers.visibilitychange?.forEach(fn=>fn());assert.equal(env.frames.size,0,'pause cancels frames');env.document.hidden=false;env.document.handlers.visibilitychange?.forEach(fn=>fn());}
 env.flushFrames(frame*16.6667);await Promise.resolve();}
 assert(ended,'race completed');assert.equal(await result,!test.cancel);assert.equal(env.frames.size,0);assert.equal(host.children.length,0,'canvas and UI removed');
 if(!test.skip&&!test.cancel){assert.equal(arrivals.length,entries.length);for(const item of arrivals)assert(Math.abs(item.noseX-48)<1,'arrival plane');for(let i=0;i<arrivals.length;i++)for(let j=0;j<arrivals.length;j++)if(arrivals[i].place===arrivals[j].place)assert.equal(arrivals[i].time,arrivals[j].time);}
 if(!test.skip&&!test.cancel){assert.equal(hoofTravel.size,entries.length*4,'all four hooves sampled for each runner');for(const path of hoofTravel.values()){assert(Math.max(...path.map(p=>p.x))-Math.min(...path.map(p=>p.x))>.25,'actual hooves move forward/back in race, including reduced motion');assert(Math.max(...path.map(p=>p.y))-Math.min(...path.map(p=>p.y))>.18,'actual hooves lift in race');}}
 if(test.introOff)assert(!sawIntro,'introduction disabled only by personal preference');else if(!test.skip&&!test.cancel){assert(sawIntro,'introduction including reduced motion');if(!test.skipIntro)assert.equal(introduced.size,entries.length,'all participants introduced');}if(!test.skip&&!test.cancel)assert.equal(celebrated.size,entries.filter(e=>e.place===1).length,'each winner has a visible signature close-up');if(!test.skip&&!test.cancel){assert(poses.has('arm'),'real 3D celebration pose');}
 if(process.env.SISAL_QA_RESULT_ONLY)await fs.writeFile(process.env.SISAL_QA_RESULT_ONLY,JSON.stringify(arrivals));
 if(test.baseline)baseline=JSON.stringify(arrivals);if(test.compare)assert.equal(JSON.stringify(arrivals),baseline,'cosmetics do not change finish times/places');
 console.log('PASS: full race lifecycle (DOM model, rendering stub):',test.places.join(','),test.weather,test.skip?'skip':test.reduced?'reduced motion':'finish/replay/awards','; approx main-pass calls',host.dataset.drawCalls,'triangles',host.dataset.triangles);
}

} finally {delete globalThis.__raceInspect;if(cryptoDescriptor)Object.defineProperty(globalThis,'crypto',cryptoDescriptor);await fs.rm(folder,{recursive:true,force:true});}
