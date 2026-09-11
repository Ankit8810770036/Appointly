import express from 'express';
import { getProviders, getProviderById, addService, deleteService, updateProviderProfile, getEarningsStats, uploadVerificationDocument } from '../controllers/providerController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { cacheResponse } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.route('/')
    .get(cacheResponse(120), getProviders);

router.get('/earnings', protect, requireRole('PROVIDER', 'ADMIN'), getEarningsStats);

router.post('/verify', protect, requireRole('PROVIDER', 'ADMIN'), upload.single('verificationDocument'), uploadVerificationDocument);

router.route('/profile')
    .put(protect, requireRole('PROVIDER', 'ADMIN'), updateProviderProfile);

router.route('/services')
    .post(protect, requireRole('PROVIDER', 'ADMIN'), addService);

router.route('/services/:id')
    .delete(protect, requireRole('PROVIDER', 'ADMIN'), deleteService);

router.route('/:id')
    .get(cacheResponse(120), getProviderById);

export default router;
