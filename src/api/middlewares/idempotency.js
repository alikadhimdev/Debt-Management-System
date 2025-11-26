/**
 * Idempotency Middleware
 * Prevents duplicate processing of requests using Redis-backed idempotency keys
 */

import { getRedisClient } from '../../config/redis.js';
import { ValidationError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';
import { IDEMPOTENCY_KEY_PREFIX, IDEMPOTENCY_TTL_SECONDS } from '../../config/constants.js';

/**
 * Validate idempotency key format (should be a UUID)
 */
const isValidIdempotencyKey = (key) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(key);
};

/**
 * Middleware to handle idempotency
 * Checks Redis for existing response and returns cached result if found
 * Otherwise continues to controller and caches response after success
 */
export const idempotency = async (req, res, next) => {
    try {
        // Extract idempotency key from header
        const idempotencyKey = req.headers['idempotency-key'];

        if (!idempotencyKey) {
            throw new ValidationError('Idempotency-Key header is required for this operation');
        }

        // Validate key format
        if (!isValidIdempotencyKey(idempotencyKey)) {
            throw new ValidationError('Idempotency-Key must be a valid UUID');
        }

        const redis = getRedisClient();
        const redisKey = `${IDEMPOTENCY_KEY_PREFIX}${idempotencyKey}`;

        // Check if we've seen this key before
        const cachedResponse = await redis.get(redisKey);

        if (cachedResponse) {
            // Found cached response - return it immediately
            const cached = JSON.parse(cachedResponse);
            logger.info(`Idempotent request detected: ${idempotencyKey}`);

            return res.status(cached.status).json(cached.body);
        }

        // Store idempotency key in request for later use
        req.idempotencyKey = idempotencyKey;

        // Override res.json to cache successful responses
        const originalJson = res.json.bind(res);

        res.json = function (body) {
            // Only cache successful responses (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const responseToCache = {
                    status: res.statusCode,
                    body: body
                };

                // Cache in Redis with TTL
                redis.setex(
                    redisKey,
                    IDEMPOTENCY_TTL_SECONDS,
                    JSON.stringify(responseToCache)
                ).catch(err => {
                    // Don't fail the request if caching fails
                    logger.error(`Failed to cache idempotency response: ${err.message}`);
                });
            }

            return originalJson(body);
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional idempotency - doesn't require the key but uses it if provided
 */
export const optionalIdempotency = async (req, res, next) => {
    try {
        const idempotencyKey = req.headers['idempotency-key'];

        if (!idempotencyKey) {
            return next(); // No key provided, continue without idempotency
        }

        // Has key, apply idempotency
        await idempotency(req, res, next);
    } catch (error) {
        next(error);
    }
};

export default idempotency;
