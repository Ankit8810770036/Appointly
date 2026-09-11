import express from 'express';
import { getStats, getSiteReviews, submitContactMessage } from '../controllers/publicController.js';

const router = express.Router();

router.get('/stats', getStats);
router.get('/site-reviews', getSiteReviews);
router.post('/contact', submitContactMessage);

export default router;
