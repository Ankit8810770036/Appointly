/**
 * Middleware to restrict access to ADMIN users only.
 * Must be used after the protect/auth middleware.
 */
export const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};
