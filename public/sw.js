/* Kira Asistan — Service Worker (offline shell + push-ready) */
const CACHE = 'kira-asistan-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never cache cross-origin (e.g. Supabase API) — always go to network.
  if (url.origin !== self.location.origin) return;

  // App navigations: always fetch the freshest index.html (bypass HTTP cache),
  // fall back to the cached shell only when offline. This guarantees users get
  // new deployments without a hard refresh.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req.url, { cache: 'no-store' }).catch(() =>
        caches.match('/index.html').then((r) => r || caches.match('/'))
      )
    );
    return;
  }

  // Static assets (hashed JS/CSS/images): cache-first.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
    )
  );
});

/* ---- Push notifications (architecture-ready; needs VAPID + backend) ---- */
self.addEventListener('push', (event) => {
  let data = { title: 'Kira Asistan', body: 'Yeni bir kira hatırlatması var.' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
