import express from 'express';
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
import complaintRoutes from './routes/complaintRoutes.js';
import { protect, requireRole } from './middleware/authMiddleware.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';

dotenv.config();

const app = express();

// Disable Express fingerprinting
app.disable('x-powered-by');

// Security Headers with Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows frontend to load images/uploads
    contentSecurityPolicy: false, // Allows inline React scripts/styles in production
    dnsPrefetchControl: { allow: false },
    xFrameOptions: { action: 'sameorigin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
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
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply general API rate limiting to all /api routes
app.use('/api', apiLimiter);

// Payload size limits to protect against DoS attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Protect sensitive KYC verification documents from unauthorized static downloads
app.use('/uploads/verification', protect, requireRole('ADMIN', 'PROVIDER'), express.static(path.join(process.cwd(), 'uploads', 'verification')));
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
app.use('/api/complaints', complaintRoutes);
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
    
    // In production, prevent leaking internal database / system stack details
    let safeMessage = err.message || 'An unexpected error occurred on the server';
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        safeMessage = 'An internal server error occurred. Please try again later.';
    }

    res.status(statusCode).json({
        message: safeMessage,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

export default app;
