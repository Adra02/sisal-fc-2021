SISAL FC 2021 - FC27 COMMAND CENTER V18

La squadra viene cercata con NOME CLUB + PIATTAFORMA.
Il backend usa Chromium headless con puppeteer-core + @sparticuz/chromium e gli endpoint Clubs di EA FC27.

Endpoint:
/api/scrape-stats?clubName=Sisal%20FC%202021&platform=common-gen5

Dati recuperati:
- ricerca club
- info club
- overall stats
- member stats
- league matches
- friendly matches
- playoff matches
- playoff achievements quando disponibili

Gemini 3.5 Flash-Lite viene usato solo per l'analisi dei dati già recuperati.

Vercel:
GEMINI_API_KEY

Gli endpoint EA sono non documentati e possono cambiare. In caso di blocco l'app mostra l'errore reale e non inventa dati.
