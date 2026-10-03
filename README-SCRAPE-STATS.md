# /api/scrape-stats — EA SPORTS FC 27

Endpoint GET dinamico:

`/api/scrape-stats?clubName=Sisal%20FC%202021&platform=common-gen5`

Flusso:
1. Apre `https://proclubstracker.com/search?q=<clubName>` con Chromium headless.
2. Se necessario seleziona la piattaforma richiesta nella UI PCT.
3. Individua il risultato che corrisponde al nome richiesto e segue esclusivamente il link PCT del club.
4. Attende il rendering dinamico della pagina del club.
5. Estrae testo, heading, tabelle, key/value, sezioni e link dal DOM.
6. Restituisce sia lo snapshot PCT sia i dati normalizzati per il frontend/Gemini.

La funzione non chiama direttamente `proclub.ea.com` e non tenta di bypassare protezioni anti-bot. Se PCT blocca l'automazione o non carica i dati, l'endpoint restituisce un errore esplicito invece di inventare dati.

Dipendenze già presenti nel progetto:
- `puppeteer-core`
- `@sparticuz/chromium`

Test locale:

`npm run test:scrape`
