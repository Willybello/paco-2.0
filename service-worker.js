// Service Worker per Paco 2.0 (PWA)
// Strategia: cache-first per asset statici, network-only per l'API del bot.

const CACHE_NAME = 'paco-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/immaginepaco.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => null)
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo richieste GET vengono gestite/cacheate
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Non toccare mai le chiamate alla function (devono andare sempre in rete)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/.netlify/')
  ) {
    return;
  }

  // Solo richieste same-origin
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache solo risposte valide
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(req, copy))
              .catch(() => null);
          }
          return res;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
