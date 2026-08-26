const CACHE = 'spenno-v1';
const FILES = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Only cache same-origin GET requests. Cross-origin (Notion API calls
  // go through our own /.netlify/functions/ proxy so those ARE same-origin,
  // but POST requests must never be intercepted or they'll break — same
  // lesson learned the hard way on TrackWise.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
