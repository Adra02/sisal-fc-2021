# Sisal FC 2021 — FC27 AI LIVE

Dashboard mobile-first per EA SPORTS FC 27 Clubs. Per collegare una squadra basta inserire il nome del club.

## Flusso live — una sola richiesta Gemini
Nome club → 1 richiesta Gemini → Google Search + URL Context → Pro Clubs Tracker → JSON completo con Stats + Fun + Players + Matches → dashboard costruito localmente.

La sincronizzazione non esegue quattro richieste separate. Non usa retry/fallback automatici: un tentativo di sincronizzazione = una richiesta Gemini.

## Cache locale
Per 10 minuti il browser conserva l'ultimo JSON valido per club e ruolo. Premendo di nuovo "Aggiorna" nello stesso intervallo, il sito usa i dati locali e non richiama Gemini. Le richieste duplicate simultanee per lo stesso club vengono inoltre bloccate.

Con "Aggiorna squadra + avversario" sono possibili al massimo 2 richieste quando entrambi i club non sono in cache: una per club.

## Sezioni
- Squadra
- Giocatori
- Top 3
- Campo
- Partite
- Fun
- Avversario
- IA
- I tuoi dati

La sezione IA/assistente fa una richiesta separata soltanto quando viene fatta una domanda all'assistente. Non fa parte della sincronizzazione live.

## Knowledge FC27
Il workflow automatico gira lunedì e venerdì alle 12:17 UTC, analizza al massimo 1 nuovo video rilevante e non esegue retry/fallback su altri modelli. Se non trova video nuovi, non chiama Gemini.

## Installazione app
In "I tuoi dati" trovi i pulsanti per Android e iPhone. Android usa il prompt PWA quando disponibile; iPhone mostra la procedura Safari per aggiungere il sito alla schermata Home come app web.

## Vercel
Root Directory: `/`
Framework Preset: Other
Build Command: vuoto
Output Directory: vuoto
Environment Variables: `GEMINI_API_KEY` + `GROQ_API_KEY`

Node.js: 24.x

Non aggiungere un blocco `functions` in `vercel.json`: le funzioni sono nella cartella `/api`.

## File principali
- `index.html` — interfaccia mobile e desktop, tema nero/verde Sisal e watermark del cavallo sullo sfondo.
- `api/club-ai-sync.js` — singola sincronizzazione Gemini per club.
- `api/assistente.js` — assistente tattico Groq; nessun fallback Gemini.
- `api/health.js` — test rapido della Function.
- `knowledge/fc27-knowledge.json` — base conoscenza FC27.
- `scripts/update-fc27-knowledge.mjs` — aggiornamento knowledge YouTube RSS + Gemini, 1 video per esecuzione.
- `scripts/test-club-ai-sync.mjs` — test automatici one-request con Gemini simulato.
- `assets/horse-watermark.webp` — elemento grafico del cavallo verde sullo sfondo.

## Controlli
Eseguire `npm run verify` e `npm run test:sync`.

Il progetto non inventa statistiche quando una sezione pubblica non è leggibile. In particolare, la sincronizzazione viene bloccata se manca completamente la rosa Players.

Diagnostica 429: la sincronizzazione espone quotaId, limite e RetryInfo restituiti da Google, invece di confondere RPD, RPM e TPM in un unico messaggio.
