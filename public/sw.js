// PWA Service Worker with Cache Bashing & Asset Versioning Safety
const CACHE_NAME = 'card-companion-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.debug('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only intercept same-origin GET requests
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Never cache API or Supabase requests
  if (url.pathname.includes('/supabase') || url.pathname.includes('/rest/v1')) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        // If requesting a JS or CSS asset but server returned HTML (Netlify 404 fallback),
        // do not return HTML as JS script to prevent MIME type errors.
        const isAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
        const contentType = response.headers.get('content-type') || '';
        
        if (isAsset && contentType.includes('text/html')) {
          console.warn('[SW] Missing JS/CSS asset fallback detected for:', url.pathname);
          // Return a 404 error response so browser can handle or trigger fallback
          return new Response('Asset not found', { status: 404, statusText: 'Not Found' });
        }
        return response;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('/index.html')))
  );
});
