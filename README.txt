SISAL FC 2021 — FC27 COMMAND CENTER V14

FLUSSO DATI
L'utente NON inserisce il nome del club.
Inserisce i link pubblici Pro Clubs Tracker:
- propria squadra: Stats, Fun, Players, Matches
- avversario: Stats, Players, Matches

Il backend apre esclusivamente questi URL con Chromium server-side e legge il contenuto pubblico renderizzato.
Il codice applicativo NON chiama direttamente proclubs.ea.com e NON usa proxy esterni.

IA
Gemini 3.5 Flash-Lite analizza solo i dati già letti da Pro Clubs Tracker.
In Vercel serve solo GEMINI_API_KEY.

VERIFICA
npm install
npm run verify
npm run test:pct
npm run test:sync
npm run test:ai
npm run test:ai-connection
