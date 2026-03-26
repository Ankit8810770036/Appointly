import prisma from '../prisma.js';
import { createNotification } from '../utils/notificationHelper.js';

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user.id;

        if (!receiverId || !content) {
            return res.status(400).json({ message: 'Receiver and content are required' });
        }

        const message = await prisma.message.create({
            data: {
                senderId,
                receiverId,
                content
            },
            include: {
                sender: { select: { name: true } },
                receiver: { select: { name: true } }
            }
        });

        // Trigger a notification for the receiver
        await createNotification({
            userId: receiverId,
            type: 'NEW_MESSAGE',
            title: 'New Message',
            message: `${req.user.name} sent you a message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
            link: req.user.role === 'PROVIDER' ? '/dashboard/client' : '/dashboard/provider'
        });

        res.status(201).json(message);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all conversations for the current user
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch all messages where user is sender or receiver
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: {
                sender: { select: { id: true, name: true, role: true } },
                receiver: { select: { id: true, name: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by other user's ID
        const conversationsMap = new Map();

        messages.forEach(msg => {
            const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
            if (!conversationsMap.has(otherUser.id)) {
                conversationsMap.set(otherUser.id, {
                    otherUser,
                    lastMessage: msg,
                    unreadCount: (msg.receiverId === userId && !msg.isRead) ? 1 : 0
                });
            } else {
                if (msg.receiverId === userId && !msg.isRead) {
                    conversationsMap.get(otherUser.id).unreadCount++;
                }
            }
        });

        res.json(Array.from(conversationsMap.values()));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get messages with a specific user
// @route   GET /api/messages/with/:otherUserId
// @access  Private
export const getChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { otherUserId } = req.params;

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId }
                ]
            },
            orderBy: { createdAt: 'asc' }
        });

        // Mark messages as read
        await prisma.message.updateMany({
            where: {
                senderId: otherUserId,
                receiverId: userId,
                isRead: false
            },
            data: { isRead: true }
        });

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
