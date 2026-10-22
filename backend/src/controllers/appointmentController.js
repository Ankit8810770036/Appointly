import prisma from '../prisma.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendBookingRequestEmail, sendBookingStatusEmail, sendServiceCompletionEmail } from '../utils/emailService.js';
import { holdSlot, releaseSlotHold, getSlotHoldStatus, getActiveHoldsForProvider } from '../utils/slotLockManager.js';
import { generateAppointmentIcs } from '../utils/icalGenerator.js';

// Haversine formula to compute great-circle distance between two GPS coordinates in km
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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

        if (isNaN(appointmentDate.getTime())) {
            return res.status(400).json({ message: 'Invalid appointment date format' });
        }

        if (appointmentDate.getTime() < Date.now()) {
            return res.status(400).json({ message: 'Cannot book an appointment in the past.' });
        }

        // Check if slot is currently held by another user
        const yyyy = appointmentDate.getUTCFullYear();
        const mm = String(appointmentDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(appointmentDate.getUTCDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const hours = String(appointmentDate.getUTCHours()).padStart(2, '0');
        const minutes = String(appointmentDate.getUTCMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        const holdStatus = await getSlotHoldStatus({
            providerId,
            date: dateStr,
            time: timeStr,
            userId: req.user.id
        });

        if (holdStatus.isHeld && !holdStatus.heldByMe) {
            return res.status(409).json({
                message: `This time slot is temporarily held by another client (${holdStatus.remainingSeconds}s remaining). Please choose another time.`,
                isHeld: true,
                remainingSeconds: holdStatus.remainingSeconds
            });
        }

        // Execute inside an atomic transaction to guarantee concurrency safety
        const appointment = await prisma.$transaction(async (tx) => {
            // 1. Check if the provider actually exists and get their userId
            const provider = await tx.providerProfile.findUnique({
                where: { id: providerId },
                include: { user: true }
            });

            if (!provider) {
                const err = new Error('Provider not found');
                err.statusCode = 404;
                throw err;
            }

            // 2. Enforce admin approval requirement
            if (!provider.isVerified) {
                const err = new Error('This specialist is currently pending admin verification and cannot accept bookings yet.');
                err.statusCode = 400;
                throw err;
            }

            // 3. Prevent self-booking
            if (provider.userId === req.user.id) {
                const err = new Error('You cannot book an appointment with yourself');
                err.statusCode = 400;
                throw err;
            }

            // 3b. Verify provider availability (blocked dates & work schedule)
            if (Array.isArray(provider.blockedDates) && provider.blockedDates.includes(dateStr)) {
                const err = new Error('The specialist has marked this date as unavailable.');
                err.statusCode = 400;
                throw err;
            }

            const dayNamesEnum = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
            const dayName = dayNamesEnum[appointmentDate.getUTCDay()];
            const rawSched = provider.workSchedule;
            const workSchedule = typeof rawSched === 'object' && rawSched !== null
                ? rawSched
                : (typeof rawSched === 'string' ? JSON.parse(rawSched || '{}') : {});
            const hasSchedule = Object.keys(workSchedule).length > 0;

            if (hasSchedule) {
                const slotsForDay = Array.isArray(workSchedule[dayName]) ? workSchedule[dayName] : [];
                if (!slotsForDay.includes(timeStr)) {
                    const err = new Error(`Specialist is not available at ${timeStr} on ${dayName}.`);
                    err.statusCode = 400;
                    throw err;
                }
            } else if (Array.isArray(provider.workingDays) && provider.workingDays.length > 0) {
                if (!provider.workingDays.includes(dayName)) {
                    const err = new Error(`Specialist does not work on ${dayName}.`);
                    err.statusCode = 400;
                    throw err;
                }
            }

            // 4. Resolve Address Snapshot
            let resolvedAddressId = addressId || null;
            let resolvedServiceAddress = null;
            let resolvedLat = latitude ? parseFloat(latitude) : null;
            let resolvedLng = longitude ? parseFloat(longitude) : null;

            if (addressId) {
                const savedAddr = await tx.address.findUnique({
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
                        const newSaved = await tx.address.create({
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

            // 5. Enforce 50 km Service Radius Distance Validation
            const provLat = provider.latitude != null ? provider.latitude : provider.user?.latitude;
            const provLng = provider.longitude != null ? provider.longitude : provider.user?.longitude;
            const clientLat = resolvedLat != null ? resolvedLat : req.user?.latitude;
            const clientLng = resolvedLng != null ? resolvedLng : req.user?.longitude;

            if (provLat != null && provLng != null && clientLat != null && clientLng != null) {
                const distKm = calculateHaversineDistance(
                    parseFloat(clientLat),
                    parseFloat(clientLng),
                    parseFloat(provLat),
                    parseFloat(provLng)
                );
                if (distKm > 50) {
                    const err = new Error(`Provider is ${distKm.toFixed(1)} km away from your location. Bookings are only permitted within a 50 km radius.`);
                    err.statusCode = 400;
                    throw err;
                }
            }

            // 6. Prevent Double Booking (Atomic check inside transaction)
            const existingAppointment = await tx.appointment.findFirst({
                where: {
                    providerId,
                    date: appointmentDate,
                    status: {
                        in: ['PENDING', 'CONFIRMED', 'COMPLETED']
                    }
                }
            });

            if (existingAppointment) {
                const err = new Error('This time slot is already booked. Please choose another time.');
                err.statusCode = 400;
                throw err;
            }

            return await tx.appointment.create({
                data: {
                    clientId: req.user.id,
                    providerId,
                    serviceId,
                    date: appointmentDate,
                    note: note && typeof note === 'string' ? note.trim().substring(0, 1000) : null,
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
        });

        // Release slot hold immediately once successfully booked
        await releaseSlotHold({
            providerId,
            date: dateStr,
            time: timeStr,
            userId: req.user.id,
            force: true
        });

        // Create Notification for Provider (Post-transaction)
        await createNotification({
            userId: appointment.provider.userId,
            type: 'BOOKING_REQUESTED',
            title: 'New Booking Request',
            message: `You have a new booking request for ${appointment.service.name} on ${dateStr} at ${timeStr}.`,
            link: '/dashboard/provider'
        });

        // Send Email notification (Async)
        sendBookingRequestEmail(appointment).catch(err => console.error('[EmailService] Booking request email failed:', err));

        res.status(201).json(appointment);
    } catch (error) {
        console.error('[createAppointment Error]:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Server Error' });
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
                        avatarUrl: true,
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
                                avatarUrl: true,
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

        // ── Structured Cancellation Policy & Grace Period Rules ──
        let finalReason = (req.body.reason || req.body.cancellationReason || '').trim();
        const updateData = { status: normalizedStatus };

        if (normalizedStatus === 'CANCELLED') {
            // Rule 1: Cannot cancel already COMPLETED or CANCELLED appointment
            if (existing.status === 'COMPLETED') {
                return res.status(400).json({
                    message: 'Completed appointments cannot be cancelled. If there was an issue, please file a complaint or contact support.',
                    code: 'APPOINTMENT_ALREADY_COMPLETED'
                });
            }
            if (existing.status === 'CANCELLED') {
                return res.status(400).json({
                    message: 'This appointment is already cancelled.',
                    code: 'APPOINTMENT_ALREADY_CANCELLED'
                });
            }

            // Rule 2 & 3: For CLIENTS, enforce past check & 2-hour grace period policy
            if (isClient && !isAdmin) {
                const now = new Date();
                const apptDate = new Date(existing.date);

                // Cannot cancel past appointment
                if (apptDate <= now) {
                    return res.status(400).json({
                        message: 'Cannot cancel an appointment that has already passed. Please contact support if you require assistance.',
                        code: 'APPOINTMENT_IN_PAST'
                    });
                }

                // 2-Hour Grace Period Policy
                const diffMs = apptDate.getTime() - now.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                const CANCELLATION_MIN_HOURS = 2;

                if (diffHours < CANCELLATION_MIN_HOURS) {
                    const remainingMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
                    return res.status(400).json({
                        message: `Cancellation Policy: Appointments cannot be cancelled less than ${CANCELLATION_MIN_HOURS} hours prior to scheduled time (scheduled in ${remainingMinutes} minutes). Please reach out to your specialist or support directly.`,
                        code: 'CANCELLATION_WINDOW_CLOSED',
                        remainingMinutes
                    });
                }

                // Rule 4: Cancellation reason required
                if (!finalReason) {
                    return res.status(400).json({
                        message: 'A cancellation reason is required (e.g. Schedule conflict, Personal emergency).',
                        code: 'CANCELLATION_REASON_REQUIRED'
                    });
                }
            }

            updateData.cancelledBy = req.user.role;
            updateData.cancelledAt = new Date();
            updateData.cancellationReason = finalReason || (isClient ? 'Cancelled by client' : 'Cancelled by provider');
        }

        const updatedAppointment = await prisma.appointment.update({
            where: { id: appointmentId },
            data: updateData,
            include: {
                client: true,
                provider: { include: { user: true } },
                service: true
            }
        });

        // Create Notification for the OTHER party
        if (req.user.role === 'PROVIDER') {
            const notifMsg = normalizedStatus === 'CANCELLED' && updateData.cancellationReason
                ? `Your appointment for ${updatedAppointment.service.name} with ${updatedAppointment.provider.user.name} was cancelled. Reason: ${updateData.cancellationReason}.`
                : `Your appointment for ${updatedAppointment.service.name} with ${updatedAppointment.provider.user.name} has been ${normalizedStatus.toLowerCase()}.`;

            await createNotification({
                userId: updatedAppointment.clientId,
                type: `BOOKING_${normalizedStatus}`,
                title: `Booking ${normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase()}`,
                message: notifMsg,
                link: '/dashboard/client'
            });
        } else if (req.user.role === 'CLIENT') {
            const notifMsg = normalizedStatus === 'CANCELLED' && updateData.cancellationReason
                ? `Your appointment with ${updatedAppointment.client.name} for ${updatedAppointment.service.name} was cancelled by client. Reason: ${updateData.cancellationReason}.`
                : `Your appointment with ${updatedAppointment.client.name} for ${updatedAppointment.service.name} has been ${normalizedStatus.toLowerCase()}.`;

            await createNotification({
                userId: updatedAppointment.provider.userId,
                type: `BOOKING_${normalizedStatus}`,
                title: `Booking ${normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase()}`,
                message: notifMsg,
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
export const getProviderSlots = async (req, res) => {
    try {
        let { providerId } = req.params;

        // If providerId passed is a User ID, resolve to ProviderProfile ID
        const profileByUser = await prisma.providerProfile.findUnique({
            where: { userId: providerId },
            select: { id: true }
        });
        if (profileByUser) {
            providerId = profileByUser.id;
        }

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

// @desc    Hold a 5-minute temporary lock on a slot during final booking confirmation
// @route   POST /api/appointments/hold-slot
// @access  Private (Client only)
export const holdSlotHandler = async (req, res) => {
    try {
        const { providerId, date, time } = req.body;
        if (!providerId || !date || !time) {
            return res.status(400).json({ message: 'providerId, date (YYYY-MM-DD), and time (HH:MM) are required.' });
        }

        // 1. Check if the provider exists and is verified
        const provider = await prisma.providerProfile.findUnique({
            where: { id: providerId }
        });
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }
        if (!provider.isVerified) {
            return res.status(400).json({ message: 'Specialist is pending admin verification.' });
        }

        // 2. Prevent self-booking
        if (provider.userId === req.user.id) {
            return res.status(400).json({ message: 'You cannot hold slots with your own profile.' });
        }

        // 3. Check if slot is already booked in database
        const bookingDate = new Date(`${date}T${time}:00Z`);
        if (isNaN(bookingDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date or time format.' });
        }
        if (bookingDate.getTime() < Date.now()) {
            return res.status(400).json({ message: 'Cannot hold a slot in the past.' });
        }

        // 3b. Check blocked dates and work schedule
        if (Array.isArray(provider.blockedDates) && provider.blockedDates.includes(date)) {
            return res.status(400).json({ message: 'The specialist has marked this date as unavailable.' });
        }

        const dayNamesEnum = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        const dayName = dayNamesEnum[bookingDate.getUTCDay()];
        const rawSched = provider.workSchedule;
        const workSchedule = typeof rawSched === 'object' && rawSched !== null
            ? rawSched
            : (typeof rawSched === 'string' ? JSON.parse(rawSched || '{}') : {});
        const hasSchedule = Object.keys(workSchedule).length > 0;

        if (hasSchedule) {
            const slotsForDay = Array.isArray(workSchedule[dayName]) ? workSchedule[dayName] : [];
            if (!slotsForDay.includes(time)) {
                return res.status(400).json({ message: `Specialist is not available at ${time} on ${dayName}.` });
            }
        } else if (Array.isArray(provider.workingDays) && provider.workingDays.length > 0) {
            if (!provider.workingDays.includes(dayName)) {
                return res.status(400).json({ message: `Specialist does not work on ${dayName}.` });
            }
        }

        const existingAppt = await prisma.appointment.findFirst({
            where: {
                providerId,
                date: bookingDate,
                status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] }
            }
        });

        if (existingAppt) {
            return res.status(409).json({ message: 'This time slot is already booked. Please choose another time.' });
        }

        // 4. Acquire 5-Minute Slot Hold
        const holdResult = await holdSlot({
            providerId,
            date,
            time,
            userId: req.user.id,
            ttlSeconds: 300 // 5 minutes
        });

        if (!holdResult.success) {
            return res.status(409).json({
                message: holdResult.message,
                isHeld: true,
                remainingSeconds: holdResult.remainingSeconds
            });
        }

        res.json({
            success: true,
            message: 'Slot successfully held for 5 minutes.',
            expiresAt: holdResult.expiresAt,
            remainingSeconds: holdResult.remainingSeconds
        });
    } catch (err) {
        console.error('[holdSlotHandler Error]:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Release an active temporary slot hold
// @route   POST /api/appointments/release-slot
// @access  Private (Client only)
export const releaseSlotHandler = async (req, res) => {
    try {
        const { providerId, date, time } = req.body;
        if (!providerId || !date || !time) {
            return res.status(400).json({ message: 'providerId, date, and time are required.' });
        }

        await releaseSlotHold({
            providerId,
            date,
            time,
            userId: req.user.id
        });

        res.json({ success: true, message: 'Slot hold released.' });
    } catch (err) {
        console.error('[releaseSlotHandler Error]:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get active slot holds for a provider on a specific date
// @route   GET /api/appointments/provider/:providerId/holds
// @access  Public
export const getProviderHolds = async (req, res) => {
    try {
        let { providerId } = req.params;
        const { date } = req.query;
        const currentUserId = req.user?.id || null;

        const profileByUser = await prisma.providerProfile.findUnique({
            where: { userId: providerId },
            select: { id: true }
        });
        if (profileByUser) {
            providerId = profileByUser.id;
        }

        const holds = await getActiveHoldsForProvider(providerId, date, currentUserId);
        res.json(holds);
    } catch (err) {
        console.error('[getProviderHolds Error]:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Download standard .ics iCalendar file for an appointment
// @route   GET /api/appointments/:id/ics
// @access  Public
export const downloadAppointmentIcs = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                client: { select: { name: true, email: true } },
                provider: {
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                },
                service: true
            }
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const icsData = generateAppointmentIcs(appointment);
        const safeId = appointment.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8);
        const filename = `appointment-${safeId}.ics`;

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(icsData);
    } catch (err) {
        console.error('[downloadAppointmentIcs Error]:', err);
        res.status(500).json({ message: 'Server Error generating calendar file' });
    }
};


