import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

export const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, name: true, email: true, role: true }
        });

        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'jwt expired' });
        }
        console.error(error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

/**
 * Middleware to enforce Role-Based Access Control (RBAC)
 * @param  {...string} allowedRoles Roles allowed to access the route (e.g. 'CLIENT', 'PROVIDER', 'ADMIN')
 */
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const userRole = req.user.role ? req.user.role.toUpperCase() : '';
        const uppercaseAllowed = allowedRoles.map(r => r.toUpperCase());

        if (!uppercaseAllowed.includes(userRole)) {
            return res.status(403).json({
                message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};

