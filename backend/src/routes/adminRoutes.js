import express from 'express';
import {
    getPendingVerifications,
    verifyProvider,
    getPlatformStats,
    getAllUsers,
    deleteUser,
    getAllReviews,
    deleteReview
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// All admin routes are protected and require ADMIN role
router.use(protect);
router.use(isAdmin);

router.get('/pending-verifications', getPendingVerifications);
router.post('/verify-provider', verifyProvider);

router.get('/stats', getPlatformStats);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReview);

export default router;
