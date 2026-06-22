/*
 CalmDaily — Service Worker
 Enables offline mode + faster loading
*/
const CACHE = 'calmdaily-v1';
const ASSETS = [
  '/calmdaily/',
  '/calmdaily/index.html',
  '/calmdaily/pages/auth.html',
  '/calmdaily/pages/dashboard.html',
  '/calmdaily/pages/privacy.html',
  '/calmdaily/pages/terms.html',
  '/calmdaily/manifest.json',
  '/calmdaily/icons/icon-192.png',
  '/calmdaily/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400;500&display=swap'
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS).catch(err => console.log('Cache miss:', err));
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', e => {
  // Skip Firebase and Stripe requests — always fresh
  if (e.request.url.includes('firebase') ||
      e.request.url.includes('stripe') ||
      e.request.url.includes('googleapis.com/identitytoolkit') ||
      e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  const title = data.title || 'CalmDaily';
  const options = {
    body:    data.body || 'Time for your daily wellness session 🌿',
    icon:    '/calmdaily/icons/icon-192.png',
    badge:   '/calmdaily/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data:    { url: data.url || '/calmdaily/pages/dashboard.html' },
    actions: [
      { action: 'open',    title: 'Open app' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || '/calmdaily/pages/dashboard.html';
  e.waitUntil(clients.openWindow(url));
});
