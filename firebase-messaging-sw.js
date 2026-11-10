importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBB1_QTcXpF0Ap72tDaf5_CCUtNBwSlXCs",
  authDomain: "illit-7ecd4.firebaseapp.com",
  projectId: "illit-7ecd4",
  storageBucket: "illit-7ecd4.firebasestorage.app",
  messagingSenderId: "1060277997826",
  appId: "1:1060277997826:web:e47d21d9edc538bb86321b"
});

const messaging = firebase.messaging();

// notification 付きのメッセージは FCM が自動で表示するので、ここでは表示しない（二重表示防止）。
// data のみのメッセージのときだけ自前で表示する。
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return;
  const d = payload.data || {};
  self.registration.showNotification(d.title || 'ILLIT Trade', {
    body: d.body || '',
    icon: '/icon-192.png',
    data: { url: d.url || '/' }
  });
});

// 通知タップでアプリを開く（開いていればそのタブを前面に）
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
