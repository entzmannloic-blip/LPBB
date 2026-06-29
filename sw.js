/* Nid — service worker
   Stratégie : network-first pour le bundle et l'app (toujours la dernière version si en ligne),
   cache-first pour les icônes/manifest. Fonctionne hors-ligne une fois la 1re visite faite. */
const CACHE = "nid-v1";
const CORE = [
  "./",
  "./index.html",
  "./bundle.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Ne gère que notre origine
  if (url.origin !== location.origin) return;

  const isAppShell = url.pathname.endsWith("/bundle.js") ||
                     url.pathname.endsWith("/index.html") ||
                     url.pathname.endsWith("/") ||
                     url.pathname.endsWith("/nid.html");

  if (isAppShell) {
    // network-first : on prend la dernière version, repli sur cache hors-ligne
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
  } else {
    // cache-first pour le reste (icônes, manifest)
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => r))
    );
  }
});
