// VAULT HAC service worker.
// Pages are always fetched from the network first, so visitors get your latest changes
// as soon as you upload them. The cache is only a fallback for when the phone is offline.
const CACHE = "vaulthac-v3";
const PRECACHE = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "welcome.webp"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(PRECACHE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  // Only handle GET requests to this same site. Firebase, YouTube and other sites are never touched.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // The admin page is never cached.
  if (/admin(\.html)?$/.test(url.pathname)) return;

  const isPage = req.mode === "navigate" || req.destination === "document";
  const isData = /\.(json|js)$/.test(url.pathname);

  if (isPage || isData) {                       // network first, cache as backup
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("index.html") || caches.match("./")))
    );
    return;
  }
  // images and icons: show the saved copy fast, refresh it in the background
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
