// Arena-only football clothing; saved identity and body proportions stay unchanged.
import * as T from './vendor/three.module.min.js';
export function footballKit(model,s,personalMap){
 const mats=model.body.material,shirt=mats[0],pants=mats[1],boots=mats[2],hands=mats[3],original=shirt.color.clone(),maps=new Map(),geometries=new Set();let state='',team=null,keeper=false;
 boots.color.set('#fff');boots.vertexColors=true;boots.roughness=.66;pants.color.set('#fff');pants.vertexColors=true;pants.roughness=.93;shirt.sheen=.18;shirt.roughness=.88;shirt.bumpScale=.00065;hands.bumpScale=.00006;
 const skin=new T.Color(s.skinColor),shoe=new T.Color('#17241c'),sock=new T.Color('#ecefe2');
 const uniforms={arenaShorts:{value:new T.Color()},arenaSkin:{value:skin},arenaShoe:{value:shoe},arenaSock:{value:sock},arenaBand:{value:new T.Color()},arenaKeeper:{value:0}};
 // Interpolating green/skin/white vertex colours produced dirty triangular
 // patches across the knees. Evaluate the hem in rest space per fragment;
 // the same rest coordinate follows skinning, with a narrow anti-aliased edge.
 for(const m of [pants,boots]){m.customProgramCacheKey=()=> 'sisal-arena-kit-12';m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float arenaRestY; varying float vArenaRestY;').replace('#include <begin_vertex>','#include <begin_vertex>\nvArenaRestY = arenaRestY;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vArenaRestY; uniform vec3 arenaShorts,arenaSkin,arenaShoe,arenaSock,arenaBand; uniform float arenaKeeper;').replace('#include <color_fragment>',`#include <color_fragment>
   vec3 kitColour = mix(arenaShoe, arenaSock, smoothstep(-.862, -.858, vArenaRestY));
   kitColour = mix(kitColour, arenaSkin, smoothstep(-.552, -.548, vArenaRestY));
   kitColour = mix(kitColour, arenaShorts, smoothstep(-.322, -.318, vArenaRestY));
   float cuff = smoothstep(-.622, -.618, vArenaRestY) * (1.0 - smoothstep(-.582, -.578, vArenaRestY));
   kitColour = mix(kitColour, arenaBand, cuff);
   if (arenaKeeper > .5) kitColour = mix(arenaShoe, arenaShorts, smoothstep(-.862, -.858, vArenaRestY));
   diffuseColor.rgb = kitColour;
  `);
 };}
 function paint(g){const p=g.getAttribute('position'),colors=new Float32Array(p.count*3),shorts=new T.Color(team==null?s.breechesColor:team===0?'#123e2a':'#f0ebd5'),band=new T.Color(team===1?'#bd943e':'#207044');for(let i=0;i<p.count;i++){const y=p.getY(i),c=y<-.86?shoe:keeper?shorts:y<-.55?(y>-.62&&y<-.58?band:sock):y<-.32?skin:shorts;colors.set([c.r,c.g,c.b],i*3);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));}
 function colorGeometry(g){geometries.add(g);const p=g.getAttribute('position');g.setAttribute('arenaRestY',new T.Float32BufferAttribute(Array.from({length:p.count},(_,i)=>p.getY(i)),1));paint(g);}
 colorGeometry(model.body.geometry);
 function shirtMap(value){if(maps.has(value))return maps.get(value);const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=value===0?'#14764a':'#d6b361';x.fillRect(0,0,256,256);x.fillStyle=value===0?'#196f49':'#cdae60';for(let i=0;i<256;i+=32)x.fillRect(i,0,16,256);x.fillStyle=value===0?'#cedcb4':'#214b39';x.fillRect(0,48,256,3);x.globalAlpha=.055;x.fillStyle='#fff';for(let i=0;i<256;i+=2)x.fillRect(0,i,256,1);x.globalAlpha=1;const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;maps.set(value,tx);return tx;}
 // A small physical chest badge and the saved personal number follow the
 // torso. They don't rely on the old riding-silks UV layout looking like a kit.
 const chest=model.skeleton.bones.find(b=>b.name==='chest'),decalCanvas=document.createElement('canvas');decalCanvas.width=128;decalCanvas.height=192;const d=decalCanvas.getContext('2d');d.fillStyle='#eee6c9';d.beginPath();d.moveTo(25,14);d.lineTo(103,14);d.lineTo(99,92);d.quadraticCurveTo(64,135,29,92);d.closePath();d.fill();d.fillStyle='#174e35';d.font='900 48px sans-serif';d.textAlign='center';d.fillText('S',64,79);d.font='700 17px sans-serif';d.fillText('2021',64,108);const badgeMap=new T.CanvasTexture(decalCanvas);badgeMap.colorSpace=T.SRGBColorSpace;
 const badge=new T.Mesh(new T.PlaneGeometry(.075,.105),new T.MeshStandardMaterial({map:badgeMap,transparent:true,alphaTest:.1,roughness:.90,polygonOffset:true,polygonOffsetFactor:-2}));badge.name='arena-embroidered-badge';badge.rotation.y=Math.PI/2;badge.position.set(.144,-.12,-.105);chest.add(badge);
 const numberCanvas=document.createElement('canvas');numberCanvas.width=256;numberCanvas.height=256;const n=numberCanvas.getContext('2d');n.fillStyle='#efedd8';n.textAlign='center';n.font='900 174px sans-serif';n.fillText(String(s.number||'').slice(0,2),128,191);const numberMap=new T.CanvasTexture(numberCanvas);numberMap.colorSpace=T.SRGBColorSpace;
 const number=new T.Mesh(new T.PlaneGeometry(.23,.23),new T.MeshStandardMaterial({map:numberMap,transparent:true,alphaTest:.1,roughness:.94,polygonOffset:true,polygonOffsetFactor:-2}));number.name='arena-shirt-personal-number';number.visible=!!s.number;number.rotation.y=-Math.PI/2;number.position.set(-.110,-.11,0);chest.add(number);
 function update(p){const next=(p.team??'training')+':'+!!(p.goalkeeper||p.keeper||p.bot);if(next===state)return;state=next;team=p.team;keeper=!!(p.goalkeeper||p.keeper||p.bot);
  shirt.color.copy(original);shirt.map=team==null?personalMap:shirtMap(team);shirt.needsUpdate=true;hands.color.set(keeper?s.glovesColor:s.skinColor);hands.roughness=keeper?.61:.84;for(const g of geometries)paint(g);
  uniforms.arenaShorts.value.set(team==null?s.breechesColor:team===0?'#123e2a':'#e9e4d3');uniforms.arenaBand.value.set(team===1?'#bd943e':'#207044');uniforms.arenaKeeper.value=keeper?1:0;
 }
 return {colorGeometry,update,dispose(){for(const tx of new Set([personalMap,...maps.values()]))tx.dispose();}};
}
