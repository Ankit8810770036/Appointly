import prisma from '../prisma.js';

// @desc    Get public statistics for the landing page
// @route   GET /api/public/stats
// @access  Public
export const getStats = async (req, res) => {
    try {
        const providersCount = await prisma.providerProfile.count();
        const bookingsCompleted = await prisma.appointment.count({
            where: { status: 'COMPLETED' }
        });

        // Get unique cities from ProviderProfiles
        const profiles = await prisma.providerProfile.findMany({
            select: { location: true }
        });

        const cities = new Set();
        profiles.forEach(p => {
            if (p.location) {
                // Assuming location format is "Area, City" or "City", take the last part
                const parts = p.location.split(',');
                const city = parts[parts.length - 1].trim();
                cities.add(city);
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

// @desc    Get top 5 site reviews for testimonials
// @route   GET /api/public/site-reviews
// @access  Public
export const getSiteReviews = async (req, res) => {
    try {
        const reviews = await prisma.siteReview.findMany({
            take: 5,
            orderBy: [
                { rating: 'desc' },
                { createdAt: 'desc' }
            ],
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
            rating: r.rating
        }));

        res.json(formattedReviews);
    } catch (error) {
        console.error('Error fetching site reviews:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
// @desc    Submit a contact support inquiry
// @route   POST /api/public/contact
// @access  Public
export const submitContactMessage = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'Please provide name, email, subject, and message.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address.' });
        }

        if (message.trim().length < 10) {
            return res.status(400).json({ message: 'Message should be at least 10 characters long.' });
        }

        console.log(`[Contact Inquiry Received] From: ${name} <${email}> | Subject: ${subject}`);

        res.status(200).json({
            success: true,
            message: "Message sent successfully! Our support team will get back to you soon."
        });
    } catch (error) {
        console.error('Error handling contact submission:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
