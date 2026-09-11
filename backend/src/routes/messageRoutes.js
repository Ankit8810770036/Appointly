import express from 'express';
import { sendMessage, getConversations, getChatHistory, markConversationAsRead } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All message routes require authentication

router.post('/', sendMessage);
router.get('/conversations', getConversations);
router.get('/with/:otherUserId', getChatHistory);
router.patch('/read/:otherUserId', markConversationAsRead);

export default router;
