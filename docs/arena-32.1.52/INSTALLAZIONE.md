# SISAL ARENA · aggiornamento 32.1.52

Preparato sul `main` del repository Adra02/sisal-fc-2021, commit `82bff85e40ab9877bbec84d7d18c4c4cc26b174e` (32.1.51), controllato il 27 ottobre 2026. Sono file completi: non devi incollare pezzi di codice. Nessuna modifica è stata pubblicata dall'assistente.

## Prima di iniziare

- Estrai lo ZIP: su Windows clic destro → Estrai tutto. Lavora nella cartella estratta, non dentro lo ZIP.
- Non devi eseguire SQL, cambiare variabili Vercel, riconfigurare account o aggiornare Termux. Rimane il database Arena 11 già utilizzato dalla 32.1.51; Arena 12 identifica soltanto la cache dei file del browser.
- Non caricare password, `.env.local`, backup dei dati o `node_modules` su GitHub. Nel pacchetto non ci sono.

## 1. Carica i file in un solo commit

Apri direttamente:

https://github.com/Adra02/sisal-fc-2021/upload/main

1. Controlla di essere nel repository `Adra02/sisal-fc-2021`, branch `main`.
2. Sul PC apri la cartella estratta `SISAL_ARENA_32_1_52/01_FILE_GITHUB`.
3. Seleziona **tutto il contenuto** di `01_FILE_GITHUB`: i file e le cartelle `scripts` e `docs`.
4. Trascina la selezione nell'area di caricamento di GitHub. Non trascinare la cartella esterna `01_FILE_GITHUB`, altrimenti crei un percorso sbagliato.
5. Controlla che l'elenco contenga `arena-avatar.js`, `arena-camera.js`, `arena-locomotion.js`, `arena-surface.js` e i percorsi `scripts/...` e `docs/...`. Non devono cominciare con `01_FILE_GITHUB/`.
6. In basso scrivi come messaggio `Arena 32.1.52: movimenti e resa grafica`.
7. Scegli il commit direttamente su `main` e premi **Commit changes** una volta, dopo che tutti i file hanno finito di caricarsi.

Non cancellare altre cartelle e non eliminare i vecchi file SQL.

Elenco completo dei file: `ELENCO_FILE.md`, nella cartella principale del pacchetto.

## 2. Aspetta Vercel

Apri:

https://vercel.com/adras-projects-eb2ae959/sisal-fc-2021/deployments

Apri il nuovo deployment associato al commit appena creato su `main`. Aspetta **Ready**, con ambiente **Production**. Non scegliere un vecchio deployment e non cambiare le impostazioni del progetto.

## 3. Apri l'app aggiornata

https://sisal-fc-2021.vercel.app/

1. Chiudi l'Arena e ricarica la pagina. Controlla il numero **v32.1.52** nel fondo dell'app.
2. Se trovi la versione precedente, chiudi tutte le schede dell'app e riaprila; su PC puoi usare Ctrl+F5. Non è necessario cancellare i dati del sito o le credenziali.
3. Tocca lo stemma Sisal e apri l'Arena.
4. In **Opzioni → Qualità grafica** comincia da **Automatica**. Puoi provare **Alta** se il dispositivo resta fluido, oppure **Risparmio** se si scalda o rallenta.
5. **Azione** segue la zona del pallone; **Campo** mostra l'insieme. **Il mio** segue il tuo giocatore. Restano zoom e trascinamento manuali.

## 4. Controllo sul tuo dispositivo

Osserva per alcuni minuti su telefono e PC:

- corsa: recupero del tallone, ginocchia, appoggi e braccia; passi quando il giocatore gira;
- raccolta/appoggio del pallone, passaggi, tiri, parate e giocate acrobatiche;
- uscita da un gesto senza scatto della posa; pausa, ripresa, replay e chiusura;
- camera durante una rimessa: in modalità Azione non deve cercare di comprendere tutta la squadra;
- terreno senza puntini vistosi da lontano, linee meno seghettate, ombre e abbigliamento;
- numero personale, colore della pelle e preferenza del casco conservati;
- stessa azione e punteggio su due dispositivi aperti insieme, con possibili pochi istanti di differenza di caricamento.

Il filmato originale è stato esaminato. Le nuove geometrie e i materiali sono stati controllati anche tramite test e proiezioni software; **non è stato possibile eseguire il nuovo rendering WebGL in questo ambiente**. Antialiasing, shader dei vestiti, resa di luce e fluidità effettiva vanno quindi confermati sul tuo dispositivo. Un video a 15 fotogrammi al secondo non misura da solo gli FPS dell'app.

Se qualcosa appare ancora sbagliato, registra 20–30 secondi con il numero della versione e il problema visibile. È più utile di una descrizione generica della qualità.

## Ripristino della 32.1.51

Non ripristinare il database: non è stato modificato.

1. Torna alla pagina di caricamento GitHub indicata sopra.
2. Dal pacchetto estratto apri `02_RIPRISTINO_32_1_51/FILE_GITHUB`.
3. Carica tutto il contenuto, come nell'installazione, e conferma in un solo commit con messaggio `Ripristina Arena 32.1.51`.
4. Attendi il deployment Vercel **Ready / Production**, poi ricarica e controlla **v32.1.51**.
5. I file aggiunti dalla 32.1.52, elencati in `NUOVI_FILE.txt`, rimangono senza riferimenti dopo il ripristino. Puoi lasciarli: non vengono eseguiti. Non cancellare file con nomi simili di altre versioni.

Questo ripristino conserva dati, foto, account, personalizzazioni e nuove statistiche caricate nel frattempo.

## Per chi vuole ripetere i controlli locali

Dal repository, con Node 24 e le dipendenze di sviluppo installate:

```sh
npm run verify
npm run test:arena-visual
npm run test:arena-calcio
```

Non servono questi comandi per installare l'aggiornamento tramite GitHub. I test SQL usano un database locale temporaneo, non il tuo Supabase.
