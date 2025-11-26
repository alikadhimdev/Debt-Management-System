/**
 * Sync Service
 * Handles client synchronization with conflict resolution
 */

import AuditLog from '../models/AuditLog.js';
import Customer from '../models/Customer.js';
import Debt from '../models/Debt.js';
import Payment from '../models/Payment.js';
import { ConflictError, ValidationError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Push changes from client to server
 * Implements "Server Wins" conflict resolution
 */
export const pushChanges = async (companyId, changesets, userId) => {
    try {
        if (!Array.isArray(changesets) || changesets.length === 0) {
            throw new ValidationError('Changesets array is required');
        }

        const results = {
            applied: [],
            conflicts: []
        };

        for (const changeset of changesets) {
            const { entity, entityId, version, data } = changeset;

            try {
                let Model;
                switch (entity) {
                    case 'Customer':
                        Model = Customer;
                        break;
                    case 'Debt':
                        Model = Debt;
                        break;
                    case 'Payment':
                        Model = Payment;
                        break;
                    default:
                        throw new ValidationError(`Unknown entity type: ${entity}`);
                }

                // Fetch current server version
                const document = await Model.findOne({ _id: entityId, companyId });

                if (!document) {
                    results.conflicts.push({
                        entityId,
                        entity,
                        reason: 'Document not found on server',
                        serverVersion: null,
                        clientVersion: version
                    });
                    continue;
                }

                // Check version for optimistic locking
                if (document.version !== undefined && document.version !== version) {
                    // Version conflict - Server wins
                    results.conflicts.push({
                        entityId,
                        entity,
                        reason: 'Version mismatch',
                        serverVersion: document.version,
                        clientVersion: version,
                        serverData: document.toObject()
                    });

                    logger.warn(`Sync conflict for ${entity} ${entityId}: client v${version}, server v${document.version}`);
                    continue;
                }

                // Apply changes
                Object.assign(document, data);

                // Increment version if supported
                if (document.incrementVersion) {
                    document.incrementVersion();
                }

                await document.save();

                results.applied.push({
                    entityId,
                    entity,
                    newVersion: document.version
                });

            } catch (error) {
                results.conflicts.push({
                    entityId,
                    entity,
                    reason: error.message,
                    error: true
                });
            }
        }

        logger.info(`Sync push completed: ${results.applied.length} applied, ${results.conflicts.length} conflicts`);

        return results;
    } catch (error) {
        logger.error(`Sync push failed: ${error.message}`);
        throw error;
    }
};

/**
 * Get changes from server since a specific timestamp
 * Returns delta of all changes for client to sync
 */
export const getChanges = async (companyId, since, limit = 100) => {
    try {
        if (!since) {
            throw new ValidationError('Since timestamp is required');
        }

        const sinceDate = new Date(since);

        if (isNaN(sinceDate.getTime())) {
            throw new ValidationError('Invalid since timestamp');
        }

        // Fetch recent audit logs
        const auditLogs = await AuditLog.find({
            companyId,
            timestamp: { $gt: sinceDate }
        })
            .sort({ timestamp: 1 })
            .limit(limit)
            .lean();

        // Transform audit logs into change objects
        const changes = auditLogs.map(log => ({
            entity: log.entity,
            entityId: log.entityId,
            action: log.action,
            timestamp: log.timestamp,
            payload: log.payload
        }));

        logger.info(`Sync pull: returning ${changes.length} changes since ${sinceDate.toISOString()}`);

        return {
            since: sinceDate.toISOString(),
            changes,
            hasMore: changes.length >= limit,
            lastTimestamp: changes.length > 0 ? changes[changes.length - 1].timestamp : sinceDate
        };
    } catch (error) {
        logger.error(`Sync get changes failed: ${error.message}`);
        throw error;
    }
};

/**
 * Get full sync data for initial client setup
 */
export const getFullSync = async (companyId, entities = ['Customer', 'Debt', 'Payment']) => {
    try {
        const syncData = {};

        if (entities.includes('Customer')) {
            syncData.customers = await Customer.find({ companyId, isActive: true }).lean();
        }

        if (entities.includes('Debt')) {
            syncData.debts = await Debt.find({ companyId }).lean();
        }

        if (entities.includes('Payment')) {
            syncData.payments = await Payment.find({ companyId }).lean();
        }

        syncData.syncedAt = new Date().toISOString();

        logger.info(`Full sync completed for company ${companyId}`);

        return syncData;
    } catch (error) {
        logger.error(`Full sync failed: ${error.message}`);
        throw error;
    }
};

export default {
    pushChanges,
    getChanges,
    getFullSync
};
