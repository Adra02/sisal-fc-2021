FC27 CLUBS COMMAND CENTER — VERSIONE CORRETTA

REGOLE ATTUALI
- Squadra: analisi esclusivamente sulle ultime 5 partite valide.
- Avversario: analisi esclusivamente sulle ultime 5 partite valide.
- Giocatori: usa tutte le partite/dati giocatore disponibili nel browser; se è disponibile solo uno storico partite, usa tutto quello storico disponibile.
- Passaggi e contrasti: percentuale sempre calcolata come riusciti ÷ tentati × 100.
- Nessuna percentuale viene accettata quando i tentativi sono 0, i numeri sono negativi o i riusciti superano i tentati.
- I risultati e i gol della squadra vengono letti dai dati clubs della partita.
- Le statistiche tecniche vengono sommate dai singoli giocatori quando disponibili.
- Campo > Tattiche contiene solo Linea difensiva.
- Campo contiene le formazioni FC27 configurate nel dashboard.
- La gestione dei file è centralizzata esclusivamente nel menu “I tuoi dati”.
- I comandi di gestione dei file non compaiono nelle altre sezioni: sono concentrati esclusivamente in “I tuoi dati”.

MENU “I TUOI DATI”
Qui si trovano tutti i comandi di caricamento e cancellazione:
- Dati della tua squadra: giocatori, partite oppure entrambi.
- Dati dell'avversario: giocatori, partite oppure entrambi.
- Conteggio dei dati attualmente presenti nel browser.
- Nessuna statistica analitica viene duplicata qui: le analisi restano nelle rispettive sezioni.

FILE PARTITE
Il dashboard accetta JSON validi anche se il file è stato rinominato in .TXT.
I file partita vengono normalizzati e i duplicati vengono eliminati quando più dati vengono caricati insieme.

AI
La richiesta inviata all'IA contiene:
- ultime 5 partite della squadra;
- ultime 5 partite dell'avversario quando caricato;
- dati individuali cumulativi disponibili;
- valori grezzi riusciti/tentati per passaggi e contrasti;
- statistiche recenti dei giocatori quando presenti;
- base di conoscenza FC27 disponibile nel repository.
L'IA deve distinguere tra dato osservato e inferenza e non deve inventare valori.

VARIABILI VERCEL
- GEMINI_API_KEY: necessaria per l'assistente IA.
- Non è necessaria YOUTUBE_API_KEY.

GITHUB / KNOWLEDGE YOUTUBE
Il workflow .github/workflows/update-fc27-knowledge.yml può aggiornare la knowledge base FC27 usando le fonti configurate e GEMINI_API_KEY.

PRIVACY
Le statistiche caricate manualmente vengono mantenute nel localStorage del browser.
