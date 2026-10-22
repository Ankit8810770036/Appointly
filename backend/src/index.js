import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import scheduleReminders from './cron/reminderCron.js';
import { initSocket } from './utils/socket.js';
import prisma from './prisma.js';

dotenv.config();

// Start Cron Jobs
scheduleReminders();

// Create HTTP Server & Init Socket
const server = http.createServer(app);
initSocket(server);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful Shutdown on termination signals
const handleGracefulShutdown = async (signal) => {
    console.log(`[Process] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
        console.log('[HTTP] Server closed.');
        try {
            await prisma.$disconnect();
            console.log('[Prisma] Disconnected cleanly.');
        } catch (dbErr) {
            console.error('[Prisma] Error during disconnect:', dbErr);
        }
        process.exit(0);
    });
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
