import express from 'express';
import { getProviders, getProviderById, addService, deleteService, updateProviderProfile, getEarningsStats } from '../controllers/providerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(getProviders);

router.get('/earnings', protect, getEarningsStats);

router.route('/profile')
    .put(protect, updateProviderProfile);

router.route('/services')
    .post(protect, addService);

router.route('/services/:id')
    .delete(protect, deleteService);

router.route('/:id')
    .get(getProviderById);

export default router;
