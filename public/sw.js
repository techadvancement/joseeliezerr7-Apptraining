// Silent self-unregistering SW. Runs once on browsers that still have a
// previous SW registration, clears its caches, and unregisters itself.
// Does NOT call clients.navigate() — that caused an infinite reload loop
// because the page kept re-registering the SW on every load.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
  })());
});
