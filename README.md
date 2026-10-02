# Sisal FC 2021 — FC27 AI LIVE

Dashboard mobile-first per EA SPORTS FC 27 Clubs. Per collegare una squadra basta inserire **il nome del club**: Gemini cerca la squadra su Pro Clubs Tracker e legge separatamente le sezioni pubbliche Stats, Players, Matches e Fun.

## Flusso live

Nome club → Gemini + Google Search → pagina Pro Clubs Tracker → URL Context → dati strutturati → dashboard.

La sincronizzazione della squadra e quella dell’avversario sono separate. La sezione Giocatori usa i dati cumulativi della pagina Players; la sezione Partite mostra le ultime 5 partite; Fun mostra solo elementi realmente letti.

## Vercel

Root Directory: `/`

Framework Preset: Other

Build Command: vuoto

Output Directory: vuoto

Environment Variable: `GEMINI_API_KEY`

Node.js: 24.x

Non aggiungere un blocco `functions` in `vercel.json`: le funzioni sono nella cartella `/api`.

## File principali

- `index.html` — interfaccia mobile e desktop.
- `api/club-ai-sync.js` — ricerca live di club/Stats/Players/Matches/Fun con Gemini.
- `api/assistente.js` — assistente tattico Gemini.
- `api/health.js` — test rapido della Function.
- `knowledge/fc27-knowledge.json` — base conoscenza FC27.
- `scripts/update-fc27-knowledge.mjs` — aggiornamento YouTube RSS.
- `scripts/test-club-ai-sync.mjs` — test automatici della sincronizzazione live con Gemini simulato.

## Controlli

Eseguire `npm run verify` e `npm run test:sync`.

Il progetto non inventa statistiche quando una sezione pubblica non è leggibile. In quel caso la sezione viene marcata come non disponibile o la sincronizzazione viene bloccata se manca completamente la rosa Players.
