/**
 * BullMQ Worker
 * Processes background jobs from queues
 */

import { Worker } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { processAgingUpdate, scheduleAgingUpdates } from './agingUpdateJob.js';
import { agingQueue } from './queue.js';
import logger from '../utils/logger.js';

/**
 * Worker for aging updates
 */
const agingWorker = new Worker(
    'aging-updates',
    async (job) => {
        return await processAgingUpdate(job);
    },
    {
        connection: getRedisClient(),
        concurrency: 5,
        limiter: {
            max: 10,
            duration: 1000
        }
    }
);

// Event listeners
agingWorker.on('completed', (job, result) => {
    logger.info(`Job ${job.id} completed:`, result);
});

agingWorker.on('failed', (job, error) => {
    logger.error(`Job ${job.id} failed: ${error.message}`);
});

agingWorker.on('error', (error) => {
    logger.error(`Worker error: ${error.message}`);
});

/**
 * Initialize workers and schedule recurring jobs
 */
export const initializeWorkers = async () => {
    try {
        logger.info('Initializing background workers...');

        // Schedule recurring jobs
        await scheduleAgingUpdates(agingQueue);

        logger.info('Background workers initialized successfully');
    } catch (error) {
        logger.error(`Failed to initialize workers: ${error.message}`);
        throw error;
    }
};

/**
 * Gracefully shutdown workers
 */
export const shutdownWorkers = async () => {
    try {
        logger.info('Shutting down workers...');

        await agingWorker.close();

        logger.info('Workers shut down successfully');
    } catch (error) {
        logger.error(`Error shutting down workers: ${error.message}`);
    }
};

export default {
    initializeWorkers,
    shutdownWorkers
};
