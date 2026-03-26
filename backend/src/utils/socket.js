import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

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

    io.on('connection', (socket) => {
        console.log(`[Socket] Secure Connection: ${socket.id} (User: ${socket.userId})`);

        // Join personal room automatically on connection
        const roomName = `user_${socket.userId}`;
        socket.join(roomName);

        socket.on('disconnect', () => {
            console.log(`[Socket] Disconnected: ${socket.id}`);
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

export const sendSocketNotification = (userId, notification) => {
    if (io) {
        const roomName = `user_${userId}`;
        io.to(roomName).emit('new_notification', notification);
        console.log(`[Socket] Emitted notification to room: ${roomName}`);
    }
};
