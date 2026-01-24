/* SELLENCE Tools - Service Worker */
const CACHE = "sellence-tools-v3";

/**
 * Core assets to pre-cache.
 * NOTE: We cache "best effort" so missing optional files (e.g. placeholder icons)
 * won't break the service worker installation.
 */
const CORE = [
  "./",
  "./index.html",
  "./tools.css",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",

  // Main tiles / icons
  "./assets/oos-icon.png",
  "./assets/retouren-icon.png",
  "./assets/stempeluhr-icon.png",
  "./assets/touren-icon.png",

  // NEW: VW Helfer
  "./sellence-vw-helfer/index.html",
  "./sellence-vw-helfer/styles.css",
  "./sellence-vw-helfer/app.js",
  "./sellence-vw-helfer/assets/icon.svg",

  // Optional / placeholder (best effort)
  "./assets/lager-icon.png",

  // OOS
  "./oos/index.html",
  "./oos/oos.html",
  "./oos/style.css",
  "./oos/icon-512.png",

  // Retouren
  "./retouren/index.html",
  "./retouren/app.html",
  "./retouren/manifest.webmanifest",
  "./retouren/sw.js",
  "./retouren/icon-192.png",
  "./retouren/icon-512.png",

  // Touren
  "./touren/index.html",
  "./touren/styles.css",
  "./touren/app.js",
  "./touren/manifest.json",
  "./touren/sw.js",
  "./touren/icons/icon-192.png",
  "./touren/icons/icon-512.png",

  // Stempeluhr
  "./stempeluhr/index.html",
  "./stempeluhr/styles.css",
  "./stempeluhr/app.js",
  "./stempeluhr/manifest.json",
  "./stempeluhr/sw.js",
  "./stempeluhr/assets/icon-192.png",
  "./stempeluhr/assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // Best-effort caching: do not fail install if a single file is missing.
    await Promise.allSettled(
      CORE.map((url) => cache.add(url))
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null))))
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
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
