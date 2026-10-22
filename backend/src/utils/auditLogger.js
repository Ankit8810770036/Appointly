import prisma from '../prisma.js';

/**
 * Creates an immutable audit log entry for admin operations.
 * 
 * @param {object} params
 * @param {string} params.adminId - ID of admin user performing the action
 * @param {string} params.action - e.g. "SPECIALIST_VERIFIED", "SPECIALIST_REJECTED", "USER_DELETED", "APPOINTMENT_OVERRIDE", "COMPLAINT_RESOLVED", "REVIEW_DELETED"
 * @param {string} params.targetType - "SPECIALIST" | "USER" | "APPOINTMENT" | "COMPLAINT" | "REVIEW"
 * @param {string} [params.targetId] - Target entity identifier
 * @param {object|string} [params.details] - Structured metadata or details of the change
 * @param {string} [params.reason] - Admin justification / reason
 * @param {string} [params.ipAddress] - Request IP address
 */
export const logAdminActivity = async ({
    adminId,
    action,
    targetType,
    targetId = null,
    details = null,
    reason = null,
    ipAddress = null
}) => {
    try {
        if (!adminId || !action || !targetType) {
            console.warn('[AuditLogger] Missing required audit log fields (adminId, action, targetType)');
            return null;
        }

        const detailsStr = typeof details === 'object' && details !== null
            ? JSON.stringify(details)
            : (details ? String(details) : null);

        const logEntry = await prisma.auditLog.create({
            data: {
                adminId,
                action: action.toUpperCase(),
                targetType: targetType.toUpperCase(),
                targetId: targetId ? String(targetId) : null,
                details: detailsStr,
                reason: reason ? String(reason).trim() : null,
                ipAddress: ipAddress ? String(ipAddress) : null
            }
        });

        return logEntry;
    } catch (err) {
        console.error('[AuditLogger] Failed to create audit log entry:', err);
        return null;
    }
};

/**
 * Fetches paginated audit logs with search and filtering
 */
export const fetchAuditLogs = async ({
    page = 1,
    limit = 10,
    action,
    targetType,
    search
}) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (action && action.toUpperCase() !== 'ALL') {
        where.action = action.toUpperCase();
    }

    if (targetType && targetType.toUpperCase() !== 'ALL') {
        where.targetType = targetType.toUpperCase();
    }

    if (search && search.trim()) {
        const cleanSearch = search.trim();
        where.OR = [
            { reason: { contains: cleanSearch, mode: 'insensitive' } },
            { targetId: { contains: cleanSearch, mode: 'insensitive' } },
            { details: { contains: cleanSearch, mode: 'insensitive' } },
            { action: { contains: cleanSearch, mode: 'insensitive' } },
            { admin: { name: { contains: cleanSearch, mode: 'insensitive' } } },
            { admin: { email: { contains: cleanSearch, mode: 'insensitive' } } }
        ];
    }

    const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
            include: {
                admin: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                        role: true
                    }
                }
            }
        })
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
        logs,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages
        }
    };
};
