// Arena-only football clothing. The saved face, hair, helmet and proportions stay intact.
import * as T from './vendor/three.module.min.js';
export function footballKit(model,s,personalMap){
 const {body}=model,mats=body.material,shirt=mats[0],pants=mats[1],boots=mats[2],hands=mats[3];
 const original={shirt:shirt.color.clone(),pants:pants.color.clone(),hands:hands.color.clone()},maps=new Map();
 boots.color.set('#fff');boots.vertexColors=true;boots.roughness=.66;hands.bumpScale=.00007;
 function colorGeometry(g){const p=g.getAttribute('position'),colors=new Float32Array(p.count*3),sock=new T.Color('#edf0df'),shoe=new T.Color('#17251e');for(let i=0;i<p.count;i++){const c=p.getY(i)>-.855?sock:shoe;colors.set([c.r,c.g,c.b],i*3);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));}
 colorGeometry(body.geometry);
 function shirtMap(team){if(maps.has(team))return maps.get(team);const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=team===0?'#16824a':'#dfb34b';x.fillRect(0,0,256,256);x.fillStyle=team===0?'#125b38':'#b78a30';for(let i=0;i<256;i+=32)x.fillRect(i,0,16,256);x.fillStyle=team===0?'#cbe8d1':'#173d2a';x.fillRect(0,49,256,5);x.globalAlpha=.12;x.fillStyle='#fff';for(let i=0;i<256;i+=4)x.fillRect(0,i,256,1);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;maps.set(team,tx);return tx;}
 let state='';function update(p){const next=(p.team??'training')+':'+!!p.keeper;if(next===state)return;state=next;
  shirt.color.copy(original.shirt);shirt.map=p.team==null?personalMap:shirtMap(p.team);shirt.needsUpdate=true;
  pants.color.copy(p.team==null?original.pants:new T.Color(p.team===0?'#143f2c':'#f0ecd8'));
  hands.color.set(p.keeper?s.glovesColor:s.skinColor);hands.roughness=p.keeper?.61:.84;
 }
 // Textures currently assigned to a body are disposed with its tree; the other variants are here.
 return {colorGeometry,update,dispose(){for(const tx of new Set([personalMap,...maps.values()]))tx.dispose();}};
}
