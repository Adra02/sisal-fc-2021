# Sisal FC 2021 — FC27 Command Center v21

## Sorgente dati
I dati del club arrivano esclusivamente dai file JSON/TXT caricati nell’archivio centrale del sito. Non vengono usate EA API, Pro Clubs Tracker o scraping.

## 4 file per squadra
Per ogni squadra esistono esattamente quattro categorie: Giocatori, Partite di campionato, Playoff, Amichevoli. La stessa struttura esiste per la squadra avversaria.

## Archivio condiviso
I file vengono salvati su Vercel Blob privato. Una volta caricati, tutti i visitatori del sito leggono lo stesso dataset. Chiunque abbia il link può caricare, sostituire o cancellare i file: non è presente alcun PIN, login o controllo amministrativo.

## IA
`api/assistente.js` legge direttamente dal Blob centrale, ricompone le quattro categorie e invia a Gemini `gemini-3.5-flash-lite` solo dati già presenti nel dataset. Nessun web search e nessuna chiamata EA.

## Fun
La sezione Fun calcola automaticamente premi e curiosità dai dati di Giocatori, Campionato, Playoff e Amichevoli: capocannoniere, assistman, presenze, rating, precisione passaggi, contrasti, vittorie/sconfitte più larghe, clean sheet, partita più spettacolare, miglior prestazione singola e strisce di vittorie.

## Deployment
1. Collega un Vercel Blob privato al progetto.
2. Imposta `GEMINI_API_KEY`.
3. Deploy su Vercel con Node 24.x.

## Test
```bash
npm install
npm run verify
npm run test:pipeline
npm run test:shared
npm run test:ai
npm run test:ai-connection
```
