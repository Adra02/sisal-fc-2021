# Verifiche 32.1.54

## Eseguito realmente in locale

- Suite `npm run test:release54`: controlli risorse e cache; nove sezioni nel DOM; avvio account; cinque pagine e risultati; permessi; like e notifiche; persistenza; storico/archivio/stagione; compatibilità del caricamento Termux; contratti delle gare.
- Migrazioni 20 e 21 eseguite due volte su PostgreSQL locale PGlite. Tabelle sorgente, account e vecchie reazioni conservati. Ruoli anon/authenticated esclusi dalla nuova RPC.
- Handler API reali collegati al database locale: concorrenza tra worker, pausa dei caricamenti, dati superati durante l’IA, contenuti identici, JSON con spazi, eventi stabili. Upload multipart con token Termux e registrazione del lavoro con l’SDK Vercel `waitUntil`.
- Cinque partite più una sesta esclusa. Soggetti del ritratto differenti tra incontri; giocatore senza account; personalizzazione del soggetto, mai dell’osservatore. Pari voto, voti parziali e nessun voto.
- Motore ritratti/modello reale con GPU simulata: identità, colori iridi, casco del soggetto, cache e rifiuto identità discordante. Fallback PNG locale generato realmente con canvas.
- Archivi ZIP verificati con CRC e hash dei file; installazione ricostruita dal main di partenza e dai soli file consegnati. Esecuzione della suite anche su tale installazione.

## Simulato, non eseguito su servizi esterni

Supabase di produzione, risposte Gemini, quota esaurita, timeout, testi incompleti, titolo ripetuto e indisponibilità. I test invocano gli handler reali ma intercettano la rete. Non sono state usate o stampate chiavi dell’utente. Non è stata consumata quota Gemini per preparare i file.

Il ciclo delle gare usa il modello reale e un renderer simulato: controlla risultato, pari merito e annullamento, non certifica i pixel WebGL.

## Browser reale, con dati di esempio

Anteprima locale con JavaScript e CSS dell’app: desktop 1348×926; iframe responsive da 390 e 360 pixel nominali. Nessun dato privato dell’utente in queste immagini.

Verificati apertura dal pulsante Gazzetta, cinque pagine e soggetti distinti, risultato sopra ogni cronaca, impaginazione, scorrimento, contrasto e tabella giocatori. Il lettore a 390 pixel nominali ha mostrato larghezza interna 375, senza overflow della pagina (la sola lista degli avversari scorre orizzontalmente). I pulsanti di pagina sono alti 44 pixel.

Misurati valori di `stroke-dashoffset` differenti durante il movimento. Dopo il comando Effetti animati tutti i bordi risultavano in pausa, mentre lo storico di esempio rimaneva 132. Rettangoli SVG ridimensionati al contorno reale delle tabelle, senza elementi dentro celle o intestazioni.

È stato anche scaricato e ispezionato il PNG esportato dal lettore, con avversario, risultato, nome del soggetto e testo della pagina. Si tratta di dati di esempio e ritratto di riserva, non di dati reali del club.

Il browser di verifica ha WebGL disabilitato: è stata vista l’illustrazione di riserva etichettata. Non è stata aggirata questa limitazione. La resa effettiva del ritratto 3D resta da controllare sul telefono/PC dell’utente.

## Da verificare dopo la pubblicazione

Migrazione sul progetto Supabase effettivo, deploy Vercel, generazione Gemini reale, dati reali delle cinque partite, uso contemporaneo su dispositivi reali, tocco/scorrimento Android o iOS e resa 3D WebGL. Nessun login all’account reale e nessuna pubblicazione automatica sono stati eseguiti.

Le animazioni dei bordi non contattano Supabase. Una Gazzetta con cinque articoli usa più token di una con un articolo, nello stesso servizio Gemini già configurato; non significa quota illimitata. L’ultima edizione valida è conservata in caso di errori.
