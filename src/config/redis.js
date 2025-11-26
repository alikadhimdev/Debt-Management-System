/**
 * Redis Configuration
 * Handles Redis client setup for idempotency and BullMQ job queues
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redisClient = null;

const connectRedis = async () => {
    try {
        const options = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB) || 0,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false
        };

        redisClient = new Redis(options);

        redisClient.on('connect', () => {
            logger.info('Redis connecting...');
        });

        redisClient.on('ready', () => {
            logger.info('Redis connected and ready');
        });

        redisClient.on('error', (err) => {
            logger.error(`Redis error: ${err.message}`);
        });

        redisClient.on('close', () => {
            logger.warn('Redis connection closed');
        });

        redisClient.on('reconnecting', () => {
            logger.info('Redis reconnecting...');
        });

        // Test connection
        await redisClient.ping();
        logger.info('Redis PING successful');

        return redisClient;
    } catch (error) {
        logger.error(`Error connecting to Redis: ${error.message}`);
        process.exit(1);
    }
};

const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis client not initialized. Call connectRedis() first.');
    }
    return redisClient;
};

const disconnectRedis = async () => {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger.info('Redis connection closed gracefully');
        } catch (error) {
            logger.error(`Error closing Redis connection: ${error.message}`);
            redisClient.disconnect();
        }
    }
};

export { connectRedis, getRedisClient, disconnectRedis };
