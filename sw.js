const CACHE='sisal-fc27-shell-v2';
const SHELL=['./','./index.html','./manifest.webmanifest','./knowledge/fc27-knowledge.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.pathname.includes('/api/')) return;
  e.respondWith(fetch(e.request).then(r=>{if(e.request.method==='GET'&&r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{});}return r}).catch(()=>caches.match(e.request).then(x=>x||caches.match('./index.html'))));
});
