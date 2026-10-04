# Sisal FC 2021 — FC27 Command Center v26.3

## Sorgente dati
I dati del club arrivano esclusivamente dai file JSON/TXT caricati nell’archivio centrale del sito. Non vengono usate EA API, Pro Clubs Tracker o scraping.

## fino a 4 file per squadra
Per ogni squadra esistono esattamente quattro categorie: Giocatori, Partite di campionato, Playoff, Amichevoli. La stessa struttura esiste per la squadra avversaria.

## Archivio condiviso
I file vengono salvati su Vercel Blob privato. Una volta caricati, tutti i visitatori del sito leggono lo stesso dataset. Chiunque abbia il link può caricare, sostituire o cancellare i file: non è presente alcun PIN, login o controllo amministrativo. Nessuna delle quattro categorie è obbligatoria: il dataset può essere parziale e completato in seguito.

## IA
`api/assistente.js` legge direttamente dal Blob centrale, ricompone le quattro categorie e invia a Gemini `gemini-3.5-flash-lite` solo dati già presenti nel dataset. Nessun web search e nessuna chiamata EA.

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
npm run test:formation
```


### V26.3 - controllo scope, ultime 5 e formazione
- Totali Squadra = tutte le partite archiviate.
- U5 = massimo 5 partite più recenti.
- Formazione IA = funziona anche con meno di 11 giocatori: usa solo quelli disponibili e lascia vuoti gli slot mancanti.
- Top 3 = ultime 5 partite.
- Fun = forma U5, superlativi, impact score U5, hot/cold, red flags e record.
- IA = Gemini con dataset centralizzato, separazione rigida degli scope e ricalcolo logico dei totali dall’archivio quando necessario.
- Nessun filtro per piattaforma; riconciliazione roster/partite per non perdere giocatori.
- Posizioni campo coerenti con i moduli disponibili.
