/* Drop PWA service worker — 웹 푸시 + Android/Chrome 앱 설치 조건 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Chrome “앱 설치” 조건: fetch 핸들러가 있어야 함.
 * 요청은 가로채지 않는다 — 실패를 504로 바꿔 개발 서버/탭 요청을 깨지 않기 위해.
 */
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  let payload = { title: 'Drop', body: '새 알림이 있습니다.', data: {}, kind: '' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  const kind = payload.kind || payload.data?.kind || '';
  const isAttendance = kind === 'activity' || kind === 'attendance';

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: isAttendance ? 'drop-attendance' : 'drop-activity',
      data: { ...(payload.data ?? {}), kind: isAttendance ? 'attendance' : kind },
      actions: isAttendance
        ? [
            { action: 'going', title: '참석' },
            { action: 'not_going', title: '불참' },
          ]
        : [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const isIntent = action === 'going' || action === 'not_going';
  const path = isIntent ? `/?attendance=${action}` : '/';

  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (isIntent) {
          client.postMessage({ type: 'attendance-intent', intent: action });
        }
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(path);
    })
  );
});
