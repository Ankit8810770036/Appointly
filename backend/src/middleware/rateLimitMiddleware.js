import rateLimit from 'express-rate-limit';

/**
 * Strict Rate Limiter for Authentication (Login, Register)
 * Prevents credential stuffing and brute force attacks.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per window
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    message: {
        message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    }
});

/**
 * Extra Strict Rate Limiter for OTP Generation & Verification
 * Prevents SMS gateway and EmailJS quota exhaustion and brute-forcing 6-digit OTPs.
 */
export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 8, // Limit each IP to 8 OTP requests per 10 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many OTP requests from this IP. Please wait 10 minutes before requesting again.'
    }
});

/**
 * General API Rate Limiter
 * Protects server resources from denial-of-service / scraping bursts.
 */
export const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // 120 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many requests. Please slow down.'
    }
});
