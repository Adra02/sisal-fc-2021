FC27 CLUBS COMMAND CENTER - YOUTUBE RSS + GEMINI, SENZA YOUTUBE API

Questa versione NON usa YouTube Data API. Per la parte YouTube non serve creare un progetto Google Cloud ne' inserire una YOUTUBE_API_KEY.

STRUTTURA
- index.html: dashboard completo. I JSON della squadra e dell'avversario vengono caricati dall'interfaccia e non sono inclusi nel repository.
- api/assistente.js: endpoint Gemini dell'assistente.
- config/fc27-sources.json: elenco delle fonti YouTube monitorate.
- knowledge/fc27-knowledge.json: base di conoscenza esterna al codice dell'interfaccia.
- scripts/update-fc27-knowledge.mjs: legge gli RSS pubblici dei canali, seleziona i video FC27 Clubs piu' pertinenti e li fa analizzare a Gemini.
- .github/workflows/update-fc27-knowledge.yml: aggiornamento giornaliero.

FONTI PRECONFIGURATE
- WhiteGamer7: contenuti FC27 Clubs, gameplay e guide.
- Pro Clubs Weekly: scena competitiva 11v11, match commentary/analysis e builds.
- EA SPORTS FC: fonte ufficiale per gameplay, Clubs e deep dive.

Le fonti community non vengono trattate come regole ufficiali. L'IA registra anche un livello di evidenza e un livello di confidenza.

DEPLOY
1) Metti TUTTA la cartella in GitHub.
2) Importa il repository in Vercel.
3) In Vercel aggiungi GEMINI_API_KEY.
4) In GitHub -> Settings -> Secrets and variables -> Actions aggiungi lo stesso GEMINI_API_KEY.
5) Non aggiungere nessuna chiave YouTube.

AGGIORNAMENTO AUTOMATICO
La GitHub Action viene eseguita ogni giorno alle 03:17 UTC e puo' essere avviata manualmente da GitHub -> Actions -> Aggiorna knowledge FC27.
Controlla i feed RSS pubblici, evita i video gia' analizzati e analizza al massimo 2 nuovi video pertinenti per esecuzione.
Quando non c'e' nulla di nuovo, non modifica il file di knowledge e quindi non provoca un inutile nuovo deploy.

LIMITI REALI
- RSS segue i canali configurati; non e' una ricerca globale di tutto YouTube.
- Gemini puo' analizzare video YouTube pubblici tramite URL. Google indica per il free tier un limite giornaliero di 8 ore di video YouTube; quote e limiti possono cambiare.
- La GitHub Action schedulata puo' essere ritardata da GitHub; workflow_dispatch permette l'avvio manuale.
- Il modello Gemini non viene "riaddestrato" ogni giorno: la Action costruisce una base di conoscenza aggiornata che l'assistente consulta insieme ai dati reali del Club.

DATI DEL CLUB
I JSON di giocatori e partite della tua squadra e quelli dell'avversario NON sono inclusi nel repository e NON vengono inseriti nel codice. Vengono caricati dall'interfaccia del dashboard.
