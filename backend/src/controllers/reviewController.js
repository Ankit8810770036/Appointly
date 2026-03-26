import prisma from '../prisma.js';
import { createNotification } from '../utils/notificationHelper.js';

// @desc    Create a review for a completed appointment
// @route   POST /api/reviews
// @access  Private (Client only)
export const createReview = async (req, res) => {
    try {
        const { appointmentId, rating, comment } = req.body;

        if (req.user.role !== 'CLIENT') {
            return res.status(403).json({ message: 'Only clients can leave reviews' });
        }

        // 1. Verify appointment exists and belongs to client
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { review: true, provider: true }
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (appointment.clientId !== req.user.id) {
            return res.status(403).json({ message: 'You can only review your own appointments' });
        }

        // 2. Verify status is COMPLETED
        if (appointment.status !== 'COMPLETED') {
            return res.status(400).json({ message: 'You can only review completed appointments' });
        }

        // 3. Verify no existing review
        if (appointment.review) {
            return res.status(400).json({ message: 'This appointment has already been reviewed' });
        }

        // 4. Create Review
        const review = await prisma.review.create({
            data: {
                appointmentId,
                rating: parseInt(rating),
                comment
            }
        });

        // 5. Update Provider Profile aggregate rating
        const allReviews = await prisma.review.findMany({
            where: {
                appointment: {
                    providerId: appointment.providerId
                }
            }
        });

        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await prisma.providerProfile.update({
            where: { id: appointment.providerId },
            data: { rating: parseFloat(avgRating.toFixed(1)) },
            include: { user: true }
        });

        // Notify Provider
        await createNotification({
            userId: appointment.provider.userId,
            type: 'NEW_REVIEW',
            title: 'New Review Received',
            message: `${req.user.name} left a ${rating}-star review for your service.`,
            link: '/dashboard/provider'
        });

        res.status(201).json(review);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get reviews for a specific provider
// @route   GET /api/reviews/provider/:providerProfileId
// @access  Public
export const getProviderReviews = async (req, res) => {
    try {
        const { providerProfileId } = req.params;

        const reviews = await prisma.review.findMany({
            where: {
                appointment: {
                    providerId: providerProfileId
                }
            },
            include: {
                appointment: {
                    include: {
                        client: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: {
                appointment: {
                    date: 'desc'
                }
            }
        });

        res.json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
