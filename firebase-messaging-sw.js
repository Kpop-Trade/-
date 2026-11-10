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
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
