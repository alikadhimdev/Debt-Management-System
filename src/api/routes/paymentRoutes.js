/**
 * Payment Routes
 * Payment processing endpoints
 */

import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import tenantIsolation from '../middlewares/tenantIsolation.js';
import idempotency from '../middlewares/idempotency.js';
import { validate } from '../middlewares/validate.js';
import {
    createPaymentSchema,
    getPaymentsQuerySchema,
    idParamSchema
} from '../validations/index.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

// Apply authentication and tenant isolation to all routes
router.use(authenticate);
router.use(tenantIsolation);

// POST /api/v1/payments - Create new payment (with idempotency)
router.post(
    '/',
    idempotency, // CRITICAL: Idempotency middleware for duplicate prevention
    validate(createPaymentSchema),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT, USER_ROLES.CASHIER),
    paymentController.createPayment
);

// GET /api/v1/payments - Get all payments
router.get(
    '/',
    validate(getPaymentsQuerySchema, 'query'),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT, USER_ROLES.CASHIER, USER_ROLES.VIEWER),
    paymentController.getPayments
);

// GET /api/v1/payments/:id - Get payment by ID
router.get(
    '/:id',
    validate(idParamSchema, 'params'),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT, USER_ROLES.CASHIER, USER_ROLES.VIEWER),
    paymentController.getPaymentById
);

export default router;
