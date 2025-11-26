/**
 * Debt Routes
 * Debt/invoice management endpoints
 */

import express from 'express';
import * as debtController from '../controllers/debtController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import tenantIsolation from '../middlewares/tenantIsolation.js';
import { validate } from '../middlewares/validate.js';
import {
    createDebtSchema,
    getDebtsQuerySchema,
    idParamSchema
} from '../validations/index.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

// Apply authentication and tenant isolation to all routes
router.use(authenticate);
router.use(tenantIsolation);

// POST /api/v1/debts - Create new debt
router.post(
    '/',
    validate(createDebtSchema),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT, USER_ROLES.CASHIER),
    debtController.createDebt
);

// GET /api/v1/debts - Get all debts
router.get(
    '/',
    validate(getDebtsQuerySchema, 'query'),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT, USER_ROLES.CASHIER, USER_ROLES.VIEWER),
    debtController.getDebts
);

// GET /api/v1/debts/:id - Get debt by ID
router.get(
    '/:id',
    validate(idParamSchema, 'params'),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT, USER_ROLES.CASHIER, USER_ROLES.VIEWER),
    debtController.getDebtById
);

// DELETE /api/v1/debts/:id - Cancel debt
router.delete(
    '/:id',
    validate(idParamSchema, 'params'),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT),
    debtController.cancelDebt
);

export default router;
