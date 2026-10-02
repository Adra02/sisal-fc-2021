FC27 COMMAND CENTER — VERSIONE TOP 3 + TREND + RUOLI

Questa versione mantiene le regole del dashboard:
- Squadra e Avversario: analisi esclusivamente sulle ultime 5 partite valide.
- Giocatori: dati cumulativi su tutte le partite disponibili.
- Passaggi: riusciti / tentati * 100, usando prima i dati per-partita verificati.
- Contrasti: riusciti / tentati * 100, usando prima i dati per-partita verificati.
- Nessun valore percentuale viene calcolato facendo la media delle percentuali dei giocatori.

AGGIUNTE:
1) TOP 3 — Pass% e Tackle%
   Mostra sempre anche il campione grezzo, ad esempio 55/66, più un indicatore dell'ampiezza del campione.
   I valori del file giocatori vengono usati solo quando non esiste un dato per-partita valido.

2) TREND
   - Squadra: ultime 5 vs totale disponibile.
   - Giocatori: ultime 5 vs cumulativo disponibile.
   - Il trend non è una previsione: mostra solo la differenza tra le due finestre.

3) CONTROLLO RUOLI
   - Campo confronta il ruolo assegnato nel modulo con il reparto dominante realmente osservato nelle partite disponibili.
   - Un giocatore che cambia reparto non viene segnalato come fuori ruolo solo perché una singola partita riporta un'altra posizione.
   - Se i dati EA contengono solo reparti generici (defender/midfielder/forward), il dashboard non inventa il sottoruolo.

4) IA
   - Riceve trend squadra, trend giocatori e analisi ruoli.
   - Per domande come "chi è nel ruolo sbagliato?" usa prima il blocco roleAnalysis.
   - Risposte normalmente compatte, massimo 4 sezioni brevi.
   - Se Gemini tronca la risposta, il backend effettua un retry compatto; se anche quello viene troncato, passa al modello successivo o al fallback locale.

DATI E MENU
- I controlli di caricamento restano concentrati in "I tuoi dati".
- Le altre sezioni non mostrano i vecchi comandi di gestione dati.


LOGICA DATI — AGGIORNAMENTO

• Squadra e Avversario: risultati/statistiche di squadra = ultime 5 partite disponibili.
• Giocatori: PG, gol, assist, minuti, Pass%, Tackle%, rating = dati cumulativi disponibili.
• Le ultime 5 dei giocatori sono mantenute separatamente solo per trend e confronto recente.
• Se il file giocatori contiene un totale storico (es. 94 PG) e l'archivio partite contiene solo 5 partite, il totale storico NON viene sostituito dalle 5 partite.
• OVR viene letto dal file giocatori nei campi ovr/overall/overallRating e varianti; non viene inventato dai rating partita.
• Se non esiste un OVR nei dati caricati, viene mostrato N/D.
