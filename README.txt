Sisal FC 2021 — FC27 Clubs Command Center (V11 FIX)

Questa versione separa completamente il recupero dei dati del Club dall'IA.

#Flusso live del Club

Inserisci il nome del club. `/api/club-ai-sync` interroga direttamente i server pubblici EA Sports FC tramite gli endpoint Clubs e recupera:

- ricerca del club
- statistiche generali
- statistiche dei giocatori
- ultime partite di campionato e playoff

Il recupero live del Club **non usa Gemini**, non usa Google Search grounding e non usa Groq.

Le API EA usate sono non ufficialmente documentate e possono cambiare. Il codice include timeout, gestione degli errori e blocco dell'aggiornamento parziale quando mancano le statistiche giocatori necessarie.

#Assistente IA

`/api/assistente` usa esclusivamente `gemini-3.5-flash-lite` e riceve i dati già recuperati da EA. Non deve cercare il Club sul web e non usa strumenti di Search o URL Context per l'analisi numerica.

Il modello è fissato nel codice per evitare che una vecchia variabile Vercel possa forzare un modello Gemini 2.5 non disponibile ai nuovi progetti.

#Vercel

Variabile necessaria:

- `GEMINI_API_KEY` — chiave Gemini del progetto Google che utilizzi

Non sono necessarie `GEMINI_MODEL` o `GROQ_API_KEY`.

Per evitare confusione, elimina `GEMINI_MODEL` dalle Environment Variables Vercel se esiste: questa versione non la legge.

Dopo aver aggiornato GitHub, crea una nuova deployment Production in Vercel.

#PWA / cache

Il service worker usa una cache versionata `v11`. Questo forza il browser a scaricare la nuova shell dell'app invece di riutilizzare quella V10.

#Knowledge YouTube

La GitHub Action opzionale legge i feed RSS dei canali configurati e può analizzare un video FC27 Clubs con `gemini-3.5-flash-lite` usando direttamente l'URL YouTube come input video. Non usa Google Search.

La chiave è sempre `GEMINI_API_KEY`, impostata come secret GitHub Actions.

#Test

npm run verify
npm run test:sync
npm run test:ai
npm run test:ai-connection

La build non contiene chiavi API hardcoded.
