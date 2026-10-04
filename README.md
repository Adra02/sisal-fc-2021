# Sisal FC 2021 — FC27 Command Center v26.8

## Sorgente dati
I dati del club arrivano esclusivamente dai file JSON/TXT caricati nell’archivio centrale del sito. Per i dati storici Totale è disponibile un import verificato dal link pubblico di ProClubTracker: il link viene letto da Gemini tramite URL Context, mentre i quattro file JSON/TXT restano la fonte per il roster e per le ultime 5.

## fino a 4 file per squadra
Per ogni squadra esistono esattamente quattro categorie: Giocatori, Partite di campionato, Playoff, Amichevoli. La stessa struttura esiste per la squadra avversaria.

## Archivio condiviso
I file vengono salvati su Vercel Blob privato. Una volta caricati, tutti i visitatori del sito leggono lo stesso dataset. Chiunque abbia il link può caricare, sostituire o cancellare i file: non è presente alcun PIN, login o controllo amministrativo. Nessuna delle quattro categorie è obbligatoria: il dataset può essere parziale e completato in seguito.

## IA
`api/assistente.js` legge direttamente dal Blob centrale, ricompone le quattro categorie e invia a Gemini `gemini-3.5-flash-lite` solo dati già presenti nel dataset. L’import ProClubTracker usa invece il tool URL Context di Gemini per leggere esclusivamente il link del club fornito dall’utente e verificare il record storico. Non viene usato Google Search e non viene chiamata l’API EA dal sito.

## Fun
La sezione Fun calcola automaticamente premi e curiosità dai dati di Giocatori, Campionato, Playoff e Amichevoli: capocannoniere, assistman, presenze, rating, precisione passaggi, contrasti, vittorie/sconfitte più larghe, clean sheet, partita più spettacolare, miglior prestazione singola e strisce di vittorie.

## Deployment
1. In Vercel apri il progetto → Storage → Blob → crea/collega un Blob store al progetto. Questo fornisce `BLOB_STORE_ID` e abilita l autenticazione OIDC automatica nelle Functions.
2. Imposta `GEMINI_API_KEY`.
3. Fai una nuova Production deployment.

Il progetto non considera più `VERCEL=1` come prova che Blob sia configurato: se il Blob non è collegato, l app mostra un errore esplicito invece di generare un falso “configurato”.

## Installazione Android
Su Android Chrome può installare il sito come PWA dalla sezione “I tuoi dati” oppure dal menu ⋮ → “Installa app”. Su iPhone è possibile usare Safari → Condividi → Aggiungi a Home.

## Test
```bash
npm install
npm run verify
npm run test:pipeline
npm run test:shared
npm run test:ai
npm run test:ai-connection
```


### V26 - controllo scope e affidabilità
- Totali Squadra = tutte le partite archiviate.
- Top 3 = ultime 5 partite.
- Fun = forma U5, superlativi, impact score U5, hot/cold, red flags e record.
- IA = Gemini con dataset centralizzato, separazione rigida degli scope e modalità audit/fun.
- Nessun filtro per piattaforma; riconciliazione roster/partite per non perdere giocatori.
- Posizioni campo coerenti con i moduli disponibili.


## ProClubTracker
Il link del club viene salvato in Vercel Blob. L’importazione passa da Gemini con URL Context e, se URL Context non recupera la pagina, Gemini riceve come fallback il contenuto della stessa identica pagina scaricato dal server. Il link resta salvato anche quando l’importazione fallisce.
