import prisma from '../prisma.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendBookingRequestEmail, sendBookingStatusEmail, sendServiceCompletionEmail } from '../utils/emailService.js';

// @desc    Book a new appointment
// @route   POST /api/appointments
// @access  Private (Client only)
export const createAppointment = async (req, res) => {
    try {
        if (req.user.role !== 'CLIENT') {
            return res.status(403).json({ message: 'Only clients can book appointments' });
        }

        const { providerId, serviceId, date, note } = req.body;
        const appointmentDate = new Date(date);

        // 1. Check if the provider actually exists and get their userId
        const provider = await prisma.providerProfile.findUnique({
            where: { id: providerId },
            include: { user: true }
        });

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // 2. Prevent self-booking (Provider cannot book themselves)
        if (provider.userId === req.user.id) {
            return res.status(400).json({ message: 'You cannot book an appointment with yourself' });
        }

        // 3. Prevent Double Booking (Race condition check)
        const existingAppointment = await prisma.appointment.findFirst({
            where: {
                providerId,
                date: appointmentDate,
                status: {
                    in: ['PENDING', 'CONFIRMED']
                }
            }
        });

        if (existingAppointment) {
            return res.status(400).json({ message: 'This time slot is already booked. Please choose another time.' });
        }

        const appointment = await prisma.appointment.create({
            data: {
                clientId: req.user.id,
                providerId,
                serviceId,
                date: appointmentDate,
                note
            },
            include: {
                client: { select: { name: true, email: true } },
                provider: {
                    include: { user: true }
                },
                service: true
            }
        });

        // Create Notification for Provider
        await createNotification({
            userId: appointment.provider.userId,
            type: 'BOOKING_REQUESTED',
            title: 'New Booking Request',
            message: `You have a new booking request for ${appointment.service.name} on ${new Date(date).toLocaleDateString()}.`,
            link: '/dashboard/provider'
        });

        // Send Email notification (Async)
        sendBookingRequestEmail(appointment).catch(err => console.error('[EmailService] Booking request email failed:', err));

        res.status(201).json(appointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get appointments for logged-in user
// @route   GET /api/appointments
// @access  Private
export const getMyAppointments = async (req, res) => {
    try {
        let whereClause = {};
        if (req.user.role === 'CLIENT') {
            whereClause.clientId = req.user.id;
        } else {
            // For provider, we need to match the providerProfile inside appointments
            const profile = await prisma.providerProfile.findUnique({
                where: { userId: req.user.id }
            });
            if (profile) {
                whereClause.providerId = profile.id;
            }
        }

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                service: true,
                review: true,
                client: {
                    select: { name: true, email: true }
                },
                provider: {
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                }
            },
            orderBy: { date: 'asc' }
        });

        res.json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update appointment status
// @route   PATCH /api/appointments/:id/status
// @access  Private
export const updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const appointmentId = req.params.id;

        // Verify appointment exists
        const existing = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { provider: true }
        });

        if (!existing) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check ownership
        const isClient = req.user.role === 'CLIENT' && existing.clientId === req.user.id;
        const isProvider = req.user.role === 'PROVIDER' && existing.provider.userId === req.user.id;

        if (!isClient && !isProvider) {
            return res.status(403).json({ message: 'Not authorized to update this appointment' });
        }

        const updatedAppointment = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status },
            include: {
                client: true,
                provider: { include: { user: true } },
                service: true
            }
        });

        // Create Notification for the OTHER party
        if (req.user.role === 'PROVIDER') {
            await createNotification({
                userId: updatedAppointment.clientId,
                type: `BOOKING_${status}`,
                title: `Booking ${status.charAt(0) + status.slice(1).toLowerCase()}`,
                message: `Your appointment for ${updatedAppointment.service.name} with ${updatedAppointment.provider.user.name} has been ${status.toLowerCase()}.`,
                link: '/dashboard/client'
            });
        } else if (req.user.role === 'CLIENT') {
            await createNotification({
                userId: updatedAppointment.provider.userId,
                type: `BOOKING_${status}`,
                title: `Booking ${status.charAt(0) + status.slice(1).toLowerCase()}`,
                message: `Your appointment with ${updatedAppointment.client.name} for ${updatedAppointment.service.name} has been ${status.toLowerCase()}.`,
                link: '/dashboard/provider'
            });
        }

        // Build full appointment for email
        const fullAppointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                client: true,
                provider: { include: { user: true } },
                service: true
            }
        });

        // Send Email status notification (Async)
        if (fullAppointment) {
            if (status.toUpperCase() === 'COMPLETED') {
                sendServiceCompletionEmail(fullAppointment).catch(err => console.error('[EmailService] Service completion email failed:', err));
            } else {
                sendBookingStatusEmail(fullAppointment).catch(err => console.error('[EmailService] Booking status email failed:', err));
            }
        }

        res.json(updatedAppointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get booked slots for a specific provider
// @route   GET /api/appointments/provider/:providerId/slots
// @access  Public
export const getProviderSlots = async (req, res) => {
    try {
        const { providerId } = req.params;

        // Fetch appointments that are not cancelled
        const appointments = await prisma.appointment.findMany({
            where: {
                providerId,
                status: {
                    in: ['PENDING', 'CONFIRMED', 'COMPLETED']
                }
            },
            select: {
                date: true // Only return the date to derive booked slots
            }
        });

        // Format into { 'YYYY-MM-DD': ['09:00', '10:30'] }
        const booked = {};
        appointments.forEach(appt => {
            const dateObj = new Date(appt.date);
            const yyyy = dateObj.getUTCFullYear();
            const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getUTCDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            const hours = String(dateObj.getUTCHours()).padStart(2, '0');
            const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;

            if (!booked[dateStr]) {
                booked[dateStr] = [];
            }
            booked[dateStr].push(timeStr);
        });

        res.json(booked);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
