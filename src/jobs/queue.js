/**
 * Job Queue Setup
 * Configures BullMQ for background job processing
 */

import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

// Queue for aging bucket updates
export const agingQueue = new Queue('aging-updates', {
    connection: getRedisClient()
});

// Queue for reminder notifications
export const reminderQueue = new Queue('debt-reminders', {
    connection: getRedisClient()
});

// Queue for report generation
export const reportQueue = new Queue('report-generation', {
    connection: getRedisClient()
});

// Event listeners for queue monitoring
agingQueue.on('error', (error) => {
    logger.error(`Aging queue error: ${error.message}`);
});

reminderQueue.on('error', (error) => {
    logger.error(`Reminder queue error: ${error.message}`);
});

reportQueue.on('error', (error) => {
    logger.error(`Report queue error: ${error.message}`);
});

logger.info('Job queues initialized');

export default {
    agingQueue,
    reminderQueue,
    reportQueue
};
