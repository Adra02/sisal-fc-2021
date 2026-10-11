/* Procedural modelling and scenery. Only the bundled Three.js is imported.
 * This module never receives scores, finish times or race-plan state. */
import * as T from './vendor/three.module.min.js';

// Merge rigid siblings with the same material while keeping animated parent
// groups separate. Position, normals, UVs and shadow flags are preserved.
export function mergeRigidParts(parent,register){
  const groups=new Map();
  for(const part of [...parent.children]){
    if(!part.isMesh||part.isInstancedMesh||Array.isArray(part.material)||part.material.userData.sisalDeform)continue;
    const key=part.material.uuid+':'+part.castShadow+':'+part.receiveShadow;
    const group=groups.get(key)||[];group.push(part);groups.set(key,group);
  }
  for(const parts of groups.values()){
    if(parts.length<2)continue;
    const positions=[],normals=[],uvs=[],indices=[];
    for(const part of parts){
      part.updateMatrix();const g=part.geometry.clone().applyMatrix4(part.matrix),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,offset=positions.length/3;
      positions.push(...p.array);if(n)normals.push(...n.array);else normals.push(...new Array(p.count*3).fill(0));
      if(uv)uvs.push(...uv.array);else uvs.push(...new Array(p.count*2).fill(0));
      if(g.index){for(const i of g.index.array)indices.push(offset+i);}else for(let i=0;i<p.count;i++)indices.push(offset+i);
      g.dispose();parent.remove(part);
    }
    const geometry=register(new T.BufferGeometry());geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingSphere();
    const merged=new T.Mesh(geometry,parts[0].material);merged.castShadow=parts[0].castShadow;merged.receiveShadow=parts[0].receiveShadow;parent.add(merged);
  }
}

// Smooth elliptical sections following a curved anatomical centreline.
// Inputs: [x,y,z,radius-in-curve-plane,radius-across].
export function sculptGeometry(sections,steps=32,sides=20){
  const curve=new T.CatmullRomCurve3(sections.map(s=>new T.Vector3(...s.slice(0,3))),false,'centripetal');
  const radii=new T.CatmullRomCurve3(sections.map(s=>new T.Vector3(s[3],s[4],0)),false,'centripetal');
  const positions=[],uv=[],indices=[],across=new T.Vector3(0,0,1),normal=new T.Vector3();
  for(let row=0;row<=steps;row++){
    const t=row/steps,point=curve.getPoint(t),tangent=curve.getTangent(t),r=radii.getPoint(t);
    normal.crossVectors(across,tangent).normalize();
    for(let column=0;column<=sides;column++){
      const a=column/sides*Math.PI*2,ry=Math.max(.001,r.x),rz=Math.max(.001,r.y);
      positions.push(point.x+normal.x*Math.cos(a)*ry,point.y+normal.y*Math.cos(a)*ry,point.z+Math.sin(a)*rz);
      uv.push(t,column/sides);
      if(row<steps&&column<sides){const i=row*(sides+1)+column;indices.push(i,i+1,i+sides+1,i+1,i+sides+2,i+sides+1);}
    }
  }
  // End caps are small but closed, so shadows do not leak through silhouettes.
  for(const [row,point] of [[0,sections[0]],[steps,sections.at(-1)]]){
    const center=positions.length/3;positions.push(point[0],point[1],point[2]);uv.push(row/steps,.5);
    for(let k=0;k<sides;k++){const a=row*(sides+1)+k;if(row===0)indices.push(center,a+1,a);else indices.push(center,a,a+1);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

export function enhanceTrack({scene,renderer,geo,mat,texture,mesh,cube,box,trackHalf,night,sunset,profile,seed}){
  let state=(seed^0x5f3759df)>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const wet=profile.weather==='rain'||profile.weather==='wet';
  const sky=texture((c,w,h)=>{
    const gradient=c.createLinearGradient(0,0,0,h);
    gradient.addColorStop(0,night?'#07142b':sunset?'#345373':'#5989b0');
    gradient.addColorStop(.42,night?'#233c57':sunset?'#e6bb94':'#c4d5dc');
    gradient.addColorStop(.53,night?'#33454a':sunset?'#e9cda3':'#dfe2d1');
    gradient.addColorStop(1,'#273c29');c.fillStyle=gradient;c.fillRect(0,0,w,h);
    // Soft cloud banks baked once, not regenerated every frame.
    for(let i=0;i<24;i++){
      const x=random()*w,y=h*(.23+random()*.19),radius=20+random()*80;
      const cloud=c.createRadialGradient(x,y,0,x,y,radius);cloud.addColorStop(0,night?'rgba(140,172,187,.1)':'rgba(255,246,219,.2)');cloud.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=cloud;c.fillRect(x-radius,y-radius,radius*2,radius*2);
    }
  },1024,512);
  sky.mapping=T.EquirectangularReflectionMapping;scene.background=sky;scene.environment=sky;scene.environmentIntensity=night?.25:.42;
  scene.fog=new T.Fog(night?'#263c42':sunset?'#c8b69b':'#b4c6c0',65,190);
  const anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const grassMap=texture((c,w,h)=>{
    c.fillStyle='#486c3d';c.fillRect(0,0,w,h);
    for(let i=0;i<14000;i++){c.strokeStyle=i%3?'#658147':'#314d30';const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+(random()-.5)*3,y-2-random()*4);c.stroke();}
  },256,256);grassMap.wrapS=grassMap.wrapT=T.RepeatWrapping;grassMap.repeat.set(45,24);grassMap.anisotropy=anisotropy;
  const grass=mat('#a1b58c',{map:grassMap,roughness:1});
  const ground=mesh(scene,geo(new T.PlaneGeometry(215,125)),grass,[35,-.041,0]);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.castShadow=false;
  const grassDark=mat('#284e32',{roughness:1}),edge=mat('#64725a',{roughness:.94});
  for(const z of [-trackHalf-.18,trackHalf+.18])cube(scene,edge,[35,.01,z],[160,.12,.2]);
  // Alternating turf bands outside the dirt track, not extra objects per blade.
  const stripes=new T.InstancedMesh(box,grassDark,24);const dummy=new T.Object3D();
  for(let i=0;i<24;i++){dummy.position.set(-45+i*7,-.023,trackHalf+10);dummy.scale.set(3.5,.025,18);dummy.updateMatrix();stripes.setMatrixAt(i,dummy.matrix);}stripes.receiveShadow=true;scene.add(stripes);
  const hedge=mat('#274931',{roughness:.92});
  const hedgeGeo=geo(new T.IcosahedronGeometry(1,1));const shrubs=new T.InstancedMesh(hedgeGeo,hedge,160);
  for(let i=0;i<160;i++){dummy.position.set(-44+i*1.08,.5+random()*.15,-trackHalf-2.4);dummy.rotation.set(random()*.2,random()*Math.PI,0);dummy.scale.set(.7,.65+random()*.35,.6);dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);shrubs.setColorAt(i,new T.Color().setHSL(.31+random()*.05,.25,.17+random()*.09));}shrubs.castShadow=true;shrubs.receiveShadow=true;scene.add(shrubs);
  // Floodlight rigs and warm emissive LED ribbon; no expensive extra shadow maps.
  const metal=mat('#34443f',{metalness:.6,roughness:.43});
  const lamp=mat('#f6ebd4',{emissive:'#dceeff',emissiveIntensity:night?3:1.1,roughness:.3});
  for(const x of [-22,18,58,98]){
    const z=-trackHalf-11;
    cube(scene,metal,[x,7,z],[.24,14,.24]);cube(scene,metal,[x,13.6,z],[4,.8,.25]);
    for(let k=0;k<5;k++)cube(scene,lamp,[x-1.55+k*.78,13.6,z+.18],[.56,.5,.06]);
  }
  const led=mat('#72ac91',{emissive:'#388466',emissiveIntensity:night?.8:.2,roughness:.7});cube(scene,led,[35,3.95,-trackHalf-5.4],[106,.09,.1]);
  // Cloth flags: geometry deforms on the GPU. Static bounds include wind travel.
  const flagGeo=geo(new T.PlaneGeometry(2.3,1.3,10,4));
  const flagMat=mat('#d6e4d6',{side:T.DoubleSide,roughness:.9});
  flagMat.userData.sisalDeform=true;
  const wind={value:0};
  flagMat.onBeforeCompile=shader=>{shader.uniforms.sisalWind=wind;shader.vertexShader='uniform float sisalWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z += sin(position.x * 3.8 - sisalWind * 2.7) * (uv.x * uv.x) * 0.22;');};
  for(let i=0;i<7;i++){const x=-16+i*17,z=-trackHalf-4.5;cube(scene,metal,[x,3.1,z],[.07,6.2,.07]);const flag=mesh(scene,flagGeo,flagMat,[x+1.16,5.3,z]);flag.castShadow=false;}
  // Rain is optional; its buffer is updated locally and paused with the race.
  let rain=null,rainPositions=null;
  if(profile.weather==='rain'){
    const rainGeo=geo(new T.BufferGeometry());rainPositions=new Float32Array(240*6);
    rainGeo.setAttribute('position',new T.BufferAttribute(rainPositions,3));
    const rainMat=new T.LineBasicMaterial({color:'#c5d8e1',transparent:true,opacity:.2,depthWrite:false});
    // Track via geo resource callback (all registered disposable resources).
    geo(rainMat);rain=new T.LineSegments(rainGeo,rainMat);rain.frustumCulled=false;scene.add(rain);
  }
  return {wet,update(time,center,reduced){wind.value=reduced?0:time;
    if(rain){rain.visible=!reduced;for(let i=0;i<240;i++){const n=i*6,x=center-18+(i*7.83)%36,y=18-((time*13+i*.71)%18),z=-trackHalf+(i*1.37)%(trackHalf*2);rainPositions.set([x,y,z,x-.1,y-.6,z],n);}rain.geometry.attributes.position.needsUpdate=true;}
  }};
}
