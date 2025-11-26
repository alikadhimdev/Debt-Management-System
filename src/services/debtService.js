/**
 * Debt Service
 * Handles debt/invoice management operations
 */

import mongoose from 'mongoose';
import Debt from '../models/Debt.js';
import Customer from '../models/Customer.js';
import AuditLog from '../models/AuditLog.js';
import * as decimalMath from '../utils/decimalMath.js';
import {
    NotFoundError,
    ValidationError,
    UnprocessableEntityError
} from '../utils/errorHandler.js';
import { AUDIT_ACTIONS, DEBT_STATUS } from '../config/constants.js';
import { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Create a new debt
 */
export const createDebt = async (companyId, debtData, userId, ipAddress = null, userAgent = null) => {
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const {
            customerId,
            reference,
            totalAmount,
            dueAt,
            items = [],
            notes
        } = debtData;

        // Validate required fields
        if (!customerId || !reference || !totalAmount || !dueAt || items.length === 0) {
            throw new ValidationError('Missing required fields for debt creation');
        }

        // Fetch customer
        const customer = await Customer.findOne({ _id: customerId, companyId }).session(session);

        if (!customer) {
            throw new NotFoundError('Customer');
        }

        const debtAmount = decimalMath.fromDecimal128(totalAmount);

        // Check if customer can accept this debt
        if (!customer.canAcceptDebt(debtAmount)) {
            const remainingCredit = customer.getRemainingCredit();
            throw new UnprocessableEntityError(
                `Customer credit limit exceeded. Remaining credit: ${remainingCredit.toString()}`
            );
        }

        // Create debt
        const debt = new Debt({
            companyId,
            customerId,
            reference,
            totalAmount: decimalMath.toDecimal128(debtAmount),
            outstandingAmount: decimalMath.toDecimal128(debtAmount),
            status: DEBT_STATUS.OPEN,
            dueAt: new Date(dueAt),
            items,
            notes
        });

        // Calculate aging bucket
        debt.agingBucket = debt.calculateAgingBucket();

        await debt.save({ session });

        // Update customer's debt balance
        const currentDebtBalance = decimalMath.fromDecimal128(customer.debtBalance);
        const newDebtBalance = decimalMath.add(currentDebtBalance, debtAmount);
        customer.debtBalance = decimalMath.toDecimal128(newDebtBalance);
        customer.lastTransactionAt = new Date();
        customer.incrementVersion();

        await customer.save({ session });

        // Log action
        await AuditLog.logAction({
            companyId,
            userId,
            action: AUDIT_ACTIONS.DEBT_CREATE,
            entity: 'Debt',
            entityId: debt._id,
            payload: {
                customerId,
                customerName: customer.name,
                reference,
                totalAmount: debtAmount.toString(),
                dueAt
            },
            ipAddress,
            userAgent
        });

        await session.commitTransaction();

        logger.info(`Debt created: ${debt.reference} for customer ${customer.name} - Amount: ${debtAmount}`);

        await debt.populate('customer', 'name contact debtBalance');

        return debt;

    } catch (error) {
        await session.abortTransaction();
        logger.error(`Failed to create debt: ${error.message}`);
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Get debts with filtering and pagination
 */
export const getDebts = async (companyId, filters = {}, pagination = {}) => {
    try {
        const {
            customerId,
            status,
            dueBefore,
            dueAfter,
            agingBucket
        } = filters;

        const {
            page = DEFAULT_PAGE,
            limit = Math.min(pagination.limit || DEFAULT_LIMIT, MAX_LIMIT),
            sortBy = 'dueAt',
            order = 'asc'
        } = pagination;

        const query = { companyId };

        if (customerId) {
            query.customerId = customerId;
        }

        if (status) {
            query.status = status;
        }

        if (agingBucket) {
            query.agingBucket = agingBucket;
        }

        if (dueBefore || dueAfter) {
            query.dueAt = {};
            if (dueBefore) query.dueAt.$lte = new Date(dueBefore);
            if (dueAfter) query.dueAt.$gte = new Date(dueAfter);
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

        const [debts, total] = await Promise.all([
            Debt.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('customer', 'name contact')
                .lean(),
            Debt.countDocuments(query)
        ]);

        return {
            debts,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error(`Failed to fetch debts: ${error.message}`);
        throw error;
    }
};

/**
 * Get debt by ID
 */
export const getDebtById = async (companyId, debtId) => {
    try {
        const debt = await Debt.findOne({ _id: debtId, companyId })
            .populate('customer', 'name contact debtBalance creditBalance');

        if (!debt) {
            throw new NotFoundError('Debt');
        }

        return debt;
    } catch (error) {
        logger.error(`Failed to fetch debt: ${error.message}`);
        throw error;
    }
};

/**
 * Cancel a debt (before any payment is made)
 */
export const cancelDebt = async (companyId, debtId, userId, ipAddress = null, userAgent = null) => {
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const debt = await Debt.findOne({ _id: debtId, companyId }).session(session);

        if (!debt) {
            throw new NotFoundError('Debt');
        }

        // Can only cancel if not paid
        const outstanding = decimalMath.fromDecimal128(debt.outstandingAmount);
        const total = decimalMath.fromDecimal128(debt.totalAmount);

        if (!decimalMath.equals(outstanding, total)) {
            throw new UnprocessableEntityError('Cannot cancel a debt that has been partially or fully paid');
        }

        debt.status = DEBT_STATUS.CANCELLED;
        await debt.save({ session });

        // Update customer's debt balance
        const customer = await Customer.findById(debt.customerId).session(session);
        const currentDebtBalance = decimalMath.fromDecimal128(customer.debtBalance);
        const newDebtBalance = decimalMath.subtract(currentDebtBalance, total);
        customer.debtBalance = decimalMath.toDecimal128(newDebtBalance);
        customer.incrementVersion();

        await customer.save({ session });

        // Log action
        await AuditLog.logAction({
            companyId,
            userId,
            action: AUDIT_ACTIONS.DEBT_DELETE,
            entity: 'Debt',
            entityId: debt._id,
            payload: {
                reference: debt.reference,
                totalAmount: total.toString()
            },
            ipAddress,
            userAgent
        });

        await session.commitTransaction();

        logger.info(`Debt cancelled: ${debt.reference}`);

        return debt;

    } catch (error) {
        await session.abortTransaction();
        logger.error(`Failed to cancel debt: ${error.message}`);
        throw error;
    } finally {
        session.endSession();
    }
};

export default {
    createDebt,
    getDebts,
    getDebtById,
    cancelDebt
};
