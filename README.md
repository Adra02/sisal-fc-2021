# Sisal FC 2021 — FC27 AI LIVE

Questa versione usa i link pubblici di Pro Clubs Tracker come input per Gemini.

## Flusso

1. Incolli un URL `https://proclubstracker.com/club/...`.
2. Il browser invia l'URL a `/api/club-ai-sync`.
3. Gemini legge l'URL tramite URL Context.
4. Gemini restituisce JSON strutturato con club, giocatori cumulativi e ultime 5 partite.
5. Il dashboard aggiorna la squadra oppure l'avversario, in modo separato.

## Vercel

Root Directory: `/`
Framework Preset: Other
Build Command: lasciare vuoto
Output Directory: lasciare vuoto
Environment Variable: `GEMINI_API_KEY`
Node: 24.x

Non serve configurare `functions` in `vercel.json`.
