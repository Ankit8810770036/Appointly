import express from 'express';
import {
    getMyAddresses,
    createAddress,
    updateAddress,
    deleteAddress
} from '../controllers/addressController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getMyAddresses)
    .post(protect, createAddress);

router.route('/:id')
    .put(protect, updateAddress)
    .delete(protect, deleteAddress);

export default router;
