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
};
