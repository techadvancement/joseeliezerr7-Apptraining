// Minimal, conservative service worker for Training App PWA.
// Only caches Expo's hashed static assets (immutable). Everything else: network only.
// This prevents the SW from ever serving stale HTML, video, PDF, or API responses.

const CACHE_VERSION = 'training-app-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Only intercept Expo's hashed bundles/assets — those are immutable.
  // Everything else (HTML, /storage/, /auth/, /rest/, manifest, sw.js, fonts loaded by ID, etc.) goes straight to network.
  if (!(url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/node_modules/'))) {
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      });
    })
  );
});
