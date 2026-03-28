import prisma from '../prisma.js';

// @desc    Get all providers
// @route   GET /api/providers
// @access  Public
export const getProviders = async (req, res) => {
    try {
        const { search, specialty, location, date, name, maxPrice } = req.query;

        const query = {
            where: {
                role: 'PROVIDER',
                providerProfile: {
                    services: {
                        some: {} // Only providers with at least one service
                    }
                },
                AND: []
            },
            include: {
                providerProfile: {
                    include: {
                        services: {
                            select: {
                                price: true
                            }
                        }
                    }
                }
            }
        };

        if (search) {
            const categoryMap = {
                'Health & Wellness': ['Dentist', 'Doctor', 'Therapist', 'Health', 'Wellness', 'Medicine'],
                'Beauty & Spa': ['Salon', 'Barber', 'Beauty', 'Spa', 'Nail', 'Hair'],
                'Home Services': ['Plumber', 'Electrician', 'Cleaner', 'Home', 'Repair'],
                'Fitness': ['Fitness', 'Yoga', 'Trainer', 'Gym'],
                'Legal & Finance': ['Legal', 'Finance', 'Accountant', 'Lawyer', 'Consultant'],
                'Education': ['Education', 'Tutor', 'Coach', 'Teacher', 'Specialist']
            };

            const keywords = categoryMap[search] || [search];

            query.where.AND.push({
                OR: keywords.flatMap(kw => [
                    { name: { contains: kw, mode: 'insensitive' } },
                    { providerProfile: { specialty: { contains: kw, mode: 'insensitive' } } }
                ])
            });
        }

        if (specialty) {
            query.where.AND.push({
                providerProfile: {
                    specialty: { contains: specialty, mode: 'insensitive' }
                }
            });
        }

        if (location) {
            query.where.AND.push({
                providerProfile: {
                    location: { contains: location, mode: 'insensitive' }
                }
            });
        }

        if (name) {
            query.where.AND.push({ name: { contains: name, mode: 'insensitive' } });
        }

        if (maxPrice) {
            query.where.AND.push({
                providerProfile: {
                    services: {
                        some: {
                            price: { lte: parseFloat(maxPrice) }
                        }
                    }
                }
            });
        }

        // Fix if no AND conditions
        if (query.where.AND.length === 0) {
            delete query.where.AND;
        }

        let providers = await prisma.user.findMany(query);

        // Date filtering (Optimized implementation)
        if (date) {
            const searchDate = new Date(date);
            const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

            // Get counts for all providers in one query
            const appointmentCounts = await prisma.appointment.groupBy({
                by: ['providerId'],
                where: {
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    status: {
                        in: ['PENDING', 'CONFIRMED']
                    }
                },
                _count: {
                    id: true
                }
            });

            // Create a map for quick lookup
            const countMap = {};
            appointmentCounts.forEach(c => {
                countMap[c.providerId] = c._count.id;
            });

            // Filter providers based on threshold (e.g., max 8 appointments per day)
            providers = providers.filter(p => {
                if (!p.providerProfile) return false;
                const count = countMap[p.providerProfile.id] || 0;
                return count < 8;
            });
        }

        res.json(providers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get provider by ID
// @route   GET /api/providers/:id
// @access  Public
export const getProviderById = async (req, res) => {
    try {
        const provider = await prisma.user.findUnique({
            where: {
                id: req.params.id,
            },
            select: {
                id: true,
                name: true,
                role: true,
                providerProfile: {
                    include: {
                        services: true
                    }
                }
            }
        });

        if (provider && provider.role === 'PROVIDER') {
            res.json(provider);
        } else {
            res.status(404).json({ message: 'Provider not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add a service to provider profile
// @route   POST /api/providers/services
// @access  Private (Provider only)
export const addService = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || user.role !== 'PROVIDER') {
            return res.status(403).json({ message: 'Only providers can add services' });
        }

        const { name, duration, price, category } = req.body;

        const profile = await prisma.providerProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!profile) {
            return res.status(404).json({ message: 'Provider profile not found' });
        }

        const service = await prisma.service.create({
            data: {
                name,
                category: category || 'General',
                duration: parseInt(duration),
                price: parseFloat(price),
                providerProfileId: profile.id
            }
        });

        res.status(201).json(service);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a service from provider profile
// @route   DELETE /api/providers/services/:id
// @access  Private (Provider only)
export const deleteService = async (req, res) => {
    try {
        const serviceId = req.params.id;
        const userId = req.user.id;

        // Find the service and ensure it belongs to the current provider
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: {
                providerProfile: true
            }
        });

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        if (service.providerProfile.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized to delete this service' });
        }

        await prisma.service.delete({
            where: { id: serviceId }
        });

        res.json({ message: 'Service removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get earnings analytics for provider
// @route   GET /api/providers/earnings
// @access  Private (Provider only)
export const getEarningsStats = async (req, res) => {
    try {
        const profile = await prisma.providerProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!profile) {
            return res.status(404).json({ message: 'Provider profile not found' });
        }

        // Fetch completed appointments with service prices
        const appointments = await prisma.appointment.findMany({
            where: {
                providerId: profile.id,
                status: 'COMPLETED'
            },
            include: {
                service: true
            },
            orderBy: { date: 'asc' }
        });

        // Grouping by Date for the chart
        const dailyEarnings = {};
        let totalEarnings = 0;

        appointments.forEach(appt => {
            const dateStr = appt.date.toISOString().split('T')[0];
            const amount = appt.service.price;

            dailyEarnings[dateStr] = (dailyEarnings[dateStr] || 0) + amount;
            totalEarnings += amount;
        });

        // Format for Recharts: [{ date: '2026-03-24', earnings: 500 }, ...]
        const chartData = Object.keys(dailyEarnings).map(date => ({
            date,
            earnings: dailyEarnings[date]
        }));

        res.json({
            totalEarnings,
            appointmentCount: appointments.length,
            chartData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateProviderProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || user.role !== 'PROVIDER') {
            return res.status(403).json({ message: 'Only providers can update their profile' });
        }

        const { name, specialty, phone, location, about, workingDays, availableSlots, workSchedule, blockedDates } = req.body;

        // Update the user's name if provided
        if (name) {
            await prisma.user.update({
                where: { id: req.user.id },
                data: { name }
            });
        }

        // Upsert the provider profile
        const profile = await prisma.providerProfile.upsert({
            where: { userId: req.user.id },
            update: {
                specialty: specialty !== undefined ? specialty : undefined,
                phone: phone !== undefined ? phone : undefined,
                location: location !== undefined ? location : undefined,
                about: about !== undefined ? about : undefined,
                workingDays: workingDays !== undefined ? workingDays : undefined,
                availableSlots: availableSlots !== undefined ? availableSlots : undefined,
                workSchedule: workSchedule !== undefined ? workSchedule : undefined,
                blockedDates: blockedDates !== undefined ? blockedDates : undefined,
            },
            create: {
                userId: req.user.id,
                specialty: specialty || '',
                phone: phone || '',
                location: location || '',
                about: about || '',
                workingDays: workingDays || ["MON", "TUE", "WED", "THU", "FRI"],
                availableSlots: availableSlots || ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
                workSchedule: workSchedule || {},
                blockedDates: blockedDates || [],
            }
        });

        // Get updated user data to return
        const updatedUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                providerProfile: true
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error("DEBUG ERROR", error);
        import('fs').then(fs => fs.appendFileSync('debug-error.log', error.stack + '\n'));
        res.status(500).json({ message: 'Server Error', details: error.message });
    }
};
