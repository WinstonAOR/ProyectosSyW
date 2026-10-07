self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // PWA offline passthrough
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

const CACHE_NAME = 'proyectos_syw-v1.1.1'; // Cambia la versión 'v' si haces cambios grandes

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Fuerza a que el nuevo service worker tome el control de inmediato
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Borra cachés antiguos
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});