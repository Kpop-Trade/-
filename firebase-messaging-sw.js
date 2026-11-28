self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  const rawPayload = event.data ? event.data.text() : '';
  try {
    payload = rawPayload ? JSON.parse(rawPayload) : {};
  } catch (error) {
    payload = { data: { body: rawPayload } };
  }

  const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const notification = payload.notification && typeof payload.notification === 'object'
    ? payload.notification
    : data.notification && typeof data.notification === 'object'
      ? data.notification
      : {};
  const fcmOptions = payload.fcmOptions || payload.webpush?.fcmOptions || payload.webpush?.fcm_options || {};
  const rawUrl = data.url || data.link || data.click_action || notification.click_action || fcmOptions.link || './';
  const notificationData = {
    url: String(rawUrl),
    ...(data.type ? { type: String(data.type) } : {}),
    ...(data.goId ? { goId: String(data.goId) } : {})
  };
  const title = String(notification.title || data.title || 'ILLIT Trade');
  const options = {
    body: String(notification.body || data.body || '新しい通知があります'),
    icon: String(notification.icon || data.icon || './icon-192.png'),
    data: notificationData
  };
  if (notification.image || data.image) options.image = notification.image || data.image;
  if (notification.tag || data.tag) options.tag = notification.tag || data.tag;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  let url = new URL(notificationData.url || './', self.location.href);
  if (notificationData.type === 'auto_go' && notificationData.goId) {
    url = new URL('./', self.location.href);
    url.searchParams.set('tab', 'autogo');
    url.searchParams.set('goId', notificationData.goId);
  }
  if (url.origin !== self.location.origin) url = new URL('./', self.location.href);
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
