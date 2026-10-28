# Installazione Sisal 32.1.53

Preparata dal main `f7a057b118807dd169f481f18058cb8ebf79f3bb` (32.1.52), verificato il 28 ottobre 2026. L’aggiornamento non è stato pubblicato automaticamente. Se main cambia prima dell’installazione, confrontare le modifiche con questa base prima di sovrascriverle.

## Cosa cambia

- SISAL ARENA rimossa. Nessuna azione facendo clic sul logo, anche nella barra laterale.
- GAZZETTA DELLA SISAL di nuovo come prima pagina dell’ultima partita: risultato, titolo e rubriche. Niente carosello di cinque partite o ritratti; le edizioni già salvate non vengono cancellate.
- Il testo è scritto dall’IA integrata, condiviso per tutti. Nome dell’avversario, niente ID della partita e niente mister. Sfottò sulle prestazioni, senza inventare episodi o fatti personali.
- Generazione automatica dopo i caricamenti della propria squadra, con confronto dei contenuti e controllo delle generazioni concorrenti. I comandi manuali sono solo degli amministratori.
- Verde Sisal, fondi scuri e neon discreti; pagina del giornale color carta. Migliorati header mobile, campanella e navigazione da notifiche. I valori in tabella compaiono subito corretti, senza contare da zero.
- Corretto il caso in cui un nome giocatore diventava il nome del club quando mancava Informazioni club. Una richiesta con identità foto non valida restituisce un errore di richiesta, senza sembrare un guasto del server.

## 1. Estrai lo ZIP sul PC

1. Scarica `Sisal_Aggiornamento_32_1_53.zip`.
2. Tasto destro → **Estrai tutto**. Apri la cartella estratta `SISAL_32_1_53`.
3. Apri `LEGGIMI.html`, oppure continua a leggere questa guida.
4. I file da caricare sono dentro **01_FILE_GITHUB**. I file sono completi: non devi modificare righe di codice.
5. Conserva **02_RIPRISTINO_32_1_52**: contiene gli originali, compresi i file che verranno eliminati.

## 2. Supabase prima del codice

1. Apri [Supabase Dashboard](https://supabase.com/dashboard) e scegli il progetto già usato dalla Sisal.
2. Nel menu a sinistra apri **SQL Editor** → **New query**. Non creare un altro database.
3. Sul PC apri `SQL/20-gazzetta-automatica.sql` con Blocco note. Premi **Ctrl+A**, poi **Ctrl+C**.
4. Incolla tutto nella nuova query di Supabase e premi **Run**.
5. Se compare l’avviso RLS, il file abilita già RLS sulla nuova tabella; puoi scegliere **Run and enable RLS**. La migrazione aggiunge una coda e funzioni dedicate, senza cancellare account, foto, statistiche o comunicati.
6. Attendi **Success**. Se appare un errore, conserva il testo dell’errore prima di caricare il codice.

Non serve inserire password o chiavi nella query. Non eseguire di nuovo le vecchie migrazioni Arena o quelle degli account. Le funzioni della Gazzetta mancanti dai file SQL del vecchio main sono sostituite da questo percorso completo e indipendente; la lettura dell’archivio e le notifiche già installate vengono riutilizzate.

## 3. Aggiorna GitHub con un unico commit

Link: [repository su main](https://github.com/Adra02/sisal-fc-2021/tree/main).

Per caricare i file ed eliminare quelli vecchi insieme, usa l’editor nel browser: [apri github.dev](https://github.dev/Adra02/sisal-fc-2021/tree/main). Puoi anche aprire il repository su GitHub e premere il tasto **.** sulla tastiera. Non occorre installare un programma o aprire Codespaces.

1. Controlla il branch **main** in basso a sinistra. Seleziona quello esistente, senza creare branch nuovi.
2. Apri **Explorer / Esplora file** nella barra di sinistra (icona con due fogli).
3. Sul PC entra in **01_FILE_GITHUB**. Seleziona **il suo contenuto** con Ctrl+A e trascinalo nella zona dei file del repository, alla radice. Trascina i file e le cartelle interne, non la cartella esterna `01_FILE_GITHUB`.
4. Accetta la sostituzione dei file esistenti. Le cartelle interne `api`, `lib`, `setup`, `scripts` e `docs` devono restare nei percorsi indicati in `ELENCO_FILE.md`. Se il browser chiede se copiare anziché aprire una nuova cartella, scegli di copiare/caricare nel repository corrente.
5. In Explorer elimina i file indicati in **FILE_DA_ELIMINARE.txt**. Puoi selezionare gruppi con Ctrl o Shift e scegliere **Delete / Elimina**. Non confermare ancora il commit.
6. Gruppi utili per eliminare in poche selezioni: tutti i file `arena-*.js` e `arena.css` nella radice; `club-experience.js`; i tre file Arena/Gazzetta obsoleti specificati dentro `lib`; `assets/studio/arena-body-lod.js`; gli script `test-arena-*.mjs` e `benchmark-arena-checkpoint.mjs`; le tre vecchie cartelle `docs/arena-32.1.50`, `docs/arena-32.1.51`, `docs/arena-32.1.52`.
7. Apri **Source Control / Controllo del codice sorgente**, icona con tre pallini collegati a sinistra. Controlla l’elenco e premi **+** accanto a **Changes / Modifiche** per includere tutte le modifiche.
8. Scrivi: `Sisal 32.1.53: rimozione Arena, Gazzetta IA automatica e stile Sisal`.
9. Premi **Commit & Push** (il nome può essere tradotto). Questo è il passaggio che pubblica il codice sul tuo main e avvia Vercel.

Il file `setup/20-gazzetta-automatica.sql` viene anche salvato nel repository come storia della migrazione: caricarlo su GitHub non lo esegue su Supabase. Va eseguito come al punto 2.

Se preferisci l’interfaccia che già usavi, [Upload files su main](https://github.com/Adra02/sisal-fc-2021/upload/main) accetta il contenuto di `01_FILE_GITHUB`, con i percorsi interni. Questo metodo crea il commit di caricamento; per rimuovere in blocco i vecchi file usa poi github.dev. Gli avanzi non sono caricati dall’app nuova, ma completane la rimozione con l’elenco fornito. Per fare tutto in un solo commit, usa il metodo github.dev sopra.

## 4. Attendi Vercel

1. Apri [Deployments Sisal](https://vercel.com/adras-projects-eb2ae959/sisal-fc-2021/deployments).
2. Apri il deployment collegato al commit appena pubblicato su **main**. Attendi **Ready** e **Production**.
3. Non servono nuove variabili d’ambiente. Restano `SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `GEMINI_API_KEY` già usate dall’app.
4. Il pacchetto ufficiale `@vercel/functions` è dichiarato in `dependencies`, con lockfile: viene installato da Vercel con il progetto.
5. Apri [la web app](https://sisal-fc-2021.vercel.app/) e ricarica. Su PC puoi usare **Ctrl+Shift+R**. Sul telefono chiudi e riapri la pagina o l’app installata.
6. Controlla in fondo **v32.1.53**. La nuova cache elimina quella precedente, compresi i vecchi moduli Arena.

## 5. Prima edizione e controllo sul sito reale

1. Accedi con il tuo account amministratore già esistente.
2. Clicca il logo in alto e quello laterale: non devono aprire finestre.
3. Apri **Squadra → GAZZETTA DELLA SISAL**. La vecchia edizione rimane leggibile. Per convertirla subito nel nuovo formato premi una volta **Prepara / riprova edizione**, oppure esegui il prossimo caricamento della squadra.
4. In seguito usa normalmente **IL MIO CLUB** su Termux, senza aggiornare script o chiave. Dopo circa 20 secondi dall’ultimo caricamento, se i contenuti sono nuovi, il server chiama l’IA. La scrittura richiede anche il tempo di risposta di Gemini; non promettiamo un numero di secondi fisso.
5. Se cambi i dati mentre un’edizione è in preparazione, quella superata non viene pubblicata. Un altro lavoro acquisisce i dati finali. Pause superiori alla finestra di quiete tra caricamenti possono avviare più tentativi; i controlli di pubblicazione impediscono di pubblicare un testo superato.
6. Riapri il giornale per leggere l’ultima edizione. Se il caricamento è fatto dalla pagina web, è prevista anche una singola lettura successiva, non un controllo in loop.
7. Rimanda gli stessi JSON: non deve nascere un altro articolo, un’altra notifica o una nuova chiamata di generazione. Un nome file o una data di caricamento diversi non contano come nuovi dati.
8. **AVVERSARIO** su Termux continua a funzionare e non genera il giornale della tua squadra.
9. Chiedi a un compagno con account membro di aprire Squadra e Fun: il giornale deve essere soltanto in Squadra e non deve vedere i due comandi della redazione. Può leggere e condividere la prima pagina.
10. Verifica su telefono menu, tabelle con scorrimento, account personale e una corsa Top 3. Foto personali e personalizzazioni devono essere presenti.
11. Tocca una notifica della Gazzetta: deve portarti al giornale, aggiornando anche la sezione selezionata nel menu.

Se manca una partita con entrambi i punteggi, non vengono inventati risultati. Se Gemini esaurisce la quota, risponde con un testo incompleto o non è disponibile, l’ultima edizione valida resta salvata. Dopo aver risolto il problema un amministratore può usare **Prepara / riprova edizione**. Un’interruzione del lavoro da parte della piattaforma può richiedere lo stesso recupero: questa coda non è un servizio di esecuzione illimitata.

## Consumi e dati

Nessun servizio esterno aggiuntivo, nessuna email o notifica push. La dipendenza Vercel gestisce il lavoro dopo la risposta HTTP. Ogni caricamento cambiato fa un controllo della coda; il contenuto identico viene riconosciuto. La generazione consuma la quota Gemini già configurata. Letture, storage ed esecuzione Vercel continuano a seguire le quote dei servizi: non sono risorse illimitate.

Le vecchie tabelle e funzioni SQL dell’Arena rimangono nel database come dati dismessi, senza chiamate dall’app nuova. Non vanno cancellate a mano: la rimozione del codice interrompe il loro utilizzo senza toccare account o archivio. I file delle vecchie migrazioni SQL sono mantenuti come storia tecnica.

## Ripristino

1. Se devi tornare indietro, apri lo stesso repository con github.dev sul branch main.
2. Da `02_RIPRISTINO_32_1_52/FILE_GITHUB`, carica il contenuto e sostituisci i file. Sono inclusi anche tutti i file eliminati dell’Arena.
3. Elimina soltanto le aggiunte elencate in `02_RIPRISTINO_32_1_52/NUOVI_FILE_DA_RIMUOVERE.txt` per ottenere nuovamente l’albero originale.
4. Crea un commit `Ripristino Sisal 32.1.52` e attendi il relativo deployment Ready su Vercel. Ricarica la web app.
5. Non eseguire SQL distruttivo e non ripristinare vecchie migrazioni degli account. La nuova tabella di coda può restare inutilizzata: non serve un rollback del database.
6. Il ripristino del codice non riporta indietro i dati: eventuali edizioni già pubblicate restano nell’archivio. Account, foto e JSON non vengono cancellati.

## Prove disponibili

Leggi `VERIFICHE.md` per distinguere test del codice, servizi simulati, controlli visivi nel browser e prove ancora da fare sul telefono reale.

Riferimenti dei passaggi del browser: [GitHub web editor](https://docs.github.com/en/codespaces/the-githubdev-web-based-editor), [caricamento file](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository), [Vercel waitUntil](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package).
