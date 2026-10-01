SISAL / FC CLUBS DASHBOARD - VERSIONE CORRETTA

STRUTTURA:
- index.html -> tutto il dashboard, CSS + JavaScript inclusi
- api/assistente.js -> endpoint IA per Vercel
- NON sono inclusi dati della squadra
- NON sono inclusi matches.json o players.json

USO:
1. Apri index.html oppure pubblica l'intera cartella su Vercel.
2. Premi "Carica giocatori" e seleziona il file dei giocatori.
3. Premi "Carica partite" e seleziona il file delle partite.
4. In alternativa usa "Carica entrambi" e il sito riconosce i due file.
5. L'estensione puo essere .json oppure .txt: il contenuto deve essere JSON valido.

IMPORTANTE:
- Non caricare solo index.html se vuoi usare anche l'IA su Vercel: devi pubblicare l'intera cartella, compresa api/.
- Il caricamento file, i sei pulsanti inferiori e il campo tattico funzionano anche aprendo index.html direttamente.
- I dati caricati vengono salvati localmente nel browser.

IA SU VERCEL:
- In Vercel -> Settings -> Environment Variables crea GEMINI_API_KEY con la tua chiave Gemini.
- Dopo averla aggiunta fai Redeploy.
- Il codice usa il modello stabile gemini-3.8-flash.
