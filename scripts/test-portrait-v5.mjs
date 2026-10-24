import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createCanvas} from '@napi-rs/canvas';
import {nameKey,styleColors} from '../horse-style.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
let selected='off',frames=[];
globalThis.window={SisalAccount:{user:{display_name:'Viewer'},styleFor:n=>n==='Subject'?{helmetVisible:selected,eyes:'blue'}:{helmetVisible:'on',eyes:'green'}}};
globalThis.__PortraitRenderer=class{
 constructor(){this.domElement={toDataURL:()=>`data:image/png;base64,simulated-${frames.length}`}}setSize(){}setPixelRatio(){}dispose(){}forceContextLoss(){}
 render(scene){let rider;scene.traverse(o=>{if(o.userData?.headgear)rider=o});assert(rider);const irises=[];scene.traverse(o=>{if(o.name==='iris')irises.push(o.material.color.getHexString())});frames.push({helmet:rider.userData.headgear.visible,irises});}
};
let source=await fs.readFile('jockey-portrait.js','utf8');
source=source.replace("import * as T from './vendor/three.module.min.js';","import * as Three from '"+new URL('../vendor/three.module.min.js',import.meta.url).href+"';const T={...Three,WebGLRenderer:globalThis.__PortraitRenderer};");
source=source.replace(/from '(\.\/[^']+)'/g,(_,p)=>"from '"+new URL('../'+p.slice(2),import.meta.url).href+"'");
const {portraitImage}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const subject={name:'Subject',key:nameKey('Subject'),appearance:{eyes:'hazel',helmetVisible:'on',hair:'bald'}};
assert(portraitImage(subject));assert.equal(frames.at(-1).helmet,false,'subject current helmet preference respected');
const colour=styleColors(subject.appearance).eyeColor;
const {Color}=await import('../vendor/three.module.min.js');assert.deepEqual(frames.at(-1).irises,[new Color(colour).getHexString(),new Color(colour).getHexString()],'portrait retains the chosen subject appearance, never the viewer');
assert(portraitImage(subject));assert.equal(frames.length,1,'identical portrait cached');
selected='on';assert(portraitImage(subject));assert.equal(frames.length,2,'helmet change invalidates cache');assert.equal(frames.at(-1).helmet,true);
selected='off';assert(portraitImage(subject,{closeup:true}));assert.equal(frames.at(-1).helmet,false);
assert.equal(portraitImage({...subject,key:'viewer'}),null,'mismatched identity refused');
console.log('PASS actual portrait scene/model with simulated GPU: subject identity, eye materials, live helmet preference in paper/closeup, cache invalidation and mismatch rejection.');
