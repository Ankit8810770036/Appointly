import express from 'express';
import { registerUser, loginUser, refreshToken, getMe, updateMe, forgotPassword, resetPassword, requestOTP, verifyOTP, googleLogin, sendSignupOTP, verifySignupOTP } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/register/send-otp', sendSignupOTP);
router.post('/register/verify-otp', verifySignupOTP);
router.post('/login', loginUser);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/request-otp', protect, requestOTP);
router.post('/verify-otp', protect, verifyOTP);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/google', googleLogin);

export default router;
