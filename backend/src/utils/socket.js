import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

let io;
// Map of userId -> Set of active socket IDs
const onlineUsers = new Map();

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST']
        }
    });

    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id; // Attach userId to the socket
            next();
        } catch (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.userId;
        console.log(`[Socket] Secure Connection: ${socket.id} (User: ${userId})`);

        // Join personal room automatically on connection
        const roomName = `user_${userId}`;
        socket.join(roomName);

        // Register user presence
        const isFirstConnection = !onlineUsers.has(userId) || onlineUsers.get(userId).size === 0;
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Send full online users list to the newly connected user
        socket.emit('online_users_list', Array.from(onlineUsers.keys()));

        if (isFirstConnection) {
            // Broadcast to everyone that this user is now online
            io.emit('user_presence_change', {
                userId,
                isOnline: true
            });

            // Mark any pending SENT messages addressed to this newly online user as DELIVERED
            try {
                const undeliveredMessages = await prisma.message.findMany({
                    where: {
                        receiverId: userId,
                        status: 'SENT'
                    },
                    select: { id: true, senderId: true }
                });

                if (undeliveredMessages.length > 0) {
                    await prisma.message.updateMany({
                        where: {
                            receiverId: userId,
                            status: 'SENT'
                        },
                        data: {
                            status: 'DELIVERED',
                            deliveredAt: new Date()
                        }
                    });

                    // Notify respective senders about delivery
                    const senderIds = [...new Set(undeliveredMessages.map(m => m.senderId))];
                    senderIds.forEach(senderId => {
                        io.to(`user_${senderId}`).emit('messages_delivered', {
                            recipientId: userId,
                            deliveredAt: new Date()
                        });
                    });
                }
            } catch (err) {
                console.error('[Socket] Error auto-delivering messages:', err);
            }
        }

        // Real-time Read Receipt event (when user opens a chat or views incoming message)
        socket.on('mark_read', async ({ otherUserId }) => {
            if (!otherUserId) return;
            try {
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
                    // Notify the sender that their sent messages have been read
                    io.to(`user_${otherUserId}`).emit('messages_read', {
                        readerId: userId,
                        readAt: now
                    });
                    console.log(`[Socket] Read receipt emitted from ${userId} to user_${otherUserId} (${updateRes.count} msgs)`);
                }
            } catch (err) {
                console.error('[Socket] Error in mark_read handler:', err);
            }
        });

        // Real-time Typing Indicators
        socket.on('typing_start', ({ receiverId }) => {
            if (receiverId) {
                io.to(`user_${receiverId}`).emit('user_typing', {
                    senderId: userId,
                    isTyping: true
                });
            }
        });

        socket.on('typing_stop', ({ receiverId }) => {
            if (receiverId) {
                io.to(`user_${receiverId}`).emit('user_typing', {
                    senderId: userId,
                    isTyping: false
                });
            }
        });

        // Disconnect handler
        socket.on('disconnect', async () => {
            console.log(`[Socket] Disconnected: ${socket.id} (User: ${userId})`);
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    const now = new Date();

                    // Update lastSeen in database
                    try {
                        await prisma.user.update({
                            where: { id: userId },
                            data: { lastSeen: now }
                        });
                    } catch (err) {
                        console.error('[Socket] Error updating lastSeen:', err);
                    }

                    // Broadcast offline status with lastSeen timestamp
                    io.emit('user_presence_change', {
                        userId,
                        isOnline: false,
                        lastSeen: now
                    });
                }
            }
        });
    });

    return io;
};

export const getIo = () => {
    if (!io) {
        console.warn('Socket.io has not been initialized yet.');
    }
    return io;
};

export const isUserOnline = (userId) => {
    return Boolean(onlineUsers.has(userId) && onlineUsers.get(userId).size > 0);
};

export const getOnlineUsersList = () => {
    return Array.from(onlineUsers.keys());
};

export const sendSocketNotification = (userId, notification) => {
    if (io) {
        const roomName = `user_${userId}`;
        io.to(roomName).emit('new_notification', notification);
        console.log(`[Socket] Emitted notification to room: ${roomName}`);
    }
};

export const sendSocketMessage = (receiverId, senderId, message) => {
    if (io) {
        io.to(`user_${receiverId}`).emit('receive_message', message);
        io.to(`user_${senderId}`).emit('message_sent', message);
        console.log(`[Socket] Emitted message [${message.status}] between user_${senderId} and user_${receiverId}`);
    }
};
