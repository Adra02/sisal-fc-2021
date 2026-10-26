# SISAL ARENA · aggiornamento 32.1.50

Preparato sul `main` verificato il 26 ottobre 2026: `940d88c6fe1cde4d13a623d13482f19e07be6719` (32.1.49). Motore condiviso Arena 10. Nessuna pubblicazione eseguita: l'installazione resta a te.

## Copertura in 29 interventi

| N. | Intervento | Risultato e file principali |
| --- | --- | --- |
| 1 | Personalizzazioni aggiornate | Il cambio di aspetto ricostruisce soltanto il personaggio interessato al prossimo snapshot condiviso, conservando campo e visuale. Cambiare soprannome non ricostruisce il modello. `arena-renderer.js`. |
| 2 | Effetto dei colpi di esterno | La curva segue la direzione del pallone anche sul lato opposto del campo; intercettazione e traiettoria usano la stessa formula. `arena-ball-flight.js`, `arena-world-ball.js`, `arena-techniques.js`. |
| 3 | Rosa assente e riprova | Una rosa inizialmente vuota può recuperare senza perdere i nuovi comandi. Una risposta HTML del server diventa un messaggio leggibile. `arena-ui.js`. |
| 4 | Appoggi, accelerazione e cambi di direzione | Abbassamento del bacino entro la portata delle gambe, piedi di sostegno e inclinazione nei cambi di direzione. `arena-avatar.js`, `arena-motion.js`. |
| 5 | Tocchi e controlli distinti | Piede destro/sinistro coerente con il colpo, conduzione a impulsi, controllo basso, coscia e petto in base all'altezza; i controlli difficili possono scappare. `arena-world-ball.js`, `arena-world-play.js`, `arena-avatar.js`. |
| 6 | Volo e contatto del pallone | Previsione condivisa del volo, resistenza dell'aria e preparazione delle traiettorie curve. Le skill mantengono un momento di contatto misurabile. `arena-ball-flight.js`, `arena-world-ball.js`. |
| 7 | Reazioni ai contrasti | I contatti ravvicinati producono una breve reazione del corpo, senza trasformare ogni contatto in fallo. `arena-motion.js`, `arena-avatar.js`. |
| 8 | Portiere più leggibile | Anticipo, tuffo e recupero coordinati con la palla; un portiere umano mantiene il ruolo nelle rimesse e nella partitella. `arena-avatar.js`, `arena-roles.js`, `arena-world-play.js`, `arena-laws.js`. |
| 9 | Finalizzazione negli esercizi | Scelta del tiro e del piede nel contesto, con rotazione dei partecipanti già presente preservata e verificata su entrambe le porte. `arena-world-ball.js`, `arena-techniques.js`. |
| 10 | Skill meno meccaniche | Le giocate dipendono da posizione, velocità e azioni recenti, anziché da una sequenza fissa di tre mosse. Rovesciata, sforbiciata, tacco, esterno e pallonetto rimangono distinguibili nel modello. `arena-techniques.js`, `arena-avatar.js`. |
| 11 | Corse senza palla e fuorigioco | Obiettivi di corsa entro una linea di fuorigioco prevista, con margine; posizionamento meno ammassato. Non elimina per regola tutti i fuorigioco. `arena-tactics.js`. |
| 12 | Scelte con il pallone | Valutazione di passaggio, conduzione, tiro e cross; penalizzati i passaggi all'indietro che bloccavano l'attacco. `arena-tactics.js`, `arena-match.js`. |
| 13 | Sostegno e triangoli | Compagni in appoggio, ampiezza e prosecuzione dopo un passaggio per offrire l'uno-due. `arena-tactics.js`. |
| 14 | Marcature e linee di passaggio | Difesa dal lato della propria porta, ostacoli sulle linee di passaggio e intercettazioni coerenti con il volo. `arena-tactics.js`, `arena-world-play.js`. |
| 15 | Ripartenze e attrezzatura | Conservati e ricontrollati raccolta dei cinesini, rimesse, corner, rigori e punizioni; titoli coerenti con la ripartenza effettiva. `arena-equipment.js`, `arena-laws.js`, `arena-world.js`. |
| 16 | Squadre, panchina e portiere | Il portiere assegnato sostituisce un BOT anche nella partitella. Squadre bilanciate contando i portieri; rotazione dei giocatori di movimento con zero presenze EA note, altrimenti degli altri. Un dato assente non vale zero. `arena-teams.js`, `arena-roles.js`. |
| 17 | Modello da calciatore | Nell'Arena maniche corte, avambracci della carnagione scelta e finiture sportive. I guanti del portiere hanno un materiale distinto dalla pelle. `arena-athlete.js`, `arena-avatar.js`. |
| 18 | Viso, capelli, barba e materiali | Modello completo da vicino e geometria semplificata da lontano; materiali di pelle, tessuti e capelli differenziati. Si riutilizzano le personalizzazioni salvate. `arena-athlete.js`, `arena-renderer.js`. |
| 19 | Terreno, luci e dettagli | Rilievo separato del manto erboso, finiture del campo, ombre di contatto, bandiere e rete che reagisce al gol anche dopo un replay. Panchina e tavolo restano fuori dal rettangolo. `arena-environment.js`, `arena-renderer.js`. |
| 20 | Regia e inquadrature | La regia segue l'azione del pallone principale, includendo corpo e palla nelle skill; una visuale manuale non viene sottratta da un'azione automatica. `arena-renderer.js`, `arena-world.js`. |
| 21 | Telefono e leggibilità | Comandi compatti, Solo campo, filtro dei nomi, fumetti ricalcolati dopo il ridimensionamento. I nomi restano sopra il giocatore, senza righe di collegamento. `arena-ui.js`, `arena-overlays.js`, `arena.css`. |
| 22 | Carico grafico e ciclo di vita | Qualità automatica che riduce e recupera dettaglio, geometria a distanza, pausa quando la pagina è nascosta, rilascio delle risorse alla chiusura e rispetto delle animazioni ridotte. `arena-renderer.js`, `arena-athlete.js`, `arena-ui.js`. |
| 23 | Audio dei contatti | Profili distinti per passaggio, tiro, testa, tessuto ed erba, oltre a palo, rimbalzo, rete e fischio. Volume, distanza, limite alle voci simultanee e arresto alla chiusura. `arena-audio.js`. |
| 24 | Dialoghi contestuali | Priorità a gol, errori e parate reali del campo; memoria recente delle frasi e tempi meno invadenti durante un gesto tecnico. Non usa Gemini. `arena-dialogue-context.js`, `arena-conversation.js`. |
| 25 | Battute con richiamo | Un successo successivo può rispondere a un errore precedente del giocatore. Le battute restano satiriche ed esplicite; non viene inventata una ricezione riuscita al semplice rilascio del passaggio. `arena-conversation.js`. |
| 26 | Replay locale | Buffer degli ultimi 12 secondi già osservati, riproduzione silenziosa e ritorno automatico o immediato in diretta. Non cambia il mondo condiviso. `arena-timeline.js`, `arena-renderer.js`, `arena-ui.js`. |
| 27 | Visuale ricordata | Inquadratura, giocatore seguito, nomi e Solo campo ricordati per account su quel dispositivo; qualità, volume e fumetti restano preferenze del dispositivo. `arena-renderer.js`, `arena-ui.js`. |
| 28 | Registro delle azioni | Fino a 24 eventi recenti con nome corretto anche dopo cambi di rosa. Se l'azione è ancora nel buffer si rivede; altrimenti si segue il protagonista in diretta. `arena-timeline.js`, `arena-ui.js`. |
| 29 | Sincronizzazione e aggiornamento | Snapshot deterministici condivisi, un'unica lettura RPC a regime, passaggio Arena 9/10 compatibile per installazione e ripristino, controlli account sul server e cache separata. `lib/arena.js`, `api/account.js`, `setup/18-arena-completa.sql`, `sw.js`. |

## Dati, consumi e compatibilità

Termux, pulsanti IL MIO CLUB/AVVERSARIO, statistiche EA, risultati e criteri Top 3 restano quelli del main di partenza. Non sono stati modificati il modello condiviso delle corse, l'editor personale o la Gazzetta. Le foto conservano i controlli di proprietà esistenti. Nessuna nuova dipendenza, chiave, servizio a pagamento o Vercel Blob.

La simulazione avanza sul dispositivo. Lo snapshot viene preparato una volta per finestra di 30 minuti e conservato su Supabase, con tentativi temporanei limitati se un altro processo lo sta preparando. Non vengono scritte posizioni per fotogramma, né richieste generazioni IA per le battute. Il replay e il registro non fanno richieste al database. Aprire l'Arena, tornare dopo una lunga assenza o raggiungere la finestra successiva richiede comunque traffico: il piano gratuito non è illimitato.

Aspetto, rosa e portiere seguono il prossimo snapshot condiviso, fino a circa 30 minuti. Non è un salvataggio istantaneo per tutti. I compagni con la stessa versione condividono azioni e stato del campo, ma possono avere camera, qualità, audio e replay diversi. Dopo il deployment tutti devono ricaricare: il server invita i vecchi client ad aggiornarsi.

## Limiti concreti

È una simulazione procedurale nel browser, con il modello esistente migliorato: non asset fotorealistici, motion capture o grafica da produzione AAA. Viso, capelli e barba conservano lo stile e i limiti della geometria di partenza. Le animazioni dei contrasti non sono una simulazione completa di corpi articolati.

Il campo è ridotto (34 × 52 m), con partitelle a obiettivo gol, non un simulatore completo di calcio a undici. VAR, cartellini e tutte le eccezioni regolamentari non sono implementati. Le frasi hanno un repertorio finito: la memoria recente riduce le ripetizioni, non garantisce dialoghi infiniti.

La resa 3D finale, gli FPS, il calore e l'audio su un telefono fisico devono essere provati sul dispositivo. Il browser di verifica disponibile aveva WebGL disabilitato; non è stata aggirata questa limitazione. Vedi `VERIFICHE.md` per le prove eseguite e quelle ancora manuali.
