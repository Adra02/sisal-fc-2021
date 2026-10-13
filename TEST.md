# Verifiche realmente eseguite

Base main: 66c5c097b96e50eda7846791d7bbfebdf265d6db. Tutti gli script test-*.mjs e verify-project.mjs sono stati eseguiti prima sulla base e poi sulla versione preparata.

Base: **12 superati / 30**, 18 fallimenti. Versione preparata: **18 superati / 36**, gli stessi 18 fallimenti preesistenti. Nessun test prima superato risulta ora fallito. I log sono in test-results.json. Questo NON significa che tutta l'app sia verificata in produzione.

I fallimenti originali includono fixture assenti in /mnt/data, versioni hard-coded 32.1.25/32.1.26 e simulatori DOM incompleti. Non sono stati eliminati per ottenere un risultato verde. I controlli sullo storage sono stati adattati a PostgreSQL; i controlli sulle altre funzioni restano. Le fixture reali mancanti non sono state inventate.

## Test nuovi

- SQL PostgreSQL eseguito in PGlite: CRUD Comunicati, pin/archivio/ripristino, like di due dispositivi, ripetizioni, rimozione, reazioni dopo modifica, revisioni in conflitto, ricevute idempotenti, accesso anon negato, memoria con fingerprint e limite 20.
- Handler API veri collegati al PostgreSQL locale con trasporto Supabase simulato: multipart own/opponent, totali, memoria, cancellazione, foto con revisioni e tombstone. Le richieste osservate vanno solamente al trasporto Supabase di test.
- Importatore eseguito su backup di test: transazione, confronto contenuti, byte delle foto, conservazione memoria e like, rifiuto backup corrotto/destinazione non vuota. Nessun dato reale trasferito.
- Frontend in JSDOM: elenco, articolo, testo sicuro, like/unlike e bozza mantenuta in caso di errore. Non è un controllo visivo in browser.
- Canvas nativo: generazione di 17 PNG per un testo lungo, presenza dell'ultimo paragrafo e assenza di sovrapposizione con il piè di pagina. Prima pagina aperta e controllata visivamente. Non sono state provate le finestre native di condivisione dei telefoni.
- Ricerca automatica in sorgenti dell'app e dipendenze: nessun SDK, token o URL Vercel Blob. La classe JavaScript Blob usata per esportazioni locali non è Vercel Blob.
- Compatibilità service worker verificata sul codice: API escluse e versione cache aggiornata. Aggiornamento reale di una PWA installata non provato.

## Limiti indispensabili prima di pubblicare

**Non posso confermarlo perché non è stato possibile testarlo direttamente.** Questo vale per Supabase ospitato, Vercel in produzione, password/chiavi reali, trasferimento dell'archivio reale, Gemini reale, pulsanti Termux del telefono, due dispositivi fisici, aggiornamento reale del service worker, condivisione nativa, grafica mobile/desktop in un browser.

La procedura Sites disponibile in questo ambiente impone di saltare la verifica browser quando manca control-browser, senza installare browser o improvvisare altri percorsi. Tale controllo non era disponibile. La revisione CSS/DOM e del PNG esportato non sostituisce la verifica del layout sul telefono.

Non è stata eseguita alcuna pubblicazione né cancellazione del vecchio archivio. Il nuovo codice non effettua operazioni Blob; il sito pubblico continua a usare il vecchio archivio finché non esegui il passaggio. L'esportatore una tantum, separato dall'app, legge intenzionalmente Blob.

## Checklist richiesta: stato

| Numeri della richiesta | Verifica | Evidenza / limite |
|---|---|---|
| 1, 34 | Apertura e refresh web app | Codice/cache esaminati; browser e PWA reali da provare |
| 2–6 | Squadre e aggiornamenti/sostituzione | API locali, multipart e PostgreSQL; dataset reale da migrare |
| 7–12 | Statistiche, giocatori, partite, stagione, playoff, amichevoli | Pipeline invariata; test disponibili eseguiti, fixture reali mancanti |
| 13–14 | Memoria e aggiornamento | Test PostgreSQL e API, fingerprint e 20 snapshot |
| 15 | Assistente IA | Contratto/modello/prompt e formazioni controllati; Gemini reale non chiamato |
| 16–21 | CRUD Comunicati, archivio, pin | PostgreSQL locale; apertura anche DOM |
| 22–23 | Foto Comunicati | Store/import di test e byte verificati; Storage ospitato da provare |
| 24–28 | Like/rimozione/conteggio/persistenza/due utenti | Due UUID indipendenti, richieste concorrenti e riletture DB; due telefoni reali non provati |
| 29–31 | Grafica e sfondo | CSS riprende il background di sisal-pro.css; verifica visiva browser mancante |
| 32–33 | Foto giocatori | API, identità, sostituzione, tombstone, rifiuto revisioni vecchie; Storage ospitato da provare |
| 35–36 | Secondo dispositivo e condivisione dati | Simulazione di richieste indipendenti; dispositivi fisici da provare |
| 37–39 | Termux e compatibilità | Endpoint/formato preservati; script personali assenti, pulsanti non accessibili |
| 40 | Assenza chiamate Blob | Scansione sorgenti e rete locale simulata: nessun uso nell'app finale; produzione ancora non migrata |

## Risultati per script

| Script | Risultato |
|---|---|
| test-ai-connection.mjs | PASS |
| test-analytics-v31.mjs | FAIL già nella base |
| test-assistente.mjs | PASS |
| test-branding-asset.mjs | FAIL già nella base |
| test-data-pipeline.mjs | FAIL già nella base |
| test-export.mjs | PASS |
| test-file-recognition.mjs | FAIL già nella base |
| test-formation.mjs | PASS |
| test-frontend-runtime.mjs | FAIL già nella base |
| test-migration.mjs | PASS |
| test-news-client.mjs | PASS |
| test-no-legacy-storage.mjs | PASS |
| test-player-identity-v32141.mjs | PASS |
| test-player-photo-v32141.mjs | PASS |
| test-proclubs-schema.mjs | FAIL già nella base |
| test-real-fixtures-v290.mjs | FAIL già nella base |
| test-rich-data.mjs | FAIL già nella base |
| test-rich-ui-v290.mjs | FAIL già nella base |
| test-shared-contract.mjs | PASS |
| test-supabase-api.mjs | PASS |
| test-supabase.mjs | PASS |
| test-tracker-import.mjs | PASS |
| test-v290-behavior.mjs | FAIL già nella base |
| test-v300-ui-cleanup.mjs | FAIL già nella base |
| test-v32.1-ui.mjs | FAIL già nella base |
| test-v320-ui-branding.mjs | FAIL già nella base |
| test-v321-metrics.mjs | PASS |
| test-v3212-profiles.mjs | PASS |
| test-v32121-effects.mjs | PASS |
| test-v32123-race.mjs | FAIL già nella base |
| test-v32124-realism-blob.mjs | FAIL già nella base |
| test-v32125-ai-race-director.mjs | FAIL già nella base |
| test-v32126-ai-race-director-visible.mjs | FAIL già nella base |
| test-v3213-profile-ai.mjs | PASS |
| test-v3215-recent-tech.mjs | PASS |
| verify-project.mjs | FAIL già nella base |
