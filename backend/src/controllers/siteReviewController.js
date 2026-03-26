import prisma from '../prisma.js';

// @desc    Create a new site review
// @route   POST /api/site-reviews
// @access  Public (Optional Auth)
export const createSiteReview = async (req, res) => {
    try {
        const { name, rating, comment } = req.body;
        const userId = req.user?.id; // From protect middleware if present

        if (!rating || !comment) {
            return res.status(400).json({ message: 'Rating and comment are required' });
        }

        const review = await prisma.siteReview.create({
            data: {
                name: name || req.user?.name || 'Anonymous',
                rating: parseInt(rating),
                comment,
                userId: userId || null
            }
        });

        res.status(201).json(review);
    } catch (error) {
        console.error('Error creating site review:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
