/**
 * Debt Controller
 * Handles debt/invoice management endpoints
 */

import * as debtService from '../../services/debtService.js';
import logger from '../../utils/logger.js';

/**
 * POST /api/v1/debts
 * Create a new debt
 */
export const createDebt = async (req, res, next) => {
    try {
        const { companyId, user } = req;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const debt = await debtService.createDebt(
            companyId,
            req.body,
            user.userId,
            ipAddress,
            userAgent
        );

        res.status(201).json({
            success: true,
            data: { debt }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/debts
 * Get all debts with filtering and pagination
 */
export const getDebts = async (req, res, next) => {
    try {
        const { companyId } = req;
        const filters = {
            customerId: req.query.customerId,
            status: req.query.status,
            agingBucket: req.query.agingBucket,
            dueBefore: req.query.dueBefore,
            dueAfter: req.query.dueAfter
        };
        const pagination = {
            page: req.query.page,
            limit: req.query.limit,
            sortBy: req.query.sortBy,
            order: req.query.order
        };

        const result = await debtService.getDebts(companyId, filters, pagination);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/debts/:id
 * Get debt by ID
 */
export const getDebtById = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { id } = req.params;

        const debt = await debtService.getDebtById(companyId, id);

        res.status(200).json({
            success: true,
            data: { debt }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/v1/debts/:id
 * Cancel a debt
 */
export const cancelDebt = async (req, res, next) => {
    try {
        const { companyId, user } = req;
        const { id } = req.params;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const debt = await debtService.cancelDebt(
            companyId,
            id,
            user.userId,
            ipAddress,
            userAgent
        );

        res.status(200).json({
            success: true,
            data: { debt }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    createDebt,
    getDebts,
    getDebtById,
    cancelDebt
};
