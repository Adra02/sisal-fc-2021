import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {createCanvas} from '@napi-rs/canvas';import {environment} from './account-test-dom.mjs';
// Actual geometry and choreography; only the GPU renderer and browser DOM are simulated.
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'sisal-race-qa-'));
let source=await fs.readFile(new URL('../race-3d.js',import.meta.url),'utf8');
source=source.replace("import * as T from './vendor/three.module.min.js';",`import * as Three from '${new URL('../vendor/three.module.min.js',import.meta.url)}';\nimport {FakeRenderer} from '${new URL('./account-test-renderer.mjs',import.meta.url)}';\nconst T={...Three,WebGLRenderer:FakeRenderer};`);
for(const file of ['horse-style.js','race-visuals.js?v=32.1.40','race-motion.js?v=32.1.39'])source=source.replace("'./"+file+"'",JSON.stringify(new URL('../'+file,import.meta.url).href));
const runtime=path.join(folder,'race.mjs');await fs.writeFile(runtime,source);const {runRace}=await import(pathToFileURL(runtime));
const cryptoDescriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:a=>{a.fill(328794);return a;}}});
try {
const cases=[{places:[1,2,3],weather:'clear'},{places:[1,1,2,3],weather:'rain'},{places:[1,1,1,1,1,1],weather:'wet'},{places:[1],weather:'clear',skip:true},{places:[1,2,3],weather:'clear',reduced:true},{places:[1,1,2,3],weather:'rain',touch:true}];
let baseline;
for(const test of [...cases,{places:[1,2,3],weather:'clear',baseline:true},{places:[1,2,3],weather:'clear',compare:true}]){
 const env=environment();env.media.matches=Boolean(test.reduced);for(const key of ['document','window','matchMedia','MutationObserver','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','CustomEvent'])globalThis[key]=env[key];globalThis.devicePixelRatio=1;globalThis.matchMedia=query=>({matches:query.includes('pointer')?Boolean(test.touch):Boolean(test.reduced)});
 const original=env.document.createElement.bind(env.document);env.document.createElement=tag=>tag==='canvas'?createCanvas(1,1):original(tag);
 const host=original('div');host.className='sr-host';env.document.body.appendChild(host);const arrivals=[];host.addEventListener('sisal-race-arrival',e=>arrivals.push(e.detail));
 const entries=test.places.map((place,i)=>({name:'Giocatore '+i,place,color:['#37bc91','#e4b861','#659bdd'][i%3],score:'8',appearance:test.baseline?undefined:{coat:'black',mane:'silver',silk:'burgundy',accent:'gold',pattern:'chevron',saddle:'tan',helmet:'ivory',marking:'blaze'}}));let ended=false;
 const result=runRace(host,entries,{profile:{weather:test.weather,lighting:'sunset'}});result.then(()=>ended=true,error=>{console.error(error);ended=true;});
 if(test.skip)host.querySelector('[data-skip]').click();
 for(let frame=0;frame<5000&&!ended;frame++){env.flushFrames(frame*16.6667);await Promise.resolve();}
 assert(ended,'race completed');assert.equal(await result,true);assert.equal(env.frames.size,0);assert.equal(host.children.length,0,'canvas and UI removed');
 if(!test.skip){assert.equal(arrivals.length,entries.length);for(const item of arrivals)assert(Math.abs(item.noseX-48)<1,'arrival plane');for(let i=0;i<arrivals.length;i++)for(let j=0;j<arrivals.length;j++)if(arrivals[i].place===arrivals[j].place)assert.equal(arrivals[i].time,arrivals[j].time);}
 if(test.baseline)baseline=JSON.stringify(arrivals);if(test.compare)assert.equal(JSON.stringify(arrivals),baseline,'cosmetics do not change finish times/places');
 console.log('PASS: full race lifecycle (DOM model, rendering stub):',test.places.join(','),test.weather,test.skip?'skip':test.reduced?'reduced motion':'finish/replay/awards','; approx main-pass calls',host.dataset.drawCalls,'triangles',host.dataset.triangles);
}

} finally {if(cryptoDescriptor)Object.defineProperty(globalThis,'crypto',cryptoDescriptor);await fs.rm(folder,{recursive:true,force:true});}
