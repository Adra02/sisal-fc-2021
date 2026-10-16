import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {createCanvas} from '@napi-rs/canvas';import {environment} from './account-test-dom.mjs';
// Actual geometry and choreography; only the GPU renderer and browser DOM are simulated.
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'sisal-race-qa-'));
let source=await fs.readFile(new URL('../race-3d.js',import.meta.url),'utf8');
source=source.replace("import * as T from './vendor/three.module.min.js';",`import * as Three from '${new URL('../vendor/three.module.min.js',import.meta.url)}';\nimport {FakeRenderer} from '${new URL('./account-test-renderer.mjs',import.meta.url)}';\nconst T={...Three,WebGLRenderer:FakeRenderer};`);
for(const file of ['race-signature.js?v=club-8-racefix2','horse-style.js?v=club-8-racefix2','race-visuals.js?v=32.1.40','race-motion.js?v=32.1.39'])source=source.replace("'./"+file+"'",JSON.stringify(new URL('../'+file,import.meta.url).href));
const runtime=path.join(folder,'race.mjs');await fs.writeFile(runtime,source);const {runRace}=await import(pathToFileURL(runtime));
const cryptoDescriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:a=>{a.fill(328794);return a;}}});
try {
const cases=[{places:[1,2,3],weather:'clear'},{places:[1,1,2,3],weather:'rain'},{places:[1,1,1,1,1,1],weather:'wet'},{places:[1],weather:'clear',skip:true},{places:[1,2,3],weather:'clear',skipIntro:true},{places:[1,2,3],weather:'clear',introOff:true},{places:[1,2,3],weather:'clear',cancel:true},{places:[1,2,3],weather:'clear',reduced:true},{places:[1,1,2,3],weather:'rain',touch:true}];
let baseline;
for(const test of [...cases,{places:[1,2,3],weather:'clear',baseline:true},{places:[1,2,3],weather:'clear',compare:true}]){
 const env=environment();env.media.matches=Boolean(test.reduced);for(const key of ['document','window','matchMedia','MutationObserver','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','CustomEvent'])globalThis[key]=env[key];globalThis.devicePixelRatio=1;globalThis.matchMedia=query=>({matches:query.includes('pointer')?Boolean(test.touch):Boolean(test.reduced)});
 const original=env.document.createElement.bind(env.document);env.document.createElement=tag=>tag==='canvas'?createCanvas(1,1):original(tag);
 const host=original('div');host.className='sr-host';if(test.touch){host.clientWidth=390;host.clientHeight=500;}env.document.body.appendChild(host);const arrivals=[];host.addEventListener('sisal-race-arrival',e=>arrivals.push(e.detail));
 const entries=test.places.map((place,i)=>({name:'Giocatore '+i,place,color:['#37bc91','#e4b861','#659bdd'][i%3],score:'98765 gol · RISULTATO_RISERVATO',appearance:test.baseline?undefined:{coat:'black',mane:'silver',silk:'burgundy',accent:'gold',pattern:'chevron',saddle:'tan',helmet:'ivory',marking:'blaze',entrance:['salute','arms','bow','crowd'][i%4],celebration:['crowd','bow','arms','salute'][i%4],nickname:'Pilota '+i}}));let ended=false;
 const poses=new Set();let sawIntro=false;const introduced=new Set(),celebrated=new Set();
 globalThis.__raceInspect=(scene,h)=>{if(h?.dataset.raceStage==='race')assert.equal(parseFloat(h.querySelector('canvas-view').style.height),h.clientHeight,'full viewport restored for race');if(h?.dataset.raceStage==='intro'){sawIntro=true;introduced.add(h.querySelector('.sr-intro strong').textContent);assert.equal(h.querySelector('.sr-intro [data-stat]').textContent,'','no score or statistic before race');assert(!h.querySelector('.sr-intro').textContent.includes('RISULTATO_RISERVATO'));assert.equal(parseFloat(h.querySelector('canvas-view').style.height),h.clientHeight-200,'canvas ends before introduction panel');}if(h?.dataset.raceStage==='signature'){celebrated.add(h.querySelector('.sr-intro strong').textContent);assert.equal(parseFloat(h.querySelector('canvas-view').style.height),h.clientHeight-200,'canvas ends before celebration panel');assert(!h.querySelector('.sr-intro').hidden);assert(h.querySelector('.sr-intro button').hidden);const roots=new Set();scene.traverse(o=>{if(o.name?.startsWith('jockey-arm-'))roots.add(o.parent.parent.parent)});assert.equal([...roots].filter(r=>r.visible).length,1,'signature close-up isolates one participant');}if(['celebration','signature'].includes(h?.dataset.raceStage))scene.traverse(o=>{if(o.name?.startsWith('jockey-arm-')){if(o.rotation.z>1)poses.add('arm');if(o.parent.rotation.z<-.4)poses.add('bow');}});};
 const result=runRace(host,entries,{profile:{weather:test.weather,lighting:'sunset'},introduction:!test.introOff});result.then(()=>ended=true,error=>{console.error(error);ended=true;});
 if(test.skip)host.querySelector('[data-skip]').click();
 for(let frame=0;frame<5000&&!ended;frame++){
 if(frame===20&&test.skipIntro)host.querySelector('.sr-intro button').click();
 if(frame===20&&test.cancel)host.remove();
 if(frame===30&&!test.cancel){env.document.hidden=true;env.document.handlers.visibilitychange?.forEach(fn=>fn());assert.equal(env.frames.size,0,'pause cancels frames');env.document.hidden=false;env.document.handlers.visibilitychange?.forEach(fn=>fn());}
 env.flushFrames(frame*16.6667);await Promise.resolve();}
 assert(ended,'race completed');assert.equal(await result,!test.cancel);assert.equal(env.frames.size,0);assert.equal(host.children.length,0,'canvas and UI removed');
 if(!test.skip&&!test.cancel){assert.equal(arrivals.length,entries.length);for(const item of arrivals)assert(Math.abs(item.noseX-48)<1,'arrival plane');for(let i=0;i<arrivals.length;i++)for(let j=0;j<arrivals.length;j++)if(arrivals[i].place===arrivals[j].place)assert.equal(arrivals[i].time,arrivals[j].time);}
 if(test.introOff)assert(!sawIntro,'introduction disabled only by personal preference');else if(!test.skip&&!test.cancel){assert(sawIntro,'introduction including reduced motion');if(!test.skipIntro)assert.equal(introduced.size,entries.length,'all participants introduced');}if(!test.skip&&!test.cancel)assert.equal(celebrated.size,entries.filter(e=>e.place===1).length,'each winner has a visible signature close-up');if(!test.skip&&!test.cancel){assert(poses.has('arm'),'real 3D celebration pose');if(test.places.length===6)assert(poses.has('bow'),'real 3D bow');}
 if(test.baseline)baseline=JSON.stringify(arrivals);if(test.compare)assert.equal(JSON.stringify(arrivals),baseline,'cosmetics do not change finish times/places');
 console.log('PASS: full race lifecycle (DOM model, rendering stub):',test.places.join(','),test.weather,test.skip?'skip':test.reduced?'reduced motion':'finish/replay/awards','; approx main-pass calls',host.dataset.drawCalls,'triangles',host.dataset.triangles);
}

} finally {delete globalThis.__raceInspect;if(cryptoDescriptor)Object.defineProperty(globalThis,'crypto',cryptoDescriptor);await fs.rm(folder,{recursive:true,force:true});}
