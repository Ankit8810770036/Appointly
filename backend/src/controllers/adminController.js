import prisma from '../prisma.js';
import { logAdminActivity, fetchAuditLogs } from '../utils/auditLogger.js';
import { createNotification } from '../utils/notificationHelper.js';
import { deleteCache } from '../utils/redis.js';

/**
 * @desc    Get all providers with pending verification documents
 * @route   GET /api/admin/pending-verifications
 * @access  Private/Admin
 */
export const getPendingVerifications = async (req, res) => {
    try {
        const pending = await prisma.user.findMany({
            where: {
                role: 'PROVIDER',
                providerProfile: {
                    isVerified: false,
                    verificationDocument: { not: null }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                role: true,
                phone: true,
                location: true,
                providerProfile: true
            }
        });

        res.json(pending);
    } catch (error) {
        console.error('Get Pending Verifications Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Approve or Reject provider verification
 * @route   POST /api/admin/verify-provider
 * @access  Private/Admin
 */
export const verifyProvider = async (req, res) => {
    try {
        const { providerId, status } = req.body; // status: 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Use approved or rejected.' });
        }

        const isVerified = status === 'approved';

        let targetProfile = await prisma.providerProfile.findFirst({
            where: {
                OR: [
                    { userId: providerId },
                    { id: providerId }
                ]
            }
        });

        if (!targetProfile) {
            return res.status(404).json({ message: 'Provider profile not found' });
        }

        const updatedProfile = await prisma.providerProfile.update({
            where: { id: targetProfile.id },
            data: {
                isVerified: isVerified
            },
            include: { user: true }
        });

        // Invalidate provider catalog & public statistics cache
        deleteCache('cache:/api/providers*').catch(() => {});
        deleteCache('cache:/api/public/stats*').catch(() => {});

        // Record immutable audit log
        await logAdminActivity({
            adminId: req.user.id,
            action: isVerified ? 'SPECIALIST_VERIFIED' : 'SPECIALIST_REJECTED',
            targetType: 'SPECIALIST',
            targetId: providerId,
            details: {
                specialistName: updatedProfile.user?.name,
                specialistEmail: updatedProfile.user?.email,
                specialty: updatedProfile.specialty,
                isVerified
            },
            reason: req.body.reason || (isVerified ? 'Specialist license & document credentials approved' : 'Verification documentation rejected'),
            ipAddress: req.ip || req.headers['x-forwarded-for']
        });

        // Notify specialist of verification status update
        try {
            await createNotification({
                userId: providerId,
                type: 'SYSTEM',
                title: isVerified ? '🎉 Credentials Verified & Approved!' : '⚠️ Verification Document Rejected',
                message: isVerified
                    ? 'Congratulations! Your professional credentials have been verified by the Appointly Admin Team. Your profile now features a verified badge.'
                    : `Your verification document was rejected by the admin team.${req.body.reason ? ' Reason: ' + req.body.reason : ' Please re-upload a clear, valid license document in your dashboard.'}`,
                link: '/dashboard/provider'
            });
        } catch (notifErr) {
            console.error('Notification error on provider verification:', notifErr);
        }

        res.json({
            message: `Provider ${status} successfully.`,
            profile: updatedProfile
        });
    } catch (error) {
        console.error('Verify Provider Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get Platform Statistics
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
export const getPlatformStats = async (req, res) => {
    try {
        const [userCount, providerCount, clientCount, appointmentCount, reviewCount, siteReviewCount] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'PROVIDER' } }),
            prisma.user.count({ where: { role: 'CLIENT' } }),
            prisma.appointment.count(),
            prisma.review.count(),
            prisma.siteReview.count(),
        ]);

        res.json({
            users: userCount,
            providers: providerCount,
            clients: clientCount,
            appointments: appointmentCount,
            totalReviews: reviewCount + siteReviewCount,
            siteReviews: siteReviewCount
        });
    } catch (error) {
        console.error('Get Stats Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get All Users with Pagination & Search
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const { search, role } = req.query;

        const where = {};
        if (role && ['CLIENT', 'PROVIDER', 'ADMIN'].includes(role.toUpperCase())) {
            where.role = role.toUpperCase();
        }

        if (search && search.trim()) {
            const cleanSearch = search.trim();
            where.OR = [
                { name: { contains: cleanSearch, mode: 'insensitive' } },
                { email: { contains: cleanSearch, mode: 'insensitive' } },
                { phone: { contains: cleanSearch, mode: 'insensitive' } }
            ];
        }

        const total = await prisma.user.count({ where });
        const totalPages = Math.ceil(total / limit) || 1;
        const skip = (page - 1) * limit;

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                location: true,
                createdAt: true,
                isEmailVerified: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        });

        res.json({
            users,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Delete User
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleteReason = req.body?.reason || req.query?.reason || 'Account deleted by Administrator';

        if (req.user.id === id) {
            return res.status(400).json({ message: 'You cannot delete your own admin account.' });
        }

        // Pre-fetch user details for audit trail
        const targetUser = await prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, role: true, phone: true }
        });

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Safely clean up related data before deleting the user
        await prisma.$transaction(async (tx) => {
            // 0. Delete push subscriptions
            await tx.pushSubscription.deleteMany({ where: { userId: id } });

            // 0b. Delete client complaints
            await tx.complaint.deleteMany({ where: { clientId: id } });

            // 1. Delete notifications
            await tx.notification.deleteMany({ where: { userId: id } });

            // 2. Delete messages sent or received
            await tx.message.deleteMany({
                where: {
                    OR: [{ senderId: id }, { receiverId: id }]
                }
            });

            // 3. Delete site reviews
            await tx.siteReview.deleteMany({ where: { userId: id } });

            // 4. Delete client favorites
            await tx.favorite.deleteMany({ where: { clientId: id } });

            // 5. Check if user is a provider and clean up provider-specific data
            const profile = await tx.providerProfile.findUnique({
                where: { userId: id },
                select: { id: true }
            });

            if (profile) {
                // Delete favorites of this provider
                await tx.favorite.deleteMany({ where: { providerProfileId: profile.id } });

                // Find appointments for this provider
                const providerAppts = await tx.appointment.findMany({
                    where: { providerId: profile.id },
                    select: { id: true }
                });
                const apptIds = providerAppts.map(a => a.id);

                if (apptIds.length > 0) {
                    await tx.review.deleteMany({ where: { appointmentId: { in: apptIds } } });
                    await tx.appointment.deleteMany({ where: { id: { in: apptIds } } });
                }

                // Delete provider services
                await tx.service.deleteMany({ where: { providerProfileId: profile.id } });

                // Delete provider profile
                await tx.providerProfile.delete({ where: { id: profile.id } });
            }

            // 6. Delete appointments where user was client
            const clientAppts = await tx.appointment.findMany({
                where: { clientId: id },
                select: { id: true }
            });
            const clientApptIds = clientAppts.map(a => a.id);
            if (clientApptIds.length > 0) {
                await tx.review.deleteMany({ where: { appointmentId: { in: clientApptIds } } });
                await tx.appointment.deleteMany({ where: { id: { in: clientApptIds } } });
            }

            // 7. Unlink any appointments referencing this user's saved addresses, then delete addresses
            const userAddresses = await tx.address.findMany({
                where: { userId: id },
                select: { id: true }
            });
            const addressIds = userAddresses.map(a => a.id);
            if (addressIds.length > 0) {
                await tx.appointment.updateMany({
                    where: { addressId: { in: addressIds } },
                    data: { addressId: null }
                });
                await tx.address.deleteMany({ where: { id: { in: addressIds } } });
            }

            // 8. Finally delete the user
            await tx.user.delete({ where: { id } });
        });

        // Record audit log
        if (targetUser) {
            await logAdminActivity({
                adminId: req.user.id,
                action: 'USER_DELETED',
                targetType: 'USER',
                targetId: id,
                details: {
                    deletedUserName: targetUser.name,
                    deletedUserEmail: targetUser.email,
                    role: targetUser.role
                },
                reason: deleteReason,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });
        }

        // Invalidate provider directory & statistics cache
        deleteCache('cache:/api/providers*').catch(() => {});
        deleteCache('cache:/api/public/stats*').catch(() => {});

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get All Reviews (Site & Appointment)
 * @route   GET /api/admin/reviews
 * @access  Private/Admin
 */
export const getAllReviews = async (req, res) => {
    try {
        const [siteReviews, appReviews] = await Promise.all([
            prisma.siteReview.findMany({
                include: { user: { select: { name: true, email: true } } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.review.findMany({
                include: {
                    appointment: {
                        include: {
                            client: { select: { name: true } },
                            provider: { include: { user: { select: { name: true } } } }
                        }
                    }
                },
                orderBy: { id: 'desc' } // Appointment reviews don't have createdAt in this schema
            })
        ]);

        const formatted = [
            ...siteReviews.map(r => ({ ...r, type: 'SITE' })),
            ...appReviews.map(r => ({
                id: r.id,
                name: r.appointment.client.name,
                rating: r.rating,
                comment: r.comment,
                type: 'APPOINTMENT',
                providerName: r.appointment.provider.user.name,
                createdAt: new Date() // Fallback
            }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(formatted);
    } catch (error) {
        console.error('Get Reviews Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Delete Review
 * @route   DELETE /api/admin/reviews/:id
 * @access  Private/Admin
 */
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query; // 'SITE' or 'APPOINTMENT'

        if (type === 'SITE') {
            await prisma.siteReview.delete({ where: { id } });
        } else {
            const review = await prisma.review.findUnique({
                where: { id },
                include: { appointment: true }
            });

            if (review) {
                const providerId = review.appointment.providerId;
                await prisma.review.delete({ where: { id } });

                // Recalculate provider aggregate rating
                const remainingReviews = await prisma.review.findMany({
                    where: { appointment: { providerId } }
                });

                const avgRating = remainingReviews.length > 0
                    ? parseFloat((remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length).toFixed(1))
                    : 0;

                await prisma.providerProfile.update({
                    where: { id: providerId },
                    data: { rating: avgRating }
                });
            }
        }

        // Invalidate provider ratings, catalog & reviews cache
        deleteCache('cache:/api/providers*').catch(() => {});
        deleteCache('cache:/api/public/stats*').catch(() => {});
        deleteCache('cache:/api/public/site-reviews*').catch(() => {});

        res.json({ message: 'Review deleted successfully' });

        // Record audit log
        await logAdminActivity({
            adminId: req.user.id,
            action: 'REVIEW_DELETED',
            targetType: 'REVIEW',
            targetId: id,
            details: { reviewType: type || 'APPOINTMENT' },
            reason: req.query.reason || req.body?.reason || 'Review removed by Administrator for policy compliance',
            ipAddress: req.ip || req.headers['x-forwarded-for']
        });
    } catch (error) {
        console.error('Delete Review Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get All Complaints & Disputes
 * @route   GET /api/admin/complaints
 * @access  Private/Admin
 */
export const getAllComplaints = async (req, res) => {
    try {
        const complaints = await prisma.complaint.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatarUrl: true
                    }
                },
                appointment: {
                    include: {
                        service: true,
                        provider: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        phone: true,
                                        avatarUrl: true
                                    }
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
        console.error('Get All Complaints Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Update Complaint Status & Resolution Notes
 * @route   PATCH /api/admin/complaints/:id
 * @access  Private/Admin
 */
export const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        const validStatuses = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const updated = await prisma.complaint.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(adminNotes !== undefined && { adminNotes: adminNotes.trim() })
            },
            include: {
                client: true
            }
        });

        // Notify client about the resolution
        if (updated.clientId) {
            try {
                await createNotification({
                    userId: updated.clientId,
                    type: 'SYSTEM',
                    title: `Complaint Status Updated: ${status || 'Reviewed'}`,
                    message: `Admin has updated your complaint #${updated.id.slice(0, 8)}. Status: ${status || updated.status}.${adminNotes ? ' Resolution note: ' + adminNotes : ''}`,
                    link: '/dashboard/client'
                });
            } catch (notifErr) {
                console.error('Failed to send notification for complaint update:', notifErr);
            }
        }

        // Record audit log
        await logAdminActivity({
            adminId: req.user.id,
            action: status === 'RESOLVED' ? 'COMPLAINT_RESOLVED' : 'COMPLAINT_STATUS_UPDATED',
            targetType: 'COMPLAINT',
            targetId: id,
            details: {
                previousStatus: updated.status,
                newStatus: status || updated.status,
                adminNotes
            },
            reason: adminNotes || `Complaint status updated to ${status || updated.status}`,
            ipAddress: req.ip || req.headers['x-forwarded-for']
        });

        res.json({
            success: true,
            message: 'Complaint updated successfully',
            complaint: updated
        });
    } catch (error) {
        console.error('Update Complaint Status Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get All Platform Appointments for Service Oversight with Pagination
 * @route   GET /api/admin/appointments
 * @access  Private/Admin
 */
export const getAllAppointments = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const { status, search } = req.query;

        const where = {};
        if (status && ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())) {
            where.status = status.toUpperCase();
        }

        if (search && search.trim()) {
            const cleanSearch = search.trim().replace(/^#?apt-?/i, '');
            where.OR = [
                { id: { contains: cleanSearch, mode: 'insensitive' } },
                { client: { name: { contains: search.trim(), mode: 'insensitive' } } },
                { client: { email: { contains: search.trim(), mode: 'insensitive' } } },
                { provider: { user: { name: { contains: search.trim(), mode: 'insensitive' } } } },
                { service: { name: { contains: search.trim(), mode: 'insensitive' } } },
            ];
        }

        const [totalAll, completedCount, confirmedCount, pendingCount, cancelledCount, complaintsCount, totalFiltered, appointments] = await Promise.all([
            prisma.appointment.count(),
            prisma.appointment.count({ where: { status: 'COMPLETED' } }),
            prisma.appointment.count({ where: { status: 'CONFIRMED' } }),
            prisma.appointment.count({ where: { status: 'PENDING' } }),
            prisma.appointment.count({ where: { status: 'CANCELLED' } }),
            prisma.complaint.count(),
            prisma.appointment.count({ where }),
            prisma.appointment.findMany({
                where,
                orderBy: { date: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    client: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            avatarUrl: true
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
                                    avatarUrl: true
                                }
                            }
                        }
                    },
                    service: true,
                    review: true,
                    complaints: true
                }
            })
        ]);

        const totalPages = Math.ceil(totalFiltered / limit) || 1;

        res.json({
            metrics: {
                total: totalAll,
                completed: completedCount,
                confirmed: confirmedCount,
                pending: pendingCount,
                cancelled: cancelledCount,
                withComplaints: complaintsCount,
                successRate: totalAll > 0 ? Math.round((completedCount / (completedCount + cancelledCount || 1)) * 100) : 100
            },
            appointments,
            pagination: {
                total: totalFiltered,
                page,
                limit,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get All Appointments Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get Detailed Single Appointment by ID for Admin Inspection
 * @route   GET /api/admin/appointments/:id
 * @access  Private/Admin
 */
export const getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const cleanId = id.trim().replace(/^#?apt-?/i, '');

        let appointment = await prisma.appointment.findUnique({
            where: { id: cleanId },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatarUrl: true,
                        location: true,
                        city: true,
                        state: true,
                        streetAddress: true,
                        zipCode: true
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
                                avatarUrl: true,
                                location: true,
                                city: true,
                                state: true,
                                streetAddress: true,
                                zipCode: true
                            }
                        }
                    }
                },
                service: true,
                address: true,
                review: true,
                complaints: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        // If not found by full ID, try searching by partial prefix
        if (!appointment && cleanId.length >= 6) {
            appointment = await prisma.appointment.findFirst({
                where: { id: { startsWith: cleanId, mode: 'insensitive' } },
                include: {
                    client: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            avatarUrl: true,
                            location: true,
                            city: true,
                            state: true,
                            streetAddress: true,
                            zipCode: true
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
                                    avatarUrl: true,
                                    location: true,
                                    city: true,
                                    state: true,
                                    streetAddress: true,
                                    zipCode: true
                                }
                            }
                        }
                    },
                    service: true,
                    address: true,
                    review: true,
                    complaints: {
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });
        }

        if (!appointment) {
            return res.status(404).json({ message: `Appointment with ID ${id} not found.` });
        }

        res.json(appointment);
    } catch (error) {
        console.error('Get Appointment By ID Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Update Appointment Status as Admin (Dispute Override)
 * @route   PATCH /api/admin/appointments/:id/status
 * @access  Private/Admin
 */
export const updateAdminAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
        if (!status || !validStatuses.includes(status.toUpperCase())) {
            return res.status(400).json({ message: 'Invalid status. Use PENDING, CONFIRMED, COMPLETED, or CANCELLED.' });
        }

        const normalizedStatus = status.toUpperCase();
        const cancelReason = req.body.reason || note || 'Overridden by Administrator';

        const updated = await prisma.appointment.update({
            where: { id },
            data: {
                status: normalizedStatus,
                ...(note ? { note } : {}),
                ...(normalizedStatus === 'CANCELLED' ? {
                    cancellationReason: cancelReason,
                    cancelledBy: 'ADMIN',
                    cancelledAt: new Date()
                } : {})
            },
            include: {
                client: true,
                service: true,
                provider: { include: { user: true } }
            }
        });

        // Invalidate public statistics cache
        deleteCache('cache:/api/public/stats*').catch(() => {});

        // Record audit log
        await logAdminActivity({
            adminId: req.user.id,
            action: 'APPOINTMENT_OVERRIDE',
            targetType: 'APPOINTMENT',
            targetId: id,
            details: {
                newStatus: normalizedStatus,
                serviceName: updated.service?.name,
                clientName: updated.client?.name,
                providerName: updated.provider?.user?.name,
                note
            },
            reason: cancelReason,
            ipAddress: req.ip || req.headers['x-forwarded-for']
        });

        // Notify client and provider of admin status update with real-time socket & web push
        try {
            await Promise.all([
                createNotification({
                    userId: updated.clientId,
                    type: 'SYSTEM',
                    title: `Appointment Status Changed by Admin: ${status.toUpperCase()}`,
                    message: `Admin has updated your appointment for "${updated.service.name}" to ${status.toUpperCase()}.${note ? ' Note: ' + note : ''}`,
                    link: '/dashboard/client'
                }),
                createNotification({
                    userId: updated.provider.userId,
                    type: 'SYSTEM',
                    title: `Appointment Status Changed by Admin: ${status.toUpperCase()}`,
                    message: `Admin has updated appointment #${updated.id.slice(0, 8)} (${updated.service.name}) to ${status.toUpperCase()}.${note ? ' Note: ' + note : ''}`,
                    link: '/dashboard/provider'
                })
            ]);
        } catch (notifErr) {
            console.error('Notification error on admin status update:', notifErr);
        }

        res.json({
            success: true,
            message: `Appointment #${id.slice(0, 8)} status updated to ${status.toUpperCase()}`,
            appointment: updated
        });
    } catch (error) {
        console.error('Update Appointment Status Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get Paginated Admin Audit Logs / Activity History
 * @route   GET /api/admin/audit-logs
 * @access  Private/Admin
 */
export const getAdminAuditLogs = async (req, res) => {
    try {
        const { page, limit, action, targetType, search } = req.query;
        const result = await fetchAuditLogs({
            page,
            limit,
            action,
            targetType,
            search
        });
        res.json(result);
    } catch (error) {
        console.error('Get Admin Audit Logs Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


