# Sisal FC 2021 — FC27 Command Center v32.1.2

## 10 sorgenti JSON riconosciute automaticamente
Per ciascuna squadra il sito riconosce e salva separatamente questi 10 file: Dati totali, Stagione corrente, Informazioni club, Overall Stats, Giocatori, Carriera giocatori, Campionato, Playoff, Amichevoli e Playoff Achievements. La stessa struttura è disponibile per la squadra avversaria.

Il riconoscimento usa firme strutturali specifiche del formato Pro Clubs Tracker + nome file. Quando `GEMINI_API_KEY` è disponibile, Gemini conferma semanticamente il tipo, ma non può sovrascrivere una firma strutturale esatta. I due `search*.json` con lo stesso schema vengono usati coerentemente per Dati totali e Stagione corrente.

## Totale storico e ultime 5
Il file Dati totali è la fonte ufficiale per Partite, Vittorie, Pareggi, Sconfitte, Gol fatti e Gol subiti storici. Questi valori non vengono ricostruiti contando le ultime 5 partite.

U5 = esclusivamente le 5 partite più recenti dell archivio Campionato + Playoff + Amichevoli disponibili.

## Archivio condiviso
I JSON vengono salvati su Vercel Blob privato. Una volta caricati, tutti i visitatori del sito leggono lo stesso dataset. Non è presente alcun PIN, login o controllo amministrativo.

## IA
`api/assistente.js` legge la mappa delle 10 sorgenti, i dati normalizzati e la memoria storica degli snapshot. Gemini deve rispettare gli scope: totale storico, cumulativo giocatori, archivio partite e ultime 5 non vanno mischiati.

## Importazione dati
Non è più presente alcuna casella o importazione separata tramite link ProClubTracker nell’interfaccia. Le tabelle usano direttamente gli export JSON riconosciuti automaticamente.

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
npm run test:rich-data
npm run test:rich-ui
npm run test:v3212-profiles
```

## V31.0 Analytics
Il progetto mostra nelle sezioni appropriate i dati realmente presenti negli export Pro Clubs Tracker: Dati totali, Stagione corrente, Info club, Overall Stats, Giocatori, Carriera. L'AI riceve anche la mappa delle sorgenti e i campi disponibili.


## V31.0 Analytics
La sezione Giocatori espone OVR e i principali campi dell’export, rapporti per partita e un indice interno 0–100 di rendimento con forma U5.
La sezione Squadra e Avversario aggiunge un pannello dettagliato U5 e grafici dell’andamento delle partite archiviate. La memoria degli aggiornamenti conserva skill rating, divisione, streak e trend per i confronti futuri.
L’Indice rendimento è una metrica interna e non sostituisce l’OVR EA. I grafici delle partite usano esclusivamente l’archivio disponibile: non ricostruiscono le partite storiche mancanti dal file Dati totali.


## V32.1 — UI pulita e stemma
La UI non mostra più la tabella dei finish per divisione, lo storico dei codici lastMatch/lastOpponent e i codici/anteprime delle maglie. I codici recenti restano nei dati e vengono conservati negli snapshot della memoria IA come dati grezzi non interpretati.

Il campo permette di toccare direttamente un pallino per cambiare rapidamente il giocatore. L'header usa un solo asset manuale: `assets/sisal-branding.png` (1536x857). I vecchi asset separati dello stemma/header non sono più utilizzati.


## V32.1.2 — Campi numerici corretti
Le tabelle `🏆 Dati totali · campi aggiuntivi` e `📅 Stagione corrente · campi disponibili` mostrano esclusivamente i valori numerici originali presenti nei rispettivi JSON: Clean sheet, Punti, Promozioni, Retrocessioni, Miglior divisione, Divisione attuale, Partite playoff e Reputation tier. Nessuna percentuale, media o altra metrica calcolata viene inserita in questi due pannelli. La stessa funzione alimenta anche la sezione Avversario, evitando un comportamento diverso tra le due squadre.
