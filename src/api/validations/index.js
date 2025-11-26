/**
 * Validation Schemas
 * Joi schemas for input validation
 */

import Joi from 'joi';
import { USER_ROLES, DEBT_STATUS, PAYMENT_METHODS, CONTACT_TYPES } from '../config/constants.js';

// Common validation patterns
const objectId = Joi.string().hex().length(24);
const email = Joi.string().email().lowercase().trim();
const positiveNumber = Joi.number().positive();
const nonNegativeNumber = Joi.number().min(0);
const dateString = Joi.date().iso();

/**
 * Auth Schemas
 */
export const loginSchema = Joi.object({
    email: email.required(),
    password: Joi.string().min(6).required()
});

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required()
});

/**
 * Customer Schemas
 */
export const createCustomerSchema = Joi.object({
    name: Joi.string().trim().max(200).required(),
    contact: Joi.array().items(
        Joi.object({
            type: Joi.string().valid(...Object.values(CONTACT_TYPES)).required(),
            value: Joi.string().trim().required(),
            isPrimary: Joi.boolean().default(false)
        })
    ).default([]),
    creditLimit: nonNegativeNumber.default(0),
    notes: Joi.string().max(1000).allow('')
});

export const updateCustomerSchema = Joi.object({
    name: Joi.string().trim().max(200),
    contact: Joi.array().items(
        Joi.object({
            type: Joi.string().valid(...Object.values(CONTACT_TYPES)).required(),
            value: Joi.string().trim().required(),
            isPrimary: Joi.boolean().default(false)
        })
    ),
    creditLimit: nonNegativeNumber,
    notes: Joi.string().max(1000).allow('')
}).min(1);

export const getCustomersQuerySchema = Joi.object({
    search: Joi.string().allow(''),
    isActive: Joi.boolean(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('name', 'debtBalance', 'creditBalance', 'createdAt').default('name'),
    order: Joi.string().valid('asc', 'desc').default('asc')
});

/**
 * Debt Schemas
 */
export const createDebtSchema = Joi.object({
    customerId: objectId.required(),
    reference: Joi.string().trim().max(100).required(),
    totalAmount: positiveNumber.required(),
    dueAt: dateString.required(),
    items: Joi.array().items(
        Joi.object({
            description: Joi.string().trim().max(500).required(),
            quantity: nonNegativeNumber.required(),
            price: positiveNumber.required()
        })
    ).min(1).required(),
    notes: Joi.string().max(1000).allow('')
});

export const getDebtsQuerySchema = Joi.object({
    customerId: objectId,
    status: Joi.string().valid(...Object.values(DEBT_STATUS)),
    agingBucket: Joi.string(),
    dueBefore: dateString,
    dueAfter: dateString,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('dueAt', 'totalAmount', 'outstandingAmount', 'createdAt').default('dueAt'),
    order: Joi.string().valid('asc', 'desc').default('asc')
});

/**
 * Payment Schemas
 */
export const createPaymentSchema = Joi.object({
    customerId: objectId.required(),
    amount: positiveNumber.required(),
    method: Joi.string().valid(...Object.values(PAYMENT_METHODS)).required(),
    appliedToDebts: Joi.array().items(
        Joi.object({
            debtId: objectId.required(),
            amount: positiveNumber.required()
        })
    ).default([]),
    paidAt: dateString.allow(null),
    notes: Joi.string().max(500).allow('')
});

export const getPaymentsQuerySchema = Joi.object({
    customerId: objectId,
    method: Joi.string().valid(...Object.values(PAYMENT_METHODS)),
    startDate: dateString,
    endDate: dateString,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('paidAt', 'amount', 'createdAt').default('paidAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Report Schemas
 */
export const getAgingReportQuerySchema = Joi.object({
    detailed: Joi.boolean().default(false),
    agingBucket: Joi.string().allow('')
});

export const getPaymentSummaryQuerySchema = Joi.object({
    startDate: dateString.required(),
    endDate: dateString.required()
});

/**
 * Sync Schemas
 */
export const pushChangesSchema = Joi.object({
    changesets: Joi.array().items(
        Joi.object({
            entity: Joi.string().valid('Customer', 'Debt', 'Payment').required(),
            entityId: objectId.required(),
            version: Joi.number().integer().required(),
            data: Joi.object().required()
        })
    ).min(1).required()
});

export const getChangesQuerySchema = Joi.object({
    since: dateString.required(),
    limit: Joi.number().integer().min(1).max(1000).default(100)
});

export const getFullSyncQuerySchema = Joi.object({
    entities: Joi.array().items(
        Joi.string().valid('Customer', 'Debt', 'Payment')
    ).default(['Customer', 'Debt', 'Payment'])
});

/**
 * Param Schemas
 */
export const idParamSchema = Joi.object({
    id: objectId.required()
});

export default {
    // Auth
    loginSchema,
    refreshTokenSchema,
    // Customer
    createCustomerSchema,
    updateCustomerSchema,
    getCustomersQuerySchema,
    // Debt
    createDebtSchema,
    getDebtsQuerySchema,
    // Payment
    createPaymentSchema,
    getPaymentsQuerySchema,
    // Reports
    getAgingReportQuerySchema,
    getPaymentSummaryQuerySchema,
    // Sync
    pushChangesSchema,
    getChangesQuerySchema,
    getFullSyncQuerySchema,
    // Common
    idParamSchema
};
