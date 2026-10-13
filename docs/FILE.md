# File della consegna

Base: main 66c5c097b96e50eda7846791d7bbfebdf265d6db. App completa dentro `app`; non serve sostituire cartelle intere. Prima segui GUIDA_SUPABASE.md.

## Sostituire nel progetto finale

- `README.md`
- `api/assistente.js`
- `api/club-data.js`
- `api/comunicati.js`
- `api/health.js`
- `api/player-photo.js`
- `comunicati.css`
- `comunicati.js`
- `env.example`
- `index-inline.js`
- `index.html`
- `lib/comunicati-store.js`
- `lib/shared-store.js`
- `package.json`
- `scripts/test-ai-connection.mjs`
- `scripts/test-player-identity-v32141.mjs`
- `scripts/test-player-photo-v32141.mjs`
- `scripts/test-shared-contract.mjs`
- `scripts/test-v32124-realism-blob.mjs`
- `scripts/verify-project.mjs`
- `sw.js`

## Aggiungere

- `.gitignore`
- `.vercelignore`
- `api/comunicati-image.js`
- `docs/ARCHITETTURA.md`
- `docs/FILE.md`
- `docs/GUIDA_SUPABASE.md`
- `docs/TEST.md`
- `docs/test-results.json`
- `lib/supabase.js`
- `migration/import.mjs`
- `migration/storage-audit.mjs`
- `package-lock.json`
- `scripts/test-export.mjs`
- `scripts/test-migration.mjs`
- `scripts/test-news-client.mjs`
- `scripts/test-no-legacy-storage.mjs`
- `scripts/test-supabase-api.mjs`
- `scripts/test-supabase.mjs`
- `setup/01-database.sql`
- `setup/02-storage.sql`
- `setup/03-import-temporary.sql`
- `setup/04-close-import.sql`

## Eliminare

Nessun file tracciato deve essere eliminato. La dipendenza @vercel/blob è stata rimossa dal package.json; npm install/npm ci riallineano node_modules.

## Strumento separato, NON da distribuire

`strumento-export/package.json`, `export.mjs` e `freeze/` servono soltanto al vecchio archivio durante la migrazione. Le istruzioni di freeze prevedono temporaneamente tre sostituzioni; l’app finale le annulla. Non caricare questa cartella su GitHub o Vercel.

Nessuno script Termux aggiunto o modificato. Il file index-inline.js cambia soltanto nella gestione delle revisioni foto; index.html cambia soltanto gli URL di versione delle risorse. Modello e prompt Gemini invariati. CSS delle altre sezioni, corse, navigazione e libreria d’identità dei giocatori invariati. La mancanza di regressioni visive reali non può essere confermata senza browser.
