import jwt from 'jsonwebtoken';
import fs from 'fs';
import prisma from '../prisma.js';
import { validateFileSignature, validateBufferSignature } from '../middleware/uploadMiddleware.js';
import { uploadDocumentStream, deleteImage } from '../utils/cloudinary.js';
import { deleteCache } from '../utils/redis.js';
import { createNotification } from '../utils/notificationHelper.js';

// Haversine distance formula in kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
        lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
        return null;
    }
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
}

// @desc    Get all providers
// @route   GET /api/providers
// @access  Public
export const getProviders = async (req, res) => {
    try {
        const { search, specialty, location, date, name, maxPrice, lat, lng, radius } = req.query;

        const query = {
            where: {
                role: 'PROVIDER',
                providerProfile: {
                    isVerified: true,
                    services: {
                        some: {} // Only providers with at least one service
                    }
                },
                AND: []
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                phone: true,
                location: true,
                latitude: true,
                longitude: true,
                isEmailVerified: true,
                isPhoneVerified: true,
                streetAddress: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                providerProfile: {
                    include: {
                        services: true,
                        appointments: {
                            select: {
                                date: true,
                                status: true,
                                review: {
                                    select: {
                                        rating: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        if (search) {
            const rawSearch = search.trim();
            const lowerSearch = rawSearch.toLowerCase();
            const categoryMap = {
                'health': ['Cardiologist', 'Physician', 'Dermatologist', 'Physiotherapist', 'Neurologist', 'Surgeon', 'Pediatrician', 'ENT', 'Nutritionist', 'Doctor', 'Therapist', 'Health', 'Wellness', 'Medicine'],
                'health & wellness': ['Cardiologist', 'Physician', 'Dermatologist', 'Physiotherapist', 'Neurologist', 'Surgeon', 'Pediatrician', 'ENT', 'Nutritionist', 'Doctor', 'Therapist', 'Health', 'Wellness', 'Medicine'],
                'beauty': ['Salon', 'Barber', 'Beauty', 'Spa', 'Nail', 'Hair', 'Makeup'],
                'beauty & spa': ['Salon', 'Barber', 'Beauty', 'Spa', 'Nail', 'Hair', 'Makeup'],
                'home': ['Plumber', 'Electrician', 'Cleaner', 'Home', 'Repair', 'Architect', 'Appliance'],
                'home services': ['Plumber', 'Electrician', 'Cleaner', 'Home', 'Repair', 'Architect', 'Appliance'],
                'fitness': ['Fitness', 'Yoga', 'Trainer', 'Gym', 'Nutritionist', 'Metabolism'],
                'legal': ['Legal', 'Finance', 'Accountant', 'Lawyer', 'Consultant', 'Wealth'],
                'legal & finance': ['Legal', 'Finance', 'Accountant', 'Lawyer', 'Consultant', 'Wealth'],
                'education': ['Education', 'Tutor', 'Coach', 'Teacher', 'Specialist', 'IELTS']
            };

            const keywords = categoryMap[lowerSearch] || [rawSearch];

            query.where.AND.push({
                OR: keywords.flatMap(kw => [
                    { name: { contains: kw, mode: 'insensitive' } },
                    { providerProfile: { specialty: { contains: kw, mode: 'insensitive' } } },
                    { providerProfile: { services: { some: { name: { contains: kw, mode: 'insensitive' } } } } }
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
            const parsedPrice = parseFloat(maxPrice);
            if (!isNaN(parsedPrice) && parsedPrice >= 0 && parsedPrice <= 500000) {
                query.where.AND.push({
                    providerProfile: {
                        services: {
                            some: {
                                price: { lte: parsedPrice }
                            }
                        }
                    }
                });
            }
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

        // Distance & Dynamic Rating Calculation
        const userLat = (lat && lng) ? parseFloat(lat) : null;
        const userLng = (lat && lng) ? parseFloat(lng) : null;
        const maxRadius = radius ? parseFloat(radius) : (userLat && userLng ? 50 : null);

        providers = providers.map(p => {
            const allReviews = (p.providerProfile?.appointments || [])
                .map(a => a.review)
                .filter(Boolean);
            const reviewCount = allReviews.length;
            const dynamicRating = reviewCount > 0
                ? parseFloat((allReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1))
                : (p.providerProfile?.rating && p.providerProfile.rating > 0 ? parseFloat(p.providerProfile.rating.toFixed(1)) : 0);

            const pLat = p.latitude != null ? p.latitude : p.providerProfile?.latitude;
            const pLng = p.longitude != null ? p.longitude : p.providerProfile?.longitude;
            const distance = (userLat !== null && userLng !== null)
                ? calculateDistanceKm(userLat, userLng, pLat, pLng)
                : null;

            return {
                ...p,
                rating: dynamicRating,
                reviewsCount: reviewCount,
                providerProfile: {
                    ...p.providerProfile,
                    rating: dynamicRating,
                    reviewsCount: reviewCount
                },
                distanceKm: distance
            };
        });

        if (userLat !== null && userLng !== null && maxRadius !== null) {
            providers = providers
                .filter(p => p.distanceKm !== null && p.distanceKm <= maxRadius)
                .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
        } else {
            providers.sort((a, b) => {
                const rA = Number(a.rating) || 0;
                const rB = Number(b.rating) || 0;
                if (rB !== rA) return rB - rA;
                return (b.reviewsCount || 0) - (a.reviewsCount || 0);
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
        const providerSelect = {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            phone: true,
            location: true,
            streetAddress: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            latitude: true,
            longitude: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            providerProfile: {
                include: {
                    services: true,
                    appointments: {
                        select: {
                            date: true,
                            status: true,
                            review: {
                                select: {
                                    rating: true
                                }
                            }
                        }
                    }
                }
            }
        };

        let targetId = req.params.id;
        if (targetId === 'me') {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.split(' ')[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    targetId = decoded.id;
                } catch {
                    return res.status(401).json({ message: 'Invalid or expired token' });
                }
            } else {
                return res.status(401).json({ message: 'Authentication required for /me' });
            }
        }

        let provider = await prisma.user.findUnique({
            where: {
                id: targetId,
            },
            select: providerSelect
        });

        if (!provider) {
            const profile = await prisma.providerProfile.findUnique({
                where: { id: targetId },
                select: { userId: true }
            });

            if (profile) {
                provider = await prisma.user.findUnique({
                    where: { id: profile.userId },
                    select: providerSelect
                });
            }
        }

        if (provider && provider.role === 'PROVIDER') {
            const allReviews = (provider.providerProfile?.appointments || [])
                .map(a => a.review)
                .filter(Boolean);
            const reviewCount = allReviews.length;
            const dynamicRating = reviewCount > 0
                ? parseFloat((allReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1))
                : (provider.providerProfile?.rating && provider.providerProfile.rating > 0 ? parseFloat(provider.providerProfile.rating.toFixed(1)) : 0);

            res.json({
                ...provider,
                rating: dynamicRating,
                reviewsCount: reviewCount,
                providerProfile: {
                    ...provider.providerProfile,
                    rating: dynamicRating,
                    reviewsCount: reviewCount
                }
            });
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

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ message: 'Service name is required' });
        }
        const parsedDuration = parseInt(duration, 10);
        if (isNaN(parsedDuration) || parsedDuration <= 0) {
            return res.status(400).json({ message: 'Valid positive duration in minutes is required' });
        }
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({ message: 'Valid price (0 or greater) is required' });
        }

        const profile = await prisma.providerProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!profile) {
            return res.status(404).json({ message: 'Provider profile not found' });
        }

        const service = await prisma.service.create({
            data: {
                name: name.trim(),
                category: category && typeof category === 'string' ? category.trim() : 'General',
                duration: parsedDuration,
                price: parsedPrice,
                providerProfileId: profile.id
            }
        });

        // Invalidate provider listings & stats caches
        deleteCache('cache:/api/providers*').catch(() => {});
        deleteCache('cache:/api/public/stats*').catch(() => {});

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

        // Check if there are any appointments for this service
        const appointmentCount = await prisma.appointment.count({
            where: { serviceId: serviceId }
        });

        if (appointmentCount > 0) {
            return res.status(400).json({
                message: 'Cannot delete service that has existing bookings. You can rename it or update its details instead.'
            });
        }

        await prisma.service.delete({
            where: { id: serviceId }
        });

        // Invalidate provider listings & stats caches
        deleteCache('cache:/api/providers*').catch(() => {});
        deleteCache('cache:/api/public/stats*').catch(() => {});

        res.json({ message: 'Service removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update an existing service in provider profile
// @route   PUT /api/providers/services/:id
// @access  Private (Provider only)
export const updateService = async (req, res) => {
    try {
        const serviceId = req.params.id;
        const userId = req.user.id;
        const { name, duration, price, category } = req.body;

        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: { providerProfile: true }
        });

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        if (service.providerProfile.userId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to update this service' });
        }

        const updateData = {};
        if (name && typeof name === 'string' && name.trim()) updateData.name = name.trim();
        if (duration !== undefined) {
            const parsedDuration = parseInt(duration, 10);
            if (isNaN(parsedDuration) || parsedDuration <= 0) {
                return res.status(400).json({ message: 'Duration must be a positive number of minutes' });
            }
            updateData.duration = parsedDuration;
        }
        if (price !== undefined) {
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                return res.status(400).json({ message: 'Price cannot be negative' });
            }
            updateData.price = parsedPrice;
        }
        if (category && typeof category === 'string' && category.trim()) updateData.category = category.trim();

        const updated = await prisma.service.update({
            where: { id: serviceId },
            data: updateData
        });

        // Invalidate provider listings & stats caches
        deleteCache('cache:/api/providers*').catch(() => {});
        deleteCache('cache:/api/public/stats*').catch(() => {});

        res.json({
            success: true,
            message: 'Service updated successfully',
            service: updated
        });
    } catch (error) {
        console.error('Update Service Error:', error);
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
            const amount = appt.service?.price || 0;

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

        const { name, specialty, phone, location, streetAddress, city, state, zipCode, country, latitude, longitude, about, workingDays, availableSlots, workSchedule, blockedDates } = req.body;

        const parsedLat = (latitude !== undefined && latitude !== null && latitude !== '') ? parseFloat(latitude) : undefined;
        const parsedLng = (longitude !== undefined && longitude !== null && longitude !== '') ? parseFloat(longitude) : undefined;

        // Update the user's details if provided
        if (name || streetAddress || city || state || zipCode || country || phone || location || parsedLat !== undefined || parsedLng !== undefined) {
            await prisma.user.update({
                where: { id: req.user.id },
                data: {
                    name: name || undefined,
                    streetAddress: streetAddress || undefined,
                    city: city || undefined,
                    state: state || undefined,
                    zipCode: zipCode || undefined,
                    country: country || undefined,
                    phone: phone || undefined,
                    location: location || undefined,
                    latitude: parsedLat,
                    longitude: parsedLng
                }
            });
        }

        // Upsert the provider profile with location coordinates
        const profile = await prisma.providerProfile.upsert({
            where: { userId: req.user.id },
            update: {
                specialty: specialty !== undefined ? specialty : undefined,
                phone: phone !== undefined ? phone : undefined,
                location: location !== undefined ? location : undefined,
                latitude: parsedLat,
                longitude: parsedLng,
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
                latitude: parsedLat !== undefined ? parsedLat : null,
                longitude: parsedLng !== undefined ? parsedLng : null,
                about: about || '',
                workingDays: workingDays || ["MON", "TUE", "WED", "THU", "FRI"],
                availableSlots: availableSlots || ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"],
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
                phone: true,
                location: true,
                streetAddress: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                latitude: true,
                longitude: true,
                isEmailVerified: true,
                isPhoneVerified: true,
                providerProfile: {
                    include: {
                        services: true
                    }
                }
            }
        });

        // Invalidate provider profile & listings cache
        deleteCache(`cache:/api/providers*`).catch(() => {});

        res.json(updatedUser);
    } catch (error) {
        console.error('Update Provider Profile Error:', error);
        res.status(500).json({ message: 'Server Error', details: error.message });
    }
};

// @desc    Upload verification document for provider
// @route   POST /api/providers/verify
// @access  Private (Provider only)
export const uploadVerificationDocument = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'Please upload a valid document file' });
        }

        // Validate binary magic numbers directly in memory
        const isValidSignature = validateBufferSignature(req.file.buffer);
        if (!isValidSignature) {
            return res.status(400).json({ message: 'Invalid or corrupted file format. Only authentic JPEG, PNG, and PDF files are allowed.' });
        }

        const profile = await prisma.providerProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!profile) {
            return res.status(404).json({ message: 'Provider profile not found' });
        }

        // Upload directly to Cloudinary (resource_type: auto for PDF / Image)
        const uploadResult = await uploadDocumentStream(req.file.buffer, {
            folder: 'appointly/verifications'
        });

        const updatedProfile = await prisma.providerProfile.update({
            where: { id: profile.id },
            data: {
                verificationDocument: uploadResult.secureUrl, // Permanent Cloudinary CDN URL
                isVerified: false // Reset verification status upon new document submission for admin review
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
                avatarUrl: true,
                phone: true,
                location: true,
                isEmailVerified: true,
                isPhoneVerified: true,
                providerProfile: {
                    include: {
                        services: true
                    }
                }
            }
        });

        // Invalidate provider cache & stats so changes take effect immediately
        deleteCache(`cache:/api/providers*`).catch(() => {});
        deleteCache('cache:/api/public/stats*').catch(() => {});

        // Real-time alert to platform Admins about the new document submission
        try {
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true }
            });
            for (const admin of admins) {
                await createNotification({
                    userId: admin.id,
                    type: 'SYSTEM',
                    title: 'New Verification Document Submitted',
                    message: `Specialist ${updatedUser.name} submitted professional credentials for admin verification.`,
                    link: '/dashboard/admin'
                });
            }
        } catch (adminErr) {
            console.error('Error notifying admins on document upload:', adminErr);
        }

        res.json({
            message: 'Verification document uploaded successfully to Cloudinary. It is now under admin review.',
            user: updatedUser,
            documentUrl: uploadResult.secureUrl
        });
    } catch (error) {
        console.error('Verification Document Upload Error:', error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};
