/* Race-only surface and architecture detail. No scores, account data or RNG state. */
import * as T from './vendor/three.module.min.js';
const fract=x=>x-Math.floor(x),noise=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
export function refineRace({horses,scene,renderer,texture,mat,mesh,cube,geo,box,trackHalf,night}){
 const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const coat=texture((c,w,h)=>{
  const image=c.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,n=noise(x,y),flow=Math.sin(y*.66+Math.sin(x*.022)*2.1),broad=Math.sin(x*.024)*Math.cos(y*.016);
   const value=244+flow*3+(n-.5)*9+broad*2;
   image.data[i]=image.data[i+1]=image.data[i+2]=value;image.data[i+3]=255;
  }
  c.putImageData(image,0,0);
 },512,512);
 coat.wrapS=coat.wrapT=T.RepeatWrapping;coat.repeat.set(2,2);coat.anisotropy=anisotropy;
 const roughness=texture((c,w,h)=>{
  const image=c.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,v=205+18*Math.sin(x*.07)*Math.sin(y*.04)+(noise(x,y)-.5)*22;image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;}
  c.putImageData(image,0,0);
 },128,128);
 // Data maps must remain linear; only the colour map uses sRGB.
 roughness.colorSpace=T.NoColorSpace;roughness.wrapS=roughness.wrapT=T.RepeatWrapping;
 for(const h of horses){
  const body=h.mount.horse.material;body.map=coat;body.roughnessMap=roughness;body.roughness=.70;body.sheen=.22;body.sheenRoughness=.8;body.clearcoat=.025;body.envMapIntensity=.75;body.needsUpdate=true;
  h.rider.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.map){m.map.anisotropy=anisotropy;}});
 }
 const metal=mat('#46534e',{metalness:.65,roughness:.48}),concrete=mat('#727d75',{roughness:.97}),cream=mat('#dbd8c5',{roughness:.82});
 // Aisles, handrails and canopy bracing give the audience a plausible setting.
 for(const x of [-12,12,36,60,84]){
  for(let row=0;row<5;row++)cube(scene,concrete,[x,.343+row*.65,-trackHalf-6.50-row*1.35],[.8,.035,1.25]);
  const a=new T.Vector3(x,1.38,-trackHalf-6.50),b=new T.Vector3(x,3.98,-trackHalf-11.90),direction=b.clone().sub(a);
  const rail=mesh(scene,geo(new T.CylinderGeometry(.025,.025,direction.length(),8)),metal,a.clone().add(b).multiplyScalar(.5).toArray());rail.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
  for(const row of [0,2,4])cube(scene,metal,[x,.86+row*.65,-trackHalf-6.50-row*1.35],[.055,1.04,.055]);
  cube(scene,metal,[x,5.65,-trackHalf-9.4],[.09,.09,8.8]);
 }
 // Low trackside section markers; always outside the runners' lanes.
 for(const [i,x]of [-1,17,35,53,71,89].entries()){
  const map=texture((c,w,h)=>{c.fillStyle='#173f2d';c.fillRect(0,0,w,h);c.fillStyle='#e0e4cf';c.font='700 52px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('S'+String(i+1).padStart(2,'0'),w/2,h/2);},256,96);
  const sign=mesh(scene,geo(new T.PlaneGeometry(2.1,.78)),mat('#fff',{map,roughness:1}),[x,.72,-trackHalf-.80]);sign.castShadow=false;
 }
 // Separate foliage clusters replace single oval tree crowns. This generator
 // does not consume the seeded stream used by the race plan.
 const leafGeo=geo(new T.IcosahedronGeometry(1,2)),leafMat=mat('#ffffff',{roughness:1}),leaves=new T.InstancedMesh(leafGeo,leafMat,88),d=new T.Object3D();
 for(let i=0;i<88;i++){
  const tree=Math.floor(i/4),branch=i%4,x=-35+tree*8,z=-33-(tree%3)*7-(trackHalf-6.5);
  d.position.set(x+Math.sin(i*2.3)*1.4,4.5+branch*.65+noise(tree,branch),z+Math.cos(i*1.9)*1.1);
  d.rotation.set(i*.11,i*.9,i*.13);d.scale.set(1.35+noise(i,1),1.7+noise(i,2),1.4+noise(i,3));d.updateMatrix();leaves.setMatrixAt(i,d.matrix);
  leaves.setColorAt(i,new T.Color().setHSL(.28+noise(i,4)*.045,.22,night?.13:.21+noise(i,5)*.08));
 }
 leaves.receiveShadow=true;scene.add(leaves);
 // Course furniture stays restrained, avoiding clutter around the horses.
 for(const z of [-trackHalf-.51,trackHalf+.51])for(const x of [0,24,48,72])cube(scene,cream,[x,1.14,z],[.3,.19,.17]);
 return {coat,roughness};
}
