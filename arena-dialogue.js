import {hash} from './arena-simulation.js?v=arena-11';
// Procedural fictional banter from the recovered catalogue; finite, not endlessly unique.
const openings={
nutmeg:['Chiudi il casello, è passata pure la ricevuta.','Cambio al centro: ti hanno aperto un sottopasso.','Ti è passato il pallone fra le idee.'],
roof:['Il tetto ringrazia per la consegna.','Cerchi la porta o il satellite?','Quello torna con il prossimo bollettino meteo.'],
post:['Le braccia le puoi riabbassare.','Il palo non conta come compagno.','Bella esultanza. Peccato per il gol.'],
inspect:['Controlla pure il pallone, lui almeno è rotondo.','Cambiamo pallone. I piedi purtroppo restano.','Il pallone ha chiesto un altro proprietario.'],
five:['La mano è rimasta in attesa di connessione.','Ti sei dato il cinque da solo?','Era un saluto ai capelli?'],
literal:['Esci dalla porta, non dal contratto!','BOT, torna qui: non abbiamo finito.','Gli abbiamo dato un comando troppo preciso.'],
hide:['Guarda dietro di lui: non sta facendo stretching.','Il pallone non è diventato invisibile.','Lo nascondi meglio di come lo controlli.'],
bottle:['La borraccia non stava partecipando.','Hai centrato l’unico bersaglio che non serviva.','Allenamento di precisione sul reparto bevande.'],
miss:['La rincorsa era bella. Manca il resto.','Il pallone sta ancora aspettando.','Hai tirato una corrente d’aria.'],
tiny:['Tutta quella rincorsa per spostarlo di mezzo metro?','Il pallone ha fatto meno strada della tua preparazione.','Serviva il permesso per andare più lontano?'],
sky:['…','…','…'],
unseen:['Hai visto? No? Fantastico.','Il gol migliore e stavate tutti girati.','Almeno la rete se lo ricorda.'],
encourage:['Dammela semplice, ripartiamo da qui.','Ci sono: appoggiala e seguimi.','Uno stop, un passaggio. Il resto arriva.'],
net:['La rete se lo vuole tenere.','Entra dalla porta, fenomeno.','Hai segnato e ora non riesci a riprenderlo.'],
read:['Gli hai indicato l’angolo con tutto il corpo.','Il portiere aveva già letto il finale.','Manca solo il cartello: tiro qui.'],
save:['Questa volta il BOT ha risposto sul campo.','Il portiere si è ricordato lo sfottò.','Adesso vai a riprenderla.'],
dispute:['Lo indicavate tutti e due. Il pallone non testimonia.','L’ultimo tocco si è visto benissimo.','Uno dei due sta mentendo con molta convinzione.'],
heel:['Adesso dirà che voleva farlo.','Il tallone ha più iniziativa del proprietario.','Assist involontario, modestia inesistente.'],
long:['Lo stop lo ritrovi vicino alla recinzione.','Quello era un controllo o un passaggio a te stesso?','Vai a riprenderti il tuo primo tocco.'],
revenge:['Ci riprovi proprio contro di me?','Ti sei ricordato del tunnel, vedo.','Stavolta le gambe sono chiuse.'],
rematch:['Il conto è ancora aperto.','Riprendiamo da dove avevamo lasciato.','Adesso non fingere di aver dimenticato.']
};
Object.assign(openings,{
pass:['La palla arriva, preparati.','Due tocchi e cambia lato.'],
juggle:['Se cade, niente discorsi: si riparte.','Piano col piede, non è un lancio.'],
signal:['Ti sto chiamando da un’eternità.','La mano alzata non è un elemento decorativo.'],
laugh:['Sì, l’abbiamo visto tutti.','Non girarti: stavamo proprio guardando te.'],
breath:['Riprendi fiato, il pallone non scappa.','Sembra che tu abbia inseguito il pullman.'],
fake:['Guardavi dall’altra parte apposta?','Mi hai venduto il lato sbagliato.'],
accidental:['Dillo subito che era involontario.','Adesso si prende pure il merito.'],
intruder:['Abbiamo un pallone ospite.','Quello non era invitato al torello.'],
crossbar:['La traversa sta chiedendo una pausa.','La porta è anche sotto quella sbarra.'],
hiddenLaugh:['Non sto ridendo. Quasi.','Ti consolo appena riesco a respirare.'],
benchSave:['Da seduto l’hai controllata meglio.','Restaci pure sulla panchina, funziona.'],
lesson:['La dimostrazione doveva finire così?','Prima la lezione, poi lo stop lungo.'],
chain:['Un tocco, uno solo. Ti vediamo.','Non rompere la catena proprio adesso.'],
target:['Quell’angolo l’avevi indicato tu.','Il bersaglio era dichiarato, niente revisioni.'],
ignored:['Finalmente ti ricordi che esisto.','Il mio passaggio ha fatto la fila.'],
closing:['Ultimo pallone. Stavolta davvero.','Chi raccoglie quelli rimasti fuori?'],
volley:['Non farla cadere proprio ora.','Piedi morbidi, è uno scambio.'],
balance:['Le braccia ti hanno salvato il conto.','Per un momento stavi decollando.'],
wall:['La barriera ha lasciato un ingresso libero.','Girarsi non fa sparire il tiro.'],
distract:['Il tuo pallone era qui davanti.','Finito lo spettacolo? Tocca a te.'],
sole:['La suola non è una cassaforte.','Tirala via se ci riesci.'],
laces:['Allaccia bene, poi torniamo a giocare.','Aspettiamo lo scarpino, non il certificato.'],
referee:['Il bersaglio si è visto, basta indicare.','La decisione non cambia con le braccia.'],
swap:['Cambio compagno, nessuna offesa.','Vai dall’altra parte, rifacciamo il giro.'],
interrupted:['Aspetta, sto passando qui davanti.','Bella rincorsa: riprovala fra un secondo.'],
ovation:['Signori, abbiamo uno stop riuscito.','Non applaudite troppo: deve rifarlo.'],
feint:['Il portiere è ancora in piedi.','La finta non ha convinto nessuno.'],
oneTwo:['Appoggia e vai, ti ho visto.','Corri nello spazio, te la restituisco.'],
both:['Uno dei due la chiami davvero.','Tutti e due cortesi, il pallone va via.'],
copy:['Quella posa era tua o l’hai presa in prestito?','L’esultanza è identica. La giocata meno.'],
line:['Quella era proprio sulla linea.','Per un soffio, ma ci sei arrivato.'],
space:['Guarda dove ti indico, c’è spazio.','Non te la sto chiedendo sui tacchi.'],
saveApplause:['Gli applausi adesso sono per il portiere.','Bel tiro, ma guarda chi ha il pallone.'],
tennis:['Deve passare sopra la rete. Sopra.','Questo scambio dura più delle tue scuse.'],
square:['Passa e segui, non mettere radici.','L’angolo dopo è libero: muoviti.'],
chest:['Il petto serve ad accompagnarla.','Controlla prima di preparare il tiro.'],
loft:['Te la mando lunga, fatti trovare.','Guarda il pallone, non me.'],
giveWay:['Passa tu. No, dall’altra parte.','Sembriamo davanti alla stessa porta.'],
collect:['Te ne sta scappando un altro.','La maglia non è un sacco senza fondo.'],
slide:['Adesso la divisa ha visto il campo.','Bella scivolata. Rialzati con calma.'],
postLook:['Quel palo l’ha sentito tutto il campo.','Ci siamo girati anche senza vedere il tiro.'],
behind:['Sono dietro, girati prima di darla.','La voce viene da questa parte.']
});
// Fictional locker-room language: deliberately sharp, only about the action.
// Templates and combinations are finite. They vary deterministically for all viewers.
const generic=['La palla si passa, non si adotta.','Dammela sui piedi, cazzo: non stiamo prendendo i satelliti.','Va bene il cinema, ma poi giochiamo.','Prossima giocata: c’è una dignità da recuperare.'];
const arrivals=['Due tocchi, cazzo. Il terzo lo teniamo per le scuse.','Venite di qua: il pallone ha già finito la pazienza.','Aspettate a fare i fenomeni: prima facciamola girare.','Fate spazio, che i piedi oggi chiedono più metri del solito.','Una semplice, poi vediamo chi deve stare zitto.','Il pallone è pronto. Per i piedi non garantisco un cazzo.','Stessa palla per tutti. Non vale accusarla dopo.','Mettetevi comodi: le scuse le raccogliamo dopo lo stop.','Pronti? Prima la giocata, poi la conferenza stampa del cazzo.','Chi la chiama se la prende, niente sparizioni creative.','Oggi proviamo a non allenare soltanto la bocca.','Muovetevi, che l’erba non cresce a ritmo delle vostre scuse.'];
const answers=['Ho visto, cazzo. Non serviva il documentario.','Aspetta la prossima e poi parli.','Tieni il pallone e fai vedere tu, fenomeno.','Va bene, questa me la tengo. Ma non ti abituare.','Me la segno. Adesso dammela sui piedi.','Ridevi di più prima del passaggio.','Non ho chiesto la telecronaca, porca miseria.','Pensa al tuo prossimo stop, che l’ultimo era una merda.','La battuta l’hai controllata meglio del pallone.','Hai finito? Ti aspettano due tocchi senza pubblico.','Parla meno forte: ti sente pure il palo.','Sì, una cazzata. Il prossimo pallone però è mio.','Me la tengo. Le tue invece le stiamo ancora raccogliendo.','Stai preparando il passaggio o un altro comizio?','Fai vedere i piedi: della bocca abbiamo già la prova.','Ridi, ridi. Poi non chiedere lo sconto sul prossimo tunnel.'];
const replies=['Eccola la risposta. Ora parla il pallone.','Questa volta puoi stare zitto, cazzo.','Hai ancora qualcosa da aggiungere?','Il pallone ha cambiato opinione sui tuoi discorsi.','Adesso ridi con calma, fenomeno.','La bocca era veloce. I piedi adesso rispondono.','Continuiamo, prima che ti monti la testa.','Ti tengo il posto: vieni a giocare.'];
const deities=['Dio','Madonna','Gesù'];
const objects=['mattarello','tamburo','cavallo','canterina','tostapane','scolapasta','girarrosto','fisarmonica','tergicristallo','monopattino','frullatore','cavatappi','carriola','citofono','paracadute','pantofola','cocomero','trapano','clavicembalo','bruscolino','balestra','frittata','mestolo','lampadario','mandolino','cacciavite','tamburello','candelabro','pattino','turbina','marmellata','pedalò','sgabello','biscottiera','melanzana','lavastoviglie','motosega','portacenere','cannocchiale','gomitolo','rotatoria','fischietto','insalatiera','capotreno','scaffale','mappamondo','centrifuga','cassapanca','salvagente','caffettiera','sottobicchiere','apriscatole','termosifone','cavatore','cocainomane','carillon','maracas','saponetta','saliera','bassotuba','cuscinetto','trombone','mangiadischi','friggitrice'];
const spice=['La prossima giocala coi piedi, cazzo.','Hai finito il numero? Giochiamo.','Adesso dammela, prima delle scuse.','Questa resta fra noi. E tutto il campo.','Bella cazzata: ora rimedia.','Passa qui e non farle fare un altro viaggio.','Meno cinema, più pallone.','Merda, questa si è vista bene.'];
export function dialogueFor(scene,serial,actors,context={}){
 if(!actors.length)return [];
 const pick=(items,salt)=>items[hash('banter4:'+serial+':'+scene.id+':'+salt)%items.length],a=actors[0],b=actors[1]??a,swear=pick(deities,'deity')+' '+pick(objects,'object');
 const eventAt=Math.min(34,Math.max(12,context.eventAt??17)),line=scene.event==='sky'?'Quel pallone ha cambiato provincia.':pick(openings[scene.event]||generic,'action');
 const reaction=swear+', '+line.charAt(0).toLowerCase()+line.slice(1);
 const result=[{at:3.1,until:7.7,speaker:pick(actors,'arrival-speaker'),text:pick(arrivals,'arrival')},{at:eventAt,until:eventAt+4.5,speaker:b,text:reaction+(reaction.length<82?' '+pick(spice,'tag'):'')},{at:eventAt+5.2,until:Math.min(48.4,eventAt+9.7),speaker:a,text:pick(answers,'answer')}];
 if(['revenge','rematch','lesson','encourage','save'].includes(scene.event)&&eventAt<29)result.push({at:eventAt+10.4,until:Math.min(48.4,eventAt+14.6),speaker:scene.event==='save'?b:a,text:pick(replies,'reply')});
 if(scene.id==='callback')return [result[0],
  {at:13.6,until:17.9,speaker:b,text:swear+', '+pick(openings.long,'bad-stop')+' Adesso rincorri pure lo stop, cazzo.'},
  {at:28,until:32.2,speaker:a,text:pick(['Ecco la risposta: adesso vai in mezzo.','Parlavi dello stop? Guarda dove è passata questa, cazzo.','Il conto è saldato, fenomeno: tocca a te rincorrerla.','La battuta era bella. Il tunnel molto di più.'],'callback')},
  {at:33,until:37.4,speaker:b,text:pick(['Me la segno. E adesso chiudo le gambe.','Va bene, questa merda l’hanno vista tutti.','Parlavo meglio prima del tunnel.','Okay, il conto è tornato. Adesso giochiamo.'],'concede')}
 ];
 if(context.botKeeper===false)for(const r of result)r.text=r.text.replace(/il BOT/g,'il portiere').replace(/BOT,/g,'Portiere,');
 return result;
}
