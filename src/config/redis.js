import Redis from 'ioredis';
import { Logger } from '../utils/logger.js';

let redisClient = null;

const initializeRedis = () => {
    // Check if Redis is enabled via environment variable
    if (process.env.REDIS_ENABLED !== 'true') {
        Logger.info('Redis is disabled by configuration');
        return null;
    }

    try {
        const client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times) => {
                // Stop retrying after 5 attempts
                if (times > 5) {
                    Logger.warn('Redis connection failed after 5 attempts, falling back to no-cache mode');
                    return null;
                }
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3
        });

        client.on('error', (err) => {
            Logger.error('Redis Client Error', err);
        });

        client.on('connect', () => {
            Logger.info('Redis Client Connected');
        });

        return client;
    } catch (error) {
        Logger.error('Failed to initialize Redis client', error);
        return null;
    }
};

// Initialize Redis or fallback object
redisClient = initializeRedis() || {
    get: async () => null,
    setex: async () => null,
    del: async () => null,
    isReady: false
};

export { redisClient }; 