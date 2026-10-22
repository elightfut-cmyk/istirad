importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'jiibha-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/header-logo.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => console.warn('Cache addAll notice:', err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // SPA Navigation / Route requests (e.g. /merchant, /admin, /supplier, /login)
  const isNavigation = event.request.mode === 'navigate' || 
                       event.request.destination === 'document' ||
                       url.pathname.startsWith('/merchant') ||
                       url.pathname.startsWith('/admin') ||
                       url.pathname.startsWith('/supplier') ||
                       url.pathname.startsWith('/login');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          // Robust SPA offline/fallback: serve /index.html or /
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const indexCached = (await caches.match('/index.html')) || (await caches.match('/'));
          if (indexCached) return indexCached;
          return new Response('<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2;url=/"></head><body>Loading...</body></html>', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // Static Assets: Cache First with safe Network Fallback
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).catch(async () => {
          // If a JS/CSS chunk failed, check if index.html can serve as fallback
          if (event.request.destination === 'document') {
            const fallback = (await caches.match('/index.html')) || (await caches.match('/'));
            if (fallback) return fallback;
          }
          return new Response('', { status: 408 });
        });
      })
      .catch(() => new Response('', { status: 408 }))
  );
});

// Fallback Push handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const rawData = event.data.json();
    if (rawData && (rawData.custom || rawData.onesignal || rawData.notificationId)) {
      return;
    }
    const options = {
      body: rawData.body || 'لديك تحديث جديد في جيبها',
      icon: '/app-logo.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200, 100, 200],
      data: {
        url: rawData.url || '/'
      }
    };
    event.waitUntil(
      self.registration.showNotification(rawData.title || 'جيبها - إشعار جديد', options)
    );
  } catch (e) {}
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
