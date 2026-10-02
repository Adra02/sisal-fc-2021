# Sisal FC 2021 — FC27 AI LIVE

Questa versione aggiorna squadra e avversario passando il link di Pro Clubs Tracker direttamente a Gemini.

## Flusso
1. Nel dashboard incolli il link `https://proclubstracker.com/club/...`.
2. Il browser invia il link a `/api/club-ai-sync`.
3. Gemini usa il tool `url_context` per leggere l'URL pubblico indicato.
4. Gemini restituisce JSON strutturato con club, giocatori e ultime 5 partite.
5. Il dashboard normalizza i dati e aggiorna le statistiche.

## Vercel
- Framework: Other
- Build Command: vuoto
- Output Directory: vuoto
- Node: 24.x
- Environment Variable: `GEMINI_API_KEY`

## Nota
Il progetto richiede una chiave Gemini valida e che la pagina Pro Clubs Tracker sia pubblicamente leggibile dal tool URL Context.

API usata per il live:
- `/api/club-ai-sync` riceve il link PCT e lo invia a Gemini Interactions con `url_context`.
- `/api/assistente` continua a gestire l'analisi tattica sui dati già estratti.
