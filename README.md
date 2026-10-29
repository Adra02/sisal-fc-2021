# Sisal FC 2021 · FC27 Command Center · 32.1.54

Sito/API su Vercel, dati su Supabase PostgreSQL e Storage privato. Account, privilegi, foto personali, statistiche e Termux restano compatibili. SISAL ARENA resta rimossa e il logo è statico.

## Gazzetta della Sisal

Il pulsante Gazzetta è nella barra superiore accanto a Comunicati, Account personale e Notifiche. Apre un lettore con una pagina per ciascuna delle ultime cinque partite con punteggi espliciti. Se i file ne contengono meno, non vengono inventate partite aggiuntive. Ogni risultato precede la cronaca IA della relativa partita. Le edizioni precedenti restano leggibili.

Il miglior voto della squadra in ciascun incontro decide il soggetto del ritratto. A pari voto: gol, assist, parate, poi nome; il pari merito è dichiarato. Voti incompleti sono indicati come tali; nessun voto disponibile significa nessun MVP inventato. Aspetto personale dall’account del soggetto, oppure modello predefinito. Il lettore non usa il fantino di chi apre la pagina. Il ritratto 3D richiede WebGL; senza WebGL viene mostrata un’illustrazione locale esplicitamente etichettata.

L’aggiornamento automatico usa i caricamenti autenticati dei JSON della squadra: coda PostgreSQL, pausa di circa 20 secondi, lease condiviso, impronta del contenuto e `waitUntil` già presenti. La RPC `sisal_paper54` riusa la coda di 53. La chiave del formato cambia una volta per permettere il passaggio alle cinque pagine anche con gli stessi file. Dopo la prima edizione 54 i JSON identici non generano nuove chiamate IA. I file dell’avversario non producono il giornale della squadra. Errori, quota esaurita e risposte incomplete conservano l’ultima edizione valida. Solo gli amministratori hanno i comandi manuali di riprova.

## Presentazione

Accenti Sisal verdi su fondo scuro, pannelli, intestazioni, navigazione e controlli coerenti. Un punto con scia percorre i bordi tramite SVG locali: nessuna lettura del database per gli effetti, nessuna animazione di numeri o celle. Le parti fuori vista sono in pausa; pagina nascosta, preferenza locale e movimenti ridotti sono rispettati. Il lettore della Gazzetta mantiene una tipografia editoriale distinta.

## Installazione

Leggere [la guida completa](docs/aggiornamento-32.1.54/INSTALLAZIONE.md). Su una versione 53 già configurata, eseguire `setup/21-gazzetta-cinque-partite.sql`, poi caricare i file su main e attendere il deployment. La migrazione 20 è il prerequisito e resta nel repository. Non rieseguire le vecchie migrazioni Arena. Non servono nuove chiavi o modifiche a Termux.

Dopo l’installazione un amministratore può premere una sola volta **Prepara / riprova edizione** per sostituire la precedente edizione a una partita. In seguito bastano i normali caricamenti dei JSON.

## Verifiche

Con Node.js 24 e dipendenze installate:

```sh
npm ci
npm run test:release54
node scripts/test-portrait-v5.mjs
```

SQL eseguito su PostgreSQL locale PGlite, richieste Supabase/Gemini esterne simulate e controlli DOM. Verifica visiva nel browser con dati di esempio. La GPU di questo ambiente è disabilitata: i test del modello non certificano la resa 3D su telefoni reali. [Prove e limiti](docs/aggiornamento-32.1.54/VERIFICHE.md).
