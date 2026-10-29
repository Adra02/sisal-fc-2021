import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {pitchLabelLayout,labelBoxesOverlap} from '../pitch-labels.js';
const source=await fs.readFile('index-inline.js','utf8'),a=source.indexOf('const FORMATIONS='),b=source.indexOf('function playerRoleMatch',a),ctx={};vm.createContext(ctx);vm.runInContext(source.slice(a,b)+';globalThis.fixture={FORM_ROWS,pitchCoordinates};',ctx);
let checks=0;for(const [formation,roles]of Object.entries(ctx.fixture.FORM_ROWS))for(const width of [240,255,270,290,320,360,420,520,720,1000]){
 const coords=ctx.fixture.pitchCoordinates(roles),defs=roles.map((r,i)=>({r,i})).filter(e=>['LB','CB','RB','LWB','RWB'].includes(e.r)).sort((a,b)=>(a.r.startsWith('L')?0:a.r.startsWith('R')?2:1)-(b.r.startsWith('L')?0:b.r.startsWith('R')?2:1));defs.forEach((d,j)=>coords[d.i].x=defs.length===1?50:12+j*76/(defs.length-1));
 const height=width<440?680:740;const input=coords.map((p,i)=>({...p,slot:String(i)})),layout=pitchLabelLayout(input,{width,height});assert.equal(layout.length,11);assert.deepEqual(input.map(p=>[p.x,p.y]),coords.map(p=>[p.x,p.y]),'labels must not modify source coordinates');
 const boxes=layout.map(p=>({left:p.x*width/100-p.width/2,right:p.x*width/100+p.width/2,top:p.y*height/100-p.height/2,bottom:p.y*height/100+p.height/2}));
 for(const [i,x]of boxes.entries()){assert(x.left>=0&&x.right<=width&&x.top>=0&&x.bottom<=height,formation+' inside field');for(let j=i+1;j<boxes.length;j++)assert(!labelBoxesOverlap(x,boxes[j]),`${formation} ${width}px: ${roles[i]} ${i} overlaps ${roles[j]} ${j}`);}
 checks++;
}
console.log('PASS pitch 55: '+checks+' formation/width combinations; all 11 token/label boxes remain inside field and do not overlap. Source coordinates/assignments unchanged by label solver. Browser font geometry is checked separately.');
