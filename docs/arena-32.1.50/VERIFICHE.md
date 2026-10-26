# Prove eseguite · 32.1.50

Data: 26 ottobre 2026. Base verificata: `940d88c6fe1cde4d13a623d13482f19e07be6719`. Le prove non hanno scritto nel sito, nel database Supabase di produzione o su GitHub.

## Esecuzioni reali in ambiente locale

La simulazione è procedurale: «reale» qui significa che è stato eseguito il codice effettivo del progetto con dati sintetici e scenari controllati, non che sono state osservate partite EA o persone fisiche.

| Area | Evidenza |
| --- | --- |
| Suite completa Arena | `npm run test:arena-completa` terminato con codice 0; include motore, SQL, UI, renderer, audio, cache e risorse. |
| Nuove funzioni | 775 controlli nella suite Arena completa: curva ruotata, portiere umano, bilanciamento, replay, preferenze e simulazioni. |
| Mondo continuo | 194.400 passi e 1.548.000 confronti di distanza, con 1/2/3/7/14/24 membri. Confronto fra client indipendenti, continuità snapshot, equivalenza con personalizzazioni diverse, sostituzione rosa, squadre e panchina. |
| Geometria degli appoggi | 4.000 confronti a velocità 1–6,8 m/s, tre lunghezze di falcata; scarto orizzontale numerico massimo 1,78 × 10⁻¹⁵ m nel riferimento delle ossa. Non equivale a una misura visiva della scivolosità sullo schermo. |
| Mani e pallone | Raccolta e posa collegate alle articolazioni Three effettive; nell'ultima suite 175 confronti raccolta, 150 posa, distanza massima mano-centro palla circa 0,110 m, nessuno spostamento a terra prima del contatto previsto. |
| Regole e attrezzatura | 41 controlli delle leggi/attrezzatura; casi controllati di rimessa laterale, corner, rigore e punizione; raccolta cinesini prima della partita. Campo ridotto, non copertura completa del regolamento a undici. |
| Skill e tiratori | 11 pose; contatti di tacco, esterno, pallonetto, rovesciata, sforbiciata e volée. In 900 secondi di esercizi, 4 tiratori distinti per ciascun lato e gol/parate/cross reali della simulazione. |
| Modello e materiali | Mesh Three e materiali effettivi, tre carnagioni/varianti con e senza casco. Viso completo 8.494 triangoli, variante lontana 3.502; avambracci separati dai guanti. Nessuna immagine GPU generata da questa prova. |
| Database | PostgreSQL locale PGlite: SQL 18 eseguito due volte, conservazione dati preesistenti, coesistenza 9/10, contesa sulle pubblicazioni, snapshot immutabili, accessi anonimo/membro/admin/in attesa/sospeso, nessun checkpoint futuro nel dato restituito. |
| API | Handler effettivo con SQL locale: autenticazione, validazione amministratore/portiere, esclusioni di rosa, client vecchio invitato ad aggiornarsi e una sola RPC per lettura a regime. Trasporto Supabase simulato verso il database locale. |
| Account esistenti | 65 controlli account/SQL/API e scrypt Node reale; login, registrazione, password, sessione ricordata, permessi e salvataggio editor. UI in JSDOM, non accesso all'account di produzione. |
| Compatibilità avatar e corse | 13.400 pose e 138 varianti di personalizzazione; ciclo corsa con pari merito, salto e animazioni ridotte in modello DOM/renderer simulato. Verifiche occhi/casco con 16 intersezioni dei raggi sulle iridi reali. I file della corsa condivisa non sono modificati. |
| Risorse e cache | 81 risorse/import locali, 79 voci del service worker; nessun riferimento mancante o duplicato. Worker effettivo in contesto isolato: nessuna cache API privata, pulizia limitata alle cache dell'app e nessun HTML restituito come JavaScript quando manca una risorsa. |
| Codice | Controllo sintattico Node sui file JS/MJS modificati/nuovi, `npm run verify`, `git diff --check`. |

### Scenari con portiere umano

Tre esecuzioni da 1.200 secondi, usando il motore effettivo:

| Membri | Distanza minima tra i corpi | Tiri registrati | Parate registrate | Fine partitella osservata |
| --- | --- | --- | --- | --- |
| 3 | circa 0,680 m | 16 | 24 | 1 |
| 7 | circa 0,680 m | 10 | 12 | 0 |
| 14 | circa 0,680 m | 18 | 20 | 1 |

I conteggi includono esercizi e tipologie di tiro diverse, non soltanto i tiri della partitella. In questi scenari non sono stati registrati fuorigioco: non significa che il motore li abbia rimossi o che non possano più verificarsi. La fine dipende dai gol, non da un cambio scena obbligato dopo un numero fisso di secondi.

Uno snapshot di 30 minuti con 14 membri ha prodotto circa 206 kB; la preparazione locale è stata misurata in circa 4–11 secondi in esecuzioni separate. Sono misure di questo ambiente, non stime garantite del tempo Vercel, del consumo Supabase o degli FPS.

## Prove simulate o con componenti sostituiti

- UI effettiva in JSDOM: permessi membro/admin, identità, nomi con caratteri speciali, recupero da rosa vuota, risposta server non JSON, chiusura durante una richiesta, replay e pulizia.
- Renderer con scena, avatar, geometrie e logica Three reali, ma GPU sostituita: aggiornamento dell'aspetto, camera conservata, replay di un tiro effettivo, pausa, risorse rilasciate, panchina e tavolo non intersecati, testa non ostruita. Non è una prova di resa WebGL.
- Audio PCM effettivamente generato e numericamente analizzato; ciclo AudioContext simulato, massimo 12 voci, nessuna coda dopo stop. Non prova volume percepito, latenza o timbro di un altoparlante reale.
- Concorrenza SQL provata con pubblicazioni in contesa, lease e risultati immutabili sul database locale. Non è un test di carico distribuito Supabase.

## Layout osservato nel browser

Interfaccia Arena e CSS effettivi con dati di prova e renderer sostituito da una scena esplicitamente etichettata «Dati simulati · scena 3D non renderizzata». Verificati viewport 320 e 390 pixel verticali, 844 × 390 orizzontale e 1.100 × 730 desktop. Nessuno scorrimento orizzontale rilevato. Controllati pannello opzioni, filtro nomi, Solo campo, replay/diretta, rosa assente e messaggio di errore HTML.

Durante il controllo è stato corretto il ricalcolo delle dimensioni dei fumetti al ridimensionamento. Il browser disponibile aveva WebGL disabilitato: nessuna promessa di FPS o di qualità finale del rendering deriva da questi screenshot.

## Controllo del pacchetto

Il risultato dell'estrazione e dell'installazione sopra una copia pulita del main è riportato in `PACCHETTO_VERIFICATO.txt`, insieme alle impronte SHA-256 in `MANIFEST_FILE.json`. Nel pacchetto non sono incluse credenziali, file ambiente, node_modules o la pagina di prova con renderer sostituito.

## Da verificare su telefono e sito dopo l'installazione

1. Rendering 3D reale: capelli, barba, pelle, ombre, panchina, appoggi e colpi di palla visti da più angolazioni.
2. Fluidità, temperatura e consumo batteria; confrontare Automatica e Risparmio. Nessun FPS minimo è stato misurato su telefono fisico.
3. Audio dopo un tocco volontario, cambio scheda, pausa, ripresa e chiusura.
4. Due dispositivi reali nella stessa diretta, anche al cambio della finestra condivisa e dopo perdita della rete; camera e replay personali indipendenti.
5. Accessi di produzione, foto personali, corse Top 3, statistiche, Gazzetta e invio Termux abituale. Il trasporto e i permessi del database locale sono stati provati; non è stata usata la tua password o mutata la produzione.

Il test pipeline che richiede un file EA esterno in `/mnt/data/matches.json` non è stato eseguito: quel fixture non era disponibile. Non sono stati modificati gli algoritmi delle statistiche. Non sono state eseguite generazioni Gemini né test di quota/costi IA, perché questo aggiornamento Arena non cambia quelle funzioni.
