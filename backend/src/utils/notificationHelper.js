import prisma from '../prisma.js';
import { sendSocketNotification } from './socket.js';
import { sendWebPush } from './webPushService.js';

export const createNotification = async ({ userId, type, title, message, link }) => {
    if (!userId) return null;
    try {
        const notif = await prisma.notification.create({
            data: { userId, type, title, message, link }
        });

        // 1. Real-time active tab Socket.io delivery
        sendSocketNotification(userId, notif);

        // 2. Native OS Web Push delivery (for background tabs or closed browsers)
        sendWebPush(userId, { title, message, link, type });

        return notif;
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};
