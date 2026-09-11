import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import siteReviewRoutes from './routes/siteReviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import scheduleReminders from './cron/reminderCron.js';
import { initSocket } from './utils/socket.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import prisma from './prisma.js';

dotenv.config();

const app = express();

// Security Headers with Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows frontend to load images/uploads
    contentSecurityPolicy: false // Allows inline React scripts/styles in production
}));

// Ensure uploads directory structure exists
const uploadDir = path.join(process.cwd(), 'uploads', 'verification');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// CORS Configuration - Supports single, multiple comma-separated URLs or fallback
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ''))
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        return callback(null, true); // Permissive in dev/prod with header reflection
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply general API rate limiting to all /api routes
app.use('/api', apiLimiter);

app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/public', publicRoutes);
app.use('/api/site-reviews', siteReviewRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Appointly API is running', timestamp: new Date().toISOString() });
});

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
    res.status(404).json({ message: `API route ${req.method} ${req.originalUrl} not found` });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('[Global Error Handler]:', err);
    const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
    res.status(statusCode).json({
        message: err.message || 'An unexpected error occurred on the server',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

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
