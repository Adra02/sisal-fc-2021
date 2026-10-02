SISAL FC 2021 · FC27 COMMAND CENTER

MODALITA LIVE
- La dashboard non richiede più upload JSON manuali.
- In “I tuoi dati” incolla un link Pro Clubs Tracker.
- Il server estrae Club ID + platform dal link e interroga direttamente gli endpoint Clubs pubblici di EA.
- La dashboard usa le ultime 5 partite per forma/archivio e mantiene le statistiche giocatore cumulative su tutto il dato disponibile.
- L’avversario ha una connessione separata.

DEPLOY VERCEL
1. Carica l’intera cartella in GitHub.
2. Importa il repository in Vercel.
3. Imposta GEMINI_API_KEY nelle Environment Variables.
4. In GitHub Actions salva la stessa GEMINI_API_KEY come repository secret.

NOTE
- Sono presenti 2 funzioni serverless: /api/assistente e /api/club-data.
- Il campo IA mantiene la logica della versione precedente ma risponde in modo più compatto.
- Il service worker rende la shell più adatta all’uso da Chrome mobile e all’aggiunta alla schermata Home.
