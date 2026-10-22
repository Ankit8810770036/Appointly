import express from 'express';
import { createComplaint, getMyComplaints } from '../controllers/complaintController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createComplaint);
router.get('/my', protect, getMyComplaints);

export default router;
