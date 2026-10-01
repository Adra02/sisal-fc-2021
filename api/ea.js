const https = require('https');

// Cache semplice in memoria (durata 120 secondi)
const cache = new Map();
const CACHE_TTL = 120 * 1000;

const ALLOWED_ENDPOINTS = [
  'allTimeLeaderboard/search',
  'clubs/matches',
  'members/stats'
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const endpoint = req.query.endpoint;
  if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
    return res.status(400).json({ error: 'Endpoint non valido o non autorizzato.' });
  }

  // Costruzione della query per EA
  const queryParams = new URLSearchParams(req.query);
  queryParams.delete('endpoint');
  queryParams.set('platform', 'common-gen5');

  const targetUrl = `https://proclubs.ea.com/api/fc/${endpoint}?${queryParams.toString()}`;

  // Controllo Cache
  const now = Date.now();
  if (cache.has(targetUrl)) {
    const cached = cache.get(targetUrl);
    if (now - cached.timestamp < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }
  }

  try {
    const data = await new Promise((resolve, reject) => {
      const request = https.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.ea.com/'
        }
      }, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Risposta EA non in formato JSON valido'));
            }
          } else {
            reject(new Error(`Errore Server EA: Status ${response.statusCode}`));
          }
        });
      });

      request.on('error', (err) => reject(err));
      request.setTimeout(8000, () => {
        request.destroy();
        reject(new Error('I server EA impiegano troppo tempo a rispondere (Timeout)'));
      });
    });

    cache.set(targetUrl, { timestamp: now, data });
    return res.status(200).json(data);

  } catch (error) {
    return res.status(502).json({ 
      error: 'Impossibile recuperare i dati da EA Sports.',
      details: error.message 
    });
  }
};
