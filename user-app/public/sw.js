self.addEventListener('install', (event) => {
    // console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
    // console.log('Service Worker activating.');
});

// A fetch handler is required for the browser to consider the app installable (PWA criteria)
self.addEventListener('fetch', (event) => {
    // Simple pass-through for now
    // event.respondWith(fetch(event.request));
});

self.addEventListener('notificationclick', function (event) {
    // console.log('Notification clicked.');
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function (windowClients) {
            // Check if there is already a window/tab open with the target URL
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // If so, just focus it.
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, then open the target URL in a new window/tab.
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
