// Firebase Messaging Service Worker
// This handles push notifications when the app is in the background

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDrAX2h5u4jZMTsPJSxf_SwSsRYfIF6jMM",
    authDomain: "cloud-messaging-9105d.firebaseapp.com",
    projectId: "cloud-messaging-9105d",
    storageBucket: "cloud-messaging-9105d.firebasestorage.app",
    messagingSenderId: "348783336016",
    appId: "1:348783336016:web:c6541cb94c82a2c8300f55",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Portfolio League';
    const notificationOptions = {
        body: payload.notification?.body || 'Something happened in your group',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.data?.type || 'default',
        data: payload.data,
        vibrate: [100, 50, 100],
        actions: [
            { action: 'open', title: 'View' },
            { action: 'close', title: 'Dismiss' }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click:', event);
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        // Open the app
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes('/dashboard') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow('/dashboard');
                }
            })
        );
    }
});
