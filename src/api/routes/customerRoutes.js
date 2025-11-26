/**
 * Customer Routes
 * Customer management endpoints
 */

import express from 'express';
import * as customerController from '../controllers/customerController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import tenantIsolation from '../middlewares/tenantIsolation.js';
import { validate } from '../middlewares/validate.js';
import {
    createCustomerSchema,
    updateCustomerSchema,
    getCustomersQuerySchema,
    idParamSchema
} from '../validations/index.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

// Apply authentication and tenant isolation to all routes
router.use(authenticate);
router.use(tenantIsolation);

// GET /api/v1/customers - Get all customers
router.get(
    '/',
    validate(getCustomersQuerySchema, 'query'),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT, USER_ROLES.CASHIER, USER_ROLES.VIEWER),
    customerController.getCustomers
);

// GET /api/v1/customers/:id - Get customer by ID
router.get(
    '/:id',
    validate(idParamSchema, 'params'),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT, USER_ROLES.CASHIER, USER_ROLES.VIEWER),
    customerController.getCustomerById
);

// GET /api/v1/customers/:id/stats - Get customer statistics
router.get(
    '/:id/stats',
    validate(idParamSchema, 'params'),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT),
    customerController.getCustomerStats
);

// POST /api/v1/customers - Create new customer
router.post(
    '/',
    validate(createCustomerSchema),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT),
    customerController.createCustomer
);

// PATCH /api/v1/customers/:id - Update customer
router.patch(
    '/:id',
    validate(idParamSchema, 'params'),
    validate(updateCustomerSchema),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT),
    customerController.updateCustomer
);

// DELETE /api/v1/customers/:id - Soft delete customer
router.delete(
    '/:id',
    validate(idParamSchema, 'params'),
    authorize(USER_ROLES.ADMIN),
    customerController.deleteCustomer
);

export default router;
