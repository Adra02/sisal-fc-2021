# Sisal FC 2021 — FC27 AI Live

## Vercel
Questa versione usa la rilevazione automatica delle Functions nella cartella `api/`.
Non inserire una proprietà `functions` in `vercel.json`.

Root del progetto:
- index.html
- vercel.json
- package.json
- api/club-ai-sync.js
- api/assistente.js
- api/health.js
- knowledge/
- config/
- scripts/
- icons/
- .github/

Environment Variable richiesta su Vercel:
`GEMINI_API_KEY`

Test dopo il deployment:
`/api/health`

Deve restituire JSON con `ok: true`.
