// Appointly Native Web Push Service Worker

self.addEventListener('install', (event) => {
    // Force immediate activation
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Listen for background push notifications
self.addEventListener('push', (event) => {
    if (!event.data) {
        console.warn('[SW] Push event received with no data.');
        return;
    }

    try {
        const payload = event.data.json();
        const title = payload.title || 'Appointly Notification';

        const options = {
            body: payload.body || payload.message || 'You have an appointment or message update.',
            icon: payload.icon || '/favicon.svg',
            badge: '/favicon.svg',
            tag: payload.tag || `appointly-${Date.now()}`,
            renotify: true,
            vibrate: [150, 80, 150],
            data: {
                link: payload.link || '/',
                timestamp: payload.timestamp || Date.now()
            },
            actions: [
                { action: 'open', title: 'Open Appointly' },
                { action: 'close', title: 'Dismiss' }
            ]
        };

        event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
        console.error('[SW] Error displaying push notification:', err);
    }
});

// Handle notification click and direct deep navigation
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const targetUrl = event.notification.data?.link || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If an Appointly tab is already open, focus it and navigate
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Otherwise, open a new window to the destination link
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
