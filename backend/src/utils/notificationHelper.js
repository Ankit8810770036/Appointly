import prisma from '../prisma.js';
import { sendSocketNotification } from './socket.js';

export const createNotification = async ({ userId, type, title, message, link }) => {
    try {
        const notif = await prisma.notification.create({
            data: { userId, type, title, message, link }
        });
        sendSocketNotification(userId, notif);
        return notif;
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};
