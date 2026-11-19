self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { notification: { title: 'ILLIT Trade', body: event.data ? event.data.text() : '' } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'ILLIT Trade';
  const options = {
    body: notification.body || data.body || '新しい通知があります',
    icon: './icon-192.png',
    data: { url: data.url || './' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.location.href);
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (url.origin === self.location.origin) {
        for (const c of list) {
          if (c.url.startsWith(self.location.origin) && 'focus' in c) {
            return c.navigate(url.href).then(() => c.focus());
          }
        }
      }
      return clients.openWindow(url.href);
    })
  );
});
