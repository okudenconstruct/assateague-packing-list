const CACHE = 'assateague-v8';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png', './banner.webp', './bg.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache immediately, refresh the cache in
// the background. Offline + cache miss falls back to the app shell for
// navigations instead of resolving undefined.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    const fetchAndCache = fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === self.location.origin) {
        const clone = res.clone();
        e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, clone)));
      }
      return res;
    });
    if (cached) {
      e.waitUntil(fetchAndCache.catch(() => {}));
      return cached;
    }
    try {
      return await fetchAndCache;
    } catch (err) {
      if (e.request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
