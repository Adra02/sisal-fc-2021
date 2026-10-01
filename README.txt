SISAL FC 2021 — DASHBOARD

IMPORTANTE:
Questo progetto NON contiene i tuoi dati di giocatori o partite.
Non c'e' matches.json nel progetto e non c'e' un players.js con dati reali.

COME USARLO
1. Carica questa cartella su GitHub/Vercel.
2. Apri il sito.
3. Premi "Carica file JSON".
4. Seleziona direttamente dal PC/telefono il file dei giocatori e/o il file delle partite.
5. Il sito riconosce automaticamente il tipo di file.
6. I dati vengono salvati nel localStorage del browser per non doverli ricaricare a ogni apertura dello stesso browser.

FORMATO
Il file partite puo' essere un array di partite come quello esportato da FC.
Il file giocatori puo' essere un array oppure un oggetto con una proprieta' players/members/data.

GEMINI SU VERCEL
Crea una Environment Variable:
GEMINI_API_KEY = la tua chiave Gemini
Opzionale:
GEMINI_MODEL = gemini-3.8-flash

NOTA PRIVACY
I file caricati vengono letti dal browser e salvati nel localStorage del browser.
Non vengono inviati al server finche' non usi la funzione IA.
Quando usi IA, il browser invia a /api/assistente i dati caricati e la domanda per ottenere la risposta Gemini.
