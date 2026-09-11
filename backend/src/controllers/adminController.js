import prisma from '../prisma.js';

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

        const updatedProfile = await prisma.providerProfile.update({
            where: { userId: providerId },
            data: {
                isVerified: isVerified,
                // If rejected, we might want to clear the document so they can re-upload
                // verificationDocument: isVerified ? undefined : null 
            }
        });

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
 * @desc    Get All Users
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
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
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
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

        // Safely clean up related data before deleting the user
        await prisma.$transaction(async (tx) => {
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

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete Review Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

