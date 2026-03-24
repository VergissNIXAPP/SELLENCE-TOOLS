const CACHE = "sellence-ean-v20";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./manifest.webmanifest",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-180.png",
  "./assets/thumbs/chesterfield-blue-op-2xl-box.png",
  "./assets/thumbs/chesterfield-blue-op-4xl-box.png",
  "./assets/thumbs/chesterfield-blue-op-box.png",
  "./assets/thumbs/chesterfield-blue-op-xl-box.png",
  "./assets/thumbs/chesterfield-original-op-2xl-box.png",
  "./assets/thumbs/chesterfield-original-op-box.png",
  "./assets/thumbs/chesterfield-original-op-xl-box.png",
  "./assets/thumbs/eve-120-op-box.png",
  "./assets/thumbs/f6-blue-op-7xl-box.png",
  "./assets/thumbs/f6-blue-op-xl-box.png",
  "./assets/thumbs/f6-original-op-2xl-box.png",
  "./assets/thumbs/f6-original-op-7xl-box.png",
  "./assets/thumbs/f6-original-op-box.png",
  "./assets/thumbs/f6-original-op-xl-box.png",
  "./assets/thumbs/landm-blue-label-op-2xl-box.png",
  "./assets/thumbs/landm-blue-label-op-4xl-box.png",
  "./assets/thumbs/landm-blue-label-op-7xl-box.png",
  "./assets/thumbs/landm-blue-label-op-box.png",
  "./assets/thumbs/landm-blue-label-op-xl-box.png",
  "./assets/thumbs/landm-red-label-long-op-box.png",
  "./assets/thumbs/landm-red-label-op-2xl-box.png",
  "./assets/thumbs/landm-red-label-op-4xl-box.png",
  "./assets/thumbs/landm-red-label-op-7xl-box.png",
  "./assets/thumbs/landm-red-label-op-9xl-box.png",
  "./assets/thumbs/landm-red-label-op-box.png",
  "./assets/thumbs/landm-red-label-op-xl-box.png",
  "./assets/thumbs/landm-simply-blue-op-box.png",
  "./assets/thumbs/landm-simply-red-op-box.png",
  "./assets/thumbs/mb-gold-long-op-box.png",
  "./assets/thumbs/mb-gold-op-2xl-box.png",
  "./assets/thumbs/mb-gold-op-3xl-box.png",
  "./assets/thumbs/mb-gold-op-7xl-box.png",
  "./assets/thumbs/mb-gold-op-box.png",
  "./assets/thumbs/mb-gold-op-xl-box.png",
  "./assets/thumbs/mb-gold-soft-label-op-soft.png",
  "./assets/thumbs/mb-mix-op-2xl-box.png",
  "./assets/thumbs/mb-mix-op-box.png",
  "./assets/thumbs/mb-mix-op-xl-box.png",
  "./assets/thumbs/mb-red-long-op-box.png",
  "./assets/thumbs/mb-red-op-2xl-box.png",
  "./assets/thumbs/mb-red-op-3xl-box.png",
  "./assets/thumbs/mb-red-op-7xl-box.png",
  "./assets/thumbs/mb-red-op-9xl-box.png",
  "./assets/thumbs/mb-red-op-box.png",
  "./assets/thumbs/mb-red-op-xl-box.png",
  "./assets/thumbs/mb-red-soft-label-op-soft.png",
  "./assets/thumbs/mb-silver-blue-op-box.png",
  "./assets/thumbs/mb-simply-blue-op-box.png",
  "./assets/thumbs/mb-simply-red-op-box.png",
  "./assets/thumbs/mb-white-op-box.png",
  "./assets/thumbs/parliament-night-blue-long-op-box.png"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", (e)=>{
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e)=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(res => res || fetch(req).then(net=>{
      const copy = net.clone();
      caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
      return net;
    }).catch(()=>caches.match("./index.html")))
  );
});
