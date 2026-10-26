import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {makeAvatar} from '../arena-avatar.js';
import {styleColors} from '../horse-style.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
const measurements=[];
for(const style of [{skin:'ebony',hair:'braids',beard:'full',helmetVisible:'off'},{skin:'sand',hair:'long',beard:'short',helmetVisible:'on'},{skin:'porcelain',hair:'bald',beard:'none',helmetVisible:'off'}]){
 const a=makeAvatar({key:'p0',appearance:style},1),state={key:'p0',pos:[0,0],look:[0,10],velocity:[0,0],heading:0,stepCycle:0,strideLength:1,gesture:'keeper',phase:.4,goalkeeper:true,team:0,actionTime:1,personality:0};a.update(state,1,.016);a.root.updateMatrixWorld(true);
 assert.equal(a.model.body.material.length,5);const colours=styleColors(style);assert.equal(a.model.body.material[3].color.getHexString(),colours.glovesColor.slice(1));assert.equal(a.model.body.material[4].color.getHexString(),colours.skinColor.slice(1),'bare forearms never become glove-coloured');assert(a.model.body.geometry.groups.some(g=>g.materialIndex===4&&g.count>0));
 const face=a.root.getObjectByName('anatomical-face'),coarse=a.root.getObjectByName('arena-head-distant-anatomical-face');assert(coarse);assert(coarse.geometry.index.count<face.geometry.index.count);a.setDetail(false);assert(!face.visible&&coarse.visible);a.setDetail(true);assert(face.visible&&!coarse.visible);
 a.root.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));if(o.geometry?.attributes.position)assert(o.geometry.attributes.position.array.every(Number.isFinite));});
 measurements.push({skin:style.skin,fullFaceTriangles:face.geometry.index.count/3,distantFaceTriangles:coarse.geometry.index.count/3,helmet:a.model.rider.userData.headgear.visible});a.dispose();
}
console.log(JSON.stringify({test:'Arena athlete materials and full head LOD',measurements,note:'Actual Three meshes/materials; no GPU rendering or subjective visual claim.'}));
