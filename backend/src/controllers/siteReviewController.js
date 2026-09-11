import prisma from '../prisma.js';

// @desc    Create a new site review
// @route   POST /api/site-reviews
// @access  Public (Optional Auth)
export const createSiteReview = async (req, res) => {
    try {
        const { name, rating, comment } = req.body;
        const userId = req.user?.id; // From protect middleware if present

        const parsedRating = parseInt(rating, 10);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
        }

        const sanitizedName = typeof name === 'string' ? name.trim().substring(0, 100) : (req.user?.name || 'Anonymous');
        const sanitizedComment = typeof comment === 'string' ? comment.trim().substring(0, 1000) : '';

        if (!sanitizedComment) {
            return res.status(400).json({ message: 'A comment is required' });
        }

        const review = await prisma.siteReview.create({
            data: {
                name: sanitizedName,
                rating: parsedRating,
                comment: sanitizedComment,
                userId: userId || null
            }
        });

        res.status(201).json(review);
    } catch (error) {
        console.error('Error creating site review:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
