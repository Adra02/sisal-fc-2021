import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import * as T from '../vendor/three.module.min.js';
import {createJockey} from '../jockey-model.js';
import {styleColors,validateStyle,OPTIONS,DEFAULT} from '../horse-style.js';
import {disposeTree} from '../studio-geometry.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
let checks=0;
for(const eyes of Object.keys(OPTIONS.eyes)){
 const style=styleColors({eyes,helmetVisible:'off',hair:'bald'});
 const j=createJockey({custom:style,standing:true});
 j.rider.updateMatrixWorld(true);
 for(const eye of j.head.userData.eyes){
  const iris=eye.getObjectByName('iris');
  const p=new T.Vector3(.02412,.003,.002),origin=p.clone().add(new T.Vector3(.15,0,0));
  eye.localToWorld(origin);eye.localToWorld(p);
  const ray=new T.Raycaster(origin,p.clone().sub(origin).normalize());
  const hits=ray.intersectObject(eye,true);
  assert.equal(hits[0]?.object.name,'iris','visible iris must be in front of sclera: '+eyes);
  assert.equal(iris.material.side,T.FrontSide,'correct winding, not a double-sided workaround');
  assert.equal(iris.material.color.getHexString(),new T.Color(style.eyeColor).getHexString());
  const n=iris.geometry.attributes.normal;
  for(let i=41;i<n.count;i++)assert(n.getX(i)>.85,'iris outward normal');
  checks++;
 }
 assert.equal(j.rider.userData.headgear.visible,false,'no helmet in common model');
 disposeTree(j.rider);
}
assert.equal(validateStyle({}).helmetVisible,'on','legacy account keeps helmet');
assert.throws(()=>validateStyle({helmetVisible:'maybe'}),/INVALID_STYLE/);
for(const standing of [true,false])for(const helmetVisible of ['on','off']){
 const j=createJockey({custom:styleColors({helmetVisible}),standing});
 assert.equal(j.rider.userData.headgear.visible,helmetVisible==='on');
 for(const pose of ['salute','arms','bow','crowd']){
  j.rider.userData.pose(pose,1,false,1);
  assert.equal(j.rider.userData.headgear.visible,helmetVisible==='on');
 }
 disposeTree(j.rider);
}
assert.equal(DEFAULT.helmetVisible,'on');
console.log(`PASS: ${checks} real Three.js iris ray intersections; all eye colours; persistent helmet contract and four poses in standing/race models.`);
