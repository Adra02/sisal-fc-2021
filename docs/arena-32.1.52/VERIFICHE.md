# Modifiche ed evidenze · 32.1.52

## Osservazione del video originale

Esaminata la registrazione allegata `Screenrecorder-2026-10-27-01-49-11-66.zip`: video verticale 1080 × 2400, durata circa 60 secondi, codifica circa 15 fps. Sono stati estratti fotogrammi e sequenze ogni 0,2 secondi, specialmente a 11, 21, 28 e 42 secondi.

Si vedono un terreno con contrasti e ciuffi molto evidenti, contorni seghettati, braccia quasi distese e un recupero della gamba limitato. Intorno a 40–45 secondi la vista diventa molto larga: il video da solo non consente di attribuire ogni movimento della camera alla regia automatica invece che a un intervento manuale. Il codice aveva comunque un adattamento dell'inquadratura all'estensione dei partecipanti che poteva allontanare troppo la camera.

## Implementato

- Ciclo del passo basato sulla distanza reale già percorsa nella simulazione: recupero del tallone anticipato, flessione del ginocchio, rollio del piede e oscillazioni contenute di bacino/busto.
- Appoggio del piede conservato durante la fase di sostegno, con compensazione del bacino quando cambia l'orientamento.
- Braccia da corsa piegate, gomiti orientati rispetto al busto; polsi allineati all'avambraccio. Morfologia di rilassamento delle dita limitata alle mani, con dita aperte per contatti controllati e portieri.
- Passaggi tra gesti sfumati. Raccolte, appoggi e parate conservano le traiettorie delle mani già calcolate dal mondo, senza trascinarle verso una posa precedente.
- Correzione del calcio generico senza bersaglio del piede: estensione al momento del contatto, anziché fine del caricamento all'indietro.
- Camera Azione con zona di interesse locale, controllo delle palle di riserva e zoom progressivo. La vista Campo resta disponibile per l'insieme; i controlli manuali restano personali.
- Dettaglio del corpo e del viso separati e scelti in base alla dimensione sullo schermo. MSAA richiesto anche sul telefono; risoluzione adattiva e modalità Risparmio conservate. Il browser/GPU può limitare l'antialiasing effettivo.
- Terreno con variazioni cromatiche più contenute e usura locale, normale/bump più tenue; ciuffi 3D solo in viste basse e vicine.
- Alberi con chiome più articolate e irregolari, rami e variazioni di colore; cielo sfumato, luce di riempimento contenuta e zona d'ombra che segue l'inquadratura con aggancio ai texel.
- Maglie con righe tonali più leggere, trama e piccoli dettagli. Bordi di pantaloncini/calzettoni calcolati sul materiale, per evitare l'interpolazione di macchie triangolari tra verde, pelle e bianco. Numero personale sulla schiena quando impostato.
- Cache browser Arena 12 e versione app 32.1.52. **Il mondo condiviso resta versione 11:** non è una nuova migrazione del database.

## Test effettivamente eseguiti

1. `npm run verify`: controllo del progetto e delle versioni.
2. Suite `test:arena-calcio`: riprese, angoli e punizioni fino all'esito; controlli della simulazione continua, contatti, varietà dei dialoghi, replay, SQL temporaneo/API e permessi, UI e cache. Completata con successo; nessun accesso in scrittura al database di produzione.
3. Suite `test:arena-visual`: nuovo controllo di arti/camera/materiali, preferenza del casco, 13.400 pose articolate e 138 varianti dei dettagli; regressioni del renderer e dell'interfaccia.
4. 4.000 confronti di appoggio a 1–6,8 m/s e tre lunghezze del passo: nessuno scorrimento numerico dell'**articolazione della caviglia** oltre la tolleranza. Questo non è una misura video dello scivolamento della suola.
5. Nel caso di corsa controllata a 4 m/s la caviglia in recupero arriva a circa 0,408 m; il ginocchio si flette. Non significa che ogni corsa debba avere quella stessa altezza.
6. 205 campioni di raccolta e 195 di appoggio con il mondo e lo scheletro reali di Three: distanza massima minima polso-centro palla circa 0,177 m, entro la tolleranza esistente di 0,21 m; nessuno spostamento della palla prima della raccolta. Il polso non è il centro del palmo: non è una prova di contatto perfetto delle dita.
7. La camera è stata provata con cinque rapporti dello schermo, palle di riserva e attori lontani; verificato il limite della variazione dello zoom.
8. Controllate le risorse locali e la cache: nessun file mancante, nessuna API privata memorizzata nella cache del service worker.
9. Confronto con il commit base: 17 moduli di fisica, simulazione, squadre, decisioni e dialoghi conservano lo stesso codice, a parte il parametro della cache negli import. Account, statistiche, Termux, corse dei cavalli e generazione della Gazzetta non sono riscritti.

I log inclusi nel pacchetto documentano i comandi e gli esiti. Gli archivi sono stati estratti e controllati; è stato verificato anche il ripristino dei file originali.

## Cosa è simulato o resta da verificare

- UI: DOM reale in jsdom, misure di impaginazione simulate; non è un telefono fisico.
- Renderer: oggetti, geometrie, materiali e scheletro di Three reali, ma renderer GPU sostituito nel test. I ganci shader vengono verificati nel codice; **non è una compilazione/esecuzione WebGL del nuovo shader**.
- Proiezioni delle nuove pose e texture: controllo software locale. Non sono screenshot del rendering WebGL finale e non vengono presentati come tali.
- Audio: campioni e ciclo di avvio/arresto verificati numericamente, non ascolto su altoparlante del telefono.
- Da confermare sul dispositivo: shader dei vestiti, luci/ombre e antialiasing effettivi, contatti visivi, resa dei capelli, frame rate, temperatura e consumi. Non viene garantita grafica fotorealistica o equivalente a un gioco AAA.

## Risorse e dati

Nessuna nuova dipendenza, servizio esterno o chiamata all'IA. Materiali e animazioni sono calcolati nel browser. Nessuna lettura/scrittura Supabase aggiuntiva per fotogramma e nessun cambiamento alla frequenza di sincronizzazione. La qualità Alta richiede più lavoro alla GPU; Automatica/Risparmio rimangono disponibili. Non viene promessa l'assenza di consumo della batteria.
