import express from 'express';
import { createReview, getProviderReviews } from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createReview);
router.get('/provider/:providerProfileId', getProviderReviews);

export default router;
