const SHOTS=new Set(['shot','penalty','freeKick','outsideShot','chip','volley','header','bicycle','scissor','heelShot']);
export const isShot=type=>SHOTS.has(type);
export function recordPracticeShot(w,g,key){
 w.trainingShots||={};const end=String(g.sign);w.trainingShots[end]||={};w.trainingShots[end][key]=(w.trainingShots[end][key]||0)+1;g.lastShooter=key;
 const order=g.members.filter(k=>k!==key&&w.players.some(p=>p.key===k&&!p.rest)),counts=w.trainingShots[end];
 order.sort((a,b)=>(counts[a]||0)-(counts[b]||0)||((g.members.indexOf(a)-g.turn+g.members.length*100)%g.members.length)-((g.members.indexOf(b)-g.turn+g.members.length*100)%g.members.length));
 g.pendingShooter=order[0]||key;g.turn++;
}
export function rotatePractice(w,g){
 if(!g.pendingShooter)return;const key=g.pendingShooter;delete g.pendingShooter;
 if(g.members.includes(key)&&w.players.some(p=>p.key===key&&!p.rest)){g.holder=key;g.receiver=g.members.find(k=>k!==key);}
}
