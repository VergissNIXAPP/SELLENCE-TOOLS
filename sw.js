/* SELLENCE Tools - Service Worker */
const CACHE = "sellence-tools-v2";
const CORE = [
  "./",
  "./index.html",
  "./tools.css",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/oos-icon.png",
  "./assets/retouren-icon.png",
  "./oos/index.html",
  "./oos/oos.html",
  "./oos/style.css",
  "./oos/icon-512.png",
  "./retouren/index.html",
  "./retouren/app.html",
  "./retouren/manifest.webmanifest",
  "./retouren/sw.js",
  "./retouren/icon-192.png",
  "./retouren/icon-512.png",
  "./assets/touren-icon.png",
  "./touren/index.html",
  "./touren/styles.css",
  "./touren/app.js",
  "./touren/manifest.json",
  "./touren/sw.js",
  "./touren/icons/icon-192.png",
  "./touren/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        // cache same-origin only
        if (new URL(req.url).origin === self.location.origin) {
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(()=>{});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
