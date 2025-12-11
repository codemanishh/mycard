// Basic Service Worker to cache app shell and listen for sync (simplified)
const CACHE_NAME = 'card-companion-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // network-first for API; cache-first for assets
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin === location.origin && ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(req).then(res => res || fetch(req)));
    return;
  }
  // default network fallback
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
