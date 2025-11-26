/**
 * Tenant Isolation Plugin for Mongoose
 * Automatically injects companyId into all queries to enforce multi-tenancy
 */

import { UnauthorizedError } from '../../utils/errorHandler.js';

/**
 * Mongoose plugin to enforce tenant isolation
 * Must be applied to all models that require tenant scoping
 */
export const tenantIsolationPlugin = (schema, options = {}) => {
    // Add companyId field if not already present
    if (!schema.path('companyId')) {
        schema.add({
            companyId: {
                type: schema.constructor.Types.ObjectId,
                required: true,
                ref: 'Company',
                index: true
            }
        });
    }

    // Middleware to inject companyId into queries
    const injectCompanyId = function (next) {
        const companyId = this.getOptions().companyId;

        if (!companyId) {
            // If no companyId in options, this might be a system operation
            // Allow it to proceed but log a warning
            if (process.env.NODE_ENV !== 'test') {
                console.warn('⚠️  Query without companyId filter - potential security issue');
            }
            return next();
        }

        // Inject companyId into the query filter
        const filter = this.getFilter();
        if (!filter.companyId) {
            this.setQuery({ ...filter, companyId });
        }

        next();
    };

    // Apply middleware to query operations
    schema.pre('find', injectCompanyId);
    schema.pre('findOne', injectCompanyId);
    schema.pre('findOneAndUpdate', injectCompanyId);
    schema.pre('findOneAndDelete', injectCompanyId);
    schema.pre('findOneAndReplace', injectCompanyId);
    schema.pre('updateOne', injectCompanyId);
    schema.pre('updateMany', injectCompanyId);
    schema.pre('deleteOne', injectCompanyId);
    schema.pre('deleteMany', injectCompanyId);
    schema.pre('count', injectCompanyId);
    schema.pre('countDocuments', injectCompanyId);

    // Add instance method to verify tenant ownership
    schema.methods.verifyTenant = function (companyId) {
        if (this.companyId.toString() !== companyId.toString()) {
            throw new UnauthorizedError('Access denied to this resource');
        }
        return true;
    };

    // Add static method to set tenant context for queries
    schema.statics.withTenant = function (companyId) {
        return this.setOptions({ companyId });
    };
};

export default tenantIsolationPlugin;
