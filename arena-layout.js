// Metres. The touchline and every solid prop share this source of truth.
export const FIELD={halfWidth:17,halfLength:26,goalWidth:6,goalHeight:2.4,goalZ:-26,netZ:-27.25,postRadius:.05,ballRadius:.11,centreRadius:9.15,penaltyHalfWidth:10,penaltyDepth:12,goalAreaHalfWidth:4.8,goalAreaDepth:4,penaltyDistance:11,cornerRadius:1};
export const PAVILION={x:24,z:8,width:7,depth:12,roofY:3.25,benchX:22,benchZ:8,spare:[19.1,.14,16],bottle:[21.3,.98,16.1]};
export const BENCH={seatY:.455,front:21.12,back:22.76,minZ:3.0,maxZ:13.04,seats:Array.from({length:6},(_,i)=>[22,3.9+i*1.65])};
export const BALL_RACK={x:19.1,z:16};
export const TRAINING_CONES=[[-10,-12],[-4,-12],[-10,-5],[-4,-5],[12,8],[12,16]];
export const STATIONS={rondo:[-5,-8],square:[-5,-8],duel:[-5,-8],pass:[-5,-8],chain:[-5,-8],shot:[0,-16],juggle:[-4,-8],tennis:[9,5],rest:[21,8]};
export const ARENA_BOUNDS={minX:-35,maxX:35,minZ:-33,maxZ:33};
export function insideField(x,z,margin=0){return Math.abs(x)<=FIELD.halfWidth-margin&&Math.abs(z)<=FIELD.halfLength-margin;}
export const PROPS=[
 {id:'pavilion',minX:PAVILION.x-PAVILION.width/2,maxX:PAVILION.x+PAVILION.width/2,minZ:PAVILION.z-PAVILION.depth/2,maxZ:PAVILION.z+PAVILION.depth/2},
 {id:'bench',minX:PAVILION.benchX-.4,maxX:PAVILION.benchX+.4,minZ:3.4,maxZ:12.6},
 {id:'spares',minX:19.8,maxX:21.2,minZ:11.5,maxZ:13},
];
