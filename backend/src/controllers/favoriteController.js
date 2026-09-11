import prisma from '../prisma.js';

// @desc    Toggle favorite status for a provider
// @route   POST /api/favorites/toggle
// @access  Private (Client only)
export const toggleFavorite = async (req, res) => {
    try {
        const { providerProfileId } = req.body;

        if (!providerProfileId) {
            return res.status(400).json({ message: 'Provider profile ID is required' });
        }

        const existing = await prisma.favorite.findUnique({
            where: {
                clientId_providerProfileId: {
                    clientId: req.user.id,
                    providerProfileId
                }
            }
        });

        if (existing) {
            await prisma.favorite.delete({
                where: { id: existing.id }
            });
            return res.json({ favorited: false, message: 'Removed from favorites' });
        } else {
            await prisma.favorite.create({
                data: {
                    clientId: req.user.id,
                    providerProfileId
                }
            });
            return res.status(201).json({ favorited: true, message: 'Added to favorites' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user favorites
// @route   GET /api/favorites
// @access  Private
export const getMyFavorites = async (req, res) => {
    try {
        const favorites = await prisma.favorite.findMany({
            where: { clientId: req.user.id },
            include: {
                providerProfile: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        },
                        services: true
                    }
                }
            }
        });

        res.json(favorites);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
