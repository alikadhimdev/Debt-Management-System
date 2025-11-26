/**
 * Tenant Isolation Middleware
 * Extracts companyId from authenticated user and makes it available
 * Works in conjunction with the Mongoose tenantIsolation plugin
 */

import { UnauthorizedError } from '../../utils/errorHandler.js';

/**
 * Middleware to enforce tenant isolation
 * Must be used after authentication middleware
 * Extracts companyId from req.user and makes it available for queries
 */
export const tenantIsolation = (req, res, next) => {
    try {
        // Ensure user is authenticated
        if (!req.user || !req.user.companyId) {
            throw new UnauthorizedError('Authentication required for tenant access');
        }

        // Extract and store companyId for easy access
        req.companyId = req.user.companyId;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Helper to set tenant context for Mongoose queries
 * This is used by services to automatically filter by companyId
 */
export const withTenantContext = (Model, companyId) => {
    return Model.setOptions({ companyId });
};

export default tenantIsolation;
