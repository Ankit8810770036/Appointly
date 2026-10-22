import prisma from '../prisma.js';
import { createNotification } from '../utils/notificationHelper.js';

/**
 * @desc    File a direct complaint to Admin
 * @route   POST /api/complaints
 * @access  Private (Client)
 */
export const createComplaint = async (req, res) => {
    try {
        const { appointmentId, providerId, subject, description, category } = req.body;

        if (!subject || !description) {
            return res.status(400).json({ message: 'Subject and detailed description are required.' });
        }

        const validCategories = ['SERVICE_QUALITY', 'NO_SHOW', 'BILLING', 'BEHAVIOR', 'OTHER'];
        const sanitizedCategory = validCategories.includes(category) ? category : 'SERVICE_QUALITY';

        let resolvedProviderId = providerId || null;
        let appointment = null;

        if (appointmentId) {
            appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: { provider: true }
            });

            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            if (appointment.clientId !== req.user.id) {
                return res.status(403).json({ message: 'You can only file a dispute on your own appointments.' });
            }

            resolvedProviderId = appointment.provider.userId || resolvedProviderId;
        } else if (resolvedProviderId) {
            const targetUser = await prisma.user.findUnique({
                where: { id: resolvedProviderId },
                select: { id: true }
            });
            if (!targetUser) {
                const targetProfile = await prisma.providerProfile.findUnique({
                    where: { id: resolvedProviderId },
                    select: { userId: true }
                });
                resolvedProviderId = targetProfile ? targetProfile.userId : null;
            }
        }

        const complaint = await prisma.complaint.create({
            data: {
                clientId: req.user.id,
                providerId: resolvedProviderId,
                appointmentId: appointmentId || null,
                subject: subject.trim().substring(0, 200),
                description: description.trim().substring(0, 2000),
                category: sanitizedCategory,
                status: 'PENDING'
            },
            include: {
                appointment: {
                    include: {
                        service: true,
                        provider: {
                            include: {
                                user: {
                                    select: { name: true, email: true, avatarUrl: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Notify client that complaint has been lodged and sent to admin
        try {
            await createNotification({
                userId: req.user.id,
                type: 'SYSTEM',
                title: 'Complaint Submitted to Admin',
                message: `Your complaint regarding "${subject.trim().substring(0, 50)}" is currently under review by our Admin Team. Ticket ID: ${complaint.id.slice(0, 8)}`,
                link: '/dashboard/client'
            });

            // Dispatch real-time alert directly to platform Admins
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true }
            });
            for (const admin of admins) {
                await createNotification({
                    userId: admin.id,
                    type: 'SYSTEM',
                    title: `🚨 New Dispute Escalation: ${sanitizedCategory}`,
                    message: `Client ${req.user.name || 'User'} filed dispute #${complaint.id.slice(0, 8)}: "${subject.trim().substring(0, 60)}"`,
                    link: '/dashboard/admin'
                });
            }
        } catch (e) {
            console.error('Notification error on complaint creation:', e);
        }

        res.status(201).json({
            success: true,
            message: 'Your complaint has been submitted directly to the Admin portal for review.',
            complaint
        });
    } catch (error) {
        console.error('Create Complaint Error:', error);
        res.status(500).json({ message: 'Server Error while filing complaint' });
    }
};

/**
 * @desc    Get all complaints filed by logged-in client
 * @route   GET /api/complaints/my
 * @access  Private (Client)
 */
export const getMyComplaints = async (req, res) => {
    try {
        const complaints = await prisma.complaint.findMany({
            where: { clientId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                appointment: {
                    include: {
                        service: true,
                        provider: {
                            include: {
                                user: {
                                    select: { name: true, email: true, avatarUrl: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const complaintsWithProvider = await Promise.all(complaints.map(async (c) => {
            if (!c.appointment && c.providerId) {
                const provUser = await prisma.user.findUnique({
                    where: { id: c.providerId },
                    select: { id: true, name: true, email: true, phone: true, avatarUrl: true }
                });
                return { ...c, providerUser: provUser };
            }
            return c;
        }));

        res.json(complaintsWithProvider);
    } catch (error) {
        console.error('Get My Complaints Error:', error);
        res.status(500).json({ message: 'Server Error while loading complaints' });
    }
};
