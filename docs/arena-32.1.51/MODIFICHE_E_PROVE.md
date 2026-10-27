# SISAL ARENA 32.1.51 · Modifiche e prove

Base: main `ebcc22d768e6f094ef4a9d9c3522bb82a2f7f42c` (32.1.50), verificato tramite GitHub. Preparazione del 27 ottobre 2026. Nessuna pubblicazione o scrittura in produzione eseguita.

## Le richieste realizzate

| Richiesta | Implementazione |
| --- | --- |
| Battute meno ripetitive | Repertori composti per evento, memoria condivisa fino a 256 elementi per testi e invocazioni, alternanza delle strutture, risposte brevi comprese nel controllo. Se una risposta è esaurita si passa a un'altra frase o al silenzio. Pausa fra interventi principali di circa 10–17 secondi, risposte contestuali più vicine. Autogol distinto dal gol. Nessuna chiamata Gemini. `arena-speech.js`, `arena-conversation.js`. |
| Rimesse laterali | Scelta della zona libera e del ricevitore, attesa del suo posizionamento, coordinamento durante preparazione e volo, velocità del lancio calcolata sul passo fisico effettivo e resistenza dell'aria. Con un solo giocatore di movimento può offrire appoggio il portiere. `arena-restart-plans.js`, `arena-match.js`, `arena-world-ball.js`, `arena-ball-flight.js`. |
| 1. Corner con schemi | Corto, primo palo, secondo palo e rimorchio; incarichi distinti e movimenti coordinati. Finita la ricezione, il piano della ripartenza non trattiene più il possessore. `arena-restart-plans.js`. |
| 2. Punizioni con scelta | Tiro diretto se distanza e corridoio lo consentono, appoggio laterale o consegna in area. Controllo della posizione del ricevitore rispetto alla linea di fuorigioco. `arena-restart-plans.js`, `arena-tactics.js`. |
| 3. Reazione al punteggio | Squadra in svantaggio più profonda, pressione più rapida e maggiore propensione al rischio; squadra avanti con scelte più prudenti. Non vengono predeterminati gol o vincitore. `arena-tactics.js`, `arena-match.js`. |
| 4. Preparazione visibile | Sguardo verso il destinatario o il pallone, orientamento della ricezione e braccio libero che chiama il passaggio, senza sostituire la camminata con una posa ferma. `arena-world.js`, `arena-avatar.js`. |
| 5. Passaggio nello spazio | Destinazione distinta dalla posizione attuale del compagno, corsa coordinata durante la preparazione, mantenendo margini di fuorigioco. Verificata anche la ricezione effettiva. `arena-tactics.js`, `arena-world-ball.js`. |
| 6. Seconde palle | Palo o respinta aprono una fase breve con un primo giocatore verso il rimbalzo previsto e un secondo in copertura, per entrambe le squadre. `arena-tactics.js`, `arena-match.js`, `arena-world-play.js`. |
| 7. Protezione palla | Sotto pressione e con passaggio chiuso, rallentamento e orientamento per proteggere il pallone, braccia e busto coerenti, poi nuova scelta. Restano possibili contrasti e intercettazioni. `arena-match.js`, `arena-avatar.js`. |
| 8. Prove sull'esito completo | Campagna di 120 rimesse e 24 corner/punizioni fino alla ricezione, al contrasto, al tiro o all'uscita. Non soltanto verifica dell'avvio dell'animazione. Nuovi test per decisioni, corpo e migrazione SQL. |
| Movimenti più realistici | Frenata in avvicinamento, accelerazione che cambia gradualmente, velocità ridotta nei cambi bruschi e negli spostamenti all'indietro, stabilizzazione vicino alla destinazione, piccoli passi durante le rotazioni da fermo, torsione del busto, appoggio e sollevamento del piede, piegamento per raccolta/posa. `arena-motion.js`, `arena-avatar.js`, `arena-world-state.js`. |

Corretto anche un ciclo di corner con pochissimi giocatori: cercando un destinatario senza considerare l'appoggio del portiere, la simulazione poteva ripetere ripartenze e gol annullati. Il tocco di un secondo giocatore ora rimuove correttamente il vincolo sul gol diretto di una ripartenza, anche in una conclusione aerea.

## Prove con codice effettivo e dati sintetici

I risultati riguardano l'ambiente locale. Non sono percentuali misurate sul sito di produzione o partite EA reali.

| Campagna rimesse | Main 32.1.50 | Aggiornamento |
| --- | --- | --- |
| Senza marcatura iniziale ravvicinata | 37 ricezioni della propria squadra su 60 | 58 su 60 |
| Con pressione iniziale | 30 su 60 | 50 su 60 |
| Prosecuzione del gioco dopo il primo contatto, campagna complessiva | 87 su 120 | 120 su 120 |

Campagna su entrambe le fasce, entrambe le squadre, cinque posizioni longitudinali e rose da 2/6/14 membri. Nella nuova versione le perdite osservate sono intercettazioni, non lanci persi fuori dal corridoio di ricezione. Non significa che tutte le rimesse reali future riusciranno.

Ulteriori controlli:

- 24 corner/punizioni con esito effettivo dopo il rilascio; quattro schemi di corner e tre scelte di punizione verificati separatamente. I gol osservati sui corner sono successivi a un altro contatto, non gol diretti del battitore.
- Passaggio nello spazio seguito fino al controllo del compagno; protezione palla sotto pressione; seconda palla attivata da un evento di palo; restrizione della ripartenza rimossa dal tocco di un secondo giocatore.
- 600 scelte del compositore senza riutilizzo del testo nei 200 interventi precedenti del test; 360 interventi del ciclo di conversazione effettivo; esaurimento delle risposte brevi senza ripetizione forzata; gestione dell'autogol. È un repertorio finito, non una garanzia di originalità infinita.
- Corpo Three effettivo: richiamo del pallone con il braccio, senza spostare il piede di appoggio; braccia di protezione; rotazione da fermo con piccolo passo; arresto stabile vicino all'obiettivo. Nessuna misura GPU.
- 4.000 confronti di appoggio delle caviglie a 1–6,8 m/s e tre lunghezze di falcata. Lo scarto numerico nel riferimento delle ossa non sostituisce un controllo visivo dei piedi.
- Suite del mondo continuo: 194.400 passi, distanze fra corpi, contatti, ripartenze, client indipendenti, continuità dei checkpoint, aspetto senza effetti sui risultati, panchina e sostituzione della rosa.
- Tre scenari da 20 minuti con portiere umano; controlli su distanze, coordinate finite e attività. La durata delle partitelle dipende dai gol: non è imposta una fine a intervalli fissi.
- SQL 19 eseguito due volte su PostgreSQL locale PGlite, con conservazione dei dati e degli snapshot 9/10 preesistenti; permessi anonimo, membro, amministratore, in attesa e sospeso; contesa sulla pubblicazione; letture immutabili; nessun checkpoint futuro restituito al client.
- Handler API effettivo con database locale e trasporto simulato: autenticazione, controllo versione, portiere amministrativo e una sola RPC per lettura a regime.
- 65 controlli account/SQL/API e scrypt Node reale, oltre a interfaccia account e login in JSDOM. Non è stato usato l'account di produzione.
- Import, cache, compilazione sintattica Node e verifica progetto. La prova del pacchetto estratto e del ripristino è documentata in `04_VERIFICHE/PACCHETTO_VERIFICATO.txt`.

I log delle esecuzioni finali sono inclusi nel pacchetto: consentono di verificare valori e comandi. Le dipendenze di test erano già disponibili localmente; non è stata simulata una nuova installazione da rete o una distribuzione Vercel.

## Limite della verifica grafica

Ho avviato l'interfaccia effettiva con motore, renderer e dati sintetici nel browser. Il renderer Three ha restituito `GL_VENDOR = Disabled, GL_RENDERER = Disabled` e l'interfaccia ha mostrato il messaggio comprensibile di 3D non disponibile. Non è stata aggirata questa limitazione.

**Non posso confermare la resa grafica finale, gli FPS, la temperatura o il consumo batteria sul telefono.** Il test del renderer esegue scena e scheletro Three reali con GPU simulata; il test dell'audio analizza il PCM e simula il ciclo AudioContext. Suono percepito e rendering vanno provati sul dispositivo.

Le animazioni restano procedurali sul modello esistente: non motion capture o asset fotorealistici da produzione AAA. Le proporzioni comuni, il peso e l'altezza non sono modificati. Il campo rimane ridotto, con le regole già supportate; non è una simulazione completa di calcio a undici, VAR o cartellini.

## Compatibilità e consumi

Nessuna nuova dipendenza o servizio a pagamento. Nessun Vercel Blob. Nessuna modifica a Termux, foto, statistiche EA, corse Top 3, Gazzetta, account o personalizzazioni salvate. Le modifiche all'avatar sono limitate ai movimenti nell'Arena.

Il mondo condiviso viene preparato per finestre di 30 minuti. Simulazione, suoni, dialoghi e replay lavorano localmente; non si scrivono posizioni per fotogramma. La nuova memoria dei dialoghi è contenuta nello snapshot già usato. Ci sono comunque letture, trasferimenti e una preparazione server: i piani gratuiti non sono illimitati. Dimensione e tempo locale dello snapshot sono nel log; non costituiscono una stima garantita di costi o tempi in produzione.

SQL 19 aggiunge lo stato Arena 11 separato e mantiene Arena 9/10 per installazione e rollback. Il codice nuovo richiede il client 11, così i membri non mescolano due motori diversi. Aspetto, rosa e portiere seguono ancora il successivo snapshot condiviso, fino a circa 30 minuti.
