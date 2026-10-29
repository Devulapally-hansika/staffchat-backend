const CACHE_NAME = 'origins-chat-v1';
const STATIC_ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Let ALL API calls pass directly to the network without interfering
  if (e.request.url.includes(':8080') || e.request.url.includes('/api/') || e.request.url.includes('onrender.com')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});