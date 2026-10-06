const CACHE='sisal-fc27-shell-v32.1.5-panels';
const SHELL=['./','./index.html','./index-inline.js?v=32.1.5-panels','./manifest.webmanifest','./knowledge/fc27-knowledge.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.pathname.includes('/api/'))return;if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(event.request,cp)).catch(()=>{})}return r}).catch(()=>caches.match(event.request).then(x=>x||caches.match('./index.html'))))});
