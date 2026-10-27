import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createCanvas} from '@napi-rs/canvas';
import * as T from '../vendor/three.module.min.js';
import {makeAvatar} from '../arena-avatar.js';
import {actionFraming,smoothRadius,fullAvatarDetail} from '../arena-camera.js';
import {paintPitch} from '../arena-surface.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
const avatar=makeAvatar({key:'motion',appearance:{helmetVisible:'off',hair:'crop',number:'27'}},1),joint=n=>{avatar.root.updateMatrixWorld(true);return avatar.limbs.find(b=>b.name===n).getWorldPosition(new T.Vector3())};
assert.equal(avatar.model.rider.userData.headgear.visible,false,'valid saved helmet preference remains off');
const geometry=avatar.model.body.geometry,morph=geometry.morphAttributes.position[0];let changedFingers=0;
for(let i=0;i<morph.count;i++){const before=new T.Vector3().fromBufferAttribute(geometry.attributes.position,i),after=new T.Vector3().fromBufferAttribute(morph,i),delta=after.distanceTo(before);assert(delta<.14,'relaxed fingers stay attached to the hand');if(delta>.00001){changedFingers++;let handWeight=0;for(let k=0;k<4;k++)if([4,10].includes(geometry.attributes.skinIndex.array[i*4+k]))handWeight+=geometry.attributes.skinWeight.array[i*4+k];assert(handWeight>=.65,'finger morph cannot alter the body, face or legs');}}
assert(changedFingers>100);
const base={key:'motion',pos:[0,0],look:[0,10],heading:0,velocity:[0,4],gesture:'run',phase:0,preciseMotion:true,strideLength:1.92,personality:0,team:0};
let maxHeel=0,minKnee=10,maxArmBend=0;
for(let i=0;i<240;i++){
 const t=i/240;avatar.update({...base,pos:[0,t*4],stepCycle:t*4/1.92,actionTime:t},t,1/240);
 const ankle=joint('rAnkle'),knee=joint('rKnee'),hip=joint('rHip'),arm=avatar.limbs.find(b=>b.name==='rElbow'),wrist=joint('rWrist'),elbow=joint('rElbow'),shoulder=arm.parent.getWorldPosition(new T.Vector3());
 maxHeel=Math.max(maxHeel,ankle.y);minKnee=Math.min(minKnee,ankle.clone().sub(knee).normalize().dot(knee.clone().sub(hip).normalize()));maxArmBend=Math.max(maxArmBend,Math.acos(T.MathUtils.clamp(elbow.clone().sub(shoulder).normalize().dot(wrist.clone().sub(elbow).normalize()),-1,1)));
 assert(ankle.y>=.035,'boots do not fall through the turf');
}
assert(maxHeel>.27,'running has a visible heel-recovery phase');assert(minKnee<.6,'recovery flexes the knee, not just a rigid leg swinging');assert(maxArmBend>.8,'running elbows bend');
const still={...base,pos:[0,0],velocity:[0,0],gesture:'idle',stepCycle:0,actionTime:2};avatar.update(still,2,.016);avatar.root.updateMatrixWorld(true);const old=avatar.limbs.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));
avatar.update({...still,gesture:'kick',gestureStart:2.016,phase:0,contact:2.4,actionTime:2.016},2.016,.016);
let maxEntryJump=0;avatar.limbs.forEach((b,i)=>{maxEntryJump=Math.max(maxEntryJump,b.position.distanceTo(old[i].p),b.quaternion.angleTo(old[i].q));});assert(maxEntryJump<.02,'starting a gesture retains the previous pose, then blends into the action');
avatar.update({...still,gesture:'kick',phase:.5,gestureStart:2.016,contact:2.4,actionTime:2.4},2.4,.016);assert(joint('rAnkle').z>.25,'generic strike is extended, not wound back, at actual contact');
avatar.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));assert(avatar.root.getObjectByName('arena-shirt-personal-number'));
for(const m of avatar.model.body.material.slice(1,3)){const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);assert(shader.vertexShader.includes('vArenaRestY = arenaRestY;'));assert(shader.fragmentShader.includes('diffuseColor.rgb = kitColour;'));assert(shader.uniforms.arenaSkin.value.isColor);assert.equal(avatar.model.body.geometry.attributes.arenaRestY.count,avatar.model.body.geometry.attributes.position.count);}
avatar.dispose();
const frame={focus:[[0,0],[28,23],[-29,-24]],balls:[{id:'spare',mode:'rack',pos:[19,.11,16]},{id:'play',mode:'free',pos:[0,.11,0]}],actors:[{key:'a',active:true,pos:[1,1]},{key:'b',active:true,pos:[3,0]},{key:'far',active:true,pos:[28,25]}],playing:true,ballVelocity:[4,0,0]};
const cameras=[];for(const aspect of [.45,.6,1,1.8,2.5]){const f=actionFraming(frame,aspect);assert(Math.hypot(f.center[0],f.center[2])<3,'spare balls and distant players do not pull the camera away');assert(f.radius>=12.5&&f.radius<=25);cameras.push({aspect,...f});}
let radius=15;for(let i=0;i<60;i++){const next=smoothRadius(radius,i%2?25:15,1/60);assert(Math.abs(next-radius)<=4.2/60+.000001);radius=next;}
assert(fullAvatarDetail(19,900));assert(!fullAvatarDetail(60,600));assert(!fullAvatarDetail(19,900,{low:true}));assert(fullAvatarDetail(60,600,{low:true,selected:true}));
const c=createCanvas(512,768),ctx=c.getContext('2d');paintPitch(ctx,512,768);const image=ctx.getImageData(0,0,512,768),means=[];
for(let b=0;b<8;b++){let total=0,n=0;for(let y=b*96+20;y<b*96+76;y++)for(let x=20;x<200;x++){total+=image.data[(y*512+x)*4+1];n++;}means.push(total/n);}
assert(Math.max(...means)-Math.min(...means)<12,'mowing stripes have restrained contrast');assert(image.data.every(Number.isFinite));
const sw=await fs.readFile('sw.js','utf8');for(const file of ['arena-camera.js','arena-locomotion.js','arena-surface.js'])assert(sw.includes(file+'?v=arena-12'),'new rendering module is cached');
console.log(JSON.stringify({test:'Arena visual motion and framing',changedFingers,maxHeel,minKnee,maxArmBend,maxEntryJump,cameras,pitchGreenBandMeans:means,note:'Actual CPU Three rig/material and camera tests. Not GPU rendering, phone FPS or a claim of photorealism.'}));
