// Cosmetic geometry only: body dimensions, race timing and results are never read here.
export function buildFace(head,{ball,link,mat,s,showHelmet=true}){
 const skin=mat(s.skinColor,{roughness:.78}),hair=mat(s.hairHex,{roughness:.88}),beard=mat(s.beardHex,{roughness:.92}),eyeWhite=mat('#eee7dc'),iris=mat(s.eyeColor),black=mat('#171916'),lips=mat(s.lipColor);
 const width={oval:.19,round:.21,square:.205,heart:.20,angular:.185,narrow:.165}[s.face];
 ball(head,skin,[0,0,0],[.20,.235,width]);
 const jawWidth={soft:width*.75,defined:width*.87,square:width*.95,tapered:width*.61}[s.jaw];ball(head,skin,[.055,-.135,0],[.13,.085,jawWidth]);
 for(const side of [-1,1]){
  const cheek={natural:[.10,.06],full:[.115,.078],high:[.10,.048],lean:[.073,.04]}[s.cheeks];ball(head,skin,[.10,s.cheeks==='high'?-.015:-.055,side*width*.68],[cheek[0],cheek[1],.065]);
  const earScale={small:.75,regular:1,prominent:1.24}[s.ears];ball(head,skin,[-.04,-.015,side*(width+.008)],[.045,.073*earScale,.028*earScale]);ball(head,lips,[-.026,-.015,side*(width+.025)],[.015,.031*earScale,.008]);
 }
 const noses={straight:[.075,.065,.04],button:[.043,.037,.039],aquiline:[.086,.085,.034],broad:[.065,.055,.064],upturned:[.055,.04,.043],rounded:[.064,.052,.052]};const nose=noses[s.nose];ball(head,skin,[.184,s.nose==='upturned'?-.017:-.035,0],nose);for(const z of [-nose[2]*.55,nose[2]*.55])ball(head,skin,[.21,-.06,z],[.03,.02,.025]);
 const lid={almond:.020,round:.028,narrow:.013,wide:.032}[s.eyeShape],eyeY=.046;
 for(const side of [-1,1]){
  const z=side*.085,wink=s.expression==='wink'&&side===-1;const openness=s.expression==='surprised'?1.35:s.expression==='relaxed'?.75:1;
  if(!wink){ball(head,eyeWhite,[.18,eyeY,z],[.025,lid*openness,.046]);ball(head,iris,[.202,eyeY,z],[.009,lid*.8*openness,.021]);ball(head,black,[.21,eyeY,z],[.005,lid*.5*openness,.010]);ball(head,eyeWhite,[.215,eyeY+.006,z-.005],[.003,.004,.004]);}
  else link(head,hair,[.204,eyeY,z-.035],[.204,eyeY,z+.035],.004);
  const thick={fine:.004,medium:.007,bold:.011}[s.browWeight];let slope={straight:0,arched:.018,angled:.025,soft:.009,flat:0}[s.brow];if(['focused','determined','serious'].includes(s.expression))slope-=s.expression==='determined'?.045:.025;if(s.expression==='surprised')slope+=.025;
  const by=s.brow==='flat'?.089:.103;link(head,hair,[.172,by+Math.max(0,slope),z-side*.04],[.163,by+slope,z+side*.043],thick);
 }
 const mouthWidth={balanced:.065,narrow:.048,wide:.082,full:.072}[s.mouth],lipWidth=s.mouth==='full'?.009:.005;
 const mouthY=z=>-.112+(['smile','grin','wink'].includes(s.expression)?.025*Math.pow(z/mouthWidth,2):s.expression==='smirk'?.022*z/mouthWidth:s.expression==='serious'?-.012*Math.pow(z/mouthWidth,2):0);
 if(['grin','surprised'].includes(s.expression)){ball(head,black,[.19,-.119,0],[.012,s.expression==='surprised'?.027:.018,mouthWidth]);if(s.expression==='grin')ball(head,eyeWhite,[.201,-.109,0],[.005,.006,mouthWidth*.8]);}
 else for(let i=0;i<8;i++){const z=-mouthWidth+2*mouthWidth*i/8,zn=-mouthWidth+2*mouthWidth*(i+1)/8;link(head,lips,[.194,mouthY(z),z],[.194,mouthY(zn),zn],lipWidth);}
 // Hair remains visible at the sides and nape under the racing helmet.
 if(s.hair!=='bald'){
  const cap=ball(head,hair,[-.035,.105,0],[.19,.16,width*1.02]);cap.name='hair-cap';if(showHelmet)cap.scale.y=.11;
  const n=s.hairTexture==='coiled'?18:s.hairTexture==='textured'?12:7;
  for(let i=0;i<n;i++){const angle=i/n*Math.PI*2;const z=Math.sin(angle)*width*.94,x=-.03+Math.cos(angle)*.17;ball(head,hair,[x,.105+Math.sin(i*2)*.006,z],[.027,s.hair==='buzz'?.018:s.hairTexture==='coiled'?.032:.045,.026]);}
  if(['long','bob','waves','curly','braids','ponytail'].includes(s.hair))for(const side of [-1,1])for(let i=0;i<4;i++){const length=s.hair==='long'?.30:s.hair==='bob'?.20:.16;const lock=ball(head,hair,[-.11+i*.035,.04-length*.35,side*width],[.03,length*.6,.027]);lock.rotation.x=side*.12;}
  if(s.hair==='ponytail')for(let i=0;i<6;i++)ball(head,hair,[-.19-i*.014,-.045-i*.035,0],[.044,.055,.045]);
  if(s.hair==='braids')for(const side of [-1,1])for(let i=0;i<8;i++)ball(head,hair,[-.12+Math.sin(i*2)*.008,-.03-i*.027,side*width],[.025,.022,.025]);
  if(!showHelmet){if(['crop','side','quiff','mohawk'].includes(s.hair)){const tuft=ball(head,hair,[s.hair==='quiff'?.09:.02,.225,s.hair==='side'?.065:0],[s.hair==='mohawk'?.16:.12,s.hair==='quiff'?.075:.035,s.hair==='mohawk'?.03:.12]);tuft.rotation.x=s.hair==='side'?.3:0;}
   if(s.hair==='curly')for(let i=0;i<12;i++)ball(head,hair,[Math.cos(i*2.4)*.12,.23+Math.sin(i)*.01,Math.sin(i*2.4)*.13],[.044,.042,.044]);
   if(s.hair==='waves')for(let i=0;i<5;i++)ball(head,hair,[-.09+i*.045,.225+Math.sin(i)*.012,0],[.04,.035,.15]);
  }
  if(s.hairPart!=='none'&&!showHelmet){const z={left:-.07,right:.07,center:0}[s.hairPart];link(head,skin,[-.13,.245,z],[.13,.245,z],.004);}
 }
 if(s.beard!=='none'){
  if(['stubble','short','full','anchor','sideburns'].includes(s.beard))for(const side of [-1,1]){ball(head,beard,[.05,-.13,side*jawWidth*.91],[.09,s.beard==='full'?.075:.04,.016]);if(s.beard==='sideburns')ball(head,beard,[-.03,-.04,side*width*.98],[.026,.083,.014]);}
  if(['full','short','goatee','anchor','chin'].includes(s.beard))ball(head,beard,[.12,-.19,0],[.075,s.beard==='full'?.067:.035,s.beard==='goatee'?.044:jawWidth*.8]);
  if(['moustache','goatee','anchor','full'].includes(s.beard))for(const side of [-1,1]){const m=ball(head,beard,[.203,-.085,side*.034],[.014,.012,.045]);m.rotation.x=side*.12;}
 }
 const mark=mat('#765044');if(s.freckles!=='none')for(const side of [-1,1])for(let i=0;i<(s.freckles==='dense'?12:5);i++)ball(head,mark,[.178,-.03-(i%3)*.014,side*(.065+(i%4)*.019)],[.002,.0025,.0025]);
 if(s.beautyMark!=='none')ball(head,mark,[.18,-.07,s.beautyMark==='left'?-.11:.11],[.003,.004,.004]);
 if(s.wrinkles!=='none'){const shade=mat(s.lipColor);for(let i=0;i<(s.wrinkles==='defined'?3:1);i++)link(head,shade,[.147,.13+i*.018,-.06],[.147,.13+i*.018,.06],.0015);}
 if(s.scar!=='none'){const scar=mat('#d8ada0');const z=s.scar==='browLeft'?-.09:.09;link(head,scar,[.19,s.scar==='cheek'?-.06:.07,z-.01],[.18,s.scar==='cheek'?-.11:.13,z+.012],.003);}
 if(s.goggles!=='none')for(const side of [-1,1]){const z=side*.085;const glass=mat(s.goggles==='amber'?'#b89142':s.goggles==='dark'?'#18262a':'#b4d4db',{transparent:true,opacity:s.goggles==='dark'?.85:.22});ball(head,glass,[.222,eyeY,z],[.008,.033,.052]);for(const y of [eyeY-.033,eyeY+.033])link(head,black,[.223,y,z-.047],[.223,y,z+.047],.004);}
 return skin;
}
