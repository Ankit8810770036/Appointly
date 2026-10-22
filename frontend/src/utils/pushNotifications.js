import { request } from '../api/apiClient';

/**
 * Utility to convert URL-safe base64 string to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Check if the current browser environment supports Push Notifications & Service Workers
 */
export const isPushSupported = () => {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

/**
 * Get current browser notification permission status
 */
export const getNotificationPermission = () => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
};

/**
 * Register the Service Worker
 */
export const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return null;

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        return registration;
    } catch (err) {
        console.error('[WebPush] Service Worker registration failed:', err);
        return null;
    }
};

/**
 * Request notification permission and subscribe device to Web Push
 * @param {string} token - User JWT token
 */
export const subscribeToWebPush = async (token) => {
    if (!isPushSupported()) {
        throw new Error('Push notifications are not supported in this browser.');
    }

    // 1. Request Browser Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error(
            permission === 'denied'
                ? 'Notification permission was denied. Please allow notifications in your browser settings.'
                : 'Notification permission was dismissed.'
        );
    }

    // 2. Register Service Worker if not registered
    const registration = await registerServiceWorker();
    if (!registration) {
        throw new Error('Failed to register Appointly service worker.');
    }

    // 3. Wait for service worker activation
    await navigator.serviceWorker.ready;

    // 4. Retrieve VAPID Public Key from backend
    const { publicKey } = await request('/notifications/vapid-public-key');
    if (!publicKey) {
        throw new Error('VAPID public key was not returned from the server.');
    }

    // 5. Subscribe using PushManager
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
        });
    }

    // 6. Send subscription object to backend database
    await request('/notifications/push-subscribe', {
        method: 'POST',
        body: { subscription },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    localStorage.setItem('abs_push_enabled', 'true');
    return subscription;
};

/**
 * Unsubscribe current browser from Web Push
 * @param {string} token - User JWT token
 */
export const unsubscribeFromWebPush = async (token) => {
    if (!isPushSupported()) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await request('/notifications/push-unsubscribe', {
                method: 'POST',
                body: { endpoint: subscription.endpoint },
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            await subscription.unsubscribe();
        }

        localStorage.removeItem('abs_push_enabled');
        return true;
    } catch (err) {
        console.error('[WebPush] Failed to unsubscribe:', err);
        return false;
    }
};

/**
 * Check if the current browser is actively subscribed
 */
export const checkIsSubscribed = async () => {
    if (!isPushSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return Boolean(subscription);
    } catch (err) {
        return false;
    }
};

/**
 * Trigger an immediate test push to verify notifications on this machine
 * @param {string} token - User JWT token
 */
export const sendTestPush = async (token) => {
    return await request('/notifications/test-push', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
};

/**
 * Display a native notification if the window is currently in the background / minimized
 * @param {string} title
 * @param {object} options
 */
export const showBackgroundNotification = async (title, options = {}) => {
    // Only display desktop notification if tab is in background or unfocused
    if (document.visibilityState === 'visible' && !options.force) {
        return;
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }

    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification(title, {
                icon: '/favicon.svg',
                badge: '/favicon.svg',
                vibrate: [120, 60, 120],
                ...options
            });
        } else {
            new Notification(title, {
                icon: '/favicon.svg',
                ...options
            });
        }
    } catch (err) {
        console.error('[WebPush] Error showing background notification:', err);
    }
};
