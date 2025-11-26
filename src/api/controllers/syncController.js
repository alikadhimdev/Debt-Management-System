/**
 * Sync Controller
 * Handles client synchronization endpoints
 */

import * as syncService from '../../services/syncService.js';
import logger from '../../utils/logger.js';

/**
 * POST /api/v1/sync/push
 * Push changes from client to server
 */
export const pushChanges = async (req, res, next) => {
    try {
        const { companyId, user } = req;
        const { changesets } = req.body;

        const result = await syncService.pushChanges(companyId, changesets, user.userId);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/sync/changes
 * Get changes from server since timestamp
 */
export const getChanges = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { since, limit } = req.query;

        const result = await syncService.getChanges(companyId, since, limit);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/sync/full
 * Get full sync data for initial client setup
 */
export const getFullSync = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { entities } = req.query;

        const result = await syncService.getFullSync(companyId, entities);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export default {
    pushChanges,
    getChanges,
    getFullSync
};
