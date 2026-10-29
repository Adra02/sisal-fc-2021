# Installazione Sisal 32.1.54

Aggiornamento preparato dal main `722f4067421d7de795841e091cdd7378f18fe7ec` (28 ottobre 2026), versione 32.1.53. Nessuna modifica è stata pubblicata automaticamente. Se main cambia ancora prima del caricamento, ricontrollare la compatibilità.

## 1. Estrai lo ZIP sul PC

Scarica `Sisal_Aggiornamento_32_1_54.zip`, poi tasto destro → Estrai tutto. Non lavorare dentro la cartella compressa.

- `01_FILE_GITHUB`: tutti i file completi da caricare; i percorsi sono già corretti.
- `SQL`: migrazione da eseguire e prerequisito precedente.
- `02_RIPRISTINO_32_1_53`: ripristino dell’interfaccia precedente, con compatibilità per leggere le nuove edizioni.
- `03_VERIFICHE`: prove e immagini con dati di esempio.

## 2. Prima Supabase

Apri [Supabase](https://supabase.com/dashboard/projects) → scegli il progetto della Sisal → SQL Editor → New query.

Apri con Blocco note `SQL/21-gazzetta-cinque-partite.sql`, copia TUTTO il contenuto nella nuova query e premi **Run**. Attendi **Success**. Questa query aggiunge la funzione della nuova Gazzetta, senza eliminare account, foto, comunicati, reazioni, statistiche o personalizzazioni. I permessi anonimi rimangono negati.

Se non avevi completato la configurazione 53 o l’errore nomina `club_paper_queue53` / `sisal_paper53_source`, esegui prima il file `SQL/20-gazzetta-automatica.sql`, poi il 21. Se il 20 è già stato eseguito, basta il 21. Non eseguire le migrazioni 13–19 Arena.

Caricare un file .sql su GitHub non lo esegue su Supabase.

## 3. Poi carica tutti i file su GitHub

Apri [caricamento sul branch main](https://github.com/Adra02/sisal-fc-2021/upload/main).

Controlla che il branch sia **main**. Apri sul PC `01_FILE_GITHUB`, seleziona TUTTO IL CONTENUTO e trascinalo nell’area di caricamento GitHub. Non trascinare la cartella esterna `01_FILE_GITHUB`, né l’intero ZIP.

Devono apparire file alla radice come `index.html`, `account-boot.js`, `sisal-future.css`, `sisal-future.js`, e percorsi come `api/editorial.js`, `lib/editorial.js`, `lib/paper-portrait.js`, `setup/21-gazzetta-cinque-partite.sql`. Non devono comparire percorsi come `01_FILE_GITHUB/index.html` o `SISAL_32_1_54/...`.

Su Windows trascinare anche le cartelle `api`, `lib`, `setup`, `scripts`, `docs`: GitHub mantiene i percorsi dei file. Se ti compare solo il nome di una cartella vuota, annulla e ripeti con il suo contenuto mantenendo il percorso, prima di confermare.

Scrivi come messaggio **Gazzetta cinque partite e stile Sisal 32.1.54**, quindi **Commit changes** → commit sul branch **main**. Questo è il passaggio che pubblica il codice e avvia Vercel.

Non devi eliminare alcun file per questo aggiornamento. I due vecchi test 53 diventano semplici collegamenti ai test aggiornati.

Alternativa: `Solo_File_GitHub_32_1_54.zip` contiene soltanto gli stessi file da caricare, già alla radice corretta. Va comunque estratto prima; non caricare il file ZIP nel repository.

## 4. Attendi Vercel

Apri [Deployments del progetto](https://vercel.com/adras-projects-eb2ae959/sisal-fc-2021/deployments). Attendi **Ready** sul commit appena caricato e controlla che sia **Production**.

Apri [la web app](https://sisal-fc-2021.vercel.app/), ricarica e verifica nel fondo pagina **v32.1.54**. Su PC puoi usare Ctrl+F5. Se l’app installata sul telefono mantiene il vecchio aspetto, chiudila completamente, riaprila e ricarica. Non cancellare password o dati del browser come primo tentativo.

## 5. Prepara la prima edizione a cinque pagine

Entra come amministratore e premi **Gazzetta** nella barra superiore, accanto a Comunicati, Account personale e campanella. Premi una sola volta **Prepara / riprova edizione**. Non serve ricaricare i JSON per questo primo passaggio.

L’IA usa i dati già archiviati e pubblica un’edizione condivisa. Se ci sono almeno cinque partite valide, trovi **Partita 1 di 5**. Se i file contengono meno partite con punteggi espliciti, vengono mostrate quelle disponibili. Ogni pagina ha risultato, avversario, cronaca e ritratto del miglior voto della squadra di QUELLA partita.

La vecchia edizione a una partita rimane leggibile finché non è pronta la nuova. Se compare quota IA esaurita o timeout, l’ultima edizione rimane intatta: riprova più tardi da amministratore. Non premere ripetutamente durante l’attesa.

## 6. Da questo momento è automatico

Usa i pulsanti Termux **IL MIO CLUB** e **AVVERSARIO** come prima. Non aggiornare o reinstallare Termux e non cambiare la sua chiave.

Dopo nuovi file della squadra, il server attende circa 20 secondi di quiete, poi avvia l’IA. Il tempo totale dipende anche da Gemini e dalla piattaforma. Non genera ad ogni apertura della Gazzetta, né quando scorri le pagine. Dati identici, anche con nomi file o date di caricamento diversi, non producono una seconda edizione.

Al passaggio dal formato 53 al 54 è consentita una prima nuova edizione anche con gli stessi JSON: serve a ripristinare le cinque pagine. Dopo questa transizione vale la deduplicazione normale. I file dell’avversario non modificano il giornale della Sisal.

Le nuove edizioni sono condivise e alimentano le notifiche esistenti. Se una pagina era già aperta, riapri Gazzetta per leggere l’ultima edizione; non c’è un ciclo continuo di aggiornamenti costosi.

## 7. Controllo finale sul tuo telefono

- Barra superiore: Gazzetta, Comunicati, Account personale e Notifiche; il logo non apre nulla.
- Gazzetta: cinque pagine se i dati bastano; risultato sopra il testo di ciascuna; niente numero identificativo del match.
- Ritratto: il nome e il voto devono corrispondere al migliore della relativa partita. A pari voto viene dichiarato il pari merito; il soggetto è deciso da gol, assist, parate e poi nome. Il fantino predefinito viene usato anche per chi non ha un account o personalizzazioni. Senza voti non viene inventato un MVP.
- Senza WebGL appare un’illustrazione etichettata. Con WebGL deve comparire il modello 3D del fantino, senza cavallo, con il suo aspetto e preferenza casco. Questa resa va verificata sul dispositivo reale.
- Un membro può leggere e condividere ma non preparare manualmente edizioni. L’API controlla il ruolo sul server.
- Tabelle: punto e scia lungo il bordo, numeri fermi. In fondo alla pagina **Effetti animati** li mette in pausa; anche la preferenza del telefono per ridurre il movimento è rispettata.
- Squadra e Avversario: controlla lo storico, i grafici e lo scorrimento delle tabelle. Nessun criterio statistico o risultato della Top 3 è stato modificato da questo aggiornamento.
- Fun: non contiene la Gazzetta. Comunicati, like, foto personali e accessi persistenti devono continuare a funzionare.

## 8. Se vuoi ripristinare l’aspetto precedente

Non cancellare dati o tabelle Supabase. Il file SQL 21 può restare: mantiene disponibile anche la RPC 53 precedente.

Per ripristinare via GitHub, carica TUTTO il contenuto di `02_RIPRISTINO_32_1_53/FILE_GITHUB` allo stesso [indirizzo di caricamento main](https://github.com/Adra02/sisal-fc-2021/upload/main), conferma il commit e attendi Ready su Vercel. Il ripristino conserva `account-boot.js` riparato e contiene un piccolo adattamento per leggere anche un’edizione a cinque pagine con il vecchio formato di lettura. Il resto dei file sostituiti torna al main di partenza. Le nuove statistiche e gli account creati nel frattempo restano nel database.

Le aggiunte 54 non più importate possono restare nel repository: sono inattive e non impediscono il ripristino. `FILE_NUOVI_54.txt` le elenca se vuoi pulirle. Conserva **account-boot.js**: mancava nel main controllato ed è necessario all’avvio ordinato degli account.

In emergenza si può usare anche il rollback del deployment precedente dalla dashboard Vercel. Quel deployment può però ripristinare anche il vecchio difetto del file account mancante e non adattare il formato delle nuove edizioni: per un ripristino stabile usa il pacchetto incluso.

[Repository](https://github.com/Adra02/sisal-fc-2021) · [File del main di partenza](https://github.com/Adra02/sisal-fc-2021/tree/722f4067421d7de795841e091cdd7378f18fe7ec)
