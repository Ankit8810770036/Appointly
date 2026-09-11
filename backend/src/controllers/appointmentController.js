import prisma from '../prisma.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendBookingRequestEmail, sendBookingStatusEmail, sendServiceCompletionEmail } from '../utils/emailService.js';

// @desc    Book a new appointment
// @route   POST /api/appointments
// @access  Private (Client only)
export const createAppointment = async (req, res) => {
    try {
        if (req.user?.role?.toUpperCase() !== 'CLIENT') {
            return res.status(403).json({ message: 'Only clients can book appointments. Providers are restricted from booking services.' });
        }

        const {
            providerId,
            serviceId,
            date,
            note,
            addressId,
            streetAddress,
            city,
            state,
            zipCode,
            country = 'India',
            latitude,
            longitude,
            saveAddress = false,
            addressLabel = 'Home'
        } = req.body;
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
                    in: ['PENDING', 'CONFIRMED', 'COMPLETED']
                }
            }
        });

        if (existingAppointment) {
            return res.status(400).json({ message: 'This time slot is already booked. Please choose another time.' });
        }

        // 4. Resolve Address Snapshot
        let resolvedAddressId = addressId || null;
        let resolvedServiceAddress = null;
        let resolvedLat = latitude ? parseFloat(latitude) : null;
        let resolvedLng = longitude ? parseFloat(longitude) : null;

        if (addressId) {
            const savedAddr = await prisma.address.findUnique({
                where: { id: addressId }
            });
            if (savedAddr) {
                resolvedServiceAddress = [savedAddr.streetAddress, savedAddr.city, savedAddr.state, savedAddr.zipCode, savedAddr.country].filter(Boolean).join(', ');
                if (!resolvedLat && savedAddr.latitude) resolvedLat = savedAddr.latitude;
                if (!resolvedLng && savedAddr.longitude) resolvedLng = savedAddr.longitude;
            }
        } else if (streetAddress || city) {
            resolvedServiceAddress = [streetAddress, city, state, zipCode, country].filter(Boolean).join(', ');
            if (saveAddress && streetAddress && city) {
                try {
                    const newSaved = await prisma.address.create({
                        data: {
                            userId: req.user.id,
                            label: addressLabel || 'Home',
                            streetAddress: streetAddress.trim(),
                            city: city.trim(),
                            state: state ? state.trim() : null,
                            zipCode: zipCode ? zipCode.trim() : null,
                            country: country ? country.trim() : 'India',
                            latitude: resolvedLat,
                            longitude: resolvedLng
                        }
                    });
                    resolvedAddressId = newSaved.id;
                } catch (addrErr) {
                    console.error('[appointmentController] Failed to auto-save address:', addrErr);
                }
            }
        }

        const appointment = await prisma.appointment.create({
            data: {
                clientId: req.user.id,
                providerId,
                serviceId,
                date: appointmentDate,
                note,
                addressId: resolvedAddressId,
                serviceAddress: resolvedServiceAddress,
                latitude: resolvedLat,
                longitude: resolvedLng
            },
            include: {
                address: true,
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
        } else if (req.user.role === 'PROVIDER') {
            const profile = await prisma.providerProfile.findUnique({
                where: { userId: req.user.id }
            });
            if (!profile) {
                return res.json([]);
            }
            whereClause.providerId = profile.id;
        } else if (req.user.role === 'ADMIN') {
            // Admins can see all
        } else {
            return res.json([]);
        }

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                address: true,
                service: true,
                review: true,
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        location: true,
                        streetAddress: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        country: true,
                        latitude: true,
                        longitude: true,
                        createdAt: true
                    }
                },
                provider: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                                location: true,
                                streetAddress: true,
                                city: true,
                                state: true,
                                zipCode: true,
                                country: true,
                                latitude: true,
                                longitude: true
                            }
                        }
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

        const allowedStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
        const normalizedStatus = (status || '').toUpperCase();
        if (!allowedStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}` });
        }

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
        const isAdmin = req.user.role === 'ADMIN';

        if (!isClient && !isProvider && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update this appointment' });
        }

        // Clients can only cancel appointments
        if (isClient && !isProvider && !isAdmin && normalizedStatus !== 'CANCELLED') {
            return res.status(403).json({ message: 'Clients are only permitted to cancel appointments' });
        }

        const updatedAppointment = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: normalizedStatus },
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
                type: `BOOKING_${normalizedStatus}`,
                title: `Booking ${normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase()}`,
                message: `Your appointment for ${updatedAppointment.service.name} with ${updatedAppointment.provider.user.name} has been ${normalizedStatus.toLowerCase()}.`,
                link: '/dashboard/client'
            });
        } else if (req.user.role === 'CLIENT') {
            await createNotification({
                userId: updatedAppointment.provider.userId,
                type: `BOOKING_${normalizedStatus}`,
                title: `Booking ${normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase()}`,
                message: `Your appointment with ${updatedAppointment.client.name} for ${updatedAppointment.service.name} has been ${normalizedStatus.toLowerCase()}.`,
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
            if (normalizedStatus === 'COMPLETED') {
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
