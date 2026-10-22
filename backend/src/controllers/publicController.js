import prisma from '../prisma.js';
import { createNotification } from '../utils/notificationHelper.js';

// @desc    Get public statistics for the landing page
// @route   GET /api/public/stats
// @access  Public
export const getStats = async (req, res) => {
    try {
        const providersCount = await prisma.providerProfile.count({
            where: { isVerified: true }
        });
        const bookingsCompleted = await prisma.appointment.count({
            where: { status: 'COMPLETED' }
        });

        // Get unique cities from verified ProviderProfiles and associated User records
        const profiles = await prisma.providerProfile.findMany({
            where: { isVerified: true },
            select: {
                location: true,
                user: { select: { city: true, location: true } }
            }
        });

        const cities = new Set();
        profiles.forEach(p => {
            const loc = p.user?.city || p.location || p.user?.location;
            if (loc) {
                const parts = loc.split(',');
                const city = parts[parts.length - 1].trim();
                if (city) cities.add(city);
            }
        });

        res.json({
            providersCount,
            bookingsCompleted,
            citiesCount: cities.size
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Get top 10 latest site reviews for testimonials
// @route   GET /api/public/site-reviews
// @access  Public
export const getSiteReviews = async (req, res) => {
    try {
        const reviews = await prisma.siteReview.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { name: true, role: true }
                }
            }
        });

        // Format for frontend
        const formattedReviews = reviews.map(r => ({
            id: r.id,
            name: r.user?.name || r.name,
            role: r.user?.role === 'PROVIDER' ? 'Provider' : 'Client',
            avatar: r.user?.role === 'PROVIDER' ? '🧑‍💼' : '🙋',
            text: r.comment,
            comment: r.comment,
            rating: r.rating,
            createdAt: r.createdAt
        }));

        res.json(formattedReviews);
    } catch (error) {
        console.error('Error fetching site reviews:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Submit a contact support inquiry
// @route   POST /api/public/contact
// @access  Public
export const submitContactMessage = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'Please provide name, email, subject, and message.' });
        }

        const sanitizedName = String(name).trim().substring(0, 100);
        const sanitizedEmail = String(email).trim().substring(0, 100);
        const sanitizedSubject = String(subject).trim().substring(0, 200);
        const sanitizedMessage = String(message).trim().substring(0, 2000);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
            return res.status(400).json({ message: 'Please provide a valid email address.' });
        }

        if (sanitizedMessage.length < 10) {
            return res.status(400).json({ message: 'Message should be at least 10 characters long.' });
        }

        console.log(`[Contact Inquiry Received] From: ${sanitizedName} <${sanitizedEmail}> | Subject: ${sanitizedSubject}`);

        // Dispatch real-time notification to platform administrators
        try {
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true }
            });
            for (const admin of admins) {
                await createNotification({
                    userId: admin.id,
                    type: 'SYSTEM',
                    title: `📩 New Support Inquiry: ${sanitizedSubject.substring(0, 40)}`,
                    message: `${sanitizedName} (${sanitizedEmail}): "${sanitizedMessage.substring(0, 75)}..."`,
                    link: '/dashboard/admin'
                });
            }
        } catch (adminNotifErr) {
            console.error('Failed to notify admins of contact submission:', adminNotifErr);
        }

        res.status(200).json({
            success: true,
            message: "Message sent successfully! Our support team will get back to you soon."
        });
    } catch (error) {
        console.error('Error handling contact submission:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
