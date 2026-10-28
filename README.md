# Sisal FC 2021 · FC27 Command Center · 32.1.53

Sito e API su Vercel, dati su Supabase PostgreSQL e Storage privato. Account personali e accessi persistenti; privilegi amministrativi controllati sul server. La modifica o rimozione delle foto resta riservata al proprietario dell’account.

Questa versione rimuove SISAL ARENA. Il logo è un marchio statico. Gare Top 3, modelli di cavallo e fantino, personalizzazioni e chiavi Termux personali restano parte dell’app.

## Gazzetta della Sisal

Prima pagina sull’ultima partita archiviata con punteggi espliciti: risultato, titolo, apertura e 2–4 rubriche scritte da Gemini. È presente soltanto in Squadra. Solo gli amministratori hanno comandi manuali di preparazione e controllo.

Dopo un caricamento della squadra, una coda SQL riconosce il contenuto dei JSON e attende circa 20 secondi di quiete. Il lavoro prosegue con `@vercel/functions` e `waitUntil`, senza cron o polling continuo del browser. Un lease e una chiave di contenuto impediscono generazioni simultanee o duplicazioni dei medesimi dati. Non viene pubblicato un testo incompleto o riferito a file superati durante la generazione; in caso di errore resta l’ultima edizione valida. Il lavoro in background ha durata limitata: una terminazione della piattaforma o una quota IA esaurita può richiedere il tentativo manuale di un amministratore.

La Gazzetta usa il percorso IA già esistente con `GEMINI_API_KEY`. L’aggiornamento da Termux non cambia. I caricamenti dell’avversario non producono il giornale della squadra.

## Sorgenti e statistiche

Totale storico, stagione, archivio e ultime cinque partite hanno ambiti distinti. Le fonti cumulative vengono riconciliate in `lib/data-pipeline.js`; un export stagionale non diventa lo storico soltanto perché caricato come Dati totali. L’assenza di un dato non equivale a zero. I nomi dei giocatori non sono identità del club.

## Installazione

Per un’installazione già funzionante leggere [la guida 32.1.53](docs/aggiornamento-32.1.53/INSTALLAZIONE.md). Applicare prima `setup/20-gazzetta-automatica.sql`, poi aggiornare i file e pubblicare il commit su main. Nessuna nuova chiave e nessuna modifica a Termux. Le migrazioni Arena precedenti sono storia del database, non vanno rieseguite per questo aggiornamento.

## Verifiche

Con Node.js 24 e dipendenze installate:

```sh
npm ci
npm run test:release53
```

La suite usa PostgreSQL locale PGlite, richieste esterne simulate e DOM di prova. La grafica WebGL delle gare non viene certificata da questi test. [Prove e limiti](docs/aggiornamento-32.1.53/VERIFICHE.md).
