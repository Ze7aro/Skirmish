// Service worker: el juego funciona sin conexión tras la primera carga.
// Sube VERSION cuando cambies archivos para invalidar la caché anterior.
const VERSION = 'kota-v27';
const SHELL = ['./', 'index.html', 'style.css', 'data.js', 'talents.js', 'game.js', 'meta.js', 'rival.js', 'season.js', 'economy.js', 'cosmetics.js', 'net.js', 'audio.js', 'render.js', 'ui.js', 'ui_store.js', 'ui_online.js', 'ui_main.js', 'ui_planet.js', 'manifest.webmanifest',
  'data/kota_roster.js', 'art/manifest.js', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Arte: caché primero (no cambia entre versiones). Código y datos: red primero, caché si no hay conexión.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isArt = /\/art\/.*\.(webp|png)$|\/icons\//.test(req.url);
  if (isArt) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    })));
  } else {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req)));
  }
});
