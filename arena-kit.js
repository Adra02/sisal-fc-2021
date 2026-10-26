// Arena-only football clothing; saved identity and body proportions stay unchanged.
import * as T from './vendor/three.module.min.js';
export function footballKit(model,s,personalMap){
 const mats=model.body.material,shirt=mats[0],pants=mats[1],boots=mats[2],hands=mats[3],original=shirt.color.clone(),maps=new Map(),geometries=new Set();let state='',team=null,keeper=false;
 boots.color.set('#fff');boots.vertexColors=true;boots.roughness=.62;pants.color.set('#fff');pants.vertexColors=true;pants.roughness=.93;shirt.sheen=.30;shirt.roughness=.83;hands.bumpScale=.00006;
 const skin=new T.Color(s.skinColor),shoe=new T.Color('#17241c'),sock=new T.Color('#ecefe2');
 function paint(g){const p=g.getAttribute('position'),colors=new Float32Array(p.count*3),shorts=new T.Color(team==null?s.breechesColor:team===0?'#123e2a':'#f0ebd5'),band=new T.Color(team===1?'#bd943e':'#207044');for(let i=0;i<p.count;i++){const y=p.getY(i),c=y<-.86?shoe:keeper?shorts:y<-.55?(y>-.62&&y<-.58?band:sock):y<-.32?skin:shorts;colors.set([c.r,c.g,c.b],i*3);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));}
 function colorGeometry(g){geometries.add(g);paint(g);}
 colorGeometry(model.body.geometry);
 function shirtMap(value){if(maps.has(value))return maps.get(value);const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle=value===0?'#128249':'#dfb64f';x.fillRect(0,0,512,512);for(let i=0;i<512;i+=64){x.fillStyle=value===0?'#196b42':'#c9a044';x.fillRect(i,0,30,512);}x.fillStyle=value===0?'#d6e9bf':'#1a452f';x.fillRect(0,96,512,7);x.globalAlpha=.08;x.fillStyle='#fff';for(let i=0;i<512;i+=3)x.fillRect(0,i,512,1);x.globalAlpha=.09;x.strokeStyle='#122e24';x.lineWidth=1;for(let i=0;i<512;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i,512);x.stroke();}const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;maps.set(value,tx);return tx;}
 function update(p){const next=(p.team??'training')+':'+!!(p.goalkeeper||p.keeper||p.bot);if(next===state)return;state=next;team=p.team;keeper=!!(p.goalkeeper||p.keeper||p.bot);
  shirt.color.copy(original);shirt.map=team==null?personalMap:shirtMap(team);shirt.needsUpdate=true;hands.color.set(keeper?s.glovesColor:s.skinColor);hands.roughness=keeper?.61:.84;for(const g of geometries)paint(g);
 }
 return {colorGeometry,update,dispose(){for(const tx of new Set([personalMap,...maps.values()]))tx.dispose();}};
}
