# Sisal FC 2021 · FC27 Command Center

Dashboard mobile-first per EA SPORTS FC 27 Clubs.

## Flusso live
Inserisci soltanto il nome del club. `/api/club-ai-sync` esegue **una sola richiesta Gemini** con Google Search + URL Context, trova Pro Clubs Tracker e prova a leggere in un unico passaggio:

- 📊 Stats
- 🎉 Fun
- 👥 Players
- ⚽ Matches

La risposta è un unico JSON completo. Tutte le sezioni del dashboard vengono costruite localmente a partire da quel JSON, senza altre chiamate Gemini durante la sincronizzazione.

## Anti-duplicazione
Il browser salva localmente l'ultimo JSON valido per club e ruolo per 10 minuti. Un nuovo click su "Aggiorna" nello stesso intervallo usa la cache locale e **non invia alcuna richiesta Gemini**. Il codice evita anche richieste duplicate simultanee per lo stesso club.

La sincronizzazione automatica non fa retry/fallback su altri modelli: un tentativo = una richiesta. Questo rende il consumo di quota prevedibile.

## IA interattiva
La sezione IA/assistente effettua una richiesta separata solo quando l'utente decide di fare una domanda all'assistente. Non viene eseguita come parte dell'aggiornamento live del club.

## Deploy
Hosting pensato per Vercel. Imposta `GEMINI_API_KEY` nelle Environment Variables. È possibile impostare facoltativamente `GEMINI_MODEL`; il default del progetto è `gemini-3.5-flash-lite`.

## Verifica locale
```bash
npm run verify
npm run test:sync
```
