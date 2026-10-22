import prisma from '../prisma.js';
import { getVapidPublicKey, saveSubscription, removeSubscription, sendWebPush } from '../utils/webPushService.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 30
        });
        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma.notification.findUnique({
            where: { id }
        });

        if (!notification || notification.userId !== req.user.id) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark all as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        });
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get VAPID Public Key for client PushManager subscription
// @route   GET /api/notifications/vapid-public-key
// @access  Public or Private
export const getVapidKeyHandler = (req, res) => {
    try {
        const publicKey = getVapidPublicKey();
        res.json({ publicKey });
    } catch (error) {
        console.error('getVapidKeyHandler error:', error);
        res.status(500).json({ message: 'Failed to retrieve VAPID public key' });
    }
};

// @desc    Subscribe device to Web Push
// @route   POST /api/notifications/push-subscribe
// @access  Private
export const subscribeWebPushHandler = async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Invalid subscription payload' });
        }

        await saveSubscription(req.user.id, subscription);
        res.status(201).json({ success: true, message: 'Subscribed to browser push notifications successfully' });
    } catch (error) {
        console.error('subscribeWebPushHandler error:', error);
        res.status(500).json({ message: error.message || 'Server error while saving push subscription' });
    }
};

// @desc    Unsubscribe device from Web Push
// @route   POST /api/notifications/push-unsubscribe
// @access  Private
export const unsubscribeWebPushHandler = async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) {
            return res.status(400).json({ message: 'Endpoint is required to unsubscribe' });
        }

        await removeSubscription(endpoint);
        res.json({ success: true, message: 'Unsubscribed from browser push notifications successfully' });
    } catch (error) {
        console.error('unsubscribeWebPushHandler error:', error);
        res.status(500).json({ message: 'Server error while unsubscribing' });
    }
};

// @desc    Send immediate test push notification to verify device receipt
// @route   POST /api/notifications/test-push
// @access  Private
export const sendTestPushHandler = async (req, res) => {
    try {
        const role = req.user.role?.toUpperCase();
        const targetLink = role === 'PROVIDER' ? '/dashboard/provider' : role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/client';

        await sendWebPush(req.user.id, {
            title: '🔔 Appointly Push Active',
            message: `Hello ${req.user.name}! Native browser notifications are active on your device.`,
            link: targetLink,
            type: 'TEST'
        });

        res.json({ success: true, message: 'Test push notification dispatched to your browser.' });
    } catch (error) {
        console.error('sendTestPushHandler error:', error);
        res.status(500).json({ message: 'Failed to send test push notification' });
    }
};
