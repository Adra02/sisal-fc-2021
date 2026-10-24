import assert from 'node:assert/strict';
import {placeLabels,intersects,leaderLine} from '../scene-labels.js';
let seed=73;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
let cases=0,boxes=0;
for(const [width,height]of [[320,230],[390,410],[768,520],[1440,700]])for(const count of [3,6,12,25])for(let frame=0;frame<24;frame++){
 const items=Array.from({length:count},(_,i)=>({id:i,ax:frame%2?width/2:random()*width,ay:frame%2?70:random()*height,w:90+random()*90,h:23,priority:i===0?100:0}));
 const opts={width,height,top:50,bottom:10,gap:6,obstacles:frame%3?[{x:width-120,y:65,w:100,h:55}]:[]};
 const result=placeLabels(items,opts),shown=[...result.values()].filter(x=>!x.hidden);assert.deepEqual(result,placeLabels(items,opts));
 assert(!result.get(0).hidden,'self/high priority keeps a readable label');
 for(let i=0;i<shown.length;i++){const a=shown[i];assert(a.x>=8&&a.y>=50&&a.x+a.w<=width-8+.001&&a.y+a.h<=height-10+.001,'clamped box is inside safe viewport');for(let j=i+1;j<shown.length;j++)assert(!intersects(a,shown[j],5.9),'no overlaps after edge clamping');for(const o of opts.obstacles)assert(!intersects(a,o,5.9),'HUD is not covered');}
 for(const item of items){const a=result.get(item.id);if(!a.hidden)assert(Object.values(leaderLine(a,item.ax,item.ay)).every(Number.isFinite));}
 const next=placeLabels(items,{...opts,previous:result});assert.deepEqual(next,placeLabels(items,{...opts,previous:result}));cases++;boxes+=shown.length;
}
console.log(`PASS ${cases} dense/edge/mobile/desktop label cases, ${boxes} visible boxes: no overlap, HUD exclusion, finite leader lines, stable layout and priority for self.`);
