# Sisal FC 2021 — FC27 AI Live

Questa versione usa i link Pro Clubs Tracker direttamente come input dell’IA.

## Flusso live
1. L’utente incolla un link `https://proclubstracker.com/club/...`.
2. La dashboard invia l’URL a `/api/club-ai-sync`.
3. Gemini Interactions API usa `url_context` per leggere la pagina.
4. Gemini restituisce dati strutturati del club, dei giocatori e delle ultime 5 partite.
5. La dashboard salva i dati nel browser e aggiorna tutte le sezioni.

La squadra e l’avversario hanno due URL separati.

## Vercel
Non impostare manualmente `functions` in `vercel.json`. La cartella `api/` viene rilevata automaticamente.

Environment Variable richiesta:
`GEMINI_API_KEY`

Endpoint di test:
`/api/health`

## Nota sul timeout
La versione precedente tentava di modificare `error.message` su un errore `AbortError`. In alcuni runtime quella proprietà è in sola lettura e produceva `Cannot set property message of which has only a getter`. Ora, in caso di timeout, viene creato un nuovo `Error` con stato HTTP 504 senza modificare l’errore originale.
