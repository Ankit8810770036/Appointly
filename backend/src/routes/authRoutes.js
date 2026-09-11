import express from 'express';
import { registerUser, loginUser, refreshToken, getMe, updateMe, forgotPassword, resetPassword, requestOTP, verifyOTP, googleLogin, sendSignupOTP, verifySignupOTP } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Public auth endpoints protected with rate limiters
router.post('/register', authLimiter, registerUser);
router.post('/register/send-otp', otpLimiter, sendSignupOTP);
router.post('/register/verify-otp', otpLimiter, verifySignupOTP);
router.post('/login', authLimiter, loginUser);
router.post('/refresh-token', authLimiter, refreshToken);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/reset-password', otpLimiter, resetPassword);
router.post('/google', authLimiter, googleLogin);

// Protected endpoints
router.post('/request-otp', protect, otpLimiter, requestOTP);
router.post('/verify-otp', protect, otpLimiter, verifyOTP);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

export default router;
