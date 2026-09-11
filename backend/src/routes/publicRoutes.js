import express from 'express';
import { getStats, getSiteReviews, submitContactMessage } from '../controllers/publicController.js';
import { cacheResponse } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.get('/stats', cacheResponse(600), getStats);
router.get('/site-reviews', cacheResponse(300), getSiteReviews);
router.post('/contact', submitContactMessage);

export default router;
