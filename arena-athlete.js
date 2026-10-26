import * as T from './vendor/three.module.min.js';

// Arena-only short sleeves. Rebucket existing triangles so bare forearms use
// skin rather than a shirt texture. The saved body dimensions never change.
export function footballGeometry(g){
 const pos=g.getAttribute('position'),skin=g.getAttribute('skinIndex'),weights=g.getAttribute('skinWeight'),index=g.index;
 if(!skin||!weights||!index)return;
 const buckets=[[],[],[],[],[]],component=(a,i,k)=>a.array[i*a.itemSize+k];
 for(const group of g.groups){for(let j=group.start;j<group.start+group.count;j+=3){const ids=[index.getX(j),index.getX(j+1),index.getX(j+2)];let material=group.materialIndex;
  if(material===0){const bare=ids.reduce((sum,i)=>{let arm=0;for(let k=0;k<4;k++)if([3,4,9,10].includes(component(skin,i,k)))arm+=component(weights,i,k);return sum+(arm>.58&&Math.abs(pos.getZ(i))>.31?1:0);},0);if(bare>=2)material=4;}
  buckets[material].push(...ids);
 }}
 g.setIndex(buckets.flat());g.clearGroups();let offset=0;for(let i=0;i<5;i++){g.addGroup(offset,buckets[i].length,i);offset+=buckets[i].length;}
}

// Vertex clustering retains a closed coarse surface, UVs and cosmetic colours.
// Used for static head/hair only; never for the articulated body or gameplay.
export function clusteredGeometry(source,cell=.012){
 const p=source.getAttribute('position'),c=source.getAttribute('color'),uv=source.getAttribute('uv'),indices=source.index?.array||Array.from({length:p.count},(_,i)=>i),map=new Map(),remap=new Uint32Array(p.count),vertices=[];
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x/cell)).join(':');let n=map.get(key);if(n==null){n=vertices.length;map.set(key,n);vertices.push({p:[0,0,0],c:[0,0,0],uv:[0,0],count:0});}remap[i]=n;const v=vertices[n];v.count++;v.p[0]+=p.getX(i);v.p[1]+=p.getY(i);v.p[2]+=p.getZ(i);if(c){v.c[0]+=c.getX(i);v.c[1]+=c.getY(i);v.c[2]+=c.getZ(i);}if(uv){v.uv[0]+=uv.getX(i);v.uv[1]+=uv.getY(i);}}
 const faces=[];for(let i=0;i<indices.length;i+=3){const a=remap[indices[i]],b=remap[indices[i+1]],c=remap[indices[i+2]];if(a!==b&&b!==c&&c!==a)faces.push(a,b,c);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices.flatMap(v=>v.p.map(x=>x/v.count)),3));if(c)g.setAttribute('color',new T.Float32BufferAttribute(vertices.flatMap(v=>v.c.map(x=>x/v.count)),3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(vertices.flatMap(v=>v.uv.map(x=>x/v.count)),2));g.setIndex(faces);g.computeVertexNormals();return g;
}

export function athleteFinish(model){
 const swaps=[],hide=[],helmet=model.rider.userData.headgear;
 model.rider.traverse(o=>{
  if(!o.isMesh)return;
  if(o.name==='zipper-tape')o.visible=false;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  for(const m of materials){if(o.name==='anatomical-face'){m.roughness=.66;m.clearcoat=.015;m.envMapIntensity=.65;}if(/hair|beard/.test(o.name)){m.roughness=.70;m.sheen=.32;m.sheenRoughness=.65;}}
  if(o.name.includes('fibres')||o.name==='zipper-tape')hide.push(o);
  if(['anatomical-face','beard-volume','rooted-long-hair','rooted-tied-hair'].includes(o.name)&&o.geometry.index?.count>1200){swaps.push({full:o,geometry:clusteredGeometry(o.geometry,o.name==='anatomical-face'?.012:.008)});}
 });
 for(const s of swaps){const low=new T.Mesh(s.geometry,s.full.material);low.name='arena-head-distant-'+s.full.name;low.position.copy(s.full.position);low.rotation.copy(s.full.rotation);low.scale.copy(s.full.scale);low.castShadow=false;low.receiveShadow=true;low.visible=false;s.full.parent.add(low);s.low=low;}
 let current=true;
 return {detail(full){if(full===current)return;current=full;for(const s of swaps){s.full.visible=full;s.low.visible=!full;}for(const h of hide)if(h.name!=='zipper-tape')h.visible=full;if(helmet)helmet.traverse(o=>{if(o.isMesh)o.castShadow=full;});}};
}
