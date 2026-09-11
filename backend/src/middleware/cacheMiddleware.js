import { getCache, setCache } from '../utils/redis.js';

/**
 * Express Middleware for automatic Redis GET caching
 * @param {number} ttlSeconds - Cache TTL in seconds (default 300s = 5m)
 * @param {string} customPrefix - Optional custom prefix for the cache key
 */
export const cacheResponse = (ttlSeconds = 300, customPrefix = '') => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const prefix = customPrefix ? `${customPrefix}:` : 'cache:';
        const cacheKey = `${prefix}${req.originalUrl || req.url}`;

        try {
            const cachedData = await getCache(cacheKey);

            if (cachedData !== null) {
                res.setHeader('X-Cache', 'HIT');
                return res.status(200).json(cachedData);
            }

            res.setHeader('X-Cache', 'MISS');

            // Hook into res.json to capture response payload
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                // Only cache successful 200 responses
                if (res.statusCode >= 200 && res.statusCode < 300 && body) {
                    setCache(cacheKey, body, ttlSeconds).catch(() => {});
                }
                return originalJson(body);
            };

            next();
        } catch (err) {
            // Fallback cleanly to next handler without interrupting user request
            next();
        }
    };
};
