import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import crypto from 'crypto';

// Helper to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, phone, location, bio, specialty } = req.body;

        const userExists = await prisma.user.findUnique({ where: { email } });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Validation for Provider
        if (role === 'PROVIDER' || role === 'provider') {
            if (!phone || !location || !specialty || !bio || bio.length < 50) {
                return res.status(400).json({ message: 'All provider details (phone, location, specialty, bio min 50 chars) are required' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user. If role is PROVIDER, also create an empty ProviderProfile
        const userRole = role === 'PROVIDER' || role === 'provider' ? 'PROVIDER' : 'CLIENT';

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: userRole,
                phone: phone || null,
                location: location || null,
                providerProfile: userRole === 'PROVIDER' ? {
                    create: {
                        specialty: specialty || 'General Professional',
                        about: bio || 'Hello! I am a new professional on Appointly.',
                        phone: phone || null,
                        location: location || null
                    }
                } : undefined
            },
            include: {
                providerProfile: true
            }
        });

        if (user) {
            // Send Welcome Email (Async, don't block response)
            sendWelcomeEmail(user).catch(err => console.error('Welcome email failed:', err));

            res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                location: user.location,
                providerProfile: user.providerProfile,
                token: generateToken(user.id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: { providerProfile: true }
        });

        if (user && (await bcrypt.compare(password, user.password))) {
            // Role validation (optional check if role is passed from frontend)
            if (role) {
                const requestedRole = role.toUpperCase();
                if (user.role !== requestedRole) {
                    return res.status(401).json({
                        message: `This account is registered as a ${user.role === 'PROVIDER' ? 'Provider' : 'Client'}. Please switch tabs.`
                    });
                }
            }

            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                location: user.location,
                providerProfile: user.providerProfile,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                location: true,
                providerProfile: true
            }
        });

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user profile (name)
// @route   PUT /api/auth/me
// @access  Private
export const updateMe = async (req, res) => {
    try {
        const { name, phone, location } = req.body;
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: { name, phone, location },
            select: { id: true, name: true, email: true, role: true, phone: true, location: true, providerProfile: true }
        });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Forgot password - generate token and send email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        // Always return 200 — never reveal whether the email exists (prevents enumeration attacks)
        if (!user) {
            return res.status(200).json({ message: 'If this email is registered, a password reset link has been sent.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedToken = crypto.createHash('sha256').update(otp).digest('hex');

        // Expiry (2 minutes)
        const expiry = new Date(Date.now() + 2 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: expiry
            }
        });

        try {
            await sendPasswordResetEmail(user, otp);
            res.json({ message: 'OTP sent to your email' });
        } catch (err) {
            // Clean up if email fails
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordToken: null,
                    resetPasswordExpires: null
                }
            });
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const hashedToken = crypto.createHash('sha256').update(otp).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                email,
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { gt: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(password, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: newHashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });

        res.json({ message: 'Password reset successful. You can now log in.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
