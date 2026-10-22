import webpush from 'web-push';
import prisma from '../prisma.js';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BGrwhrlHQs-7rvQvL3qudVm9PwHLoKqoVcfk3_hg6KzfgNAzo1_ZfN7jEb6k2i5m88olQE3ZFdDAf0xNzmCatZ8';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'McCw1a6uQwc4HlM4EU1Jk_oajE6A4LT9GHo-tWgTpz4';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@appointly.live';

try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log('[WebPush] VAPID details configured successfully.');
} catch (err) {
    console.error('[WebPush] Failed to set VAPID details:', err.message);
}

/**
 * Returns the public VAPID key so frontend can convert it into an Uint8Array applicationServerKey
 */
export const getVapidPublicKey = () => {
    return vapidPublicKey;
};

/**
 * Save or update a client's push subscription
 */
export const saveSubscription = async (userId, subscription) => {
    if (!subscription || !subscription.endpoint || !subscription.keys) {
        throw new Error('Invalid push subscription object');
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    if (!p256dh || !auth) {
        throw new Error('Push subscription keys (p256dh, auth) are missing');
    }

    return await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: {
            userId,
            endpoint,
            p256dh,
            auth
        },
        update: {
            userId,
            p256dh,
            auth
        }
    });
};

/**
 * Remove an existing subscription on user toggle or signout
 */
export const removeSubscription = async (endpoint) => {
    try {
        await prisma.pushSubscription.deleteMany({
            where: { endpoint }
        });
        return { success: true };
    } catch (err) {
        console.error('[WebPush] Failed to remove subscription:', err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Send Web Push notification to all active devices registered by this user
 * @param {string} userId - Recipient User ID
 * @param {object} payload - { title, message, link, icon, type }
 */
export const sendWebPush = async (userId, payload) => {
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId }
        });

        if (!subscriptions || subscriptions.length === 0) {
            return;
        }

        const notificationData = JSON.stringify({
            title: payload.title || 'Appointly Notification',
            body: payload.message || payload.body || 'You have a new update.',
            icon: payload.icon || '/favicon.svg',
            badge: '/favicon.svg',
            link: payload.link || '/dashboard/client',
            type: payload.type || 'SYSTEM',
            timestamp: Date.now()
        });

        const sendPromises = subscriptions.map(async (sub) => {
            const pushConfig = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushConfig, notificationData);
            } catch (err) {
                // If subscription has expired or is invalid (HTTP 410 or 404), clean it from DB
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`[WebPush] Cleaning up expired subscription: ${sub.id}`);
                    await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
                } else {
                    console.error('[WebPush] Push error:', err.statusCode, err.message);
                }
            }
        });

        await Promise.allSettled(sendPromises);
    } catch (error) {
        console.error('[WebPush] sendWebPush Error:', error);
    }
};
