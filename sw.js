/* Service worker del Cartellone.
   Tiene una copia locale del foglio: una volta aperto, l'app funziona
   anche senza rete. Cambia VERSION per forzare l'aggiornamento. */

const VERSION = "v4";
const CACHE = `cartellone-${VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./nube.js",
  "./config.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./fonts/fonts.css",
  "./fonts/inter-latin.woff2",
  "./fonts/fraunces-latin.woff2",
  "./fonts/fraunces-italic-latin.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Pagina: prima la rete (così si aggiorna), poi la copia salvata.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Font, icone, manifest: prima la copia salvata.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
