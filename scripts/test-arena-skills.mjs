import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createCanvas} from '@napi-rs/canvas';
import * as T from '../vendor/three.module.min.js';
import {createWorld,worldContext,stepWorld,captureWorld} from '../arena-world.js';
import {makeAvatar} from '../arena-avatar.js';
import {TECHNIQUES} from '../arena-technique-data.js';
import {supportTarget,onside,trackReceiver} from '../arena-tactics.js';
import {offsideAtRelease} from '../arena-laws.js';
import {releaseBall,stepBalls} from '../arena-world-ball.js';
import {tryAerial,stepTechniques} from '../arena-techniques.js';
import {hash} from '../arena-motion.js';
const roster=n=>Array.from({length:n},(_,i)=>({key:'p'+i,name:'P'+i,games:i,appearance:{}}));
const w=createWorld(roster(6));w.players.forEach((p,i)=>{p.team=p.bot?(p.key==='__keeper_bot'?0:1):i<3?0:1;p.x=(i%3)*3;p.z=p.team===0?-18:-10;});w.match={ball:'ball-0'};const b=w.balls[0];Object.assign(b,{x:0,z:-8,y:.11});const p=w.players[0],q=w.players[1];p.z=-8;
assert(!onside(w,q,b));const target=supportTarget(w,q,b,[4,-22]);assert(target[1]>-10,'support stays behind second-last defender');q.z=target[1];assert(onside(w,q,b));assert(!offsideAtRelease(w,p,b,'pass').includes(q.key),'law remains active, movement changed');q.z=-20;assert(offsideAtRelease(w,p,b,'pass').includes(q.key));
const k={receiver:q.key,type:'pass',target:[q.x,.11,q.z],stage:'swing'};assert.equal(trackReceiver(w,p,k,b),false,'late offside cancels the pass, never silently ignores the law');
const spin=[];for(const type of ['pass','outsidePass','heelPass','outsideShot','chip']){const x=createWorld(roster(2)),ball=x.balls[0],a=x.players[0];Object.assign(ball,{x:0,y:.11,z:0,mode:'free'});releaseBall(x,a,ball,[1,.5,10],type,'p1');spin.push({type,curve:ball.flight.curve,vertical:ball.vy,speed:Math.hypot(ball.vx,ball.vz)});}assert(spin.find(p=>p.type==='outsidePass').curve!==0);assert(spin.find(p=>p.type==='outsideShot').curve!==0);assert(spin.find(p=>p.type==='chip').vertical>spin.find(p=>p.type==='pass').vertical);assert(spin.find(p=>p.type==='heelPass').speed<spin.find(p=>p.type==='pass').speed);
globalThis.document={createElement:()=>createCanvas(256,256)};
const avatar=makeAvatar({key:'p',appearance:{}},1),body=avatar.model.body,index=avatar.model.skeleton.bones.findIndex(b=>b.name==='rAnkle'),skin=body.geometry.getAttribute('skinIndex'),weight=body.geometry.getAttribute('skinWeight'),point=new T.Vector3();const poses=[],contacts=[];
for(const [type,spec]of Object.entries(TECHNIQUES)){
 const high=['bicycle','scissor'].includes(type),ball=high?[0,1.5,.3]:[0,.11,.36];let contact=Infinity;
 for(let i=0;i<=30;i++){const phase=i/30,time=phase*spec.duration,player={pos:[0,0],velocity:[0,0],heading:0,look:[0,3],gesture:spec.gesture,gestureStart:0,actionTime:time,phase,contact:spec.wind,footTarget:ball,stepCycle:.2,personality:11,preciseMotion:true,elevation:high?.32*Math.sin(Math.min(1,time/.7)*Math.PI):0,diveSide:1,team:0};avatar.update(player,time,1/30);avatar.root.updateMatrixWorld(true);avatar.model.skeleton.update();avatar.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),'finite '+type));}
 const time=spec.wind,phase=time/spec.duration;avatar.update({pos:[0,0],velocity:[0,0],heading:0,look:[0,3],gesture:spec.gesture,gestureStart:0,actionTime:time,phase,contact:time,footTarget:ball,stepCycle:.2,personality:11,preciseMotion:true,elevation:high?.32*Math.sin(time/.7*Math.PI):0,diveSide:1,team:0},time,.016);avatar.root.updateMatrixWorld(true);avatar.model.skeleton.update();
 if(['heelPass','outsidePass','outsideShot','chip','bicycle','scissor','volley'].includes(type)){for(let i=0;i<skin.count;i++){let ankleWeight=0;for(let j=0;j<4;j++)if(skin.array[i*4+j]===index)ankleWeight+=weight.array[i*4+j];if(ankleWeight<.55)continue;body.getVertexPosition(i,point).applyMatrix4(body.matrixWorld);contact=Math.min(contact,point.distanceTo(new T.Vector3(...ball)));}assert(contact<.24,'real shoe reaches ball in '+type+': '+contact);contacts.push({type,distance:contact});}
 const pose=avatar.limbs.filter(b=>['lKnee','rKnee','lWrist','rWrist'].includes(b.name)).flatMap(b=>b.getWorldPosition(point).toArray());poses.push({type,pose});
}
assert(new Set(poses.map(p=>p.pose.map(v=>v.toFixed(2)).join(','))).size>=9,'distinct articulated signatures, not one renamed kick');avatar.dispose();
const players=roster(8),world=createWorld(players),context=worldContext({players}),events={},setups={},successful=[],byEnd={};world.nextMatchAt=1e9;
for(let tick=0;tick<900*24;tick++){stepWorld(world,context);for(const e of world.newEvents){events[e.type]=(events[e.type]||0)+1;if(e.type==='techniqueSetup')setups[e.technique]=(setups[e.technique]||0)+1;if(['bicycle','scissor'].includes(e.type)){successful.push(e.type);assert.equal(world.balls.find(b=>b.id===e.ball).flight.from,e.actor,'actual contact produces the flight');}if(['shot','outsideShot','chip','penalty','freeKick','bicycle','scissor','header','volley'].includes(e.type)){const g=world.groups.find(g=>g.ball===e.ball);if(g){const list=byEnd[g.sign]||=[];list.push(e.actor);}}}}
for(const [end,list]of Object.entries(byEnd)){assert(new Set(list).size>=3,'shooters rotate at end '+end);assert(list.some((key,i)=>i&&key!==list[i-1]));}assert(successful.length>0,'acrobatic contacts actually occur in natural training');assert(events.pass&&events.shot,'ordinary football remains');
const aerialCases=[];
for(const kind of ['bicycle','scissor']){
 const ps=roster(2),x=createWorld(ps),a=x.players[1],from=x.players[0],ball=x.balls[0],spec=TECHNIQUES[kind];x.tick=24;a.x=0;a.z=20;a.heading=kind==='bicycle'?Math.PI:0;a.lastAerialKind=kind==='scissor'?'bicycle':null;from.x=-12;from.z=13;
 let at=0;while(hash(a.key+':'+from.key+':'+at)%100>=55)at+=1/24;assert(at<.8);
 Object.assign(ball,{x:0,y:1.5+spec.wind+4.905*spec.wind**2+4.905/24*spec.wind,z:20-5*spec.wind,vx:0,vy:-1,vz:5,mode:'free',owner:null,flight:{type:'cross',from:from.key,at,receiver:a.key,destination:[0,1.5,20]}});
 assert(tryAerial(x,ball,null,{sign:1,members:[from.key,a.key]}));assert.equal(a.aerial.kind,kind);
 for(let tick=0;tick<12&&!x.newEvents.some(e=>e.type===kind);tick++){x.tick++;stepBalls(x);stepTechniques(x);}
 const contact=x.newEvents.find(e=>e.type===kind);assert(contact,'actual '+kind+' contact');assert.equal(ball.flight.from,a.key);aerialCases.push({kind,contactHeight:contact.pos[1],contactAt:contact.at});
}
const result={test:'Arena skills',poses:poses.length,aerialCases,contacts,ballistics:spin,trainingSeconds:900,events,setups,shooterCounts:Object.fromEntries(Object.entries(byEnd).map(([k,v])=>[k,{shots:v.length,players:new Set(v).size}]))};if(process.env.SKILLS_METRICS_FILE)await fs.writeFile(process.env.SKILLS_METRICS_FILE,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
