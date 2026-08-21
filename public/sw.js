/* Drop PWA service worker — 웹 푸시 + Android/Chrome 앱 설치 조건 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Chrome “앱 설치” 조건: fetch 핸들러가 있어야 함.
 * 문서(navigate) 요청은 가로채지 않음 — Expo 개발 서버가 SW fetch에 403을 줍니다.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response('', { status: 504, statusText: 'offline' })
    )
  );
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Drop', body: '새 알림이 있습니다.' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'drop-activity',
      data: payload.data ?? {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
