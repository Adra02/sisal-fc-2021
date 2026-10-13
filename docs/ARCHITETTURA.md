# Schema e compatibilità

Base analizzata: `main` 66c5c097b96e50eda7846791d7bbfebdf265d6db, commit GitHub del 12 ottobre 2026 alle 23:40:41 UTC. La versione del pacchetto è 32.1.39; alcune risorse frontend sono 32.1.41. Non è stata dedotta una corrispondenza automatica tra questi numeri e il deployment pubblico.

| Tabella | Contenuto / concorrenza |
|---|---|
| team_state | Due righe own/opponent. Dieci categorie JSON originali, totali e memoria in jsonb. Revisioni e lock di riga: salvataggi basati su una revisione superata falliscono. |
| communications | Testo, stato, date, revisione e percorso foto. Un solo pin grazie a indice univoco. |
| communication_reactions | Coppia comunicato/dispositivo univoca; inserimento idempotente, eliminazione esplicita. Cascade quando si elimina l'articolo. |
| player_photos | Identità originale e percorso immagine; revisioni, tombstone e verifiche nome/club preservate. |
| sisal_requests | Ricevute delle operazioni Comunicati, valide sette giorni; riuso dello stesso ID con payload diverso rifiutato; conteggi di frequenza nella stessa transazione. |

RLS abilitata su tutte le tabelle; niente permessi anon/authenticated. RPC revocate a PUBLIC. Solo il server usa la chiave segreta. PostgreSQL conserva i dati strutturati; il bucket privato `sisal-images` contiene solo JPEG. Nessuna Edge Function o Realtime necessario.

La memoria conserva fino a 20 snapshot, uniti per fingerprint. L'assistente continua a usare gemini-3.5-flash-lite, prompt e analisi esistenti. Il caricamento centrale ora include realmente memoria e totali: prima `loadCentralTeams` chiamava solo `readAllFiles` benché il contesto disponesse di `historicalMemory`.

## Contratto Termux preservato

`/api/club-data` conserva GET, POST e DELETE. POST multipart conserva `role=own|opponent`, `file` e `category` facoltativa; JSON conserva saveTotals/saveTrackerUrl/removeTrackerUrl/importTracker e i rispettivi campi. DELETE conserva `?role=...`. Nessuna chiave Supabase nel dispositivo. Non esistono script Termux nel repository: il comportamento dei pulsanti sul telefono non è stato provato.

I caricamenti di categorie differenti continuano a essere richieste separate, come prima. Non avviare due esportazioni complete della stessa squadra contemporaneamente: non esiste un identificativo di batch negli script disponibili che permetta di trattarle come un solo caricamento indivisibile. Il database impedisce una sovrascrittura concorrente basata sulla stessa revisione; un errore durante le operazioni successive al salvataggio può richiedere di ritentare il caricamento.

## Cache e immagini

Le letture della stessa squadra sono riutilizzate all'interno della richiesta HTTP; nessuna cache persistente di processo può far rispondere un'altra istanza con una vecchia revisione. I Comunicati mostrano la copia locale mentre eseguono una singola lettura all'apertura. Aggiornamento manuale, nessun polling. Le API sono escluse dal service worker. Nuova versione della shell e dei moduli modificati.

La cache foto del browser conserva la revisione per le modifiche. Un vecchio client senza revisione deve aggiornare la pagina prima di salvare. Nessuna modifica ai pulsanti Termux.

Le immagini sono indirizzate tramite hash del contenuto. Vecchie versioni e upload rimasti senza riferimento dopo un conflitto non sono cancellati automaticamente: evitare cancellazioni mentre altri utenti scrivono protegge i contenuti. `migration/storage-audit.mjs` fornisce l'inventario, senza cancellare. Questo è un limite attuale: lo spazio può crescere con le sostituzioni, quindi va controllato in Usage. Non è previsto spazio illimitato né garbage collection automatica.

Limiti applicativi: 100 Comunicati, 18.000 caratteri/testo, 160/titolo, JPEG Comunicati 192 KiB, foto giocatori fino a 315.000 byte; 15 modifiche Comunicati/minuto/dispositivo e 1.000/giorno complessive. Il filtro IP nell'API è per istanza, non un WAF distribuito. Gli identificativi browser non provano l'unicità delle persone; cambiando dati del browser si cambia identità.

## Separazione dal vecchio archivio

La cartella `app` non dipende dal vecchio SDK. `strumento-export`, da tenere fuori dal repository e dal deployment, usa @vercel/blob ESCLUSIVAMENTE per leggere la sorgente una tantum. Queste letture consumano operazioni durante il trasferimento. Il suo sottoinsieme `freeze` è una fase temporanea sul vecchio codice, non parte dell'app Supabase finale. Nessuno script elimina il vecchio archivio.

Il backup comprende tutti i percorsi. L'importazione usa il bundle attivo (o i file legacy se il bundle manca), foto con metadati originali, Comunicati e votanti. Immagini storiche non più referenziate restano nel backup. Percorsi sconosciuti bloccano l'importazione e sono elencati in inventory-review.json. Non vengono ignorati silenziosamente. Vecchie ricevute d'invio non sono trasferite: prima della pausa completa eventuali invii pendenti o conserva le bozze.
