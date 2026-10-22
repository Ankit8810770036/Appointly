import express from 'express';
import {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    getVapidKeyHandler,
    subscribeWebPushHandler,
    unsubscribeWebPushHandler,
    sendTestPushHandler
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/vapid-public-key', getVapidKeyHandler);
router.post('/push-subscribe', protect, subscribeWebPushHandler);
router.post('/push-unsubscribe', protect, unsubscribeWebPushHandler);
router.post('/test-push', protect, sendTestPushHandler);

router.get('/', protect, getMyNotifications);
router.patch('/read-all', protect, markAllAsRead);
router.patch('/:id/read', protect, markAsRead);

export default router;

