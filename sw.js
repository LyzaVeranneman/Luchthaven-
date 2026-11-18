// Network first: always the newest version online, the cached copy when offline.
const CACHE = 'luchthaven-v2';
const FILES = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

// Background sync: when the connection comes back, fetch the newest game files into the cache.
function refreshCache() {
  return caches.open(CACHE).then(c => Promise.all(FILES.map(f =>
    fetch(f, { cache: 'no-store' }).then(res => res.ok && c.put(f, res)).catch(() => {}))));
}
self.addEventListener('sync', e => {
  if (e.tag === 'luchthaven-sync') e.waitUntil(refreshCache());
});
// Periodic background sync (installed app): check for a new version now and then.
self.addEventListener('periodicsync', e => {
  if (e.tag === 'luchthaven-update') e.waitUntil(refreshCache());
});
