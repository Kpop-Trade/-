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

messaging.onBackgroundMessage((payload) => {
  // notification または data のどちらからでもタイトルと本文を確実に取得して表示する
  const notification = payload.notification || {};
  const data = payload.data || {};
  
  const title = notification.title || data.title || 'ILLIT Trade';
  const options = {
    body: notification.body || data.body || '',
    icon: './icon-192.png',
    data: { url: data.url || './' }
  };

  return self.registration.showNotification(title, options);
});

// 通知をタップしたときの挙動
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
