/**
 * Payment Controller
 * Handles payment processing endpoints
 */

import * as paymentService from '../../services/paymentService.js';
import logger from '../../utils/logger.js';

/**
 * POST /api/v1/payments
 * Create a new payment (with idempotency support)
 */
export const createPayment = async (req, res, next) => {
    try {
        const { companyId, user, idempotencyKey } = req;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const { customerId, ...paymentData } = req.body;

        // Add idempotency key to payment data
        if (idempotencyKey) {
            paymentData.idempotencyKey = idempotencyKey;
        }

        const payment = await paymentService.createPayment(
            companyId,
            customerId,
            paymentData,
            user.userId,
            ipAddress,
            userAgent
        );

        res.status(201).json({
            success: true,
            data: { payment }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/payments
 * Get all payments with filtering and pagination
 */
export const getPayments = async (req, res, next) => {
    try {
        const { companyId } = req;
        const filters = {
            customerId: req.query.customerId,
            method: req.query.method,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
        const pagination = {
            page: req.query.page,
            limit: req.query.limit,
            sortBy: req.query.sortBy,
            order: req.query.order
        };

        const result = await paymentService.getPayments(companyId, filters, pagination);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/payments/:id
 * Get payment by ID
 */
export const getPaymentById = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { id } = req.params;

        const payment = await paymentService.getPaymentById(companyId, id);

        res.status(200).json({
            success: true,
            data: { payment }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    createPayment,
    getPayments,
    getPaymentById
};
