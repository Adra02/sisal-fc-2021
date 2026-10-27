/* Same saved identity and common proportions as the personal jockey. Locomotion
   is driven by distance along the shared path, with a planted-foot stance. */
import * as T from './vendor/three.module.min.js';
import {createJockey} from './jockey-model.js?v=studio-9';
import {styleColors,paintSilks} from './horse-style.js?v=studio-9';
import {material,mesh,disposeTree} from './studio-geometry.js?v=studio-9';
import distantBody from './assets/studio/arena-body-lod.js?v=arena-11';
import {footballKit} from './arena-kit.js?v=arena-11';
import {skillBodyPose} from './arena-skill-pose.js?v=arena-11';
import {footballGeometry,athleteFinish} from './arena-athlete.js?v=arena-11';
const clamp=T.MathUtils.clamp,TAU=Math.PI*2,scale=.86;
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const axis=new T.Vector3(),bend=new T.Vector3();
function joint(a,b,l1,l2,pole,out){axis.subVectors(b,a);const d=clamp(axis.length(),.015,l1+l2-.0001);axis.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d);bend.copy(pole).addScaledVector(axis,-pole.dot(axis)).normalize();return out.copy(a).addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));}
export function makeAvatar(player,quality=1){
 const s=styleColors(player.appearance),root=new T.Group();root.name='arena-player-'+(player.key||'');
 const c=document.createElement('canvas');c.width=c.height=256;paintSilks(c.getContext('2d'),256,256,s);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
 const model=createJockey({custom:s,standing:true,detail:quality ? .65 : .30,silk:material('#fff',{map:tx})});
 const {rider,head,skeleton,body}=model;body.material.push(material(s.skinColor,{roughness:.77}));footballGeometry(body.geometry);const kit=footballKit(model,s,tx),finish=athleteFinish(model);rider.scale.setScalar(scale);rider.position.y=.94*scale+.055;root.add(rider);
 const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(distantBody.position,3));lg.setIndex(distantBody.index);lg.setAttribute('skinIndex',new T.Uint16BufferAttribute(distantBody.skinIndex,4));lg.setAttribute('skinWeight',new T.Float32BufferAttribute(distantBody.skinWeight,4));const luv=[];for(let i=0;i<distantBody.position.length;i+=3)luv.push((distantBody.position[i+2]+.62)/1.24,(distantBody.position[i+1]+1.1)/2.1);lg.setAttribute('uv',new T.Float32BufferAttribute(luv,2));lg.computeVertexNormals();let start=0,last=distantBody.materials[0];for(let i=1;i<=distantBody.materials.length;i++)if(distantBody.materials[i]!==last){lg.addGroup(start*3,(i-start)*3,last);start=i;last=distantBody.materials[i];}const lowBody=new T.SkinnedMesh(lg,body.material);lowBody.name='arena-body-distant';lowBody.bind(skeleton,body.bindMatrix);lowBody.castShadow=lowBody.receiveShadow=true;rider.add(lowBody);lowBody.visible=false;
 footballGeometry(lg);kit.colorGeometry(lg);const rig=rider.userData.arenaRig;let fullDetail=true;const fibres=[];rider.traverse(o=>{if(o.name.includes('fibres'))fibres.push(o)});
 const stainCanvas=document.createElement('canvas');stainCanvas.width=stainCanvas.height=64;const dc=stainCanvas.getContext('2d');for(let i=0;i<55;i++){dc.fillStyle=`rgba(57,85,32,${.12+(i%4)*.06})`;dc.beginPath();dc.ellipse(32+Math.sin(i*19)*21,32+Math.cos(i*13)*20,2+i%6,1+i%4,i,0,TAU);dc.fill();}
 const stainMap=new T.CanvasTexture(stainCanvas);stainMap.colorSpace=T.SRGBColorSpace;
 const thigh=skeleton.bones.find(b=>b.name==='lHip'),stain=mesh(thigh,new T.PlaneGeometry(.14,.20),material('#fff',{map:stainMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),'arena-grass-stain');stain.rotation.y=Math.PI/2;stain.position.set(.082,-.22,0);stain.castShadow=false;
 const wrist=skeleton.bones.find(b=>b.name==='rWrist'),drink=new T.Group();wrist.add(drink);mesh(drink,new T.CylinderGeometry(.028,.033,.14,12),material('#8dbea2',{roughness:.35}),'arena-water-bottle').position.y=.065;mesh(drink,new T.CylinderGeometry(.016,.016,.02,10),material('#e4eae3'),'bottle-cap').position.y=.145;drink.visible=false;
 const targets={pelvis:[0,0,0],chest:[0,.49,0]};for(const side of ['l','r'])for(const bone of ['Hip','Knee','Ankle','Shoulder','Elbow','Wrist'])targets[side+bone]=[0,0,0];
 const hip=new T.Vector3(),foot=new T.Vector3(),knee=new T.Vector3(),shoulder=new T.Vector3(),hand=new T.Vector3(),elbow=new T.Vector3(),poleLeg=new T.Vector3(),poleArm=new T.Vector3(),baseHand=new T.Vector3();
 const inverseRoot=new T.Quaternion(),inverseRider=new T.Quaternion(),effector=new T.Vector3(),surfacePoint=new T.Vector3();
 function localEffector(world,out){return out.set(...world).sub(root.position).applyQuaternion(inverseRoot).sub(rider.position).applyQuaternion(inverseRider).divideScalar(scale);}
 let previous=null,previousTime=null,lastFaceTick=-1;const planted={l:null,r:null},wasStance={l:false,r:false};
 function update(p,time,dt,velocity){
  const delta=time-(previousTime??time),v=p.velocity||velocity||[delta>0&&delta<.5?(p.pos[0]-(previous?.[0]??p.pos[0]))/delta:0,delta>0&&delta<.5?(p.pos[1]-(previous?.[1]??p.pos[1]))/delta:0];
  const speed=Math.min(7,Math.hypot(...v)),pivot=p.pivot||0,moving=speed>.04||pivot>.12,heading=p.heading??Math.atan2(p.look[0]-p.pos[0],p.look[1]-p.pos[1]);
  root.position.set(p.pos[0],p.elevation||0,p.pos[1]);const targetYaw=heading-Math.PI/2,yaw=!p.preciseMotion&&previousTime!=null&&delta>0&&delta<.25?root.rotation.y+Math.atan2(Math.sin(targetYaw-root.rotation.y),Math.cos(targetYaw-root.rotation.y))*(1-Math.exp(-delta*11)):targetYaw;root.rotation.set(0,yaw,0);
  const actionTime=p.actionTime??time;
  const sourceGesture=p.gesture||'idle',g=({pass:'kick',shot:'kick',cross:'kick',save:'dive',tackle:'slide',fall:'stumble',standFromSeat:'sit'})[sourceGesture]||sourceGesture,shortKick=sourceGesture==='pass',ph=clamp(p.phase||0,0,1),seed=((p.personality||0)%997)/997*5.3,cycleBase=p.stepCycle??time*(moving?speed/.98:0),sitting=['sit','seatedTrap'].includes(g);
  const gestureWeight=sourceGesture==='standFromSeat'?1-ease(ph):Math.min(ease(ph*7),ease((1-ph)*7)),moveWeight=clamp(Math.max(speed,pivot*.20)/.55,0,1),runWeight=clamp((speed-1.4)/2.2,0,1),stanceFraction=.62-.22*runWeight;
  const acceleration=p.acceleration||[0,0],drive=acceleration[0]*Math.sin(heading)+acceleration[1]*Math.cos(heading),turnLean=clamp((p.turnRate||0)*speed*.018,-.11,.11);
  let lower=.065*moveWeight+.065*runWeight,lean=clamp(speed/6,0,1)*.15+clamp(drive*.012,-.075,.10);
  if(['bend','collect','inspect','breath','laugh','bow'].includes(g))lean+={bend:.68,collect:.40,inspect:.10,breath:.24,laugh:.16,bow:.65}[g]*gestureWeight;
  if(g==='laces'){lower=.43*gestureWeight;lean=.55*gestureWeight;}
  if(sitting){lower=.30*(p.seatBlend??gestureWeight);lean=.07;}
  let ballHandling=1;
  if(['collect','placeBall'].includes(g)&&p.handTarget){const age=actionTime-(p.gestureStart??actionTime),reach=clamp((1-p.handTarget[1])/.86,0,1),entry=g==='collect'?ease(age/.25):1,exit=g==='placeBall'?1-ease((age-.60)/.35):1;ballHandling=Math.min(entry,exit);lean=reach*1.10*ballHandling;lower=.62*reach*ballHandling;}
  if(g==='header'){lean-=Math.sin(ph*Math.PI)*.13;if(!p.preciseMotion)root.position.y+=(p.jumpHeight||.12)*Math.sin(ph*Math.PI);}
  if(['slide','getUp'].includes(g)){const f=g==='slide'?ease(ph):1-ease(ph);lower=.58*f;lean=-.36*f;}
  if(g==='dive'){const f=Math.sin(ph*Math.PI),low=p.preciseMotion?clamp((1.1-(p.handTarget?.[1]??.8)),0,1):0;lower=(p.preciseMotion?.18+.45*low:.42)*f;if(!p.preciseMotion)root.rotation.z=f*.65;}
  if(g==='stumble')root.rotation.z=Math.sin(ph*Math.PI*4)*.10*gestureWeight;
  if(p.preciseMotion&&sourceGesture==='save'){const side=p.diveSide||1,roll=side*(Math.sin(yaw)<0?-1:1)*(.45+.40*clamp(1.1-(p.handTarget?.[1]??.8),0,1))*gestureWeight;root.rotation.set(roll,yaw,0,'YXZ');root.position.y=p.elevation||0;}
  if(p.preciseMotion&&sourceGesture==='fall'){lower=.38*gestureWeight;lean=.42*gestureWeight;root.rotation.set(.55*gestureWeight,yaw,0,'YXZ');}
  const skill=skillBodyPose(g,ph,p.diveSide||1,p.strength??1),strikeFoot=p.foot??1;
  if(strikeFoot<0&&skill.legs){const {r,l}=skill.legs;skill.legs={r:l?[l[0],l[1],-l[2]]:undefined,l:r?[r[0],r[1],-r[2]]:undefined};}
  const bodyTwist=clamp((p.turnRate||0)*.025,-.075,.075),shield=p.shielding?.70:0;
  rider.rotation.set(skill.rotation[0]+turnLean+(p.braceSide||0)*(p.brace||0)*.12,skill.rotation[1]+bodyTwist,skill.rotation[2]);rider.position.y=.94*scale+.055+skill.drop;lean+=skill.lean+shield*.10;
  inverseRoot.copy(root.quaternion).invert();inverseRider.copy(rider.quaternion).invert();
  kit.update(p);root.userData.team=p.team??null;
  // Path distances are metres; the rig is scaled, so compensate in rig space.
  const stride=(p.strideLength||1.1)/scale,bob=moving?Math.sin((cycleBase+seed)*TAU*2)*(.008+.008*clamp(speed/4,0,1)):Math.sin(time*1.6+seed)*.0015;
  // Lower the weight-bearing pelvis when the stride needs it, rather than
  // shortening a planted leg target and sliding its boot along the grass.
  if(['idle','walk','run','keeper','dribble'].includes(g)&&!sitting){for(const sign of [-1,1]){const cycle=((cycleBase+seed+(sign>0?.5:0))%1+1)%1;if(cycle>=stanceFraction)continue;const x=(stanceFraction/2-cycle)*stride*moveWeight,horizontal=x*x+(.024*.024),vertical=Math.sqrt(Math.max(.01,.887*.887-horizontal));lower=Math.max(lower,.89-vertical+bob);}}
  targets.pelvis[0]=0;targets.pelvis[1]=-lower+bob;targets.pelvis[2]=Math.sin((cycleBase+seed)*TAU)*.006*moveWeight;
  targets.chest[0]=Math.sin(lean)*.49;targets.chest[1]=Math.cos(lean)*.49-lower+bob;targets.chest[2]=-targets.pelvis[2]*.5;
  const moveAngle=speed>.001?Math.atan2(v[0],v[1])-heading:0,dx=Math.cos(moveAngle),dz=-Math.sin(moveAngle);
  for(const [side,sign]of [['l',-1],['r',1]]){
   const cycle=((cycleBase+seed+(sign>0?.5:0))%1+1)%1,stance=cycle<stanceFraction,fx=moveWeight*(stance?(stanceFraction/2-cycle)*stride:(-stanceFraction/2+stanceFraction*ease((cycle-stanceFraction)/(1-stanceFraction)))*stride),lift=moving&&!stance?Math.sin((cycle-stanceFraction)/(1-stanceFraction)*Math.PI)*(.035+.065*clamp(speed/.6,0,1)+.08*clamp(speed/4,0,1)):0;
   hip.set(0,-.05-lower+bob,sign*.106);foot.set(dx*fx,-.94+lift,sign*.13+dz*fx);
   if(skill.legs?.[side])foot.lerp(new T.Vector3(...skill.legs[side]),gestureWeight);
   const gaitOnly=['idle','walk','run','keeper','dribble'].includes(g)&&(!p.footTarget||sign!==strikeFoot),lockable=gaitOnly&&!sitting&&stance&&moving;
   if(lockable){if(!wasStance[side]||!planted[side]||delta<0||delta>.3){const point=foot.clone().multiplyScalar(scale).applyQuaternion(rider.quaternion).add(rider.position).applyQuaternion(root.quaternion).add(root.position);point.y=.055;planted[side]=point;}
    const fixed=localEffector(planted[side].toArray(),effector);if(fixed.distanceTo(hip)<.91){const weight=Math.min(ease(cycle/.08),ease((stanceFraction-cycle)/.08));foot.lerp(fixed,weight);}else planted[side]=null;
   }else planted[side]=null;wasStance[side]=lockable;
   if(sign===strikeFoot){
    if(g==='kick'||g==='heel'||g==='volley'){const age=actionTime-(p.contact??actionTime),wind=shortKick?.17:.23,back=shortKick?.17:.26,follow=shortKick?.34:.53,snap=age<0?-back*Math.sin(clamp((age+wind)/wind,0,1)*Math.PI/2):age<.12?-back+(back+follow)*ease(age/.12):follow*(1-ease((age-.12)/.34));foot.x=(g==='heel'?-1:1)*snap;foot.y+=g==='volley'?.48/scale*gestureWeight:(shortKick?.09:.16)*Math.sin(ph*Math.PI);}
    if(g==='trap'){foot.x=.35*gestureWeight;foot.y+=.07*gestureWeight;}
    if(p.footTarget&&['kick','heel','outside','chip','bicycle','scissor','volley','trap','soleRoll','dribble','thigh'].includes(g)){const target=localEffector(p.footTarget,effector);target.x-=(g==='heel'?-.065:.26)/scale;target.y-=.025/scale;const contact=p.contact??actionTime,w=Math.min(ease((actionTime-contact+.22)/.18),1-ease((actionTime-contact-.05)/.30));foot.lerp(target,w);}
    if(g==='juggle'){const u=((actionTime-(p.gestureStart??10))/1.35%1+1)%1;foot.x=.30;foot.y+=.04+.15*Math.max(0,Math.sin(u*TAU));}
    if(g==='sole'||g==='lookBoot'){foot.x=.33;foot.y+=g==='sole'?.15:.30;}
   }
   if(sign!==strikeFoot&&p.footTarget&&['kick','heel','volley','outside','chip'].includes(g)){const target=localEffector(p.footTarget,effector);target.x-=.27/scale;target.z+=sign*.24/scale;target.y=(.055-root.position.y-rider.position.y)/scale;const contact=p.contact??actionTime,w=Math.min(ease((actionTime-contact+.32)/.26),1-ease((actionTime-contact-.10)/.36));foot.lerp(target,w);}
   if(g==='nutmeg')foot.z=sign*(.13+.19*gestureWeight);
   if(g==='block')foot.z=sign*.075;
   if(sitting){foot.x=foot.x*(1-gestureWeight)+.43*gestureWeight;foot.y=foot.y*(1-gestureWeight)-.93*gestureWeight;if(sign>0&&g==='seatedTrap')foot.x+=.08*gestureWeight;}
   if(g==='laces')foot.x=.30;
   if(g==='slide')foot.x=sign>0?.64:.34;
   if(skill.legs){surfacePoint.copy(foot).multiplyScalar(scale).applyQuaternion(rider.quaternion).add(rider.position).applyQuaternion(root.quaternion).add(root.position);if(surfacePoint.y<.04){surfacePoint.y=.04;foot.copy(localEffector(surfacePoint.toArray(),effector));}}
   const reach=foot.clone().sub(hip);if(reach.length()>.895)foot.copy(hip).addScaledVector(reach,.895/reach.length());
   poleLeg.set(1,0,sign*.10);joint(hip,foot,.43,.47,poleLeg,knee);
   hip.toArray(targets[side+'Hip']);knee.toArray(targets[side+'Knee']);foot.toArray(targets[side+'Ankle']);
   shoulder.set(targets.chest[0],targets.chest[1],sign*.207);hand.set(-dx*fx*.58,-.10-lower,sign*.24-dz*fx*.28);baseHand.copy(hand);
   if(['arms','celebrate'].includes(g))hand.lerp(new T.Vector3(0,.99-lower,sign*.43),gestureWeight);
   if(['salute','wave','call','highFive','crowd'].includes(g)&&sign>0)hand.set(.12,.79-lower,g==='crowd'?.57:.22);
   if(['shrug','dodge','stumble','balance'].includes(g))hand.set(.12,.24-lower,sign*.48);
   if((p.brace||0)>.08&&!p.handTarget&&!p.footTarget)hand.lerp(new T.Vector3(.12,.16-lower,sign*.39),Math.min(.8,p.brace*1.3));
   if(['point','referee','explain','search'].includes(g)&&sign>0)hand.set(.49,.46-lower,.24);
   if(['handsHips','freeze'].includes(g))hand.set(.10,.05-lower,sign*.22);
   if(g==='keeper')hand.set(.13,.03-lower,sign*.35);
   if(p.shielding&&!p.handTarget)hand.lerp(new T.Vector3(.12,.16-lower,sign*.43),.75);
   if(['clap','pat'].includes(g))hand.set(.40,.34-lower,sign*(.045+.07*Math.abs(Math.sin(time*6))));
   if(g==='cover')hand.set(.18,.67-lower,sign*.075);
   if(g==='drink'&&sign>0)hand.set(.18,.70-lower,.05);
   if(g==='hair'&&sign>0)hand.set(.02,.91-lower,.07);
   if(['inspect','collect'].includes(g))hand.set(.39,.12-lower,sign*.10);
   if(g==='hide')hand.set(-.16,-.03-lower,sign*.07);
   if(g==='laces')hand.set(.34,-.70,sign*.08);
   if(g==='breath')hand.set(.27,-.38-lower,sign*.14);
   if(g==='laugh')hand.set(.29,.10-lower,sign*.14);
   if(g==='chest')hand.set(.08,.25-lower,sign*.40);
   if(g==='dive')hand.set(.42,.73-lower,sign*.26);
   if(sitting)hand.set(.31,.09-lower,sign*.16);
   if(skill.arms?.[side])hand.lerp(new T.Vector3(...skill.arms[side]),gestureWeight);
   if(p.handTarget&&['collect','placeBall','carryBall','carryEquipment','throw','throwIn'].includes(g)){const target=localEffector(p.handTarget,effector);target.z+=sign*.10/scale;target.x-=.03/scale;hand.copy(target);const reach=hand.clone().sub(shoulder);if(reach.length()>.60)hand.copy(shoulder).addScaledVector(reach,.60/reach.length());if(['collect','placeBall'].includes(g))hand.lerp(baseHand,1-ballHandling);if(['throw','throwIn'].includes(g))hand.lerp(baseHand,1-gestureWeight);}
   if(p.handTarget&&sourceGesture==='save'){const target=localEffector(p.handTarget,effector);target.z+=sign*.22/scale;target.x-=.20/scale;const contact=p.contact??actionTime,w=Math.min(ease((actionTime-contact+.4)/.25),1-ease((actionTime-contact-.20)/.45));hand.lerp(target,w);const reach=hand.clone().sub(shoulder);if(reach.length()>.61)hand.copy(shoulder).addScaledVector(reach,.61/reach.length());}
   if(g!=='keeper'&&!sitting&&!(p.handTarget&&['save','collect','placeBall','carryBall','carryEquipment','throw','throwIn'].includes(sourceGesture)))hand.lerp(baseHand,1-gestureWeight);
   if(p.shielding&&!p.handTarget&&!sitting)hand.lerp(new T.Vector3(.10,.13-lower,sign*.40),.72);
   if(p.signal&&sign>0&&!p.handTarget&&!p.footTarget&&!sitting){const u=clamp((actionTime-p.signal.at)/Math.max(.01,p.signal.until-p.signal.at),0,1),weight=Math.sin(u*Math.PI)*.72;hand.lerp(new T.Vector3(.43,.33-lower,.27),weight);}
   poleArm.set(-.45,0,sign);joint(shoulder,hand,.31,.30,poleArm,elbow);
   shoulder.toArray(targets[side+'Shoulder']);elbow.toArray(targets[side+'Elbow']);hand.toArray(targets[side+'Wrist']);
  }
  rig(targets);
  const ankle=skeleton.bones.find(b=>b.name===(strikeFoot>0?'rAnkle':'lAnkle'));if(ankle&&g==='outside')ankle.rotation.y+=strikeFoot*.42*gestureWeight;if(ankle&&g==='chip')ankle.rotation.z-=.28*gestureWeight;
  if(['walk','run','idle','dribble'].includes(g)&&moving){for(const [side,offset]of [['l',0],['r',.5]]){const phase=((cycleBase+seed+offset)%1+1)%1,bone=skeleton.bones.find(b=>b.name===side+'Ankle');if(bone&&phase>stanceFraction)bone.rotation.z+=Math.sin((phase-stanceFraction)/(1-stanceFraction)*Math.PI)*.12*moveWeight;}}
  stain.visible=!!p.dirty;drink.visible=g==='drink';
  if(fullDetail){rider.userData.idle(time+seed,{x:0,y:0},false);const tick=Math.floor(time*12);if(tick!==lastFaceTick){lastFaceTick=tick;const emote=p.speaking?'talk':['laugh','celebrate','clap','arms'].includes(g)?'grin':['kick','trap','block','keeper'].includes(g)?'focused':null;head.userData.expression?.(emote,emote?(emote==='talk'?.30+.45*Math.abs(Math.sin(actionTime*9+seed)):gestureWeight*(emote==='grin'?.65:.35)):0);}}
  const lookAngle=Math.atan2(p.look[0]-p.pos[0],p.look[1]-p.pos[1])-heading;
  head.rotation.z=lean*.18+(p.speaking?Math.sin(actionTime*3+seed)*.018:0);head.rotation.y=clamp(Math.atan2(Math.sin(lookAngle),Math.cos(lookAngle)),-.65,.65)+(g==='laugh'?Math.sin(time*6)*.03:0);
  previous=p.pos;previousTime=time;root.userData.gesture=g;root.userData.stepCycle=cycleBase;
 }
 return {root,update,head,model,limbs:skeleton.bones,setDetail:full=>{fullDetail=full;body.layers.set(full?0:1);lowBody.visible=!full;finish.detail(full);for(const o of fibres)o.visible=full;},dispose:()=>{disposeTree(root);kit.dispose();}};
}
