# Sisal Racing — modifica isolata alla Corsa dei Cavalli

Base analizzata: `d83832e20c94417de0d5299f7dadec8d1124dfca` (main, 12 ottobre 2026).

## Cosa faceva la versione precedente

La corsa si apre dalle schede Top 3 tramite `startTop3Race`, in `index-inline.js`. I partecipanti sono i giocatori con un valore positivo nei primi tre posti della categoria U5; i pari merito possono portare a più di tre cavalli. `race-motion.js` costruiva un percorso con l'ordine finale già imposto da `entry.place`. `race-3d.js` mostrava i cavalli, `race-visuals.js` costruiva ambiente e geometrie, `race-audio.js` produceva l'audio. Il fotofinish/replay era sistematico e non dipendeva dal reale distacco.

Il renderer era già lazy, ma il service worker precaricava Three.js e i file della corsa. Nessuna API salvava lo storico delle gare. localStorage conserva lo sblocco delle schede (`markTop3Seen`) e il profilo visivo esistente; non conservava risultati di una simulazione indipendente. Il profilo estetico può provenire dalla funzione IA esistente: la relativa API non è stata cambiata. I dati calcistici continuano a usare i servizi originali, incluso Blob; non vengono migrati.

## Comportamento implementato

Lo stesso ingresso apre una lobby interna alla scheda, con gli stessi partecipanti. La gara ha un risultato simulato distinto dalla classifica calcistica; questa distinzione è esplicita nella lobby. Alla chiusura resta visibile la Top 3 calcistica originale. Non sono state aggiunte sezioni Record.

- Race Engine versione 1: 400 metri, passo fisso 1/60 s, seed uint32, attributi individuali, accelerazione, reazione, stamina, variabilità continua, affaticamento e sprint.
- Il percorso completo viene calcolato prima del via; i frame sono interpolati per la visualizzazione. Frame rate, qualità e telecamera non cambiano l'esito.
- Tempi interpolati all'interno dell'ultimo passo; simulazione fino all'arrivo di tutti. I rarissimi tempi identici vengono ordinati stabilmente per numero di partenza, senza duplicare i posti.
- Fotofinish solo se il distacco fra primo e secondo è <= 0,035 s. Revisione del finale a 0.5× e tempi precisi.
- Three.js già presente, cavalli articolati e materiali procedurali mantenuti, galoppo legato alla distanza percorsa, partenza con cancelli, pista estesa, indicatori distanza, camera automatica e manuale, polvere e ombre.
- Spostamenti laterali entro corridoi separati: evitano attraversamenti fra cavalli. Non è implementata una fisica completa di contatto né il cambio libero di corsia.
- HUD, classifica live, distacchi, eventi effettivi, statistiche, podio testuale e risultato completo.
- Replay completo con pausa, restart, 0.5×/1×/2×. Lo storico ricostruisce la simulazione usando versione, seed e partecipanti. L'aspetto di luce/meteo usa il profilo visivo attuale, non altera il percorso.
- Audio sintetizzato locale, inizialmente muto, sbloccato dal pulsante; volume regolabile.
- AUTO/HIGH/MEDIUM/LOW: risoluzione, ombre, pubblico e particelle. AUTO abbassa il dettaglio dopo rallentamenti sostenuti.
- CSS `.hr-app` isolato, layout portrait/landscape e reduced motion. Asset 3D e audio esclusi dal precaricamento generale.

## MongoDB e sicurezza

Una sola collection: `sisal_racing.horse_races`. Stati `pending` e `completed`. Gli elementi pending scadono dopo 24 ore; gli elementi completati non hanno TTL. Lo storico mostra solo completed, 20 alla volta, con paginazione.

`POST /api/horse-races` con action `create` genera sul server seed, ID e token di completamento. La risposta non contiene credenziali MongoDB. Il database conserva solo l'hash del token. La creazione è limitata a quattro richieste al minuto per IP tramite conteggio persistente (limite semplice, non una protezione DDoS completa).

Con action `complete`, il server richiede ID e token, controlla il tempo minimo trascorso, ricalcola la gara e ignora risultati/tempi/statistiche eventualmente inviati dal client. Il salvataggio è atomico e idempotente. Una gara abbandonata non diventa completed.

Lo storico è condiviso e leggibile pubblicamente come il resto di questa app pubblica: nessun login è stato aggiunto o modificato. I nomi dei partecipanti vengono validati ma non certificati contro l'identità del roster; i risultati della corsa sono verificati dal server. Non è un sistema per scommesse o ricompense economiche.

Unica nuova dipendenza diretta: `mongodb` 6.21.0, solo server. `@vercel/blob` resta 2.6.1. Nessuna nuova dipendenza grafica. Unica variabile: `MONGODB_URI`. Non usare prefissi pubblici. Nessun segreto nei file o nelle risposte API.

## Configurazione guidata — da svolgere un passo per volta

Non inviare password, token o connection string completa in chat. Le etichette qui sotto sono basate sulla documentazione ufficiale consultata il 12 ottobre 2026; se l'interfaccia del tuo account è diversa, invia solo una schermata senza segreti e procediamo dal punto effettivo.

1. **Account.** Apri https://www.mongodb.com/cloud/atlas/register. Crea l'account oppure accedi. Puoi usare il pulsante Google o la registrazione con email. Conferma l'email se richiesto. Fermati quando sei nella dashboard.
2. **Progetto.** Dal selettore Projects crea un progetto con New Project, nome `Sisal-Racing`. Non occorre invitare altre persone. Se la procedura iniziale ha già creato un progetto, possiamo usare quello invece di crearne un altro.
3. **Cluster.** In Project Overview premi Create. Seleziona esplicitamente **Free / M0** e verifica il costo gratuito prima di confermare. Non scegliere Flex o Dedicated a pagamento. Nome consigliato `sisal-racing`. Come scelta iniziale: AWS e la regione gratuita europea disponibile più vicina alla regione delle Functions Vercel. La disponibilità effettiva e la regione del tuo progetto Vercel vanno lette nel tuo account; non sono state verificate. Non attivare upgrade o servizi a pagamento.
4. **Utente database.** Nella procedura guidata o in Database & Network Access > Database Users aggiungi un utente con autenticazione Password. Nome consigliato `sisal_racing_app`. Genera una password forte e conservala nel tuo gestore password. Configura il ruolo specifico `readWrite` per il solo database `sisal_racing`, tramite Specific Privileges (se la procedura iniziale crea un ruolo più ampio, restringilo dalla modifica dell'utente prima dell'uso). Conferma con Create Database User / Add User secondo la schermata visualizzata. Non serve Atlas admin per l'app.
5. **Rete.** In Database & Network Access > IP Access List, Add IP Address. Per il collegamento standard a Vercel con IP dinamici, aggiungi `0.0.0.0/0` e conferma. Questa regola permette tentativi di collegamento da qualsiasi IP: restano necessari password forte e utente limitato al database della corsa. L'alternativa più restrittiva è autorizzare IP di uscita statici tramite un servizio Vercel compatibile; non viene attivata perché può richiedere un piano/costo aggiuntivo. Il solo Add My Current IP Address non basta per le Functions Vercel.
6. **Connection string.** Vai al cluster > Connect > Drivers, scegli Node.js e copia la stringa SRV. Sostituisci `<db_password>` (o il segnaposto password mostrato) solo sul tuo dispositivo. Se la password contiene caratteri riservati in una URI, devono essere codificati; chiedi assistenza indicando solo quali caratteri speciali contiene, mai la password. Il codice seleziona `sisal_racing` esplicitamente: non devi creare manualmente la collection.
7. **Vercel.** Apri https://vercel.com/dashboard, progetto `sisal-fc-2021`. Apri Settings > Environment Variables (nell'interfaccia che la espone direttamente, Environment Variables nella barra laterale). Add New: Name `MONGODB_URI`; Value la stringa completa privata; tipo Secret se disponibile. Per la prima verifica seleziona Preview, preferibilmente limitata al ramo della corsa. Premi Save. Production andrà configurato prima del rilascio definitivo; è preferibile avere credenziali/database di prova separati. Non cambiare le variabili di Blob, Gemini o altre funzioni.
8. **Redeploy.** La variabile vale solo per nuovi deployment: in Deployments seleziona il deployment del ramo della corsa, menu con i tre punti > Redeploy. Non ridistribuire un ramo diverso per errore. Dopo collaudo e integrazione su main, configurare Production e ridistribuire il codice aggiornato.
9. **Test leggibile.** Nella nuova lobby premi Verifica MongoDB. Il messaggio deve dire “✅ MongoDB collegato”. Avvia una gara normale, lasciala finire, torna alle corse e apri Storico gare: deve comparire risultato completo e replay. La modalità locale è etichettata e non salva. Il test del vero trasporto MongoDB resta da fare con il tuo cluster.
10. **Errori.** NOT_CONFIGURED: controlla nome della variabile e ambiente, salva e ridistribuisci. AUTH: controlla l'utente DATABASE e la password nella variabile privata, non la password dell'account Atlas. CONNECTION: controlla cluster attivo, stringa e IP Access List. “Non è ancora terminata”: attendi e riprova il salvataggio. Dopo un errore di salvataggio il pulsante Riprova salvataggio consente di riusare la stessa gara senza duplicarla.

**Solo se vuoi eseguire il progetto sul PC:** crea un file `.env.local` nella radice del checkout, con `MONGODB_URI=` e il valore privato inserito localmente. Il file è ignorato da Git. Non caricarlo tramite l'interfaccia GitHub. Node non carica automaticamente `.env.local`: usa un ambiente di sviluppo Vercel appropriato oppure `node --env-file=.env.local` per i tuoi script server. Non condividere schermate del file. Non serve configurare il PC per usare il sito distribuito.

Fonti ufficiali:
- https://www.mongodb.com/docs/atlas/tutorial/create-atlas-account/
- https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
- https://www.mongodb.com/docs/atlas/security-add-mongodb-users/
- https://www.mongodb.com/docs/atlas/security/ip-access-list/
- https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/
- https://vercel.com/kb/guide/how-to-allowlist-deployment-ip-address
- https://vercel.com/docs/environment-variables/managing-environment-variables

## Verifiche eseguite e limiti

- `node scripts/test-horse-engine.mjs`: PASS, 200 seed, arrivi di tutti, unico primo, posizioni uniche, determinismo, replay a 15/30/60/120/144 FPS, coerenza attraversamenti, classifica, statistiche, separazione laterale. 8 fotofinish su 200; 1.944 sorpassi complessivi. Non è una promessa di frequenza per ogni numero di partecipanti.
- `node scripts/test-horse-api.mjs`: PASS con collection simulata, risultati falsificati ignorati, token, pending/completed, idempotenza, limite richieste, errori sanitizzati e origine. Non prova la connessione Atlas reale.
- `node scripts/test-horse-scope.mjs`: PASS; codice generale identico alla base al netto delle due funzioni della corsa, API esistenti e CSS globali invariati.
- Controlli sintattici JS e `git diff --check`: PASS.
- Eseguito test temporaneo con geometrie Three.js reali e GPU/DOM simulati: costruzione scena, animazione, pausa, eventi d'arrivo, vincitore, podio, restart e rilascio risorse PASS. Non è un test visivo.
- Test generali preesistenti non verdi già sulla base: `test-frontend-runtime.mjs` manca `document.querySelector` nello stub; `verify-project.mjs` si aspetta 32.1.26 ma la base ha package 32.1.39. Non sono stati cambiati.
- Browser/GPU reali e dispositivi fisici non disponibili nel percorso di verifica supportato di questa sessione. Desktop, laptop, tablet, Android portrait/landscape, clipping e prestazioni 60/30 FPS NON sono certificati. Occorre collaudare l'anteprima prima del merge.
- Non sono stati introdotti nuovi modelli professionali esterni: i cavalli sono le geometrie procedurali articolate del progetto, con nuova guida del movimento. Il podio mostra nomi, numeri, tempi e distacchi, non modelli 3D individuali sul palco. Restano possibili rifiniture visive dopo il collaudo.

## Diff

| File modificato | Motivo |
| --- | --- |
| `index-inline.js` | Solo scheda corsa e launcher: lobby integrata, partecipanti esistenti, ritorno alla classifica calcistica |
| `index.html` | Rimozione del caricamento anticipato audio corsa e versione del relativo launcher |
| `sw.js` | Rimozione asset corsa dal precache e aggiornamento cache/launcher |
| `race-3d.js` | Renderer collegato al motore, pista, camera, HUD, risultati, replay, qualità e cleanup |
| `race-visuals.js` | Estensione del terreno e dei bordi per il nuovo rettilineo |
| `race-audio.js` | Audio muto iniziale e volume |
| `package.json` | Driver MongoDB solo server |

| File nuovo | Scopo |
| --- | --- |
| `race-engine.js` | Simulazione deterministica e campionamento condivisi client/server |
| `race-app.js` | Lobby, storico, integrazione API e replay |
| `race-premium.css` | Stili completamente confinati alla corsa |
| `api/horse-races.js` | API dedicata e controllo connessione |
| `lib/horse-racing/store.js` | Connessione, collection e indici MongoDB |
| `lib/horse-racing/service.js` | Creazione e completamento autorevole delle gare |
| `scripts/test-horse-engine.mjs` | Test simulazione |
| `scripts/test-horse-api.mjs` | Test contratto e sicurezza dei risultati |
| `scripts/test-horse-scope.mjs` | Controllo confini del diff |
| `package-lock.json` | Dipendenze riproducibili |
| `.gitignore` | Protezione dei file locali con segreti e delle installazioni |
| `docs/HORSE_RACING.md` | Analisi, consegna, istruzioni e limiti verificati |

Nessun file eliminato. Home, Squadra, Avversario, Giocatori, IA, statistiche calcistiche, Campo/Formazione, FUN, API EA, navigazione generale e servizi Blob non sono stati riprogettati né riscritti.
