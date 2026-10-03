# Sisal FC 2021 — FC27 Command Center V14

## Sorgente dati: SOLO Pro Clubs Tracker
Questa versione non cerca il club per nome e non chiama direttamente gli endpoint EA.

L'utente incolla i link pubblici di Pro Clubs Tracker che vuole usare:

### La tua squadra — 4 link obbligatori
- Statistiche
- Fun
- Giocatori
- Partite

### Avversario — 3 link obbligatori
- Statistiche
- Giocatori
- Partite

Il backend accetta esclusivamente URL `https://proclubstracker.com/...` o `https://www.proclubstracker.com/...` e li apre con Chromium server-side. Legge soltanto il contenuto pubblico renderizzato delle pagine.

Non vengono chiamati da `api/club-ai-sync.js`:
- `proclubs.ea.com`
- API EA dirette
- Google Search grounding
- proxy esterni
- endpoint Groq

Pro Clubs Tracker dichiara pubblicamente che i numeri mostrati sulle sue pagine vengono recuperati live dai server EA; in questa app, però, la sorgente applicativa resta esclusivamente la pagina pubblica di Pro Clubs Tracker.

## Parser
`lib/pct-parser.js` unisce i quattro snapshot della squadra e i tre dell'avversario. I dati necessari a Squadra, Giocatori, Partite, Fun, scouting e IA vengono mappati senza inventare valori.

Se una pagina è bloccata, reindirizzata fuori dominio o non contiene dati leggibili, la sincronizzazione fallisce in modo esplicito invece di usare dati parziali o inventati.

## IA
`api/assistente.js` usa Gemini `gemini-3.5-flash-lite` solo per analizzare i dati già estratti dalle pagine PCT.
Non usa Search grounding.

Imposta in Vercel solamente:

`GEMINI_API_KEY`

## Cache
I link e i dati recenti vengono salvati nel browser locale. La cache dura 5 minuti e ha una chiave basata sui link, non sul nome del club.

## Vercel
- Node 24.x
- PWA con service worker V14
- Chromium server-side con `puppeteer-core` + `@sparticuz/chromium`
- Nessuna chiave EA necessaria

## Verifica locale
```bash
npm install
npm run verify
npm run test:pct
npm run test:sync
npm run test:ai
npm run test:ai-connection
```
