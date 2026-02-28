/* SELLENCE RETOURENSCANNER – simple offline cache */
const CACHE = "sellence-retourenscanner-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./app.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE) ? caches.delete(k) : null));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try{
      const res = await fetch(req);
      const c = await caches.open(CACHE);
      c.put(req, res.clone());
      return res;
    }catch(err){
      return cached || new Response("Offline", {status: 503, headers: {"Content-Type":"text/plain"}});
    }
  })());
});