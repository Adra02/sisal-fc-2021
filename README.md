# Sisal FC 2021 — FC27 Command Center v27.0

## 10 sorgenti JSON riconosciute automaticamente
Per ciascuna squadra il sito riconosce e salva separatamente questi 10 file: Dati totali, Stagione corrente, Informazioni club, Overall Stats, Giocatori, Carriera giocatori, Campionato, Playoff, Amichevoli e Playoff Achievements. La stessa struttura è disponibile per la squadra avversaria.

Il riconoscimento usa struttura del JSON + nome file e, quando `GEMINI_API_KEY` è disponibile, una conferma semantica di Gemini. Se la classificazione automatica e Gemini sono in forte conflitto, il file non viene salvato nella categoria potenzialmente sbagliata.

## Totale storico e ultime 5
Il file Dati totali è la fonte ufficiale per Partite, Vittorie, Pareggi, Sconfitte, Gol fatti e Gol subiti storici. Questi valori non vengono ricostruiti contando le ultime 5 partite.

U5 = esclusivamente le 5 partite più recenti dell archivio Campionato + Playoff + Amichevoli disponibili.

## Archivio condiviso
I JSON vengono salvati su Vercel Blob privato. Una volta caricati, tutti i visitatori del sito leggono lo stesso dataset. Non è presente alcun PIN, login o controllo amministrativo.

## IA
`api/assistente.js` legge la mappa delle 10 sorgenti, i dati normalizzati e la memoria storica degli snapshot. Gemini deve rispettare gli scope: totale storico, cumulativo giocatori, archivio partite e ultime 5 non vanno mischiati.

## ProClubTracker
Resta disponibile l importazione opzionale del totale storico da un link pubblico del club. Il link viene salvato separatamente e può essere riutilizzato con Aggiorna totali.

## Deployment
1. Collega un Vercel Blob al progetto.
2. Imposta `GEMINI_API_KEY`.
3. Esegui una nuova Production deployment.

## Test
```bash
npm install
npm run verify
npm run test:pipeline
npm run test:shared
npm run test:file-recognition
npm run test:ai
npm run test:ai-connection
npm run test:frontend
npm run test:tracker-import
```
