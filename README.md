# Sisal FC 2021 · FC27 Command Center

Dashboard statico mobile-first per EA SPORTS FC 27 Clubs.

## Deploy Vercel

- Framework Preset: Other
- Root Directory: la cartella che contiene `index.html`, `api/`, `package.json` e `vercel.json`
- Build Command: lasciare quello rilevato dal progetto; il repository include `npm run build`
- Output Directory: lasciare vuoto
- Node.js: `24.x` viene impostato dal `package.json`
- Environment Variable: `GEMINI_API_KEY`

## Dati live

Da `I tuoi dati` si incollano i link Pro Clubs Tracker della propria squadra e dell'avversario.
Il dashboard usa il link per ricavare Club ID e piattaforma e interroga gli endpoint Clubs pubblici di EA dal backend Vercel.

## IA

L'assistente usa `GEMINI_API_KEY` dal backend. Nessuna chiave viene inserita nel browser.
