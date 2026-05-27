/**
 * Firebase Messaging Service Worker
 * Handles background push notifications from Firebase Cloud Messaging
 */

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration passed from registration URL parameters in lib/firebase.ts
// This prevents hardcoding API keys and credentials in public static scripts.
const urlParams = new URLSearchParams(self.location.search);
const apiKey = urlParams.get('apiKey');
const authDomain = urlParams.get('authDomain');
const projectId = urlParams.get('projectId');
const storageBucket = urlParams.get('storageBucket');
const messagingSenderId = urlParams.get('messagingSenderId');
const appId = urlParams.get('appId');

// Only initialize if we have the configuration parameters
if (apiKey) {
    firebase.initializeApp({
        apiKey: apiKey,
        authDomain: authDomain,
        projectId: projectId,
        storageBucket: storageBucket,
        messagingSenderId: messagingSenderId,
        appId: appId
    });
} else {
    console.warn('[SW] Firebase configuration parameters missing. FCM might not work properly.');
}

const messaging = firebase.messaging();

// Handle background messages
// NOTE: Since the backend sends messages WITH a 'notification' field,
// the browser auto-displays the notification. We do NOT call
// showNotification here to avoid duplicate notifications.
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload?.data?.type);
    // No manual showNotification — the browser handles display from the notification field
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Navigate to specific page based on notification data
    let targetUrl = '/';

    if (event.notification.data?.type === 'questionnaire') {
        targetUrl = '/formularios';
    } else if (event.notification.data?.type === 'message') {
        targetUrl = '/chat';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
