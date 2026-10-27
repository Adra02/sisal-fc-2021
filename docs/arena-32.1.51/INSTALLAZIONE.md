# SISAL ARENA 32.1.51 · Installazione

Aggiornamento preparato sul main `ebcc22d768e6f094ef4a9d9c3522bb82a2f7f42c`, versione 32.1.50. Data: 27 ottobre 2026. I file sono completi e già nelle cartelle giuste. La pubblicazione resta a te.

**Ordine: SQL 19 → file su GitHub main → Vercel Ready/Production → ricarica. Termux resta com'è.**

## 1. Estrai il pacchetto

Scarica `Sisal_Arena_32_1_51.zip`. Su Windows: tasto destro → **Estrai tutto**. Apri la cartella estratta, non lavorare dentro lo ZIP.

Troverai `01_FILE_DA_CARICARE_SU_GITHUB`, `02_DATABASE`, `03_RIPRISTINO_32_1_50`, `04_VERIFICHE`, questa guida e l'elenco esatto dei file.

## 2. Esegui SQL 19 su Supabase

1. Apri [Supabase Dashboard](https://supabase.com/dashboard) e scegli il progetto già usato dalla Sisal.
2. Entra in **SQL Editor** e crea una nuova query.
3. Sul PC apri `02_DATABASE/19-arena-calcio.sql` con Blocco note, seleziona tutto e copia.
4. Incolla tutto nella nuova query di Supabase e premi **Run**.
5. Attendi il messaggio di successo prima di caricare i file su GitHub.

SQL 19 richiede SQL 18, già previsto per l'Arena 32.1.50. Se compare «Esegui prima setup/18-arena-completa.sql», conserva il messaggio e scrivimelo: ti accompagno nel prerequisito. Non rieseguire tutti i vecchi script.

La nuova tabella contiene soltanto lo stato calcolato dell'Arena 11, con RLS già abilitata. Lo script mantiene le vecchie versioni utilizzabili per il ripristino; non elimina account, foto, statistiche, comunicati, reazioni o personalizzazioni. Se appare un avviso sulle eliminazioni, si riferisce alla pulizia di vecchi snapshot tecnici della nuova tabella Arena 11. Se la finestra offre **Run and enable RLS**, è compatibile con questo script.

La copia SQL che caricherai anche nella cartella `setup` del repository serve a conservare la migrazione: il deployment Vercel non la esegue sul database.

## 3. Carica i file su main in un solo commit

1. Apri [GitHub · Sisal FC 2021 · main](https://github.com/Adra02/sisal-fc-2021/tree/main). Resta nella radice del repository, dove vedi `index.html`, `api`, `lib` e `setup`.
2. Controlla che il branch sia **main**. Non serve un branch di prova.
3. Scegli **Add file → Upload files**.
4. Sul PC apri `01_FILE_DA_CARICARE_SU_GITHUB`.
5. Seleziona **tutto il contenuto** e trascinalo nell'area di caricamento GitHub, comprese le cartelle. Non trascinare il contenitore `01_FILE_DA_CARICARE_SU_GITHUB` e non caricare lo ZIP.
6. Attendi la fine dei caricamenti. Scrivi `Aggiorna Sisal Arena 32.1.51` e premi **Commit changes**, direttamente su main.

Esempi dei percorsi corretti: `arena-match.js` nella radice, `api/account.js`, `lib/arena.js`, `setup/19-arena-calcio.sql`. Non creare duplicati e non spostare manualmente i file. L'elenco completo è in `ELENCO_FILE.md` e nel manifest.

Il pacchetto è stato preparato sul commit indicato all'inizio. Se dopo questa consegna modifichi altri file su main, va confrontata la nuova base prima di applicare queste copie complete.

## 4. Attendi il deployment

Apri [Vercel · Deployments del progetto](https://vercel.com/adras-projects-eb2ae959/sisal-fc-2021/deployments). Con l'integrazione Git già attiva e main come branch di produzione, il nuovo commit avvia il deployment. Attendi **Ready** e **Production** per quel commit.

Se compare un errore, apri i log e mandami il testo. Non cambiare le variabili: questo aggiornamento non richiede nuove chiavi, credenziali o dipendenze.

## 5. Apri la web app

Apri [Sisal FC 2021](https://sisal-fc-2021.vercel.app/). Sul PC ricarica con **Ctrl + Maiusc + R**; sul telefono chiudi e riapri la scheda o l'app installata e ricarica. Il footer deve mostrare **v32.1.51**. Invita anche i compagni a ricaricare: il vecchio client viene invitato dal server ad aggiornarsi.

Alla prima apertura l'Arena prepara il nuovo mondo condiviso. La nuova generazione può iniziare un allenamento nuovo; i dati EA e i risultati delle gare Top 3 restano quelli esistenti. Successivamente la continuità fra finestre condivise di 30 minuti rimane attiva.

## 6. Cosa provare

1. Osserva una rimessa su entrambe le fasce: il compagno si offre, il lancio lo cerca e il gioco continua. Un difensore può ancora intercettare: non è un passaggio garantito.
2. Osserva più corner: corto, primo palo, secondo palo o rimorchio. Gli schemi dipendono dai partecipanti e non seguono una sequenza di scene a tempo fisso.
3. Guarda le punizioni da posizioni diverse: tiro diretto, appoggio o pallone in area. Confronta il comportamento di una squadra avanti nel punteggio con quello di una in svantaggio.
4. Guarda cambi di direzione, frenate, piccoli passi da fermo, braccio che chiama la palla, controllo in corsa e protezione del pallone. Le skill non devono apparire a ogni azione.
5. Lascia aperta l'Arena abbastanza da sentire eventi diversi. I dialoghi sono meno fitti, con memoria più lunga; una risposta esaurita può essere omessa anziché ripetuta. Il repertorio è finito: non è una promessa di frasi nuove per sempre.
6. Prova nome TU, camera, Solo campo, pausa, audio e replay. Chiudendo l'Arena devono fermarsi suoni e animazione locale.
7. Apri la diretta su due dispositivi, fuori da pausa/replay. Azioni e stato condiviso devono corrispondere; visuale e qualità restano personali. Rete e orologio stimato possono produrre piccoli scarti.
8. Verifica login, foto, una tabella storica, Top 3, Gazzetta e un invio con i pulsanti Termux abituali. Non devono richiedere una nuova configurazione.

**La resa grafica e gli FPS sul tuo telefono non posso confermarli.** Il browser di verifica non ha potuto creare un contesto WebGL. Nel rapporto sono separati i test della simulazione, quelli delle ossa del modello e quelli con GPU simulata.

## Ripristino della 32.1.50

Prima del caricamento individua in Vercel il deployment di produzione attuale e funzionante.

- Per ripristinare il sito usa il rollback al deployment di produzione precedente in [Vercel Deployments](https://vercel.com/adras-projects-eb2ae959/sisal-fc-2021/deployments). Con il piano Hobby, Instant Rollback riguarda il deployment di produzione immediatamente precedente. Dopo un rollback l'assegnazione automatica dei nuovi deployment alla produzione resta sospesa finché non usi Undo Rollback.
- Il rollback Vercel non cambia main. Per riallineare il codice, carica in un solo commit su main **il contenuto** di `03_RIPRISTINO_32_1_50/FILE_DA_CARICARE_SU_GITHUB`, con lo stesso procedimento del punto 3.
- Non serve cancellare i file nuovi per ripristinare: possono restare inutilizzati. Il relativo elenco è nel pacchetto di ripristino.
- Non eseguire SQL inversi e non cancellare tabelle o Storage. SQL 19 mantiene il funzionamento delle generazioni precedenti. Non rieseguire SQL 18 dopo SQL 19, perché riscriverebbe il router precedente.
- Se dopo l'aggiornamento hai caricato altre modifiche, non sovrascriverle con il ripristino senza un confronto dei commit.

Documentazione ufficiale: [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview), [Vercel Git](https://vercel.com/docs/git), [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback).
