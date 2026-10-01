FC CLUBS DASHBOARD — VERSIONE FILE ESTERNI

IMPORTANTE
Questo progetto NON contiene i tuoi dati reali.
Non ci sono matches.json, players.json, players.js o statistiche della squadra nel codice.

COME USARLO
1. Carica questa cartella su GitHub.
2. Importa il repository in Vercel.
3. Apri il sito.
4. Premi CARICA I FILE.
5. Seleziona contemporaneamente i due file oppure uno alla volta.
6. Il sito riconosce automaticamente quale file contiene i giocatori e quale contiene le partite.

FORMATO FILE
- I file devono contenere JSON valido.
- Possono avere estensione .json oppure essere .txt contenenti JSON.
- Il parser supporta sia array sia oggetti indicizzati per ID.
- Il formato partite esportato da FC, con clubs e players come oggetti indicizzati, è supportato.

DATI
I file vengono letti direttamente dal browser e salvati nel localStorage.
Non vengono inseriti nel codice del sito.

IA
La funzione IA funziona dopo il deploy su Vercel.
In Vercel aggiungi:
GEMINI_API_KEY = la tua chiave Gemini
Facoltativo:
GEMINI_MODEL = gemini-3.8-flash

NOTA
L'apertura del solo index.html sul dispositivo può mostrare il dashboard e permettere il caricamento dei file, ma l'endpoint /api/assistente esiste solo quando il progetto è pubblicato su Vercel.
