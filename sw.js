const CACHE = "sellence-tools-v27";
const CORE = [
  "./",
  "./index.html",
  "./tools.css",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./sellence-ninox-bericht/index.html",
  "./sellence-ninox-bericht/style.css",
  "./sellence-ninox-bericht/app.js",
  "./sellence-ninox-bericht/icon-192.png",
  "./sellence-ninox-bericht/manifest.webmanifest"
];
self.addEventListener("install", event => {
  event.waitUntil((async ()=>{
    const cache = await caches.open(CACHE);
    await Promise.allSettled(CORE.map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE ? caches.delete(k) : null))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    const copy = res.clone();
    if(new URL(req.url).origin === self.location.origin){
      caches.open(CACHE).then(cache => cache.put(req, copy)).catch(()=>{});
    }
    return res;
  }).catch(() => cached)));
});
