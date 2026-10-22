import prisma from '../prisma.js';

// @desc    Toggle favorite status for a provider
// @route   POST /api/favorites/toggle
// @access  Private (Client only)
export const toggleFavorite = async (req, res) => {
    try {
        let { providerProfileId } = req.body;

        if (!providerProfileId) {
            return res.status(400).json({ message: 'Provider profile ID is required' });
        }

        const profile = await prisma.providerProfile.findFirst({
            where: {
                OR: [
                    { id: providerProfileId },
                    { userId: providerProfileId }
                ]
            },
            select: { id: true }
        });

        if (!profile) {
            return res.status(404).json({ message: 'Provider profile not found' });
        }

        const targetProfileId = profile.id;

        const existing = await prisma.favorite.findUnique({
            where: {
                clientId_providerProfileId: {
                    clientId: req.user.id,
                    providerProfileId: targetProfileId
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
                    providerProfileId: targetProfileId
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
            where: {
                clientId: req.user.id
            },
            include: {
                providerProfile: {
                    include: {
                        user: {
                            select: { name: true, email: true, avatarUrl: true }
                        },
                        services: true
                    }
                }
            }
        });

        // Filter out any entries where providerProfile or its user is missing
        const validFavorites = favorites.filter(f => f.providerProfile && f.providerProfile.user);

        res.json(validFavorites);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
