// Subí este número cada vez que deployes cambios importantes
const CACHE_VERSION = 'myhubhestudio-v1';

const SHELL = [
  './',
  './index.html',
  './LobbyStyle.css',
  './JsLobby.js',
  './JsRutas.js',
  './ExtraFunc.js',
  './vendor/lucide.min.js',
  './vendor/snd.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './Apps/Papelera/papelera.html',
  './Apps/Papelera/papelera.css',
  './Apps/Papelera/papelera.js',
  './Apps/Forge/forge.html',
  './Apps/Forge/forge.css',
  './Apps/Forge/forge.js',
  './Apps/StorHe/Stor-He.html',
  './Apps/StorHe/Stor-He.css',
  './Apps/StorHe/Stor-He.js',
  './Apps/CMD-HE/cmd-he.html',
  './Apps/CMD-HE/cmd-he.css',
  './Apps/CMD-HE/cmd-he.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Cachear resiliente: si un archivo falla, loguea y sigue
      await Promise.all(SHELL.map(url =>
        fetch(url, { cache: 'no-cache' }).then(res => {
          if (res.ok) return cache.put(url, res);
          console.warn('[SW] No cacheado:', url, res.status);
        }).catch(err => console.warn('[SW] Error cacheando:', url, err))
      ));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // APIs externas: passthrough total (Stor-He necesita GitHub en vivo)
  const EXTERNAL = [
    'api.github.com',
    'raw.githubusercontent.com',
    'cdnjs.cloudflare.com',
    'unpkg.com'
  ];
  if (EXTERNAL.includes(url.hostname)) return;

  // Mismo origen: cache-first con fallback a red
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
          }
          return res;
        }).catch(() => caches.match('./index.html')); // fallback SPA
      })
    );
  }
});
