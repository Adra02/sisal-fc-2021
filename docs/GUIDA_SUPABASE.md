# Guida Sisal — una fase alla volta

**Non caricare subito la cartella app sul main.** Contiene il codice finale, che richiede prima Supabase e il trasferimento dei dati. Il sito pubblico non è stato modificato da questa consegna. Conserva lo ZIP e il vecchio archivio.

## 1. Crea il progetto (la sola fase da fare adesso)

1. Apri https://supabase.com/dashboard .
2. Se non hai un account, scegli Sign up; puoi usare Continue with GitHub oppure email e password. Completa l'eventuale verifica email.
3. Se viene chiesta un'organizzazione, premi New organization, scrivi `Sisal FC 2021`, scegli il piano **Free**, quindi Create organization. L'organizzazione è il contenitore del progetto.
4. Premi **New project**, seleziona quell'organizzazione.
5. Nome: `sisal-fc-2021`.
6. Database password: usa Generate a password oppure una password lunga e unica. Salvala nel tuo gestore password con il nome “Sisal Supabase database”. Non serve inserirla nell'app, in Vercel o in Termux.
7. Regione: scegli **Europe / Frankfurt** se disponibile. Lascia le altre opzioni predefinite, senza componenti aggiuntivi a pagamento.
8. Premi **Create new project**. Attendi che compaia la dashboard del progetto pronta all'uso.
9. Controlla che l'organizzazione risulti Free nella sezione Billing/Subscription. Non attivare Pro.

Fermati qui se vuoi procedere insieme, una fase alla volta. Non inviarmi password, token, chiavi segrete o schermate che li mostrino.

## 2. Crea le tabelle

1. Estrai lo ZIP. Dentro `app/setup` trovi quattro file SQL completi.
2. Nella dashboard del progetto Supabase, menu laterale → **SQL Editor** → **New query** (o pulsante `+`).
3. Apri `01-database.sql` con Blocco note. Seleziona tutto, copia e incolla nella nuova query. Incolla il file completo, una sola volta: include la transazione.
4. Premi **Run**. Deve terminare senza errori; per istruzioni senza risultati è normale leggere “Success. No rows returned”.
5. Menu laterale → **Table Editor**, schema `public`: devono esserci `team_state`, `communications`, `communication_reactions`, `player_photos`, `sisal_requests`.
6. Apri `team_state`: devono esserci due righe, `own` e `opponent`, ancora vuote. RLS deve risultare abilitata sulle cinque tabelle. Non aggiungere policy pubbliche.

Se Run mostra un errore, non procedere al trasferimento: conserva il messaggio, senza chiavi. Il file non modifica le altre tabelle di un progetto, ma questa procedura è pensata per un progetto nuovo.

## 3. Crea Storage

1. Torna in **SQL Editor → New query**.
2. Incolla tutto `02-storage.sql` e premi **Run**.
3. Menu **Storage → Files/Buckets**: apri `sisal-images`.
4. In configurazione bucket verifica: nome esatto `sisal-images`; **Public disattivato**, limite `315000` byte, MIME consentito `image/jpeg`.
5. Non creare un secondo bucket, non renderlo pubblico e non aggiungere policy anon/authenticated. Il server userà la chiave segreta e le immagini passeranno dalle API Sisal.

Il file SQL crea il bucket e tutte le impostazioni: non occorre ricrearlo a mano. I Comunicati applicano inoltre il limite più basso di 192 KiB.

## 4. Trova i due valori Supabase

| Nome da usare | Dove trovare il valore | Riservatezza |
|---|---|---|
| `SUPABASE_URL` | Progetto → pulsante **Connect** → Project URL; in alcune viste è anche Settings → Data API → Project URL | URL del progetto, non una password |
| `SUPABASE_SECRET_KEY` | Progetto → **Settings → API Keys** → scheda **Publishable and secret API keys** → Secret keys → crea una secret key se assente → Copy | Segreta, di norma inizia con `sb_secret_`; solo server |

Non usare la Publishable key (`sb_publishable_`) o la vecchia anon key. È supportata anche la vecchia `service_role` JWT se necessaria, ma scegli la nuova secret key per un progetto nuovo. Non usare la password database al suo posto. Non pubblicare mai secret key, service_role, password database o token Blob.

## 5. Prepara un'anteprima Vercel senza cambiare produzione

1. Apri https://github.com/Adra02/sisal-fc-2021 . Prima controlla che main sia ancora `66c5c09`. Se è cambiato, fermati: le modifiche successive vanno integrate, non sovrascritte.
2. Dal menu del branch `main`, crea `migrazione-supabase` a partire da main.
3. In quel branch carica i file elencati in `docs/FILE.md`, mantenendo i percorsi. GitHub **Add file → Upload files** permette di trascinare i file e le sottocartelle contenuti in `app`, non la cartella `app` stessa. Per evitare upload di tutto il progetto puoi copiare soltanto i file modificati e nuovi indicati nell'elenco.
4. Non caricare `strumento-export`, backup, `.env.local`, `node_modules`, né la cartella `.git`. Non fare merge su main.
5. Apri https://vercel.com/dashboard → progetto **sisal-fc-2021 → Settings → Environment Variables**.
6. **Add Environment Variable**: Name `SUPABASE_URL`; Value il Project URL. Seleziona **Preview** e **Production**. Development solo se vuoi eseguire il server Vercel localmente; non serve al trasferimento da terminale. Premi Save.
7. Ripeti per `SUPABASE_SECRET_KEY`; scegli tipo **Secret/Sensitive** se disponibile, con Preview e Production. La chiave viene usata solo dalle API server.
8. Lascia invariata `GEMINI_API_KEY`. Non eliminare ancora le variabili Blob.
9. **Deployments → deployment del branch migrazione-supabase → ⋯ → Redeploy**, con ambiente Preview. Le nuove variabili valgono dai nuovi deployment.
10. L'anteprima inizialmente ha dati vuoti. Non inserire dati di prova nel progetto Supabase destinato alla migrazione: l'importatore richiede una destinazione vuota.

Non promuovere ancora in produzione. Il codice non contiene chiavi e non usa una variabile NEXT_PUBLIC/VITE per Supabase.

## 6. Metti in pausa i salvataggi del vecchio sito

Serve una finestra tranquilla: niente pulsanti Termux, nuove foto, comunicati o like fino alla fine del passaggio.

1. Aspetta che eventuali pubblicazioni pendenti siano terminate; conserva le bozze non pubblicate sul dispositivo.
2. Nel branch **main originale** sostituisci SOLO questi tre file con quelli dentro `strumento-export/freeze`: `lib/shared-store.js`, `lib/comunicati-store.js`, `api/player-photo.js`.
3. Esegui il commit e aspetta che il deployment Production sia Ready. Sono copie della base analizzata con le scritture bloccate; NON sono il codice Supabase finale.
4. Apri il sito pubblico e prova una modifica: deve essere rifiutata. Anche foto e Comunicati devono rifiutare il salvataggio. L'archivio non viene cancellato. Alcune letture che tentano una riparazione automatica possono mostrare errore durante la pausa.
5. Evita accessi ai vecchi URL di deployment Vercel: il blocco riguarda il nuovo deployment sul dominio pubblico, non riscrive deployment storici. Nessuno deve usare direttamente API di vecchi deployment durante il trasferimento.

I tre file di freeze non vanno copiati nel progetto finale. In caso di annullamento PRIMA del passaggio, puoi ripristinarli dal commit originale. Non riabilitare scritture dopo aver copiato i dati senza ripetere la verifica della sorgente.

## 7. Copia Blob in un backup locale (PC consigliato)

1. Installa Node.js **24 LTS** da https://nodejs.org . Su Windows apri Windows Terminal/PowerShell; su Mac apri Terminale. Chiudi e riapri il terminale dopo l'installazione. `node --version` deve mostrare `v24...`.
2. Estrai lo ZIP in una cartella facile da trovare. Apri `strumento-export` in Esplora file, clicca nella barra dell'indirizzo, scrivi `powershell` e premi Invio. Il terminale si apre in quella cartella.
3. Apri Vercel → progetto → **Storage → tuo Blob store → Settings / .env.local** e copia il **Read/Write token**. Se non è visualizzabile, usa il comando dell'interfaccia per generarlo. Non revocare quello in uso adesso.
4. In `strumento-export`, crea con Blocco note un file chiamato ESATTAMENTE `.env.local` (tipo “Tutti i file”, non `.txt`). Contenuto:

```dotenv
BLOB_READ_WRITE_TOKEN=INCOLLA_QUI_IL_TOKEN_SUL_TUO_PC
```

5. Nel terminale di quella cartella esegui, uno alla volta:

```sh
npm install
node --env-file=.env.local export.mjs backup-sisal
```

6. Attendi **BACKUP COMPLETO: ... file**. Deve esistere `backup-sisal/manifest.json` con `complete: true`. Non modificare i file `.bin`.
7. Lo script effettua elenco e letture, con doppio confronto del contenuto. Non scrive o elimina Blob. Durante QUESTA fase ci sono ancora operazioni Blob: lo zero riguarda l'app dopo il passaggio.

Se segnala “Sorgente cambiata”, lascia il sito in pausa e ripeti con un nome nuovo, per esempio `backup-sisal-2`. Se ci sono errori non usare un backup incompleto. Conserva una seconda copia del backup in un posto privato; non metterla su GitHub.

## 8. Importa e confronta Supabase

1. In Supabase **SQL Editor → New query**, incolla tutto `app/setup/03-import-temporary.sql` → **Run**.
2. Apri un terminale dentro la cartella `app`, come fatto sopra.
3. Crea qui un altro `.env.local`, privato, con:

```dotenv
SUPABASE_URL=https://IL_TUO_PROGETTO.supabase.co
SUPABASE_SECRET_KEY=INCOLLA_QUI_LA_SECRET_KEY_SUL_TUO_PC
```

4. Non aggiungere il token Blob a questo file. Esegui:

```sh
node --env-file=.env.local migration/import.mjs import ../strumento-export/backup-sisal
```

5. Lo script carica i JPEG nello Storage, poi tutte le righe database in UNA transazione. Se trova una destinazione già utilizzata si ferma, senza sovrascriverla. Se l'import è già riuscito ma la rete cade durante la verifica, usa il comando `verify` sotto, non svuotare le tabelle.
6. Deve comparire **VERIFICA COMPLETA: dati, memoria, reazioni e byte delle immagini coincidono**. Trovi anche `verification.json` nel backup. Controlla `inventory-review.json`: percorsi sconosciuti bloccano il caricamento e richiedono analisi; non cancellarli per forzare il passaggio.
7. Per ripetere SOLO il confronto:

```sh
node --env-file=.env.local migration/import.mjs verify ../strumento-export/backup-sisal
```

8. Torna al terminale `strumento-export` e controlla che la sorgente non sia cambiata:

```sh
node --env-file=.env.local export.mjs backup-sisal --verify
```

Deve comparire **SORGENTE INVARIATA**. In caso contrario non pubblicare la nuova app: serve confrontare e importare le modifiche sopraggiunte. Non esiste un merge automatico sicuro contro una destinazione già modificata.

9. In Table Editor verifica `team_state`: own/opponent, files, totals e memory; apri memory → snapshots. Controlla communications e communication_reactions. In Storage → sisal-images trovi cartelle news e players. Il confronto automatico è più completo del solo conteggio a vista.

## 9. Verifica l'anteprima e passa alla nuova app

1. Riapri il deployment Preview del branch. Guarda squadra, avversario, foto, storico e articoli migrati. Prima di fare prove che modificano contenuti, assicurati che il confronto della fase 8 sia riuscito.
2. Esegui la checklist nella sezione seguente con due browser/dispositivi, soprattutto foto e like.
3. Dopo le prove rimuovi solamente i comunicati di test. Le prove di modifica cambiano intenzionalmente i dati di destinazione: un successivo confronto contro il vecchio backup segnalerà queste differenze, quindi conserva il primo rapporto integro.
4. Solo quando decidi tu di pubblicare, sostituisci in main i file finali della cartella `app` elencati in FILE.md, compresi i tre che annullano il freeze. Non sovrascrivere altre modifiche eventualmente aggiunte dopo la base.
5. Attendi il deployment Production Ready. Il dominio pubblico e `/api/club-data` restano gli stessi: i pulsanti Termux non devono essere riscritti.
6. Riapri l'app e aggiorna la pagina per caricare il nuovo service worker. Apri `/api/health`: deve indicare `supabaseConfigured: true` e `databaseReachable: true`.
7. Prova i due pulsanti Termux sul telefono e verifica i nuovi dati da un secondo browser. Solo qui si può confermare il funzionamento dei tuoi pulsanti reali.
8. Quando tutto è verificato, esegui `04-close-import.sql` in SQL Editor: rimuove soltanto la funzione temporanea di importazione.

Non tornare automaticamente alla vecchia app dopo nuove scritture su Supabase: Blob non contiene quelle modifiche. Un eventuale ritorno richiede prima salvare e riconciliare i nuovi dati.

## Checklist finale

- [ ] Apro la web app, vedo la mia squadra e l'avversario.
- [ ] Statistiche, giocatori, stagioni, playoff, amichevoli e U5 coincidono con i dati precedenti.
- [ ] Aggiorno IL MIO CLUB da Termux; un secondo dispositivo vede il nuovo dato dopo aggiornamento.
- [ ] Aggiorno AVVERSARIO da Termux; il vecchio avversario è sostituito correttamente.
- [ ] L'IA risponde e la memoria conserva lo storico; lo stesso dataset non duplica il fingerprint.
- [ ] Pubblico, apro, modifico, fisso, archivio, ripristino ed elimino un comunicato.
- [ ] Allego e sostituisco la foto del comunicato.
- [ ] Metto like: aumenta. Tolgo like: diminuisce. Refresh: resta corretto.
- [ ] Due browser mettono like: il conteggio è condiviso; una modifica del testo non perde i like.
- [ ] Due editor sulla stessa revisione: uno salva, l'altro riceve conflitto e conserva la bozza.
- [ ] Un errore di rete non perde il testo.
- [ ] Esporto un testo lungo e ritrovo l'ultimo paragrafo nelle pagine numerate.
- [ ] Su telefono e desktop i Comunicati hanno impaginazione editoriale e lo stesso sfondo generale.
- [ ] Cambio foto giocatore, la vedo nel profilo giusto e su un secondo dispositivo.
- [ ] Formazioni, corse, navigazione ed effetti già esistenti funzionano.
- [ ] Le richieste dell'app non contattano Vercel Blob; i log non mostrano operazioni Blob.
- [ ] Conservo backup e rapporto verification.json. Nessuna chiave è stata caricata su GitHub.

## Spazio e piano Free

Documentazione ufficiale controllata il 13 ottobre 2026: https://supabase.com/pricing . Free comprende 500 MB database, 1 GB file, 5 GB egress e 5 GB cached egress; massimo due progetti attivi; pausa dopo una settimana di inattività. I backup automatici non sono inclusi. Le immagini passano dal server e non è garantito che beneficino del traffico cached: considera soprattutto l'egress ordinario.

Non attivare trasformazioni immagini o Edge Functions: non servono. Controlla Organization → Usage e Project → Storage periodicamente. Questa consegna limita foto/testi, evita polling e separa dati/immagini, ma non può garantire consumi gratuiti con traffico o abusi illimitati. Restano anche le quote Vercel e Gemini già esistenti.

Le vecchie versioni delle foto vengono conservate per sicurezza. Per vedere il loro peso, dal terminale app:

```sh
node --env-file=.env.local migration/storage-audit.mjs
```

È solo un inventario. Non cancella niente. Se lo spazio cresce molto, serve una pulizia in una finestra senza scritture dopo aver identificato i file non referenziati.

## Blob: per ora non eliminarlo

Non scollegare lo store, non revocare i token e non cancellare backup adesso. La rimozione definitiva è una fase successiva alla checklist reale: in questa consegna non è stata eseguita né autorizzata automaticamente. Dopo la verifica ti guiderò nel rimuovere le variabili obsolete e i collegamenti dei vecchi deployment. Solo allora l'intero progetto distribuito potrà essere dichiarato privo di utilizzo Blob, non semplicemente il nuovo codice.

## Fonti e valori privati

- Chiavi: https://supabase.com/docs/guides/getting-started/api-keys
- SQL e Run: https://supabase.com/docs/guides/database/functions
- Storage e accessi: https://supabase.com/docs/guides/storage/security/access-control
- Variabili e nuovo deployment: https://vercel.com/docs/environment-variables

Gli account delle dashboard sono solo per te che configuri il progetto. I visitatori della Sisal continuano a usare l'app senza login.
