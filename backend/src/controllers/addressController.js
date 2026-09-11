import prisma from '../prisma.js';

// @desc    Get all saved addresses for logged-in user
// @route   GET /api/addresses
// @access  Private
export const getMyAddresses = async (req, res) => {
    try {
        const addresses = await prisma.address.findMany({
            where: { userId: req.user.id },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(addresses);
    } catch (error) {
        console.error('[addressController:getMyAddresses]', error);
        res.status(500).json({ message: 'Failed to fetch saved addresses' });
    }
};

// @desc    Create a new saved address
// @route   POST /api/addresses
// @access  Private
export const createAddress = async (req, res) => {
    try {
        const {
            label = 'Home',
            streetAddress,
            city,
            state,
            zipCode,
            country = 'India',
            latitude,
            longitude,
            isDefault = false
        } = req.body;

        if (!streetAddress || !city) {
            return res.status(400).json({ message: 'Street address and city are required' });
        }

        // If this address is set as default, unset existing defaults
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId: req.user.id, isDefault: true },
                data: { isDefault: false }
            });
        }

        // If it's the user's first address, make it default automatically
        const existingCount = await prisma.address.count({
            where: { userId: req.user.id }
        });

        const address = await prisma.address.create({
            data: {
                userId: req.user.id,
                label: label.trim(),
                streetAddress: streetAddress.trim(),
                city: city.trim(),
                state: state ? state.trim() : null,
                zipCode: zipCode ? zipCode.trim() : null,
                country: country ? country.trim() : 'India',
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                isDefault: isDefault || existingCount === 0
            }
        });

        res.status(201).json(address);
    } catch (error) {
        console.error('[addressController:createAddress]', error);
        res.status(500).json({ message: 'Failed to save address' });
    }
};

// @desc    Update a saved address
// @route   PUT /api/addresses/:id
// @access  Private
export const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            label,
            streetAddress,
            city,
            state,
            zipCode,
            country,
            latitude,
            longitude,
            isDefault
        } = req.body;

        const existing = await prisma.address.findUnique({
            where: { id }
        });

        if (!existing || existing.userId !== req.user.id) {
            return res.status(404).json({ message: 'Address not found or access denied' });
        }

        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId: req.user.id, isDefault: true },
                data: { isDefault: false }
            });
        }

        const updated = await prisma.address.update({
            where: { id },
            data: {
                ...(label !== undefined && { label: label.trim() }),
                ...(streetAddress !== undefined && { streetAddress: streetAddress.trim() }),
                ...(city !== undefined && { city: city.trim() }),
                ...(state !== undefined && { state: state ? state.trim() : null }),
                ...(zipCode !== undefined && { zipCode: zipCode ? zipCode.trim() : null }),
                ...(country !== undefined && { country: country ? country.trim() : 'India' }),
                ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
                ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
                ...(isDefault !== undefined && { isDefault: Boolean(isDefault) })
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('[addressController:updateAddress]', error);
        res.status(500).json({ message: 'Failed to update address' });
    }
};

// @desc    Delete a saved address
// @route   DELETE /api/addresses/:id
// @access  Private
export const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.address.findUnique({
            where: { id }
        });

        if (!existing || existing.userId !== req.user.id) {
            return res.status(404).json({ message: 'Address not found or access denied' });
        }

        // Unlink any appointments referencing this addressId so snapshot remains without throwing FK violation
        await prisma.appointment.updateMany({
            where: { addressId: id },
            data: { addressId: null }
        });

        await prisma.address.delete({
            where: { id }
        });

        // If the deleted address was default, make the most recent remaining address default
        if (existing.isDefault) {
            const nextDefault = await prisma.address.findFirst({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' }
            });
            if (nextDefault) {
                await prisma.address.update({
                    where: { id: nextDefault.id },
                    data: { isDefault: true }
                });
            }
        }

        res.json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error('[addressController:deleteAddress]', error);
        res.status(500).json({ message: 'Failed to delete address' });
    }
};
