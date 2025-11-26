/**
 * Customer Service
 * Handles customer management operations
 */

import Customer from '../models/Customer.js';
import AuditLog from '../models/AuditLog.js';
import * as decimalMath from '../utils/decimalMath.js';
import { NotFoundError, ValidationError } from '../utils/errorHandler.js';
import { AUDIT_ACTIONS } from '../config/constants.js';
import { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Get all customers with filtering and pagination
 */
export const getCustomers = async (companyId, filters = {}, pagination = {}) => {
    try {
        const {
            search,
            isActive,
            minDebt,
            maxDebt
        } = filters;

        const {
            page = DEFAULT_PAGE,
            limit = Math.min(pagination.limit || DEFAULT_LIMIT, MAX_LIMIT),
            sortBy = 'name',
            order = 'asc'
        } = pagination;

        const query = { companyId };

        // Filter by active status
        if (isActive !== undefined) {
            query.isActive = isActive;
        } else {
            query.isActive = true; // Default to active customers only
        }

        // Search by name or contact
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'contact.value': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

        const [customers, total] = await Promise.all([
            Customer.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Customer.countDocuments(query)
        ]);

        return {
            customers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error(`Failed to fetch customers: ${error.message}`);
        throw error;
    }
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (companyId, customerId) => {
    try {
        const customer = await Customer.findOne({ _id: customerId, companyId });

        if (!customer) {
            throw new NotFoundError('Customer');
        }

        return customer;
    } catch (error) {
        logger.error(`Failed to fetch customer: ${error.message}`);
        throw error;
    }
};

/**
 * Create a new customer
 */
export const createCustomer = async (companyId, customerData, userId, ipAddress = null, userAgent = null) => {
    try {
        const {
            name,
            contact = [],
            creditLimit = 0,
            notes
        } = customerData;

        if (!name) {
            throw new ValidationError('Customer name is required');
        }

        const customer = new Customer({
            companyId,
            name,
            contact,
            creditLimit: decimalMath.toDecimal128(creditLimit),
            debtBalance: decimalMath.toDecimal128(0),
            creditBalance: decimalMath.toDecimal128(0),
            notes,
            version: 0
        });

        await customer.save();

        // Log action
        await AuditLog.logAction({
            companyId,
            userId,
            action: AUDIT_ACTIONS.CUSTOMER_CREATE,
            entity: 'Customer',
            entityId: customer._id,
            payload: customer.toObject(),
            ipAddress,
            userAgent
        });

        logger.info(`Customer created: ${customer.name} (${customer._id})`);

        return customer;
    } catch (error) {
        logger.error(`Failed to create customer: ${error.message}`);
        throw error;
    }
};

/**
 * Update customer
 */
export const updateCustomer = async (companyId, customerId, updateData, userId, ipAddress = null, userAgent = null) => {
    try {
        const customer = await Customer.findOne({ _id: customerId, companyId });

        if (!customer) {
            throw new NotFoundError('Customer');
        }

        const allowedUpdates = ['name', 'contact', 'creditLimit', 'notes'];
        const updates = {};

        for (const key of allowedUpdates) {
            if (updateData[key] !== undefined) {
                if (key === 'creditLimit') {
                    updates[key] = decimalMath.toDecimal128(updateData[key]);
                } else {
                    updates[key] = updateData[key];
                }
            }
        }

        Object.assign(customer, updates);
        await customer.save();

        // Log action
        await AuditLog.logAction({
            companyId,
            userId,
            action: AUDIT_ACTIONS.CUSTOMER_UPDATE,
            entity: 'Customer',
            entityId: customer._id,
            payload: { updates },
            ipAddress,
            userAgent
        });

        logger.info(`Customer updated: ${customer.name} (${customer._id})`);

        return customer;
    } catch (error) {
        logger.error(`Failed to update customer: ${error.message}`);
        throw error;
    }
};

/**
 * Soft delete customer
 */
export const deleteCustomer = async (companyId, customerId, userId, ipAddress = null, userAgent = null) => {
    try {
        const customer = await Customer.findOne({ _id: customerId, companyId });

        if (!customer) {
            throw new NotFoundError('Customer');
        }

        customer.isActive = false;
        await customer.save();

        // Log action
        await AuditLog.logAction({
            companyId,
            userId,
            action: AUDIT_ACTIONS.CUSTOMER_DELETE,
            entity: 'Customer',
            entityId: customer._id,
            payload: { customerName: customer.name },
            ipAddress,
            userAgent
        });

        logger.info(`Customer soft deleted: ${customer.name} (${customer._id})`);

        return { message: 'Customer deleted successfully' };
    } catch (error) {
        logger.error(`Failed to delete customer: ${error.message}`);
        throw error;
    }
};

/**
 * Get customer statistics
 */
export const getCustomerStats = async (companyId, customerId) => {
    try {
        const customer = await Customer.findOne({ _id: customerId, companyId });

        if (!customer) {
            throw new NotFoundError('Customer');
        }

        // Could add aggregation for payment history, debt counts, etc.
        const stats = {
            customer: {
                id: customer._id,
                name: customer.name,
                debtBalance: decimalMath.toNumber(customer.debtBalance),
                creditBalance: decimalMath.toNumber(customer.creditBalance),
                creditLimit: decimalMath.toNumber(customer.creditLimit),
                remainingCredit: customer.getRemainingCredit().toNumber()
            }
        };

        return stats;
    } catch (error) {
        logger.error(`Failed to fetch customer stats: ${error.message}`);
        throw error;
    }
};

export default {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerStats
};
