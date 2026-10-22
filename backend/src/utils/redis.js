import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
let redisClient = null;
let adapterType = 'NONE'; // 'UPSTASH_REST' | 'IOREDIS' | 'IN_MEMORY'

// In-memory fallback map: key -> { value, expiresAt }
const memoryStore = new Map();

// Periodic cleanup of expired memory keys
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memoryStore.entries()) {
        if (v.expiresAt && v.expiresAt <= now) {
            memoryStore.delete(k);
        }
    }
}, 30000);

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_URL = process.env.REDIS_URL;

// 1. Try Upstash Cloud Redis (REST API) if credentials are present
if (UPSTASH_URL && UPSTASH_TOKEN) {
    adapterType = 'UPSTASH_REST';
    
    // REST API helper
    const execUpstash = async (commandArray) => {
        const response = await fetch(UPSTASH_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${UPSTASH_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commandArray)
        });
        if (!response.ok) {
            throw new Error(`Upstash HTTP Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`Upstash Redis Error: ${data.error}`);
        }
        return data.result;
    };

    redisClient = {
        status: 'ready',
        async get(key) {
            return await execUpstash(['GET', key]);
        },
        async set(key, value, ...args) {
            // Support: set(key, value), set(key, value, 'EX', ttl), set(key, value, 'PX', ttlMs)
            const cmd = ['SET', key, value];
            if (args.length > 0) {
                cmd.push(...args.map(String));
            }
            return await execUpstash(cmd);
        },
        async del(...keys) {
            const flatKeys = keys.flat();
            if (flatKeys.length === 0) return 0;
            return await execUpstash(['DEL', ...flatKeys]);
        },
        async keys(pattern) {
            return (await execUpstash(['KEYS', pattern])) || [];
        },
        async expire(key, seconds) {
            return await execUpstash(['EXPIRE', key, String(seconds)]);
        },
        async ping() {
            return await execUpstash(['PING']);
        }
    };

    isConnected = true; // Upstash REST is stateless HTTP and immediately available

    // Verify initial connection in background
    redisClient.ping()
        .then(() => {
            console.log('[Redis] Connected to Upstash Cloud Redis successfully! Cache & Rate-Limiting active.');
        })
        .catch((err) => {
            isConnected = false;
            console.warn(`[Redis] Upstash connection check failed (${err.message}). Using database fallback mode.`);
        });

} else if (REDIS_URL || process.env.NODE_ENV === 'production') {
    // 2. Try TCP ioredis Client
    adapterType = 'IOREDIS';
    try {
        const url = REDIS_URL || 'redis://127.0.0.1:6379';
        redisClient = new Redis(url, {
            maxRetriesPerRequest: 1,
            retryStrategy: (times) => {
                if (times > 3) return null;
                return Math.min(times * 1000, 3000);
            },
            enableOfflineQueue: false,
            lazyConnect: true
        });

        redisClient.connect()
            .then(() => {
                isConnected = true;
                console.log('[Redis] Connected to TCP Redis server successfully. Cache enabled.');
            })
            .catch((err) => {
                isConnected = false;
                console.log(`[Redis] Notice: Redis not active (${err.message}). Using database fallback mode.`);
            });

        redisClient.on('connect', () => { isConnected = true; });
        redisClient.on('error', () => { isConnected = false; });
        redisClient.on('close', () => { isConnected = false; });
    } catch (initErr) {
        console.warn('[Redis] Initialization note:', initErr.message);
    }
} else {
    // 3. Fallback: In-Memory RAM Cache
    adapterType = 'IN_MEMORY';
    redisClient = {
        status: 'ready',
        async get(key) {
            const item = memoryStore.get(key);
            if (!item) return null;
            if (item.expiresAt && item.expiresAt <= Date.now()) {
                memoryStore.delete(key);
                return null;
            }
            return item.value;
        },
        async set(key, value, ...args) {
            let ttlMs = null;
            if (args[0] === 'EX' && args[1]) ttlMs = parseInt(args[1], 10) * 1000;
            if (args[0] === 'PX' && args[1]) ttlMs = parseInt(args[1], 10);
            memoryStore.set(key, {
                value: String(value),
                expiresAt: ttlMs ? Date.now() + ttlMs : null
            });
            return 'OK';
        },
        async del(...keys) {
            let count = 0;
            for (const k of keys.flat()) {
                if (memoryStore.delete(k)) count++;
            }
            return count;
        },
        async keys(pattern) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            const result = [];
            const now = Date.now();
            for (const [k, v] of memoryStore.entries()) {
                if (v.expiresAt && v.expiresAt <= now) {
                    memoryStore.delete(k);
                    continue;
                }
                if (regex.test(k)) result.push(k);
            }
            return result;
        },
        async expire(key, seconds) {
            const item = memoryStore.get(key);
            if (!item) return 0;
            item.expiresAt = Date.now() + Number(seconds) * 1000;
            return 1;
        },
        async ping() {
            return 'PONG';
        }
    };
    isConnected = true;
}

/**
 * Check if Redis is currently connected and active
 */
export const isRedisReady = () => isConnected;

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
            if (keys && keys.length > 0) {
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
