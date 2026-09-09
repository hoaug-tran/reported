const CACHE_NAME = 'reported-cache-v5';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.svg?v=2',
  '/icon-192.png?v=2',
  '/icon-512.png?v=2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  if (event.request.method !== 'GET' || !url.protocol.startsWith('http') || url.pathname.startsWith('/api')) {
    return;
  }

  const isViteDev =
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/.vite/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.includes('hot-update');

  if (isViteDev) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && !url.port) {
          const toCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', toCache)).catch(() => {});
        }
        return networkResponse;
      }).catch(async () => {
        const cached = await caches.match('/');
        if (cached) return cached;
        return new Response('<!DOCTYPE html><html><body>Offline</body></html>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    STATIC_ASSETS.includes(url.pathname);

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const toCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache)).catch(() => {});
        }
        return networkResponse;
      }).catch(async () => {
        const fallback = await caches.match(event.request);
        if (fallback) return fallback;
        return new Response('', { status: 408, statusText: 'Request Timeout' });
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Reported', message: 'Bạn có thông báo mới.', link: '/' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    if (event.data) {
      data.message = event.data.text();
    }
  }

  const options = {
    body: data.message || data.body || '',
    icon: '/icon-192.png',
    badge: '/favicon.svg',
    data: {
      url: data.link || data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Reported', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
