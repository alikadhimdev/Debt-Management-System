/**
 * Aging Update Job
 * Updates aging buckets for all debts nightly
 */

import Debt from '../models/Debt.js';
import logger from '../utils/logger.js';

/**
 * Process aging bucket updates for all companies or a specific company
 */
export const processAgingUpdate = async (job) => {
    try {
        const { companyId } = job.data || {};

        logger.info(`Starting aging bucket update job${companyId ? ` for company ${companyId}` : ''}`);

        const startTime = Date.now();
        const result = await Debt.updateAgingBuckets(companyId);
        const duration = Date.now() - startTime;

        logger.info(
            `Aging bucket update completed: ${result.modifiedCount || 0} debts updated in ${duration}ms`
        );

        return {
            success: true,
            modifiedCount: result.modifiedCount || 0,
            duration,
            companyId: companyId || 'all'
        };
    } catch (error) {
        logger.error(`Aging bucket update failed: ${error.message}`);
        throw error;
    }
};

/**
 * Schedule aging updates (called by worker)
 */
export const scheduleAgingUpdates = async (queue) => {
    try {
        // Add job to run daily at 1 AM
        await queue.add(
            'update-aging-buckets',
            {},
            {
                repeat: {
                    pattern: '0 1 * * *', // Cron: Every day at 1 AM
                    tz: 'UTC'
                },
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 60000 // 1 minute
                }
            }
        );

        logger.info('Aging update job scheduled for daily execution at 1 AM UTC');
    } catch (error) {
        logger.error(`Failed to schedule aging update job: ${error.message}`);
    }
};

export default {
    processAgingUpdate,
    scheduleAgingUpdates
};
