import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createCanvas} from '@napi-rs/canvas';
import * as Three from '../vendor/three.module.min.js';
import {sampleArena} from '../arena-simulation.js';
import {SCENES} from '../arena-scenes.js';
const dom=new JSDOM('<div id="host"></div>',{pretendToBeVisual:true,url:'https://sisal.test'});
globalThis.document=dom.window.document;globalThis.window=dom.window;globalThis.devicePixelRatio=1;globalThis.matchMedia=()=>({matches:false});
const contexts=new WeakMap();dom.window.HTMLCanvasElement.prototype.getContext=function(){if(!contexts.has(this))contexts.set(this,createCanvas(this.width||256,this.height||256));return contexts.get(this).getContext('2d')};
let frames=new Map(),id=0,renderCount=0,lastScene,lastCamera;globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id};globalThis.cancelAnimationFrame=n=>frames.delete(n);globalThis.ResizeObserver=class{constructor(f){this.f=f}observe(){this.f()}disconnect(){}};
globalThis.__Renderer=class{constructor(){this.domElement=document.createElement('canvas');this.shadowMap={};this.ratio=1}setPixelRatio(v){this.ratio=v}getPixelRatio(){return this.ratio}setSize(){}render(scene,camera){renderCount++;lastScene=scene;lastCamera=camera;scene.updateMatrixWorld();scene.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite))})}dispose(){}forceContextLoss(){}};
let source=await fs.readFile('arena-renderer.js','utf8');
source=source.replace("import * as T from './vendor/three.module.min.js';", "import * as Three from '"+new URL('../vendor/three.module.min.js',import.meta.url).href+"';const T={...Three,WebGLRenderer:globalThis.__Renderer};");
let forcedScene=null;globalThis.__arenaSample=(s,t)=>sampleArena(s,t,forcedScene);
source=source.replace("import {sampleArena} from './arena-simulation.js?v=arena-4';","const sampleArena=globalThis.__arenaSample;");
source=source.replace(/from '(\.\/[^']+)'/g,(_,p)=>"from '"+new URL('../'+p.slice(2),import.meta.url).href+"'");
const {createArenaRenderer}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const host=document.getElementById('host');let now=1730,caption;const engine=createArenaRenderer(host,{players:Array.from({length:8},(_,i)=>({key:'p'+i,name:'P'+i,appearance:{}})),keeper:null},{clock:()=>now,onFrame:f=>caption=f});
for(let i=0;i<400;i++){now+=.05;const copy=[...frames.values()];frames.clear();copy.forEach(f=>f(i*50))}
assert(renderCount>300);assert(caption.title);engine.follow('p1');engine.zoom(-3);engine.pause();assert.equal(frames.size,0);engine.resume();assert.equal(frames.size,1);engine.dispose();engine.dispose();assert.equal(frames.size,0);assert.equal(host.children.length,0);
const fixture={players:Array.from({length:8},(_,i)=>({key:'p'+i,name:'P'+i,appearance:{helmetVisible:'off'}})),keeper:null};
let views=0;
for(const [id,time]of [['benchSave',17],['break',17],['laces',17],['roof',17],['roof',30]]){
 forcedScene=SCENES.find(s=>s.id===id);now=time;const e=createArenaRenderer(host,fixture,{clock:()=>now,onFrame:f=>caption=f,selfKey:'p0'});for(let i=0;i<4;i++){const copy=[...frames.values()];frames.clear();copy.forEach(f=>f(100000+i*50));}
 assert(lastCamera.position.x<17,'bench and roof viewed from the open field side');
 const props=lastScene.children.filter(o=>o.name.startsWith('bench-seat-')||o.name.startsWith('pavilion-'));for(const prop of props){const bounds=new Three.Box3().setFromObject(prop);assert(bounds.min.x>17,'the entire '+prop.name+' is beyond the touchline');}
 const solid=lastScene.children.filter(o=>['pavilion-roof','pavilion-back-wall'].includes(o.name));let checked=0;
 for(const p of sampleArena(fixture,now,forcedScene).actors.filter(p=>p.active&&p.pos[0]>20)){const head=lastScene.getObjectByName('arena-player-'+p.key).getObjectByName('jockey-neck-pivot'),target=head.getWorldPosition(new Three.Vector3()),distance=lastCamera.position.distanceTo(target),ray=new Three.Raycaster(lastCamera.position,target.clone().sub(lastCamera.position).normalize(),.01,distance-.08);assert.equal(ray.intersectObjects(solid).length,0,'no wall or roof between camera and active player');checked++;}
 if(id!=='roof')assert(checked>0);assert(caption.anchors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)));assert(caption.anchors.some(a=>a.self),'self anchor is transmitted');views++;e.dispose();
}
delete globalThis.__arenaSample;
dom.window.close();console.log(`PASS full Arena renderer lifecycle with real scene/avatar geometry and simulated GPU: finite transforms, multi-scene rendering, camera follow, pause/resume, double-dispose cleanup; ${views} pavilion/roof views, solid prop bounds and camera-to-player occlusion rays.`);
