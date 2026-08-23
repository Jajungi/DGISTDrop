/* Drop PWA service worker — v20260824-attendance */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {});

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function readPushPayload(event) {
  const base = { title: 'Drop', body: '새 알림이 있습니다.', data: {}, kind: '', showAttendance: false };
  if (!event.data) return base;

  let raw = null;
  try {
    raw = event.data.json();
  } catch {
    try {
      raw = JSON.parse(event.data.text());
    } catch {
      return { ...base, body: event.data.text() };
    }
  }
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ...base, body: raw };
    }
  }

  const data = asObject(raw && raw.data);
  const kind = raw.kind || data.kind || '';
  const showAttendance =
    raw.showAttendance === true ||
    raw.showAttendance === '1' ||
    data.showAttendance === true ||
    data.showAttendance === '1';

  return {
    title: raw.title || data.title || base.title,
    body: raw.body || data.body || raw.message || base.body,
    data,
    kind,
    showAttendance,
  };
}

function isAttendancePayload(payload) {
  const kind = String(payload.kind || '').toLowerCase();
  if (kind === 'activity' || kind === 'attendance') return true;
  if (payload.showAttendance) return true;
  return String(payload.title || '').includes('활동');
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event);
  const isAttendance = isAttendancePayload(payload);

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: isAttendance ? 'drop-attendance' : 'drop-activity',
      renotify: true,
      data: { ...payload.data, kind: isAttendance ? 'attendance' : payload.kind },
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
