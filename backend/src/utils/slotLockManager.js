import redisClient, { isRedisReady } from './redis.js';
import { getIo } from './socket.js';

// In-Memory Fallback Map: key -> { userId, providerId, date, time, expiresAt, timeoutId }
const inMemoryHolds = new Map();

/**
 * Format standard slot key
 */
const getSlotKey = (providerId, date, time) => `slot_hold:${providerId}:${date}:${time}`;

/**
 * Clean up expired in-memory holds periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, hold] of inMemoryHolds.entries()) {
        if (hold.expiresAt <= now) {
            if (hold.timeoutId) clearTimeout(hold.timeoutId);
            inMemoryHolds.delete(key);
            console.log(`[SlotHold] In-Memory expired hold cleared for ${key}`);
        }
    }
}, 30000);

/**
 * Broadcast slot hold status via Socket.io
 */
const broadcastSlotHoldChange = (providerId, date, time, isHeld, expiresAt = null, userId = null) => {
    try {
        const io = getIo();
        if (io) {
            io.emit('slot_hold_changed', {
                providerId,
                date,
                time,
                isHeld,
                expiresAt,
                userId
            });
        }
    } catch (err) {
        console.warn('[SlotHold] Socket broadcast warning:', err.message);
    }
};

/**
 * Acquire or refresh a 5-minute temporary slot hold
 * @param {Object} params
 * @param {string} params.providerId
 * @param {string} params.date - 'YYYY-MM-DD'
 * @param {string} params.time - 'HH:MM'
 * @param {string} params.userId
 * @param {number} [params.ttlSeconds=300] - 5 minutes default
 */
export const holdSlot = async ({ providerId, date, time, userId, ttlSeconds = 300 }) => {
    const key = getSlotKey(providerId, date, time);
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    // 1. Check Redis if available
    if (isRedisReady()) {
        try {
            const raw = await redisClient.get(key);
            if (raw) {
                const existing = JSON.parse(raw);
                if (existing.userId && existing.userId !== userId && existing.expiresAt > now) {
                    const remainingSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
                    return {
                        success: false,
                        isHeld: true,
                        heldByOther: true,
                        remainingSeconds,
                        message: `This time slot is temporarily held by another client. Please check back in ${Math.ceil(remainingSeconds / 60)} minute(s).`
                    };
                }
            }

            // Set Redis Key with TTL
            const payload = JSON.stringify({ userId, providerId, date, time, expiresAt });
            await redisClient.set(key, payload, 'EX', ttlSeconds);

            broadcastSlotHoldChange(providerId, date, time, true, expiresAt, userId);
            return {
                success: true,
                isHeld: true,
                heldByMe: true,
                expiresAt,
                remainingSeconds: ttlSeconds
            };
        } catch (redisErr) {
            console.warn('[SlotHold] Redis error, switching to in-memory hold:', redisErr.message);
        }
    }

    // 2. In-Memory Store
    const existing = inMemoryHolds.get(key);
    if (existing && existing.expiresAt > now && existing.userId !== userId) {
        const remainingSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
        return {
            success: false,
            isHeld: true,
            heldByOther: true,
            remainingSeconds,
            message: `This time slot is temporarily held by another client. Please check back in ${Math.ceil(remainingSeconds / 60)} minute(s).`
        };
    }

    if (existing?.timeoutId) {
        clearTimeout(existing.timeoutId);
    }

    const timeoutId = setTimeout(() => {
        inMemoryHolds.delete(key);
        broadcastSlotHoldChange(providerId, date, time, false);
    }, ttlSeconds * 1000);

    inMemoryHolds.set(key, {
        userId,
        providerId,
        date,
        time,
        expiresAt,
        timeoutId
    });

    broadcastSlotHoldChange(providerId, date, time, true, expiresAt, userId);

    return {
        success: true,
        isHeld: true,
        heldByMe: true,
        expiresAt,
        remainingSeconds: ttlSeconds
    };
};

/**
 * Release an active slot hold
 */
export const releaseSlotHold = async ({ providerId, date, time, userId, force = false }) => {
    const key = getSlotKey(providerId, date, time);

    if (isRedisReady()) {
        try {
            const raw = await redisClient.get(key);
            if (raw) {
                const existing = JSON.parse(raw);
                if (force || existing.userId === userId) {
                    await redisClient.del(key);
                    broadcastSlotHoldChange(providerId, date, time, false);
                }
            }
        } catch (err) {
            console.warn('[SlotHold] Redis delete error:', err.message);
        }
    }

    const existing = inMemoryHolds.get(key);
    if (existing) {
        if (force || existing.userId === userId) {
            if (existing.timeoutId) clearTimeout(existing.timeoutId);
            inMemoryHolds.delete(key);
            broadcastSlotHoldChange(providerId, date, time, false);
        }
    }

    return { success: true };
};

/**
 * Inspect slot hold status
 */
export const getSlotHoldStatus = async ({ providerId, date, time, userId }) => {
    const key = getSlotKey(providerId, date, time);
    const now = Date.now();

    if (isRedisReady()) {
        try {
            const raw = await redisClient.get(key);
            if (raw) {
                const existing = JSON.parse(raw);
                if (existing.expiresAt > now) {
                    const remainingSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
                    return {
                        isHeld: true,
                        heldByMe: existing.userId === userId,
                        expiresAt: existing.expiresAt,
                        remainingSeconds
                    };
                }
            }
        } catch (err) {
            console.warn('[SlotHold] Redis get error:', err.message);
        }
    }

    const existing = inMemoryHolds.get(key);
    if (existing && existing.expiresAt > now) {
        const remainingSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
        return {
            isHeld: true,
            heldByMe: existing.userId === userId,
            expiresAt: existing.expiresAt,
            remainingSeconds
        };
    }

    return {
        isHeld: false,
        heldByMe: false,
        expiresAt: null,
        remainingSeconds: 0
    };
};

/**
 * Get all active holds for a provider on a specific date
 */
export const getActiveHoldsForProvider = async (providerId, date, currentUserId = null) => {
    const holds = {};
    const now = Date.now();

    // Check in-memory holds
    for (const [key, hold] of inMemoryHolds.entries()) {
        if (hold.providerId === providerId && hold.date === date && hold.expiresAt > now) {
            holds[hold.time] = {
                isHeld: true,
                heldByMe: currentUserId ? hold.userId === currentUserId : false,
                expiresAt: hold.expiresAt,
                remainingSeconds: Math.max(1, Math.ceil((hold.expiresAt - now) / 1000))
            };
        }
    }

    // Check Redis holds if available
    if (isRedisReady()) {
        try {
            const pattern = `slot_hold:${providerId}:${date}:*`;
            const keys = await redisClient.keys(pattern);
            for (const key of keys) {
                const raw = await redisClient.get(key);
                if (raw) {
                    const item = JSON.parse(raw);
                    if (item.expiresAt > now) {
                        holds[item.time] = {
                            isHeld: true,
                            heldByMe: currentUserId ? item.userId === currentUserId : false,
                            expiresAt: item.expiresAt,
                            remainingSeconds: Math.max(1, Math.ceil((item.expiresAt - now) / 1000))
                        };
                    }
                }
            }
        } catch (err) {
            console.warn('[SlotHold] Redis query pattern error:', err.message);
        }
    }

    return holds;
};
