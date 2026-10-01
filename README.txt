FC27 CLUBS COMMAND CENTER — VERSIONE CORRETTA

COSA È STATO CORRETTO
- Le percentuali di passaggi e contrasti sono calcolate sempre come RIUSCITI / TENTATI * 100.
- Un rapporto impossibile (riusciti > tentati, numeri negativi o tentativi 0) non viene trasformato artificialmente in una percentuale.
- Il punteggio e i gol della partita vengono letti dal blocco clubs; le statistiche tecniche vengono sommate dai giocatori della partita.
- Le partite caricate con “Aggiungi partite” vengono unite senza duplicati.
- Il dashboard analizza fino a 50 partite disponibili; non taglia più l'archivio a 5.
- L'IA riceve esplicitamente il numero reale di partite disponibili e non deve inventare le partite mancanti.
- “Campo > Tattiche” contiene solo Linea difensiva.
- Il campo contiene le 29 formazioni FC27 presenti nell'elenco corrente di FUT.GG, incluse le varianti come Wide, Holding, Attack e Defend.
- La sincronizzazione EA importa le ultime partite che l'endpoint pubblico EA restituisce e le accumula nel browser senza inserirle nel codice.
- Quando il dashboard è aperto su Vercel, la sincronizzazione EA viene tentata all'avvio e ogni 5 minuti.
- L'IA YouTube usa l'Interactions API di Gemini con input video YouTube tramite URI pubblico; non usa YouTube Data API e non richiede YOUTUBE_API_KEY.

PARTITE: PERCHÉ VEDEVI SOLO 5
Un file che contiene 5 partite non può magicamente produrne 50. Il dashboard ora conserva tutti i file importati e può accumularli, ma per avere uno storico di 50 partite bisogna avere 50 partite nell'archivio.
La sincronizzazione EA serve a costruire quello storico da ora in avanti: viene eseguita mentre la pagina è aperta. Le partite già scomparse dalla finestra restituita dall'endpoint EA non possono essere recuperate retroattivamente da quel singolo endpoint.

PUBBLICAZIONE VERCEL
1. Carica tutti i file mantenendo la struttura delle cartelle.
2. In Vercel > Settings > Environment Variables inserisci GEMINI_API_KEY.
3. Non serve YOUTUBE_API_KEY.
4. Il file api/ea-matches.js viene usato dal pulsante “Sincronizza EA” e dalla sincronizzazione automatica del browser.

GITHUB / KNOWLEDGE YOUTUBE
Nel repository GitHub inserisci GEMINI_API_KEY nei Secrets di Actions.
Il workflow .github/workflows/update-fc27-knowledge.yml esegue l'aggiornamento giornaliero della knowledge base.

ATTENZIONE PRIVACY
Le statistiche della squadra vengono mantenute nel localStorage del browser. Lo script di sincronizzazione EA non salva automaticamente le tue partite nel repository GitHub.
