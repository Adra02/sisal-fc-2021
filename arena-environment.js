import * as T from './vendor/three.module.min.js';
import {FIELD,PAVILION,BENCH,BALL_RACK,TRAINING_CONES} from './arena-layout.js?v=arena-9';
// Static shared training ground. Created once; no scenery swaps during play.
export function buildGround(scene,{own,renderer,coarse=false}){
 const mat=(color,extra={})=>own(new T.MeshStandardMaterial({color,roughness:.8,...extra})),unit=own(new T.BoxGeometry(1,1,1));
 const add=(g,m,p,s=[1,1,1],name='')=>{const o=new T.Mesh(g,m);o.position.set(...p);o.scale.set(...s);o.name=name;o.castShadow=o.receiveShadow=true;scene.add(o);return o;};
 const box=(m,p,s,n)=>add(unit,m,p,s,n),metal=mat('#8c9e99',{roughness:.34,metalness:.72}),green=mat('#0e4934',{roughness:.52}),white=mat('#eeeee1',{roughness:.48}),rubber=mat('#232b29',{roughness:.9});
 let seed=2714;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 function texture(draw,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tx=own(new T.CanvasTexture(c));tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=Math.min(8,renderer.capabilities?.getMaxAnisotropy?.()||1);return tx;}
 const pitchMap=texture((c,w,h)=>{c.fillStyle='#347845';c.fillRect(0,0,w,h);for(let z=0;z<13;z++){c.fillStyle=z%2?'rgba(15,45,25,.13)':'rgba(154,193,94,.085)';c.fillRect(0,z*h/13,w,h/13);}for(let i=0;i<125000;i++){const x=random()*w,y=random()*h;c.fillStyle=['#286a3c','#55924a','#74984d','#315d33'][i%4];c.globalAlpha=.12+random()*.18;c.fillRect(x,y,.3+random()*.7,1+random()*2.3);}c.globalAlpha=1;for(const [x,z,r]of [[.5,.065,.10],[.5,.935,.10],[.5,.5,.065]]){const g=c.createRadialGradient(x*w,z*h,0,x*w,z*h,r*w);g.addColorStop(0,'rgba(130,118,62,.28)');g.addColorStop(1,'rgba(126,141,66,0)');c.fillStyle=g;c.fillRect(0,0,w,h);}},1536,2048);
 box(mat('#537d47',{roughness:1}),[0,-.17,0],[72,.32,66],'ground');
 const pitch=add(own(new T.PlaneGeometry(34,52)),mat('#fff',{map:pitchMap,bumpMap:pitchMap,bumpScale:.022,roughness:1}),[0,.002,0],[1,1,1],'pitch');pitch.rotation.x=-Math.PI/2;pitch.castShadow=false;
 const track=texture((c,w,h)=>{c.fillStyle='#a0a498';c.fillRect(0,0,w,h);for(let i=0;i<9000;i++){c.fillStyle=i%2?'#c2c2b2':'#7e8e80';c.globalAlpha=.12;c.fillRect(random()*w,random()*h,1,1);}c.globalAlpha=1;});track.wrapS=track.wrapT=T.RepeatWrapping;track.repeat.set(3,5);
 box(mat('#fff',{map:track,roughness:1}),[23.7,-.028,9.1],[10.9,.05,20.1],'pavilion-hardstanding');
 const lineMat=own(new T.LineBasicMaterial({color:'#f6f3de'}));
 function line(points,m=lineMat,name=''){const o=new T.Line(own(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)))),m);o.name=name;scene.add(o);return o;}
 const markingVertices=[];
 function paint(points,width=.075){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz)||1,nx=-dz/l*width/2,nz=dx/l*width/2;markingVertices.push(a[0]+nx,.013,a[2]+nz,b[0]+nx,.013,b[2]+nz,a[0]-nx,.013,a[2]-nz,a[0]-nx,.013,a[2]-nz,b[0]+nx,.013,b[2]+nz,b[0]-nx,.013,b[2]-nz);}}
 paint([[-17,.009,-26],[17,.009,-26],[17,.009,26],[-17,.009,26],[-17,.009,-26]]);paint([[-17,.009,0],[17,.009,0]]);
 const circle=(r,z,from=0,to=Math.PI*2)=>paint(Array.from({length:97},(_,i)=>[Math.sin(from+(to-from)*i/96)*r,.011,z+Math.cos(from+(to-from)*i/96)*r]),.065);
 circle(FIELD.centreRadius,0);for(const sign of [-1,1]){const pw=FIELD.penaltyHalfWidth,front=FIELD.halfLength-FIELD.penaltyDepth,gw=FIELD.goalAreaHalfWidth,gf=FIELD.halfLength-FIELD.goalAreaDepth;paint([[-pw,.011,sign*26],[-pw,.011,sign*front],[pw,.011,sign*front],[pw,.011,sign*26]]);paint([[-gw,.011,sign*26],[-gw,.011,sign*gf],[gw,.011,sign*gf],[gw,.011,sign*26]]);const arc=Array.from({length:97},(_,i)=>{const a=-Math.acos(1/9.15)+Math.acos(1/9.15)*2*i/96;return [Math.sin(a)*9.15,.011,sign*(15-Math.cos(a)*9.15)];});paint(arc,.065);for(const z of [0,15*sign]){const d=add(own(new T.CircleGeometry(.08,16)),white,[0,.014,z]);d.rotation.x=-Math.PI/2;d.castShadow=false;}}
 for(const sx of [-1,1])for(const sz of [-1,1])paint(Array.from({length:25},(_,i)=>[sx*(FIELD.halfWidth-Math.cos(i*Math.PI/48)*FIELD.cornerRadius),.011,sz*(FIELD.halfLength-Math.sin(i*Math.PI/48)*FIELD.cornerRadius)]),.065);
 const markG=own(new T.BufferGeometry());markG.setAttribute('position',new T.Float32BufferAttribute(markingVertices,3));markG.computeVertexNormals();const markings=add(markG,mat('#eeeede',{roughness:1,side:T.DoubleSide}),[0,0,0],[1,1,1],'pitch-markings');markings.castShadow=false;
 for(const sx of [-1,1])for(const sz of [-1,1]){const post=add(own(new T.CylinderGeometry(.018,.022,1.50,10)),white,[sx*17,.75,sz*26],[1,1,1],'corner-flag-pole');post.castShadow=false;const fg=own(new T.BufferGeometry());fg.setAttribute('position',new T.Float32BufferAttribute([0,0,0,.38,-.03,0,0,-.25,0],3));fg.computeVertexNormals();const flag=add(fg,mat('#eac74a',{side:T.DoubleSide}),[sx*17,1.43,sz*26],[sx,1,sz],'corner-flag');flag.rotation.y=sx*.4;}
 // Full back, side and top net surfaces, on both goals, with round posts.
 const nets=[],netMat=own(new T.LineBasicMaterial({color:'#f7f7ec',transparent:true,opacity:.58}));
 for(const sign of [-1,1]){
  for(const x of [-3,3])add(own(new T.CylinderGeometry(.05,.05,2.4,16)),white,[x,1.2,sign*26]);const bar=add(own(new T.CylinderGeometry(.05,.05,6.1,20)),white,[0,2.4,sign*26]);bar.rotation.z=Math.PI/2;
  const points=[];const seg=(a,b)=>points.push(...a,...b);for(let x=-3;x<=3.001;x+=.2){seg([x,0,sign*27.25],[x,2.4,sign*27.25]);seg([x,2.4,sign*26],[x,2.4,sign*27.25]);}
  for(let y=0;y<=2.401;y+=.16){seg([-3,y,sign*27.25],[3,y,sign*27.25]);for(const x of [-3,3])seg([x,y,sign*26],[x,y,sign*27.25]);}
  for(let z=26;z<=27.251;z+=.18){seg([-3,2.4,sign*z],[3,2.4,sign*z]);for(const x of [-3,3])seg([x,0,sign*z],[x,2.4,sign*z]);}
  const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(points,3));const net=new T.LineSegments(g,netMat);net.name='goal-net-'+sign;scene.add(net);nets.push({g,base:Float32Array.from(points),sign,impact:null});
  for(const x of [-3.1,3.1]){line([[x,0,sign*26],[x,0,sign*27.4],[x,2.45,sign*27.4]],own(new T.LineBasicMaterial({color:'#88958c'})));}
 }
 // Bench seats: one curved shell per person, exact coordinates shared with IK.
 const shell=mat('#167253',{roughness:.39,metalness:.05}),seatPos=[],seatIdx=[];
 const profile=[[-.32,.465],[-.24,.455],[.18,.455],[.29,.49],[.35,.59],[.38,.92],[.36,1.03]];
 for(let i=0;i<profile.length;i++)for(let j=0;j<9;j++){const u=j/8*2-1;seatPos.push(profile[i][0]+.025*u*u,profile[i][1]+.020*u*u,u*.34);}
 for(let i=0;i<profile.length-1;i++)for(let j=0;j<8;j++){const a=i*9+j,b=a+9;seatIdx.push(a,b,a+1,b,b+1,a+1);}
 const shellG=own(new T.BufferGeometry());shellG.setAttribute('position',new T.Float32BufferAttribute(seatPos,3));shellG.setIndex(seatIdx);shellG.computeVertexNormals();shell.side=T.DoubleSide;
 const seatSupport=own(new T.CylinderGeometry(.025,.025,.40,12));
 for(const [i,[x,z]]of BENCH.seats.entries()){add(shellG,shell,[x,0,z],[1,1,1],'bench-seat-'+i);for(const dz of [-.26,.26]){add(seatSupport,metal,[x,.22,z+dz]);box(rubber,[x,.022,z+dz],[.62,.035,.07]);}box(metal,[x,.36,z],[.40,.045,.56]);}
 box(green,[27.1,1.48,8],[.22,2.96,12],'pavilion-back-wall');
 const roofMat=mat('#255c4a',{metalness:.44,roughness:.38}),roof=box(roofMat,[24,PAVILION.roofY,8],[7.6,.12,12.5],'pavilion-roof');roof.rotation.z=.045;
 for(const z of [2.1,13.9]){box(metal,[20.4,1.62,z],[.075,3.24,.075]);box(metal,[27.1,1.76,z],[.075,3.52,.075]);box(metal,[23.8,3.18,z],[6.9,.07,.075]);}for(let z=2.5;z<14;z+=.32){const rib=box(roofMat,[24,3.33,z],[7.55,.035,.025]);rib.rotation.z=.045;}
 // Water table is beyond the sixth seat, never in a seated body or exit path.
 const wood=mat('#a4a28b',{roughness:.72});box(wood,[21.3,.77,16.1],[1.15,.07,.70],'water-table');for(const x of [20.86,21.74])for(const z of [15.85,16.35])box(metal,[x,.38,z],[.04,.75,.04]);
 const bottleGeo=own(new T.CylinderGeometry(.055,.065,.34,16)),bottleMat=mat('#9acdb8',{roughness:.24,metalness:.06});for(let i=0;i<3;i++){add(bottleGeo,bottleMat,[21.05+i*.23,.98,16.1],[1,1,1],'water-bottle-'+i);add(own(new T.CylinderGeometry(.03,.03,.025,12)),white,[21.05+i*.23,1.16,16.1]);}
 box(mat('#274b3d'),[25,.45,15.9],[1.1,.90,1.25],'equipment-box');for(let i=0;i<3;i++)box(metal,[24.43,.19+i*.26,15.9],[.035,.035,1.2]);
 // Low ball rack sides keep access from the field open.
 box(metal,[BALL_RACK.x+.90,.25,BALL_RACK.z+.5],[.035,.5,1.7],'ball-rack-side');box(metal,[BALL_RACK.x+.4,.08,BALL_RACK.z+1.15],[1.05,.035,.035]);
 const signMap=texture((c,w,h)=>{c.fillStyle='#073c2b';c.fillRect(0,0,w,h);c.strokeStyle='#95d794';c.lineWidth=3;c.strokeRect(9,9,w-18,h-18);c.fillStyle='#f0f4de';c.font='800 70px Arial';c.textAlign='center';c.fillText('SISAL ARENA',w/2,91);c.fillStyle='#c8d5a9';c.font='23px Arial';c.fillText('FC 2021   /   IL CAMPO DEL CLUB',w/2,137);},1024,176);
 const sign=add(own(new T.PlaneGeometry(8,1.375)),mat('#fff',{map:signMap}),[26.98,2.13,8],[1,1,1],'arena-sign');sign.rotation.y=-Math.PI/2;
 // Distant surroundings are instanced; geometry detail stays near the action.
 const dummy=new T.Object3D(),postG=own(new T.CylinderGeometry(.028,.028,4,7)),posts=new T.InstancedMesh(postG,metal,92);let n=0;for(const side of [-1,1])for(let i=0;i<32;i++){dummy.position.set(side*32,2,-31+i*2);dummy.updateMatrix();posts.setMatrixAt(n++,dummy.matrix);}for(const side of [-1,1])for(let i=0;i<14;i++){dummy.position.set(-28+i*4.3,2,side*31.6);dummy.updateMatrix();posts.setMatrixAt(n++,dummy.matrix);}scene.add(posts);
 const fencePoints=[];for(const side of [-1,1])for(let z=-31;z<31;z+=.48)fencePoints.push(side*32,.12,z,side*32,4,z);for(const side of [-1,1])for(let y=.2;y<=4;y+=.48)fencePoints.push(side*32,y,-31,side*32,y,31);for(const side of [-1,1])for(let x=-32;x<=32;x+=.48)fencePoints.push(x,.1,side*31.6,x,4,side*31.6);for(const side of [-1,1])for(let y=.2;y<=4;y+=.48)fencePoints.push(-32,y,side*31.6,32,y,side*31.6);const fg=own(new T.BufferGeometry());fg.setAttribute('position',new T.Float32BufferAttribute(fencePoints,3));scene.add(new T.LineSegments(fg,own(new T.LineBasicMaterial({color:'#517364',transparent:true,opacity:.23}))));
 const trunkG=own(new T.CylinderGeometry(.13,.20,3.2,7)),leafG=own(new T.IcosahedronGeometry(1,1)),leafM=mat('#3e7050',{roughness:1}),trunks=new T.InstancedMesh(trunkG,mat('#6d6651'),34),trees=new T.InstancedMesh(leafG,leafM,102);
 for(let i=0;i<34;i++){const x=i<17?-35.7:35.7,z=-32+(i%17)*4.2;dummy.position.set(x,1.5,z);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);for(let j=0;j<3;j++){dummy.position.set(x+(random()-.5)*1.3,3.2+j*.7,z+(random()-.5));dummy.scale.set(1.2+random()*.6,1.3+random()*.8,1.2+random()*.5);dummy.updateMatrix();trees.setMatrixAt(i*3+j,dummy.matrix);}}trees.castShadow=true;scene.add(trunks,trees);
 const bladeVertices=[];for(let i=0;i<7;i++){const a=i*2.4,x=Math.cos(a)*.055,z=Math.sin(a)*.055,h=.055+(i%3)*.018;bladeVertices.push(x-.007,0,z,x+.007,0,z,x+.015,h,z+.012);}
 const bladeG=own(new T.BufferGeometry());bladeG.setAttribute('position',new T.Float32BufferAttribute(bladeVertices,3));bladeG.computeVertexNormals();const bladeM=mat('#84b466',{side:T.DoubleSide,roughness:1}),grass=new T.InstancedMesh(bladeG,bladeM,coarse?5000:12000),grassBase=[];for(let i=0;i<grass.count;i++){const x=(random()-.5)*33.8,z=(random()-.5)*51.8;dummy.position.set(x,.004,z);dummy.rotation.set(.05,random()*Math.PI*2,(random()-.5)*.20);dummy.scale.set(.7+random()*.5,.55+random()*.55,1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);grass.setColorAt(i,new T.Color(Math.abs(z)<.10||Math.abs(Math.hypot(x,z)-FIELD.centreRadius)<.08?'#e2e3c8':i%2?'#79a55b':'#538e4a'));grassBase.push([x,z]);}grass.castShadow=false;grass.name='detail-turf';scene.add(grass);
 const coneG=own(new T.ConeGeometry(.13,.26,18)),coneM=mat('#f0a92e',{roughness:.65}),cones=new Map();for(const [i,[x,z]]of TRAINING_CONES.entries()){const g=new T.Group();g.name='training-cone-'+i;const cone=new T.Mesh(coneG,coneM);cone.position.y=.13;cone.castShadow=true;g.add(cone);const base=new T.Mesh(unit,rubber);base.scale.set(.27,.025,.27);base.position.y=.013;g.add(base);g.position.set(x,0,z);scene.add(g);cones.set('cone-'+i,g);}
 const bannerMap=texture((c,w,h)=>{c.fillStyle='#073c2b';c.fillRect(0,0,w,h);c.fillStyle='#dbedba';c.font='800 74px Arial';c.textAlign='center';c.fillText('SISAL FC 2021',w/2,110);c.fillStyle='#efcd68';c.fillRect(25,h-18,w-50,4);},1024,180);
 for(const sign of [-1,1])for(const x of [-22,-7,8,23]){const board=add(own(new T.PlaneGeometry(12,2.1)),mat('#fff',{map:bannerMap,roughness:.85,side:T.DoubleSide}),[x,1.1,sign*31.8],[1,1,1],'perimeter-club-board');board.rotation.y=sign>0?Math.PI:0;}
 scene.add(new T.HemisphereLight('#d7eaff','#314b30',1.4));const sun=new T.DirectionalLight('#fff2d8',2.45);sun.position.set(-18,28,16);sun.castShadow=true;sun.shadow.mapSize.set(coarse?1024:2048,coarse?1024:2048);Object.assign(sun.shadow.camera,{left:-34,right:34,top:36,bottom:-36,near:1,far:90});sun.shadow.bias=-.00005;sun.shadow.normalBias=.010;sun.shadow.radius=2.4;scene.add(sun);const fill=new T.DirectionalLight('#b7d6eb',.65);fill.position.set(15,10,-20);scene.add(fill);
 let lastGoal=0;return {solids:[roof,scene.getObjectByName('pavilion-back-wall')],sun,texture,
 update(frame,camera,quality=1){
  for(const c of frame.props?.cones||[]){const model=cones.get(c.id);if(model){model.position.set(c.x,c.y||0,c.z);model.rotation.z=c.tilt||0;model.visible=true;}}
  for(const event of frame.events||[])if(event.type==='goal'&&event.id>lastGoal){lastGoal=event.id;const net=nets.find(n=>Math.sign(event.pos[2])===n.sign);if(net)net.impact={at:event.at,x:event.pos[0],y:event.pos[1]};}
  for(const net of nets){const age=net.impact?frame.t-net.impact.at:20,a=age<2?Math.sin(age*15)*Math.exp(-age*2.5)*.30:0,position=net.g.attributes.position;for(let i=0;i<position.count;i++){const x=net.base[i*3],y=net.base[i*3+1],z=net.base[i*3+2],back=Math.abs(z)>27?1:Math.max(0,(Math.abs(z)-26)/1.25),spread=net.impact?Math.exp(-((x-net.impact.x)**2+(y-net.impact.y)**2)*.65):0;position.setZ(i,z+net.sign*a*back*spread);}position.needsUpdate=true;}
  grass.visible=quality>0&&camera.position.y<14;trees.castShadow=quality>0;},
 dispose(){for(const o of [posts,trunks,trees,grass])o.dispose();}
 };
}
