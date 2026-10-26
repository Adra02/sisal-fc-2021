// Subtle grass particles only at real, low ball contacts. No new physics/network work.
import * as T from './vendor/three.module.min.js';
export function contactEffects(scene,own){
 const g=own(new T.PlaneGeometry(.025,.075)),m=own(new T.MeshStandardMaterial({color:'#a2a86b',roughness:1,side:T.DoubleSide})),mesh=new T.InstancedMesh(g,m,96),dummy=new T.Object3D();mesh.name='contact-grass';mesh.frustumCulled=false;mesh.count=0;scene.add(mesh);
 const cameraRight=new T.Vector3();
 return {update(frame,camera,quality){let n=0;if(quality>0){cameraRight.setFromMatrixColumn(camera.matrixWorld,0);for(const e of frame.events||[]){const age=frame.t-e.at;if(age<0||age>.55||e.pos[1]>.3||!['shot','outsideShot','chip','pass','outsidePass','heelPass','touch','penalty','freeKick'].includes(e.type)||Math.abs(e.pos[0])>17||Math.abs(e.pos[2])>26)continue;for(let j=0;j<5&&n<96;j++){const seed=(Math.imul(e.id*7+j+1,2654435761)>>>0)/4294967296,a=seed*Math.PI*2,speed=.35+seed*.75,y=.03+(1.3+seed)*age-4.9*age*age;if(y<.02)continue;dummy.position.set(e.pos[0]+Math.cos(a)*age*speed,y,e.pos[2]+Math.sin(a)*age*speed);dummy.rotation.set(age*8+j,a,age*6+j);dummy.scale.setScalar(1-age/.65);dummy.updateMatrix();mesh.setMatrixAt(n++,dummy.matrix);}}}mesh.count=n;mesh.instanceMatrix.needsUpdate=true;},dispose(){mesh.dispose();mesh.removeFromParent();}};
}
