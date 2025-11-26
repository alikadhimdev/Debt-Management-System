/**
 * Customer Controller
 * Handles customer management endpoints
 */

import * as customerService from '../../services/customerService.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/v1/customers
 * Get all customers with filtering and pagination
 */
export const getCustomers = async (req, res, next) => {
    try {
        const { companyId } = req;
        const filters = {
            search: req.query.search,
            isActive: req.query.isActive
        };
        const pagination = {
            page: req.query.page,
            limit: req.query.limit,
            sortBy: req.query.sortBy,
            order: req.query.order
        };

        const result = await customerService.getCustomers(companyId, filters, pagination);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/customers/:id
 * Get customer by ID
 */
export const getCustomerById = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { id } = req.params;

        const customer = await customerService.getCustomerById(companyId, id);

        res.status(200).json({
            success: true,
            data: { customer }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/customers
 * Create a new customer
 */
export const createCustomer = async (req, res, next) => {
    try {
        const { companyId, user } = req;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const customer = await customerService.createCustomer(
            companyId,
            req.body,
            user.userId,
            ipAddress,
            userAgent
        );

        res.status(201).json({
            success: true,
            data: { customer }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/v1/customers/:id
 * Update customer
 */
export const updateCustomer = async (req, res, next) => {
    try {
        const { companyId, user } = req;
        const { id } = req.params;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const customer = await customerService.updateCustomer(
            companyId,
            id,
            req.body,
            user.userId,
            ipAddress,
            userAgent
        );

        res.status(200).json({
            success: true,
            data: { customer }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/v1/customers/:id
 * Soft delete customer
 */
export const deleteCustomer = async (req, res, next) => {
    try {
        const { companyId, user } = req;
        const { id } = req.params;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await customerService.deleteCustomer(
            companyId,
            id,
            user.userId,
            ipAddress,
            userAgent
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/customers/:id/stats
 * Get customer statistics
 */
export const getCustomerStats = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { id } = req.params;

        const stats = await customerService.getCustomerStats(companyId, id);

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
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
