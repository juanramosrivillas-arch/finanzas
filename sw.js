const CACHE = "finanzas-v2";
const ARCHIVOS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icono-192.png", "./icono-512.png", "./icono-maskable.png",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La app va primero desde la red y cae al caché si no hay conexión.
// Las consultas externas (TRM) nunca se cachean.
self.addEventListener("fetch", (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  ev.respondWith(
    fetch(ev.request)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(ev.request, copia)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(ev.request).then((r) => r || caches.match("./index.html")))
  );
});
