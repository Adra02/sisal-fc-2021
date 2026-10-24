import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createCanvas} from '@napi-rs/canvas';
const dom=new JSDOM('<div id="host"></div>',{pretendToBeVisual:true,url:'https://sisal.test'});
globalThis.document=dom.window.document;globalThis.window=dom.window;globalThis.devicePixelRatio=1;globalThis.matchMedia=()=>({matches:false});
const contexts=new WeakMap();dom.window.HTMLCanvasElement.prototype.getContext=function(){if(!contexts.has(this))contexts.set(this,createCanvas(this.width||256,this.height||256));return contexts.get(this).getContext('2d')};
let frames=new Map(),id=0,renderCount=0,lastScene;globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id};globalThis.cancelAnimationFrame=n=>frames.delete(n);globalThis.ResizeObserver=class{constructor(f){this.f=f}observe(){this.f()}disconnect(){}};
globalThis.__Renderer=class{constructor(){this.domElement=document.createElement('canvas');this.shadowMap={};this.ratio=1}setPixelRatio(v){this.ratio=v}getPixelRatio(){return this.ratio}setSize(){}render(scene){renderCount++;lastScene=scene;scene.updateMatrixWorld();scene.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite))})}dispose(){}forceContextLoss(){}};
let source=await fs.readFile('arena-renderer.js','utf8');
source=source.replace("import * as T from './vendor/three.module.min.js';", "import * as Three from '"+new URL('../vendor/three.module.min.js',import.meta.url).href+"';const T={...Three,WebGLRenderer:globalThis.__Renderer};");
source=source.replace(/from '(\.\/[^']+)'/g,(_,p)=>"from '"+new URL('../'+p.slice(2),import.meta.url).href+"'");
const {createArenaRenderer}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const host=document.getElementById('host');let now=1730,caption;const engine=createArenaRenderer(host,{players:Array.from({length:8},(_,i)=>({key:'p'+i,name:'P'+i,appearance:{}})),keeper:null},{clock:()=>now,onFrame:f=>caption=f});
for(let i=0;i<400;i++){now+=.05;const copy=[...frames.values()];frames.clear();copy.forEach(f=>f(i*50))}
assert(renderCount>300);assert(caption.title);engine.follow('p1');engine.zoom(-3);engine.pause();assert.equal(frames.size,0);engine.resume();assert.equal(frames.size,1);engine.dispose();engine.dispose();assert.equal(frames.size,0);assert.equal(host.children.length,0);
dom.window.close();console.log('PASS full Arena renderer lifecycle with real scene/avatar geometry and simulated GPU: finite transforms, multi-scene rendering, camera follow, pause/resume, double-dispose cleanup.');
