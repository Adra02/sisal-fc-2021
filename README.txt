FC27 CLUBS COMMAND CENTER

STRUTTURA
index.html            -> tutta l'interfaccia e il codice frontend
api/assistente.js     -> API IA Gemini per Vercel

I DATI NON SONO INCLUSI
Questo progetto NON contiene players.json, matches.json, nomi dei tuoi giocatori o statistiche della tua squadra.
I file vengono scelti manualmente dall'utente dal browser.

USO LOCALE
Puoi aprire index.html direttamente per testare caricamento JSON/TXT, statistiche, campo e navigazione.
L'IA richiede pubblicazione su Vercel.

VERCEL + IA
1. Crea un repository GitHub.
2. Carica index.html e la cartella api con assistente.js.
3. Importa il repository in Vercel.
4. In Vercel -> Settings -> Environment Variables crea:
   GEMINI_API_KEY = la tua chiave Gemini
5. Redeploy.

CARICAMENTO DATI
Squadra:
- Giocatori -> un file giocatori
- Partite -> un file partite
- Carica entrambi -> seleziona entrambi insieme; il sistema prova a riconoscere automaticamente il tipo.

Avversario:
Apri la sezione Avversario e seleziona i due file dell'avversario insieme.
Il sistema li salva separatamente dai dati della tua squadra.

NOTA JSON/TXT
Il file può avere estensione .json o .txt. L'estensione non è il punto importante: il contenuto deve essere JSON valido.

MODELLO IA
L'API prova in ordine Gemini 3.8 Flash, 3.7 Flash, 3.6 Flash, 3.5 Flash e 3.5 Flash-Lite.
In caso di 429/503/5xx applica retry con backoff prima di passare al modello successivo.
