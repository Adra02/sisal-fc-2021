# Verifiche 32.1.53

## Eseguite sul codice

- `npm run test:release53`: completata con esito 0. Include sintassi, chiusura delle risorse/import, cache, nove sezioni, Gazzetta, notifiche e like, account, permessi, recupero foto, formazione, scope dei dati, IA e ciclo delle gare.
- 65 controlli account/SQL/API, con scrypt reale Node. Riconfermati dopo la rimozione dell’ultima azione API Arena rimasta.
- SQL Gazzetta applicato due volte in PostgreSQL locale PGlite: account, sorgenti e reazioni preesistenti conservati. RLS e permessi negano le chiamate dirette ad anon e authenticated.
- Due lavori JavaScript intercalati, uno in attesa della risposta IA: un lease condiviso, una sola generazione. Provati dati cambiati durante la scrittura, lavori superati, ripresa con una nuova istanza, errore e idempotenza. È PostgreSQL locale; non è un test di carico distribuito su Supabase cloud.
- Handler reale di caricamento con chiave personale Termux, pipeline attuale e SDK `waitUntil` reale, con contesto Vercel e rete simulati. Caricamento squadra → coda → pubblicazione; avversario senza generazione.
- Identità dei JSON indipendente da ordine delle chiavi, nome file, data di upload e spaziatura di un JSON testuale. Reinviare gli stessi contenuti non crea altre edizioni.
- Quota Gemini, timeout, errore del fornitore, risposta incompleta, contenuto vietato e titolo ripetuto simulati: nessuna falsa pubblicazione, ultima edizione conservata, lease rilasciato. Punteggi e avversario copiati dalle fonti. Nessuna chiamata Gemini reale o consumo della chiave del club durante il lavoro.
- Amministratore, membro e visitatore non autenticato; CSRF, vecchio header del job, azioni Arena dismesse. Il membro non genera anche chiamando direttamente l’API.
- Like ripetuti e ricevute, una reazione per account, letture notifiche personali e concorrenza simulate con SQL/DOM; richieste di iscrizione solo agli amministratori.
- Vecchie edizioni a cinque articoli leggibili come ultima partita; giornale solo in Squadra; nessun pulsante di redazione per un membro.
- Identità foto e tombstone; proprietario autorizzato, amministratore e altro membro non possono sostituire o rimuovere una foto altrui. Test unitario con autenticazione simulata, integrato dai controlli API/SQL account.
- Totale storico 132 e stagione 2 della fixture tenuti distinti; sette costruttori di pagine e matrice numerica; nomi giocatori esclusi dalle identità club. I numeri in tabella non vengono più interpolati da zero.
- Undici scenari del ciclo gara, compresi pari merito, salto, replay e animazioni ridotte. Rendering GPU sostituito da un renderer di prova: controllati ciclo e risultati, non certificata l’immagine 3D su hardware reale.
- Modelli condivisi: 16 intersezioni reali con le iridi Three.js, colori e casco; 69.129 confronti barba/viso durante espressioni; 41 opzioni anatomiche, 12 capelli, quattro pose, 12 carnagioni e sei mantelli; geometrie e pesi finiti. Sono verifiche geometriche, non un filmato WebGL.
- Import e cache senza moduli Arena; originale di ripristino e file consegnati confrontati con i rispettivi alberi Git. Lo ZIP è estratto e verificato prima della consegna.

## Controlli visivi realmente eseguiti

Browser Chrome remoto sull’app locale, con sorgenti dell’aggiornamento e dati di esempio dichiarati. Navigazione delle nove sezioni su desktop e in iframe da 390/360 px (area utile rispettivamente 375/345 px per la barra del browser). Verificati header, campanella, assenza di overflow della pagina, impaginazione del giornale, vista membro senza comandi, logo senza azione e navigazione dalla notifica al giornale. Corretti un conflitto di vecchi stili e la disposizione dei comandi in alto.

Gli screenshot mostrano dati sintetici e testo editoriale di esempio, non una generazione reale del tuo Gemini. È stato attivato anche il comando di esportazione: il browser ha segnalato un download. Il file scaricato non è stato sincronizzato per un’ispezione locale dei pixel; non viene presentato come immagine esportata verificata. Gli screenshot dell’interfaccia sono invece allegati.

## Da verificare dopo l’installazione

- Esecuzione della migrazione nel tuo progetto Supabase, installazione delle dipendenze e durata effettiva del lavoro su Vercel.
- Generazione Gemini reale con quota del club; qualità e correttezza del testo. Prompt e validazione riducono errori e ripetizioni, non garantiscono fatti perfetti o originalità assoluta.
- Stessa edizione e stato notifiche su due dispositivi autenticati reali.
- Uso con il tuo telefono, tastiera/tocco, Safari e PWA installata; non sono stati emulati hardware, GPU o browser iOS.
- Esportazione e condivisione nativa dell’immagine su telefono reale.

Non è stata pubblicata alcuna modifica su GitHub, Vercel o Supabase. Le copie di backup nel pacchetto riguardano il codice, non un’esportazione dei dati privati del database.
