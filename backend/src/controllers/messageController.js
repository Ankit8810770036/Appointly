import prisma from '../prisma.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendSocketMessage, isUserOnline, getIo } from '../utils/socket.js';

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

        if (receiverId === senderId) {
            return res.status(400).json({ message: 'You cannot send a message to yourself' });
        }

        const recipientOnline = isUserOnline(receiverId);
        const initialStatus = recipientOnline ? 'DELIVERED' : 'SENT';
        const deliveredAt = recipientOnline ? new Date() : null;

        const message = await prisma.message.create({
            data: {
                senderId,
                receiverId,
                content,
                status: initialStatus,
                deliveredAt
            },
            include: {
                sender: { select: { id: true, name: true, role: true, lastSeen: true } },
                receiver: { select: { id: true, name: true, role: true, lastSeen: true } }
            }
        });

        const receiver = await prisma.user.findUnique({ where: { id: receiverId } });

        // Emit real-time Socket.io message directly to sender and receiver
        sendSocketMessage(receiverId, senderId, message);

        // Trigger a notification for the receiver
        await createNotification({
            userId: receiverId,
            type: 'NEW_MESSAGE',
            title: 'New Message',
            message: `${req.user.name} sent you a message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
            link: receiver?.role === 'PROVIDER' ? '/dashboard/provider' : '/dashboard/client'
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
                sender: { select: { id: true, name: true, role: true, lastSeen: true } },
                receiver: { select: { id: true, name: true, role: true, lastSeen: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by other user's ID
        const conversationsMap = new Map();

        messages.forEach(msg => {
            const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
            if (!otherUser || !otherUser.id) return;

            if (!conversationsMap.has(otherUser.id)) {
                conversationsMap.set(otherUser.id, {
                    otherUser: {
                        ...otherUser,
                        isOnline: isUserOnline(otherUser.id)
                    },
                    lastMessage: msg,
                    unreadCount: (msg.receiverId === userId && !msg.isRead && msg.status !== 'READ') ? 1 : 0
                });
            } else {
                if (msg.receiverId === userId && !msg.isRead && msg.status !== 'READ') {
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

        const now = new Date();

        // Mark messages from other user as read
        const updateRes = await prisma.message.updateMany({
            where: {
                senderId: otherUserId,
                receiverId: userId,
                status: { not: 'READ' }
            },
            data: {
                status: 'READ',
                isRead: true,
                readAt: now
            }
        });

        if (updateRes.count > 0) {
            const io = getIo();
            if (io) {
                io.to(`user_${otherUserId}`).emit('messages_read', {
                    readerId: userId,
                    readAt: now
                });
            }
        }

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark a conversation as read explicitly
// @route   PATCH /api/messages/read/:otherUserId
// @access  Private
export const markConversationAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { otherUserId } = req.params;
        const now = new Date();

        const updateRes = await prisma.message.updateMany({
            where: {
                senderId: otherUserId,
                receiverId: userId,
                status: { not: 'READ' }
            },
            data: {
                status: 'READ',
                isRead: true,
                readAt: now
            }
        });

        if (updateRes.count > 0) {
            const io = getIo();
            if (io) {
                io.to(`user_${otherUserId}`).emit('messages_read', {
                    readerId: userId,
                    readAt: now
                });
            }
        }

        res.json({ success: true, count: updateRes.count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
