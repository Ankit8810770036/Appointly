import express from 'express';
import {
    createAppointment,
    getMyAppointments,
    updateAppointmentStatus,
    getProviderSlots
} from '../controllers/appointmentController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, requireRole('CLIENT'), createAppointment)
    .get(protect, getMyAppointments);

router.route('/:id/status')
    .patch(protect, updateAppointmentStatus);

router.route('/provider/:providerId/slots')
    .get(getProviderSlots);

export default router;

