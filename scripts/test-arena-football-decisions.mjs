import assert from 'node:assert/strict';
import {createWorld,worldContext,stepWorld,captureWorld} from '../arena-world.js';
import {buildRestartPlan} from '../arena-restart-plans.js';
import {requestRestart} from '../arena-match.js';
import {matchIntent,chooseMatchAction,reboundTargets} from '../arena-tactics.js';
import {chooseSpeech,rememberSpeech} from '../arena-speech.js';
import {converse} from '../arena-conversation.js';
import {movePlayers} from '../arena-motion.js';
import {prepareKick,releaseBall} from '../arena-world-ball.js';
import {afterWorld} from '../arena-world-play.js';
const players=Array.from({length:8},(_,i)=>({key:'p'+i,name:'P'+i,games:8,appearance:{}}));
function fixture(){const w=createWorld(players,321);w.mode='match';w.groups=[];w.equipment.cones.forEach(c=>c.mode='stored');
 w.players.forEach((p,i)=>{p.team=p.bot?(p.key==='__keeper_bot'?0:1):i<4?0:1;p.keeperRole=p.bot;p.x=p.bot?0:(i%4-1.5)*4;p.z=p.bot?(p.team===0?24.8:-24.8):p.team===0?-5:5;});
 w.match={teams:[players.slice(0,4).map(p=>p.key),players.slice(4).map(p=>p.key)],keepers:['__keeper_bot','__keeper_away_bot'],score:[0,0],ball:'ball-0',targetGoals:4,restarts:0,phase:'play',since:0,lastDecision:999,lastChange:0,passes:0};
 Object.assign(w.balls[0],{x:0,z:0,y:.11,mode:'free',group:'match',owner:null,flight:null});return w;}
const cornerSchemes=new Set();for(let i=0;i<12;i++){const w=fixture();w.match.restarts=i;requestRestart(w,'corner',0,[16.5,-26]);const plan=w.match.restartPlan;cornerSchemes.add(plan.scheme);assert(plan.runs.every(r=>Math.abs(r.point[0])<17&&Math.abs(r.point[1])<26));assert.equal(new Set(plan.runs.map(r=>r.key)).size,plan.runs.length);}
assert.equal(cornerSchemes.size,4,'four purposeful corner plans');
const freeKicks=new Set();for(const z of [-18,-7,6]){const w=fixture(),b=w.balls[0];b.z=z;w.players.filter(p=>p.team===1).forEach((p,i)=>{p.x=10+i;p.z=15;});requestRestart(w,'freeKick',0,[0,z]);freeKicks.add(w.match.restartPlan.kind);}
assert(freeKicks.has('freeKick')&&freeKicks.has('pass')&&freeKicks.has('cross'),'shot, layoff and delivery selected by position');
{
 const game=fixture(),p=game.players[0],q=game.players[1],ball=game.balls[0];p.x=p.z=0;p.heading=Math.PI;q.x=5;q.z=-2;ball.x=0;ball.z=-.35;ball.owner=p.key;
 game.players.filter(a=>a.team===1).forEach(a=>{a.x=13;a.z=-19;});game.players[2].x=-10;game.players[3].x=-13;
 const choice=chooseMatchAction(game,p,ball,[q]);assert.equal(choice.kind,'pass');assert(choice.runTarget,'a forward moving option has a real run target');
 prepareKick(game,p,ball,choice.target,'pass',q.key);p.kick.runTarget=choice.runTarget;q.reception={from:p.key,point:choice.runTarget,until:3};let received=false;
 const context=worldContext({players});for(let i=0;i<200;i++){stepWorld(game,context);if(game.newEvents.some(e=>e.type==='receive'&&e.actor===q.key)){received=true;break;}}
 assert(received,'the running receiver actually controls the ball');assert(q.x<4,'the receiver moved into the planned space');
}
{
 const game=fixture(),p=game.players[0],q=game.players[1],opponent=game.players.find(a=>a.key==='p4'),ball=game.balls[0];p.x=p.z=0;q.x=5;q.z=0;opponent.x=.6;opponent.z=0;
 assert.equal(chooseMatchAction(game,p,ball,[q]).kind,'shield','close pressure and blocked pass provoke protection rather than a blind pass');
 game.newEvents=[{type:'post',ball:ball.id,pos:[0,1,-26]}];afterWorld(game,worldContext({players}));assert(game.match.reboundUntil>0,'a real frame hit opens the second-ball phase');
}
{const game=fixture(),ball=game.balls[0];ball.restartGuard={type:'indirect',kicker:'p0',team:0};releaseBall(game,game.players[1],ball,[0,.4,-26],'header');assert.equal(ball.restartGuard,null,'a second player touching an indirect delivery clears the direct-restart restriction');}
const w=fixture();w.match.score=[2,0];assert.equal(matchIntent(w,0).mode,'protect');assert.equal(matchIntent(w,1).mode,'chase');assert(matchIntent(w,1).risk>matchIntent(w,0).risk);
const rebounds=reboundTargets(w,{x:0,y:1.0,z:15,vx:2,vy:2,vz:-4});assert.equal(rebounds.size,4);assert([...rebounds.values()].every(p=>Math.abs(p[0])<=16&&Math.abs(p[1])<=24.5));
const memory={},phrases=[];for(let i=0;i<600;i++){const kind=['goal','save','post','badControl','throwIn','interception','roof','foul'][i%8],chosen=chooseSpeech(kind,[],i,memory);assert(chosen);assert(!phrases.slice(-200).includes(chosen.text),'no repeated body in 200 utterances');phrases.push(chosen.text);rememberSpeech(memory,chosen);}assert(memory.utterances.length<=256);
const answers={};for(let i=0;i<4;i++){const a=chooseSpeech('answer',['Sì.','No.','Basta.','Arrivo.'],i,answers,{reply:true});assert(a);rememberSpeech(answers,a);}assert.equal(chooseSpeech('answer',['Sì.','No.','Basta.','Arrivo.'],99,answers,{reply:true}),null,'exhausted replies go quiet instead of repeating');
let actualDialogueLines=0;
{
 const game=fixture(),context=worldContext({players}),texts=[];for(let i=0;i<360;i++){
  game.tick=(i+1)*24*25;game.newEvents=[{id:i+1,type:['goal','save','throwIn','post','receive','pass','cross','shot'][i%8],actor:'p0',target:'p1',pos:[0,.1,0]}];converse(game,context);const line=game.dialogue.at(-1);if(line?.id===i+1){assert(!texts.slice(-180).includes(line.text));texts.push(line.text);}
 }actualDialogueLines=texts.length;assert(texts.length>250,'actual dialogue loop uses the richer banks, not only the helper');
}
const speechWorld=fixture(),ctx=worldContext({players});speechWorld.tick=1000;speechWorld.newEvents=[{id:1,type:'goal',ownGoal:true,actor:'p0',target:null,pos:[0,.1,0]}];converse(speechWorld,ctx);assert.equal(speechWorld.dialogue[0].event,'ownGoal');assert(/autogol|sbagliat|nostra porta|altri/i.test(speechWorld.dialogue[0].text));
let peakAcceleration=0,peakJerk=0,old=[0,0];const p={key:'runner',x:0,z:0,vx:0,vz:0,heading:0,cycle:0,travel:0,maxSpeed:5.5};
for(let i=0;i<240;i++){movePlayers([p],[i<100?[0,20]:[12,0]]);const a=p.motorAcceleration;peakAcceleration=Math.max(peakAcceleration,Math.hypot(...a));peakJerk=Math.max(peakJerk,Math.hypot(a[0]-old[0],a[1]-old[1])*24);assert(Number.isFinite(p.x+p.z+p.heading+p.cycle));old=[...a];}assert(peakAcceleration<10);assert(peakJerk<47,'bounded acceleration changes');
console.log(JSON.stringify({test:'football decisions and shared dialogue',cornerSchemes:[...cornerSchemes],freeKicks:[...freeKicks],uniqueSpeechBodies:phrases.length,actualDialogueLines,memorySize:memory.utterances.length,peakAcceleration,peakJerk,note:'actual local functions and engine, synthetic scenarios; no GPU/production access'}));
