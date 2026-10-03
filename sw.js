const CACHE = 'sisal-fc27-shell-v18';
const SHELL = ['./', './index.html', './manifest.webmanifest', './knowledge/fc27-knowledge.json'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/')) return;
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => { if (response.ok) { const copy=response.clone(); caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{}); } return response; }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
});
