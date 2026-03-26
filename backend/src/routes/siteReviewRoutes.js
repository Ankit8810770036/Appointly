import express from 'express';
import { createSiteReview } from '../controllers/siteReviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Allow both logged in and anonymous reviews
// We'll try to get the user if they are logged in but not require it
router.post('/', (req, res, next) => {
    // Optional auth middleware
    if (req.headers.authorization) {
        return protect(req, res, next);
    }
    next();
}, createSiteReview);

export default router;
