// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDorDxQcL3PVPKDtXNoVH32CY_c4sxDol0",
  projectId: "shepherdess-shop",
  messagingSenderId: "821551315722",
  appId: "1:821551315722:web:195f667fc0617d4d2718f3",
});

const messaging = firebase.messaging();

// This handles the notification when the user has the browser closed or is on another tab!
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  
  const notificationTitle = payload.notification.title || "Shepherdess Update!";
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://i.ibb.co/cck7F7yq/shepherdess-logo-small.png', // Your logo
    badge: 'https://i.ibb.co/cck7F7yq/shepherdess-logo-small.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});