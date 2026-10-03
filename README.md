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
La sezione IA/assistente usa Groq (`openai/gpt-oss-20b`) e NON usa Gemini per rispondere. Alla prima domanda, se non esistono ancora dati locali, il dashboard avvia automaticamente la sincronizzazione della tua squadra; poi la risposta conversazionale usa i dati sincronizzati. Le richieste successive usano la cache di sincronizzazione quando ancora valida. Se `GROQ_API_KEY` manca o Groq risponde con errore, il sito usa una risposta locale basata sui dati disponibili. Senza dati reali, l'assistente non inventa uno stato del club e blocca l'analisi numerica.

## Knowledge FC27
L'aggiornamento automatico legge i feed YouTube pubblici e, quando trova un nuovo video rilevante, analizza al massimo **1 video per esecuzione** con `gemini-3.5-flash-lite`. Il workflow gira **lunedì e venerdì alle 12:17 UTC**, senza retry o fallback su altri modelli. Se non ci sono nuovi video, non viene effettuata alcuna chiamata Gemini.

## Installazione app
Android: il pulsante in "I tuoi dati" usa il prompt PWA quando Chrome lo rende disponibile; in alternativa mostra i passaggi manuali. iPhone: il pulsante mostra la procedura Safari per "Aggiungi alla schermata Home".

## Deploy
Hosting pensato per Vercel. Imposta `GEMINI_API_KEY` e `GROQ_API_KEY` nelle Environment Variables. È possibile impostare facoltativamente `GEMINI_MODEL`; il default del progetto è `gemini-3.5-flash-lite`.

## Verifica locale
```bash
npm run verify
npm run test:ai-connection
npm run test:ai
npm run test:sync
```
