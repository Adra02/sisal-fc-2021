# Sisal FC 2021 – FC27 Command Center

Versione statica + Vercel Functions, senza framework e senza build obbligatoria.

## Root del repository

```text
index.html
vercel.json
manifest.webmanifest
sw.js
api/
  club-data.js
  assistente.js
  health.js
knowledge/
config/
scripts/
icons/
.github/
```

## Vercel

Framework Preset: Other
Root Directory: /
Build Command: lasciare vuoto / disattivato
Output Directory: lasciare vuoto
Node.js: 24.x
Environment Variable: GEMINI_API_KEY

Dopo il deploy, apri `/api/health`. Deve comparire JSON con `ok: true`.

## Dati live

Incolla un link `https://proclubstracker.com/club/ID?platform=common-gen5...` e premi Aggiorna squadra. Il backend usa il Club ID e la piattaforma del link e interroga gli endpoint pubblici Clubs di EA.
