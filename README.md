# Sisal FC 2021 — FC 27 Clubs Dashboard

Dashboard statico + Vercel Function per analizzare una squadra EA SPORTS FC 27 Clubs.

## Struttura

- `index.html` — dashboard frontend.
- `api/assistente.js` — endpoint Gemini server-side.
- `knowledge/fc27-knowledge.json` — base di conoscenza FC27.
- `config/fc27-sources.json` — canali YouTube monitorati via RSS.
- `scripts/update-fc27-knowledge.mjs` — aggiorna la knowledge usando RSS + Gemini.
- `scripts/validate-project.mjs` — controlli automatici di struttura, JSON, JavaScript e path.
- `.github/workflows/update-fc27-knowledge.yml` — aggiornamento giornaliero.
- `package.json` — blocca Node.js su `24.x`.

## Deploy Vercel

Importa il repository dalla ROOT del progetto. Non impostare `knowledge/` come Root Directory.

Non serve una build complessa: il progetto usa `index.html` alla root e `/api/assistente.js` come Vercel Function.

In Vercel configura:

`GEMINI_API_KEY` = la tua chiave Gemini

Node.js deve essere `24.x`. Il `package.json` contiene già:

```json
"engines": { "node": "24.x" }
```

## GitHub Actions

Aggiungi in GitHub → Settings → Secrets and variables → Actions:

`GEMINI_API_KEY`

Il workflow controlla prima il progetto con `npm run validate`. Se un feed YouTube non risponde, gli altri feed continuano a essere elaborati.

## YouTube

Non viene usata la YouTube Data API. I canali sono letti tramite RSS pubblico. I video pubblici selezionati vengono passati a Gemini tramite la funzione ufficiale di analisi degli URL YouTube.

L'URL di YouTube viene fornito come input video a Gemini tramite la Interactions API; non viene usato come `file_uri` di un file caricato.

La feature YouTube URL di Gemini è attualmente in anteprima e limiti/prezzi possono cambiare: controllare sempre la documentazione ufficiale prima di modificare lo script.

## Dati squadra

I JSON della squadra e dell'avversario vengono caricati dall'interfaccia e non sono hardcodati nel codice.

Regole principali:

- squadra: ultime 5 partite per la forma e i dati di partita;
- giocatori: statistiche cumulative su tutti i dati disponibili;
- trend giocatori: confronto ultime 5 vs cumulativo;
- passaggi: somma riusciti / somma tentati;
- contrasti: somma riusciti / somma tentati;
- OVR: solo se presente nei dati, altrimenti `N/D`.

## Controllo locale

Con Node 24 installato:

```bash
npm run validate
```

Deve terminare con `Validation OK`.
