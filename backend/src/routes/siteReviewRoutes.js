import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { createSiteReview } from '../controllers/siteReviewController.js';

const router = express.Router();

// Allow both logged-in and guest reviews safely
router.post('/', async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            if (process.env.JWT_SECRET) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded?.id) {
                    req.user = await prisma.user.findUnique({
                        where: { id: decoded.id },
                        select: { id: true, name: true, email: true, role: true }
                    });
                }
            }
        } catch (err) {
            // Expired or invalid token for optional review auth - proceed as guest
            req.user = null;
        }
    }
    next();
}, createSiteReview);

export default router;
