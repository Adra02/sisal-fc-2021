import {hash} from './arena-simulation.js?v=arena-2';
// Editorial fictional banter, never quotes or claims about members' real lives.
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
const endings=['Adesso chiudi l’azione.','Fai vedere il prossimo tocco.','Non fermarti a spiegarmelo.','Passa qui e ripartiamo.','La risposta la voglio col pallone.','Ti tengo il posto, muoviti.','Questa la ricorderemo per un po’.','Aspetto la replica sul campo.'];
const generic=['La palla si passa, non si adotta.','Dai, fammela arrivare sui piedi.','Ci sono, guarda prima di inventare.','Va bene il cinema, ma giochiamo.','Hai visto lo spazio? Era lì.','Prossima giocata, stessa dignità da recuperare.'];
const answers=['Ho visto. Non serviva il documentario.','Aspetta la prossima e poi parli.','Tieni il pallone e fai vedere tu.','Va bene, questa me la tengo.','Me la segno. Adesso dammela.','Ridevi di più prima del passaggio.','Non ho chiesto la telecronaca.','Pensa al tuo prossimo stop.'];
const replies=['Eccola la risposta.','Questa volta puoi stare zitto.','Hai ancora qualcosa da aggiungere?','Il pallone ha cambiato opinione.','Adesso ridi con calma.','Lo sapevo che aspettavi questa.','Era ora che arrivasse una giocata.','Continuiamo, prima che ti monti la testa.'];
const invocations=['Dio mattarello','Madonna tamburo','Gesù cavallo','Madonna canterina','Dio cocainomane','Madonna girarrosto','Dio tostapane','Gesù tergicristallo','Madonna fisarmonica','Dio scolapasta','Gesù monopattino','Madonna frullatore','Dio cavatappi','Madonna carriola','Gesù citofono','Dio paracadute'];
export function dialogueFor(scene,serial,actors){
 const n=hash(scene.id),cycle=Math.floor(serial/64),pick=(arr,offset)=>arr[((serial+offset*n)%arr.length+arr.length)%arr.length];
 const line=pick(openings[scene.event]||generic,1),answer=answers[(Math.floor(serial/3)+n)%answers.length];
 const swear=invocations[(Math.floor(serial/5)+n)%invocations.length];
 const prefix=(serial+n)%3===0?swear+', ':((serial+n)%5===0?'Cazzo, ':'');
 const eventAt=scene.event==='sky'?16:11;
 const first=(scene.event==='sky'?'Quel pallone ha cambiato provincia.':line)+' '+endings[(Math.floor(serial/7)+n)%endings.length];
 const result=[{at:eventAt,until:eventAt+3.5,speaker:actors[1]??actors[0],text:prefix+first},
 {at:eventAt+4,until:eventAt+7.5,speaker:actors[0],text:answer}];
 if(['revenge','rematch','lesson','encourage','save'].includes(scene.event))result.push({at:21,until:24,speaker:actors[0],text:replies[(cycle+n)%replies.length]});
 return result;
}
