# File dell’aggiornamento 32.1.54

Base: `722f4067421d7de795841e091cdd7378f18fe7ec`. Tutti i file sono completi, non patch da incollare. Caricare dalla radice del repository preservando le cartelle.

## Sostituire (25)

- `README.md`
- `api/editorial.js`
- `club-modern.css`
- `club-workspace.js`
- `editorial-ui.js`
- `index-inline.js`
- `index.html`
- `jockey-portrait.js`
- `lib/editorial.js`
- `lib/paper-auto.js`
- `lib/paper-job.js`
- `package-lock.json`
- `package.json`
- `paper-interactions.js`
- `scripts/test-club-editorial.mjs`
- `scripts/test-club-workspace-v6.mjs`
- `scripts/test-data-flow-v5.mjs`
- `scripts/test-frontend-runtime.mjs`
- `scripts/test-gazzetta53.mjs`
- `scripts/test-portrait-v5.mjs`
- `scripts/test-release-resources.mjs`
- `scripts/test-release53.mjs`
- `scripts/verify-project.mjs`
- `sisal-pro.js`
- `sw.js`

## Aggiungere (11)

- `account-boot.js`
- `docs/aggiornamento-32.1.54/ELENCO_FILE.md`
- `docs/aggiornamento-32.1.54/INSTALLAZIONE.md`
- `docs/aggiornamento-32.1.54/LEGGIMI.html`
- `docs/aggiornamento-32.1.54/VERIFICHE.md`
- `lib/paper-portrait.js`
- `scripts/test-gazzetta54.mjs`
- `scripts/test-release54.mjs`
- `setup/21-gazzetta-cinque-partite.sql`
- `sisal-future.css`
- `sisal-future.js`

## Eliminare

Nessun file da eliminare per installare questa versione. Non eliminare le vecchie migrazioni SQL: sono la storia del database. Non toccare i file del downloader sul telefono.

## SQL

Eseguire `setup/21-gazzetta-cinque-partite.sql` sul database prima di pubblicare il codice. Il 20 già presente è il prerequisito. Caricare la migrazione su GitHub non la esegue.

## Ripristino

Il pacchetto contiene tutti i file sostituiti della versione precedente. Il solo `index-inline.js` del ripristino include un adattamento che rende leggibili nel vecchio formato anche le edizioni nuove. `account-boot.js` viene conservato perché ripara un file mancante del main. Nessun dato personale o statistico viene cancellato.
