export class FakeRenderer {
 constructor(){this.domElement=document.createElement('canvas-view');this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};this.info={render:{calls:0,triangles:0}};this.disposed=false;}
 setPixelRatio(){}setSize(){}render(scene,camera){globalThis.__raceInspect?.(scene,this.domElement.parentNode,camera);scene.updateMatrixWorld();let calls=0,triangles=0;scene.traverse(o=>{if(o.isMesh&&o.visible){calls++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position?.count||0)/3*(o.isInstancedMesh?o.count:1);}});this.info.render={calls,triangles};}
 dispose(){this.disposed=true}forceContextLoss(){}
}
