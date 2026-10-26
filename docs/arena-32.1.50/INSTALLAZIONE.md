# Installa SISAL ARENA 32.1.50

Non devi scrivere codice, usare PowerShell o aggiornare Termux. Servono il pacchetto estratto, GitHub, Supabase e Vercel. L'ordine è: **SQL → file su main in un solo caricamento → deployment → verifica**.

## 1. Scarica ed estrai

Scarica `SISAL_ARENA_32_1_50.zip`. Su Windows clicca con il tasto destro sullo ZIP → **Estrai tutto**. Lavora nella cartella estratta, non dentro lo ZIP.

Troverai:

- `01_FILE_DA_CARICARE_SU_GITHUB`: i file completi già nei percorsi corretti;
- `02_DATABASE`: il file SQL da eseguire una volta;
- `03_RIPRISTINO_32_1_49`: i vecchi file per tornare indietro;
- `04_VERIFICHE`: resoconto e prove;
- `LEGGIMI.html`: questa guida apribile con un doppio clic;
- `MANIFEST_FILE.json`: elenco preciso, azione aggiungi/sostituisci e impronte dei file.

## 2. Controlla il punto di partenza

Apri [GitHub · main](https://github.com/Adra02/sisal-fc-2021/tree/main). Questo aggiornamento è costruito sul commit `940d88c6fe1cde4d13a623d13482f19e07be6719`, versione 32.1.49, verificato il 26 ottobre 2026.

Non creare un branch di prova. Se dopo questa consegna hai caricato altre modifiche su main, va confrontata la nuova base prima di sostituire file: il pacchetto contiene copie complete dei file interessati.

Lascia aperta anche la pagina [Vercel · deployment del progetto](https://vercel.com/adras-projects-eb2ae959/sisal-fc-2021/deployments). Individua l'attuale deployment Production/Ready: sarà il punto di ripristino. Non modificare impostazioni o variabili.

## 3. Esegui SQL 18 su Supabase

1. Apri [Supabase Dashboard](https://supabase.com/dashboard) e scegli il progetto già collegato alla Sisal.
2. Entra in **SQL Editor** e crea una nuova query.
3. Sul PC apri `02_DATABASE/18-arena-completa.sql` con Blocco note. Seleziona tutto e copia.
4. Incolla tutto nella nuova query e premi **Run**.
5. Attendi il messaggio di successo. Non caricare ancora i file se compare un errore.

Lo script presuppone l'Arena 9 già funzionante e lo SQL `17-arena-skills.sql` già installato. Se segnala «Esegui prima setup/17-arena-skills.sql», fermati e inviami il testo dell'errore. Non rieseguire tutti i vecchi script alla cieca.

Se Supabase mostra un avviso sulle operazioni di rimozione, lo script 18 elimina soltanto vecchi snapshot tecnici della nuova Arena 10. Non cancella account, foto, tabelle EA, comunicati o personalizzazioni. La nuova tabella ha già RLS abilitata; se la finestra offre **Run and enable RLS**, è compatibile con questo script.

Il vecchio sito può continuare a usare Arena 9 durante questo passaggio. Puoi rieseguire lo stesso SQL 18 se necessario: l'installazione è stata provata due volte sullo stesso database locale.

## 4. Carica tutti i file su GitHub in una sola volta

1. Torna a [GitHub · main](https://github.com/Adra02/sisal-fc-2021/tree/main), nella radice del repository, dove vedi `index.html`, `api`, `lib` e `setup`.
2. Controlla che il selettore del branch mostri **main**.
3. Scegli **Add file → Upload files**.
4. Sul PC apri la cartella `01_FILE_DA_CARICARE_SU_GITHUB`.
5. **Seleziona tutto ciò che c'è dentro quella cartella**, comprese `api`, `lib`, `scripts`, `setup` e `docs`, e trascinalo nell'area di caricamento GitHub. Non trascinare la cartella contenitore `01_FILE_DA_CARICARE_SU_GITHUB` e non caricare lo ZIP.
6. Attendi che tutti i file siano caricati. GitHub mantiene i percorsi delle cartelle trascinate.
7. Scrivi come messaggio `Aggiorna Sisal Arena 32.1.50` e premi **Commit changes**, direttamente su **main**.

Non creare manualmente file duplicati, non rinominare cartelle e non caricare separatamente i file una volta per volta. I percorsi corretti sono ad esempio `api/account.js`, `lib/arena.js`, `setup/18-arena-completa.sql`, mentre `arena-ui.js` e `arena-renderer.js` vanno nella radice.

Il pacchetto ripristino, il database separato e i resoconti esterni non vanno caricati nella radice del repository. La copia SQL in `setup` viene invece caricata insieme al codice per conservare la migrazione nel progetto; Vercel non la esegue automaticamente sul database.

## 5. Attendi Vercel

Apri [Vercel · Deployments](https://vercel.com/adras-projects-eb2ae959/sisal-fc-2021/deployments). Con l'integrazione Git già attiva e main come branch di produzione, il commit avvia il deployment. Attendi che **quel nuovo commit** sia **Ready** e **Production**.

Se non compare, controlla che il commit sia realmente su main e che il collegamento Git del progetto sia ancora attivo. Non basta vedere Ready su un deployment precedente. Se il build fallisce, apri i log e mandami l'errore; non eliminare dati e non cambiare variabili.

Non servono nuove variabili d'ambiente, chiavi Supabase o modifiche Termux.

## 6. Apri e controlla

Apri [la web app](https://sisal-fc-2021.vercel.app/). Sul PC ricarica con **Ctrl + Maiusc + R**. Sul telefono chiudi e riapri la scheda o l'app installata, poi ricarica. Invita i compagni a ricaricare prima di confrontare la scena. Il footer deve mostrare **v32.1.50**.

Apri la SISAL ARENA dallo stemma. Alla prima apertura la preparazione condivisa può richiedere più tempo; vedrai uno stato di avanzamento. Se compare una richiesta SQL 18, controlla il passaggio 3. Se il campo non parte, usa **Riprova** e conserva il messaggio esatto.

Prova questi controlli:

1. **Identità e visuale:** il tuo giocatore ha il badge TU; Il mio lo segue. Trascina la camera e controlla che non venga spostata subito dalla regia.
2. **Solo campo e telefono:** il pulsante ⛶ amplia il campo; Opzioni contiene filtro nomi, qualità, volume, rosa e azioni. Ruota il telefono e controlla che comandi e fumetti rimangano leggibili.
3. **Giocate:** osserva entrambe le porte; i tiratori devono variare. Controlla piedi di appoggio, ricezioni e curva dell'esterno sui due lati. Le skill sono contestuali: non devono comparire a ogni azione.
4. **Partitella:** l'attrezzatura va raccolta; dopo il gol si riparte. Il portiere assegnato occupa un ruolo vero e il conteggio delle squadre include i portieri.
5. **Replay:** dopo un gol, una parata o una skill osservati, premi Replay. È silenzioso. Premi Diretta oppure attendi la fine. In Opzioni → Azioni puoi rivedere un evento ancora nel buffer. Un replay non è disponibile appena apri il campo o dopo che l'azione è uscita dai 12 secondi conservati.
6. **Audio:** tocca Audio, regola il volume e ascolta palla/palo/rete. Prova Pausa e Chiudi: niente suoni in coda. Alla riapertura l'audio può richiedere di nuovo un tocco del browser.
7. **Due dispositivi:** confronta la diretta nello stesso momento, fuori da pausa/replay. Cambiare camera o qualità su uno non deve cambiare l'altro. Una rete lenta e la stima dell'orologio possono produrre piccoli scarti temporali.
8. **Persistenza:** cambia visuale e nomi, chiudi e riapri l'Arena sullo stesso dispositivo e account. Queste preferenze non si trasferiscono automaticamente su un altro telefono.
9. **Dati esistenti:** controlla login, foto, una tabella storica, Top 3, Gazzetta e un invio abituale da Termux. Non devono richiedere una nuova configurazione.

Per controllare un nuovo aspetto o un nuovo portiere nella scena condivisa, attendi il cambio della finestra di 30 minuti. Non è necessario ricaricare più volte in continuazione.

## Se qualcosa non va: ripristino

**Sito:** in [Vercel Deployments](https://vercel.com/adras-projects-eb2ae959/sisal-fc-2021/deployments) usa il rollback al precedente deployment di produzione funzionante. Nel piano Hobby l'Instant Rollback riguarda il deployment di produzione immediatamente precedente. Dopo un rollback Vercel sospende l'assegnazione automatica dei nuovi deployment alla produzione finché non usi Undo Rollback.

**Codice su GitHub:** il rollback di Vercel non cambia main. Per riallineare il repository, torna a main → Add file → Upload files e carica **il contenuto** di `03_RIPRISTINO_32_1_49/FILE_DA_CARICARE_SU_GITHUB` in un solo commit. Sono le copie complete dei 43 file preesistenti modificati. I moduli nuovi possono restare inutilizzati: non occorre eliminarli per tornare alla vecchia Arena. Usa `NUOVI_FILE.txt` solo come elenco informativo.

**Database:** non eseguire SQL inversi e non cancellare tabelle, account o Storage. SQL 18 mantiene anche l'Arena 9: il vecchio codice può usare il vecchio mondo. Non rieseguire SQL 17 dopo SQL 18, perché sostituirebbe il router compatibile.

Se hai già caricato altre modifiche dopo questo aggiornamento, non caricare il ripristino alla cieca: contattami con il commit corrente per evitare di sovrascriverle.

## Documentazione ufficiale

- [Supabase · SQL Editor e database](https://supabase.com/docs/guides/database/overview)
- [Vercel · integrazione Git](https://vercel.com/docs/git)
- [Vercel · Instant Rollback](https://vercel.com/docs/instant-rollback)

I risultati delle prove e i limiti della verifica grafica sono in `04_VERIFICHE/VERIFICHE.md`. L'elenco esatto dei file è in `ELENCO_FILE.md` e `MANIFEST_FILE.json`.
