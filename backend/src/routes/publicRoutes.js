import express from 'express';
import { getStats, getSiteReviews } from '../controllers/publicController.js';

const router = express.Router();

router.get('/stats', getStats);
router.get('/site-reviews', getSiteReviews);

export default router;
