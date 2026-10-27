import {hash} from './arena-motion.js?v=arena-12';
import {banterLexicon,creativeInvocations} from './arena-banter.js?v=arena-12';
import {now,actor} from './arena-world-state.js?v=arena-12';
import {chooseSpeech,rememberSpeech} from './arena-speech.js?v=arena-12';
import {contextualLines,replies} from './arena-dialogue-context.js?v=arena-12';
const extra={
 touch:['Piano coi tocchi, che la palla non ha chiesto il divorzio.','Portala avanti coi piedi: la spiegazione arriva già da sola.','Un controllo alla volta, cazzo. Non stai svuotando il garage.','Sei tu che guidi lei, almeno sulla carta.'],
 deflect:['Respinta: il portiere ha detto no senza aprire una riunione.','Non l’ha tenuta, ma intanto ti ha rovinato la festa.','Seconda palla: muoviti, che quella buona non ti aspetta.','Guanti sul pallone. Il tuo autografo sulla rete può aspettare.'],
 post:['Palo pieno. Il falegname ringrazia, la squadra un po’ meno.','Bella precisione: sul pezzo di porta che non segna.','Il rumore era buono. Il risultato fa ancora cagare.','Hai centrato il palo: prossima volta prova il buco in mezzo.','Il palo ha respinto pure la conferenza sul tuo tiro.'],
 roof:['È sul tetto. Prendiamo una riserva prima che tu ordini un elicottero.','Bravo, adesso abbiamo anche il riscaldamento del capannone.','Quella è edilizia, non calcio. Vai a prendere un’altra palla.','Il tetto l’hai preso. La porta intanto resta disponibile.'],
 collect:['Recuperala, che per ora il tuo ruolo migliore è quello.','Bravo raccattapalle. Ora vediamo il resto del curriculum.','Questa almeno sai dove prenderla.','Portala qui: il prato non firma le tue scuse.'],
 header:['Testa sul pallone: dentro, per una volta, sembrava esserci un’idea.','Colpo di testa. Il rumore del vuoto lo controlliamo dopo.','La testa l’hai usata: segnati il giorno.','Bella incornata. Adesso rimetti il cervello in carica.'],
 throw:['La rimessa è con le mani: stavolta hai la scusa giusta.','Buttala dentro al campo, è già un obiettivo dignitoso.','Due mani e un pallone. Non renderla una saga.','La linea è qui, il compagno pure. Dai, cazzo.'],
 corner:['Dalla bandierina evita di arredare il parcheggio.','Calcio d’angolo: mettici un indirizzo, almeno stavolta.','In area c’è gente. La tribuna può aspettare.','Angolo guadagnato. Vediamo come riesci a restituirlo.'],
 gather:['Cambiamo compagni: le scuse avranno finalmente facce nuove.','Radunatevi, che fra poco conta dove la passate davvero.','Partitella. La bocca si è già scaldata, aspettiamo i piedi.','Pettorine nuove, stessi piedi sospetti. Vediamo.'],
 matchEnd:['Finita la partitella. I fenomeni possono tornare a respirare.','Le scuse si piegano e si lasciano sulla panchina.','Basta processo: riportiamo il pallone e facciamo qualcosa.','Bella discussione. Adesso proviamo anche un allenamento.'],
 badControl:['Primo controllo: il secondo lo facciamo nel comune vicino.','Ti è scappata. Almeno non darle pure un nome.','Il pallone ha visto il piede e ha cambiato residenza.','Stop di merda. La tua spiegazione però arriva precisa.'],
 juggle:['Uno, due: il terzo controllo non serve prenotarlo.','Palleggia coi piedi, che la lingua ha già fatto riscaldamento.','Bella serie. Il pallone per ora non ha presentato reclamo.','La tieni su: incredibile, anche senza il discorso.'],
 place:['Posala bene. Non è un pacco da tirare oltre il cancello.','La palla è ferma: adesso tocca a te complicare tutto.','Perfetto. Il bersaglio è ancora quello col buco.'],
 combination:['Uno crossa e l’altro chiude: finalmente una riunione produttiva.','Questa almeno aveva un seguito. Prendete appunti, cazzo.','Bella combinazione. Il commento adesso dura meno della giocata.']
};
const comeback={
 goal:['Prima ridevi tu. Ora controlla la rete, fenomeno.','Il gol te lo lascio lì. La battuta riprenditela.','Questa è la risposta. La conferenza la saltiamo.','Quella scusa che volevi? È finita in porta.','Ridevi del controllo. Adesso conta il gol, cazzo.'],
 pass:['Questa l’hai ricevuta, vero? Per la battuta puoi aspettare.','Ti è arrivata sui piedi. Il resto era tutto tuo rumore.','Pallone consegnato. La critica la puoi ritirare qui.','Ho trovato un compagno. Tu intanto trova una battuta nuova.'],
 save:['Adesso i guanti rispondono. Il tuo commento può sedersi.','Questa l’ho presa. Il prossimo sfottò almeno tiralo meglio.','Tieni la battuta: il pallone me lo tengo io.'],
 receive:['Controllata. Tu intanto controlla quanto parli.','È rimasta qui. La battuta di prima la trovi nel cestino.','Piede acceso. La tua bocca può riposare due minuti.']
};
const mistakes=new Set(['out','post','foul','badControl','roof']),successes=new Set(['goal','receive','save']);
export function converse(w,context){
 const t=now(w),memory=w.speechMemory,people=context.meta,real=w.players.filter(p=>!p.bot&&!p.rest);
 memory.phrases||=[];
 const priority={goal:100,save:90,roof:85,post:84,bicycle:80,scissor:80,volley:75,header:70,foul:65,badControl:60,interception:55};
 const events=[...w.newEvents].sort((a,b)=>(priority[b.type]||0)-(priority[a.type]||0));
 const pending=memory.reply;
 if(pending&&t>pending.expires)delete memory.reply;
 if(pending&&t>=pending.at&&t<=pending.expires&&!events.some(e=>(priority[e.type]||0)>=60)&&t-memory.lastAt>6.8){
  const speaker=actor(w,pending.speaker),incoming=w.balls.some(b=>b.flight?.receiver===pending.speaker);
  if(speaker&&!speaker.rest&&!speaker.kick&&!speaker.aerial&&!incoming&&Math.hypot(speaker.vx,speaker.vz)<4.5){
   const until=t+Math.min(4.8,Math.max(3.1,pending.text.length/25));rememberSpeech(memory,pending.chosen);w.dialogue.push({id:'reply-'+pending.id,at:t,until,speaker:speaker.key,name:people.get(speaker.key)?.appearance?.nickname||people.get(speaker.key)?.name||speaker.key,text:pending.text,event:'answer'});if(w.dialogue.length>8)w.dialogue.shift();memory.lastAt=t;memory.lastSpeaker=speaker.key;memory.nextAt=t+9+(hash('quiet:'+pending.id)%7);delete memory.reply;
  }
 }
 for(const e of events){
  if(mistakes.has(e.type)&&e.actor){const witness=real.filter(p=>p.key!==e.actor).sort((a,b)=>Math.hypot(a.x-e.pos[0],a.z-e.pos[2])-Math.hypot(b.x-e.pos[0],b.z-e.pos[2]))[0];if(witness)memory.mistakes[e.actor]={type:e.type,witness:witness.key,event:e.id};}
  const recall=!e.ownGoal&&successes.has(e.type)&&memory.mistakes[e.actor];let eligible=recall&&e.id-recall.event<42&&actor(w,recall.witness)&&comeback[e.type];
  const regular=e.ownGoal?'ownGoal':e.type==='throwIn'?'throwIn':e.type==='save'&&e.saveType==='deflect'?'deflect':e.type==='penaltyAwarded'?'penalty':e.type==='freeKickAwarded'?'freeKick':e.type==='cornerAwarded'?'corner':e.type==='interception'?'interception':e.type;
  let kind=eligible?'reply-'+e.type:regular;const base=extra[kind]||banterLexicon[kind];let list=eligible?comeback[e.type]:base?[...base,...(contextualLines[kind]||[])]:contextualLines[kind];if(t<Math.max(memory.lastAt+8,memory.nextAt||0)||!real.length)continue;
  const subject=actor(w,e.actor),receiver=actor(w,e.target);
  let speaker=eligible&&subject&&!subject.bot?subject:receiver&&!receiver.bot&&!receiver.rest?receiver:real.filter(p=>p.key!==e.actor&&p.key!==memory.lastSpeaker).sort((a,b)=>Math.hypot(a.x-e.pos[0],a.z-e.pos[2])-Math.hypot(b.x-e.pos[0],b.z-e.pos[2]))[0]||real[0];
  if(speaker.kick||speaker.aerial)continue;
  let chosen=chooseSpeech(kind,list,w.seed+':'+e.id+':'+kind,memory);if(!chosen&&eligible){eligible=false;kind=regular;list=[...(extra[kind]||banterLexicon[kind]||[]),...(contextualLines[kind]||[])];chosen=chooseSpeech(kind,list,w.seed+':'+e.id+':'+kind,memory);delete memory.mistakes[e.actor];speaker=receiver&&!receiver.bot&&!receiver.rest?receiver:real.filter(p=>p.key!==e.actor&&p.key!==memory.lastSpeaker).sort((a,b)=>Math.hypot(a.x-e.pos[0],a.z-e.pos[2])-Math.hypot(b.x-e.pos[0],b.z-e.pos[2]))[0]||real[0];if(speaker.kick||speaker.aerial)continue;}if(!chosen)continue;const called=eligible?people.get(recall.witness):subject?people.get(subject.key):null;rememberSpeech(memory,chosen);
  const invocation=!eligible&&hash('invocation:'+w.seed+':'+e.id)%5===0?chooseSpeech('invocation',creativeInvocations,'exotic:'+w.seed+':'+e.id,memory,{reply:true}):null;if(invocation)rememberSpeech(memory,invocation);
  const opening=eligible&&called?(called.appearance?.nickname||called.name)+', ':invocation?invocation.text+', ':'';
  const tail='';
  const text=opening+chosen.text.charAt(0).toLowerCase()+chosen.text.slice(1)+tail,at=t+.20+(hash('reaction:'+e.id)%5)*.08,until=at+Math.min(6.2,Math.max(3.3,text.length/22));
  if(!eligible&&replies[e.type]&&subject&&!subject.bot&&!subject.rest&&subject.key!==speaker.key){const answer=chooseSpeech('answer-'+e.type,replies[e.type],'reply:'+w.seed+':'+e.id,memory,{reply:true});if(answer)memory.reply={id:e.id,speaker:subject.key,at:Math.max(until+.5,t+7.0),expires:t+13.5,text:answer.text,chosen:answer};}
  w.dialogue.push({id:e.id,at,until,speaker:speaker.key,name:people.get(speaker.key)?.appearance?.nickname||people.get(speaker.key)?.name||speaker.key,text,event:kind});if(w.dialogue.length>8)w.dialogue.shift();
  memory.lastAt=t;memory.nextAt=t+10+(hash('silence:'+w.seed+':'+e.id)%8);memory.lastSpeaker=speaker.key;memory.recent.push(chosen.id);if(memory.recent.length>30)memory.recent.shift();if(eligible)delete memory.mistakes[e.actor];
 }
 for(const [key,m]of Object.entries(memory.mistakes))if(w.eventId-m.event>60||!actor(w,key))delete memory.mistakes[key];
}
