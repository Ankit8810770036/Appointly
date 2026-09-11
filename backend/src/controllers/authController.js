import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail } from '../utils/emailService.js';
import smsService from '../utils/smsService.js';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '30d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

export const generateAccessToken = (id) => {
    return jwt.sign({ id, tokenType: 'access' }, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
};

export const generateRefreshToken = (id) => {
    return jwt.sign({ id, tokenType: 'refresh' }, REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        const decoded = jwt.verify(token, REFRESH_SECRET);

        if (decoded.tokenType && decoded.tokenType !== 'refresh') {
            return res.status(401).json({ message: 'Invalid refresh token type' });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, name: true, email: true, role: true }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const newAccessToken = generateAccessToken(user.id);
        const newRefreshToken = generateRefreshToken(user.id);

        res.json({
            token: newAccessToken,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Refresh token expired, please log in again' });
        }
        return res.status(401).json({ message: 'Invalid refresh token' });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const {
            name, email, password, role,
            phone, location, streetAddress, city, state, zipCode, country,
            latitude, longitude,
            bio, specialty
        } = req.body;

        const normalizedEmail = email?.toLowerCase().trim();
        const normalizedPhone = phone?.trim();

        if (!normalizedEmail) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const userExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Validation for Provider
        if (role === 'PROVIDER' || role === 'provider') {
            if (!normalizedPhone || !location || !specialty || !bio || bio.length < 50) {
                return res.status(400).json({ message: 'All provider details (phone, location, specialty, bio min 50 chars) are required' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user. If role is PROVIDER, also create an empty ProviderProfile
        const userRole = role === 'PROVIDER' || role === 'provider' ? 'PROVIDER' : 'CLIENT';

        // Check if phone/email verified in SignupOtp table
        const emailVerified = await prisma.signupOtp.findUnique({
            where: { identifier_type: { identifier: normalizedEmail, type: 'EMAIL' } }
        });
        const phoneVerified = normalizedPhone ? await prisma.signupOtp.findUnique({
            where: { identifier_type: { identifier: normalizedPhone, type: 'PHONE' } }
        }) : null;

        if (!emailVerified?.verified || (normalizedPhone && !phoneVerified?.verified)) {
            return res.status(400).json({ message: 'Email and phone must be verified before registration' });
        }

        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                password: hashedPassword,
                role: userRole,
                phone: normalizedPhone || null,
                location: location || null,
                streetAddress: streetAddress || null,
                city: city || null,
                state: state || null,
                zipCode: zipCode || null,
                country: country || null,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                isEmailVerified: true,
                isPhoneVerified: Boolean(normalizedPhone && phoneVerified?.verified),
                providerProfile: userRole === 'PROVIDER' ? {
                    create: {
                        specialty: specialty || 'General Professional',
                        about: bio || 'Hello! I am a new professional on Appointly.',
                        phone: normalizedPhone || null,
                        location: location || null
                    }
                } : undefined
            },
            include: {
                providerProfile: {
                    include: {
                        services: true
                    }
                }
            }
        });

        // Cleanup OTPs
        await prisma.signupOtp.deleteMany({
            where: { identifier: { in: [email, phone] } }
        });

        if (user) {
            // Send Welcome Email (Async, don't block response)
            sendWelcomeEmail(user).catch(err => console.error('Welcome email failed:', err));

            res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
                streetAddress: user.streetAddress,
                city: user.city,
                state: user.state,
                zipCode: user.zipCode,
                providerProfile: user.providerProfile,
                token: generateAccessToken(user.id),
                accessToken: generateAccessToken(user.id),
                refreshToken: generateRefreshToken(user.id),
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
        const normalizedEmail = email?.toLowerCase().trim();

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
                providerProfile: {
                    include: {
                        services: true
                    }
                }
            }
        });

        if (user && (await bcrypt.compare(password, user.password))) {
            // Role validation (optional check if role is passed from frontend)
            if (role && user.role !== 'ADMIN') {
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
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
                streetAddress: user.streetAddress,
                city: user.city,
                state: user.state,
                zipCode: user.zipCode,
                providerProfile: user.providerProfile,
                token: generateAccessToken(user.id),
                accessToken: generateAccessToken(user.id),
                refreshToken: generateRefreshToken(user.id),
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
                isEmailVerified: true,
                isPhoneVerified: true,
                streetAddress: true,
                city: true,
                state: true,
                zipCode: true,
                providerProfile: {
                    include: {
                        services: true
                    }
                }
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
        const { name, phone, location, streetAddress, city, state, zipCode, country, latitude, longitude } = req.body;
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                name, phone, location, streetAddress, city, state, zipCode, country,
                latitude: latitude ? parseFloat(latitude) : undefined,
                longitude: longitude ? parseFloat(longitude) : undefined
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isEmailVerified: true,
                isPhoneVerified: true,
                streetAddress: true,
                city: true,
                state: true,
                zipCode: true,
                providerProfile: {
                    include: {
                        services: true
                    }
                }
            }
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
        const normalizedEmail = email?.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

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
        const normalizedEmail = email?.toLowerCase().trim();

        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const hashedToken = crypto.createHash('sha256').update(otp).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                email: normalizedEmail,
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

// @desc    Request OTP for email or phone verification
// @route   POST /api/auth/request-otp
// @access  Private
export const requestOTP = async (req, res) => {
    try {
        const { type } = req.body; // 'email' or 'phone'
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedToken = crypto.createHash('sha256').update(otp).digest('hex');
        const expiry = new Date(Date.now() + 2 * 60 * 1000);

        if (type === 'email') {
            await prisma.user.update({
                where: { id: user.id },
                data: { emailOtp: hashedToken, otpExpires: expiry }
            });
            await sendVerificationEmail(user, otp);
            res.json({ message: 'Verification code sent to your email' });
        } else if (type === 'phone') {
            if (!user.phone) {
                return res.status(400).json({ message: 'Please add a phone number first' });
            }
            await prisma.user.update({
                where: { id: user.id },
                data: { phoneOtp: hashedToken, otpExpires: expiry }
            });
            await smsService.sendOTP(user.phone, otp);
            res.json({ message: 'Verification code sent to your phone' });
        } else {
            res.status(400).json({ message: 'Invalid verification type' });
        }
    } catch (error) {
        console.error('OTP Request Error:', error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Verify OTP for email or phone
// @route   POST /api/auth/verify-otp
// @access  Private
export const verifyOTP = async (req, res) => {
    try {
        const { type, otp } = req.body;
        const hashedToken = crypto.createHash('sha256').update(otp).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                id: req.user.id,
                otpExpires: { gt: new Date() },
                OR: [
                    { emailOtp: hashedToken },
                    { phoneOtp: hashedToken }
                ]
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        if (type === 'email' && user.emailOtp === hashedToken) {
            await prisma.user.update({
                where: { id: user.id },
                data: { isEmailVerified: true, emailOtp: null, otpExpires: null }
            });
            res.json({ message: 'Email verified successfully!' });
        } else if (type === 'phone' && user.phoneOtp === hashedToken) {
            await prisma.user.update({
                where: { id: user.id },
                data: { isPhoneVerified: true, phoneOtp: null, otpExpires: null }
            });
            res.json({ message: 'Phone number verified successfully!' });
        } else {
            res.status(400).json({ message: 'Verification failed' });
        }
    } catch (error) {
        console.error('OTP Verification Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Send OTP for Signup (Public)
// @route   POST /api/auth/register/send-otp
// @access  Public
export const sendSignupOTP = async (req, res) => {
    try {
        const { identifier, type } = req.body; // email or phone, type=EMAIL/PHONE
        if (!identifier) {
            return res.status(400).json({ message: 'Identifier (email or phone) is required' });
        }

        const normalizedIdentifier = type === 'EMAIL' ? identifier.toLowerCase().trim() : identifier.trim();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        // Clean up expired OTPs asynchronously
        prisma.signupOtp.deleteMany({
            where: { expiresAt: { lt: new Date() } }
        }).catch(() => {});

        await prisma.signupOtp.upsert({
            where: { identifier_type: { identifier: normalizedIdentifier, type } },
            update: { otp: hashedOtp, expiresAt, verified: false },
            create: { identifier: normalizedIdentifier, type, otp: hashedOtp, expiresAt }
        });

        if (type === 'EMAIL') {
            await sendVerificationEmail({ email: normalizedIdentifier, name: 'Future User' }, otp);
        } else {
            await smsService.sendOTP(normalizedIdentifier, otp);
        }

        res.json({ message: `OTP sent to your ${type.toLowerCase()}` });
    } catch (error) {
        console.error('Signup OTP Send Error:', error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
};

// @desc    Verify OTP for Signup (Public)
// @route   POST /api/auth/register/verify-otp
// @access  Public
export const verifySignupOTP = async (req, res) => {
    try {
        const { identifier, type, otp } = req.body;
        if (!identifier || !otp) {
            return res.status(400).json({ message: 'Identifier and OTP are required' });
        }

        const normalizedIdentifier = type === 'EMAIL' ? identifier.toLowerCase().trim() : identifier.trim();
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

        const record = await prisma.signupOtp.findUnique({
            where: { identifier_type: { identifier: normalizedIdentifier, type } }
        });

        if (!record || record.expiresAt < new Date() || record.otp !== hashedOtp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        await prisma.signupOtp.update({
            where: { id: record.id },
            data: { verified: true }
        });

        res.json({ message: `${type.toLowerCase()} verified successfully!` });
    } catch (error) {
        console.error('Signup OTP Verify Error:', error);
        res.status(500).json({ message: 'Verification failed' });
    }
};

// @desc    Google Login
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req, res) => {
    try {
        const { credential, role } = req.body;

        if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
            return res.status(500).json({ message: 'Google Login is not configured on the server. Please provide a Client ID.' });
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(401).json({ message: 'Invalid Google token' });
        }

        const { email, name, sub: googleId, picture } = payload;

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email },
            include: {
                providerProfile: {
                    include: {
                        services: true
                    }
                }
            }
        });

        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            // Register new user via Google
            const userRole = role === 'PROVIDER' || role === 'provider' ? 'PROVIDER' : 'CLIENT';

            // Create user with a random password since it's required by our schema
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: userRole,
                    isEmailVerified: true, // Google accounts are verified
                    providerProfile: userRole === 'PROVIDER' ? {
                        create: {
                            specialty: 'General Professional',
                            about: 'Hello! I am a new professional on Appointly.',
                        }
                    } : undefined
                },
                include: {
                    providerProfile: {
                        include: {
                            services: true
                        }
                    }
                }
            });

            // Send Welcome Email
            sendWelcomeEmail(user).catch(err => console.error('Welcome email failed:', err));
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isNewUser,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            providerProfile: user.providerProfile,
            token: generateAccessToken(user.id),
            accessToken: generateAccessToken(user.id),
            refreshToken: generateRefreshToken(user.id),
        });
    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(401).json({ message: 'Google authentication failed' });
    }
};
