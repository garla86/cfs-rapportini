const CACHE_NAME = 'cfs-facility-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdn-icons-png.flaticon.com/512/995/995250.png'
];

// 1. Installazione: Scarica le risorse statiche di base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Attivazione: Pulisce vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch: Strategia "Cache First, Network Fallback" per le risorse statiche
// e "Stale While Revalidate" per le librerie esterne (esm.sh)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Gestione specifica per le librerie caricate da ESM.SH o Google Fonts
  if (url.hostname.includes('esm.sh') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Se la risposta è valida, aggiorna la cache per la prossima volta
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
             // Se siamo offline e il fetch fallisce, non fare nulla (speriamo ci sia la cache)
          });
          // Restituisci la cache se c'è, altrimenti aspetta la rete
          return response || fetchPromise;
        });
      })
    );
    return;
  }

  // Per le pagine HTML (navigazione) usiamo Network First
  if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Per tutto il resto (file locali) usiamo Cache First
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});