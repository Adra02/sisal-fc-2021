# Sisal FC 2021 — FC27 Command Center V18

## Sorgente dati
Il dashboard cerca il club **direttamente tramite gli endpoint Clubs di EA FC 27**, usando Chromium headless (`puppeteer-core` + `@sparticuz/chromium`) con un contesto browser reale.

L'utente inserisce solo:
- nome del club
- piattaforma (`common-gen5` per PS5 / Xbox Series X|S / PC)

Endpoint frontend:
`/api/scrape-stats?clubName=Sisal%20FC%202021&platform=common-gen5`

## Flusso
1. Chromium apre `https://proclubs.ea.com/` per stabilire un contesto browser.
2. Cerca il club tramite `currentSeasonLeaderboard/search`.
3. Seleziona il risultato con corrispondenza più forte sul nome.
4. Legge info, overall stats e member stats.
5. Legge match di league, friendly e playoff.
6. Normalizza il JSON nel formato usato dal dashboard.
7. Gemini `gemini-3.5-flash-lite` riceve solo i dati già recuperati e produce l'analisi tattica.

Non viene usato Pro Clubs Tracker come fonte applicativa.

## Dipendenze
- `puppeteer-core`
- `@sparticuz/chromium`

## Vercel
Variabile richiesta:
`GEMINI_API_KEY`

La ricerca e il recupero dati EA non richiedono una EA API key.

## Limite importante
Gli endpoint Clubs di EA sono non documentati e possono cambiare. Il progetto gestisce 403/429/5xx, ritenta le richieste transitorie e prova una navigazione Chromium reale come fallback. Non inventa dati se EA non restituisce una risposta utilizzabile.
