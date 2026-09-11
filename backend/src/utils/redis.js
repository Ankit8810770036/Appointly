import Redis from 'ioredis';

let isConnected = false;
let redisClient = null;

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

try {
    redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
            // Try reconnecting up to 3 times before staying quiet in development
            if (times > 3) {
                return null; // Stop reconnecting if no Redis server exists
            }
            return Math.min(times * 1000, 3000);
        },
        enableOfflineQueue: false, // Immediately fail or fallback when disconnected
        lazyConnect: true
    });

    redisClient.connect()
        .then(() => {
            isConnected = true;
            console.log('[Redis] Connected successfully. Cache & Rate-Limiting enabled.');
        })
        .catch((err) => {
            isConnected = false;
            console.log(`[Redis] Notice: Redis not active (${err.message}). Using database fallback mode.`);
        });

    redisClient.on('connect', () => {
        isConnected = true;
    });

    redisClient.on('error', (err) => {
        isConnected = false;
    });

    redisClient.on('close', () => {
        isConnected = false;
    });
} catch (initErr) {
    console.warn('[Redis] Initialization note:', initErr.message);
}

/**
 * Check if Redis is currently connected and active
 */
export const isRedisReady = () => isConnected && redisClient?.status === 'ready';

/**
 * Retrieve cached JSON value by key
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export const getCache = async (key) => {
    if (!isRedisReady()) return null;
    try {
        const raw = await redisClient.get(key);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        return null;
    }
};

/**
 * Set cache value with TTL
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds - Default 300s (5 minutes)
 */
export const setCache = async (key, value, ttlSeconds = 300) => {
    if (!isRedisReady()) return false;
    try {
        const payload = JSON.stringify(value);
        if (ttlSeconds > 0) {
            await redisClient.set(key, payload, 'EX', ttlSeconds);
        } else {
            await redisClient.set(key, payload);
        }
        return true;
    } catch (err) {
        return false;
    }
};

/**
 * Delete key or keys matching pattern
 * @param {string} patternOrKey
 */
export const deleteCache = async (patternOrKey) => {
    if (!isRedisReady()) return false;
    try {
        if (patternOrKey.includes('*')) {
            const keys = await redisClient.keys(patternOrKey);
            if (keys.length > 0) {
                await redisClient.del(...keys);
            }
        } else {
            await redisClient.del(patternOrKey);
        }
        return true;
    } catch (err) {
        return false;
    }
};

export default redisClient;
