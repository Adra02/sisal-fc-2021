FC27 CLUBS COMMAND CENTER – VERSIONE CORRETTA

STRUTTURA
- index.html: interfaccia + logica del dashboard, senza i tuoi dati.
- api/assistente.js: backend Gemini con retry, modelli di riserva e fallback locale.

DATI
I file JSON della squadra NON sono inclusi nel progetto. Li carichi dall’interfaccia.
Il dashboard fonde automaticamente le statistiche del file giocatori con quelle presenti nelle singole partite.
Questo è importante per passaggi, contrasti, tiri, parate, minuti e voti che possono essere presenti nel file partite ma non nel file rosa.

AVVERSARIO
La sezione AVVERSARIO mantiene separati i dati avversari dai tuoi. Puoi caricare il file giocatori e il file partite dell’avversario.

IA
Su Vercel imposta la Environment Variable: GEMINI_API_KEY.
Il backend usa retry con backoff per errori temporanei e più modelli Gemini stabili. Se Gemini è temporaneamente non disponibile, restituisce comunque una analisi numerica locale, dichiarando che non è una risposta Gemini.

PUBBLICAZIONE
1. Crea un repository GitHub.
2. Carica index.html e la cartella api con assistente.js.
3. Importa il repository in Vercel.
4. In Vercel → Settings → Environment Variables aggiungi GEMINI_API_KEY.
5. Redeploy.

NOTA
Puoi anche aprire index.html direttamente per usare il caricamento e le statistiche locali. La parte IA richiede il progetto pubblicato su Vercel perché chiama /api/assistente.
