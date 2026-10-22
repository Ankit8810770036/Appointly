import express from 'express';
import {
    createAppointment,
    getMyAppointments,
    updateAppointmentStatus,
    getProviderSlots,
    holdSlotHandler,
    releaseSlotHandler,
    getProviderHolds,
    downloadAppointmentIcs
} from '../controllers/appointmentController.js';
import { protect, requireRole, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, requireRole('CLIENT'), createAppointment)
    .get(protect, getMyAppointments);

router.route('/hold-slot')
    .post(protect, requireRole('CLIENT'), holdSlotHandler);

router.route('/release-slot')
    .post(protect, requireRole('CLIENT'), releaseSlotHandler);

router.route('/provider/:providerId/holds')
    .get(optionalAuth, getProviderHolds);

router.route('/:id/ics')
    .get(downloadAppointmentIcs);

router.route('/:id/status')
    .patch(protect, updateAppointmentStatus);

router.route('/provider/:providerId/slots')
    .get(getProviderSlots);

export default router;



