/**
 * Report Routes
 * Report generation endpoints
 */

import express from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import tenantIsolation from '../middlewares/tenantIsolation.js';
import { validate } from '../middlewares/validate.js';
import {
    getAgingReportQuerySchema,
    getPaymentSummaryQuerySchema
} from '../validations/index.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

// Apply authentication and tenant isolation to all routes
router.use(authenticate);
router.use(tenantIsolation);

// GET /api/v1/reports/aging - Get aging report
router.get(
    '/aging',
    validate(getAgingReportQuerySchema, 'query'),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT),
    reportController.getAgingReport
);

// GET /api/v1/reports/customer-balance - Get customer balance summary
router.get(
    '/customer-balance',
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT),
    reportController.getCustomerBalanceSummary
);

// GET /api/v1/reports/payment-summary - Get payment summary
router.get(
    '/payment-summary',
    validate(getPaymentSummaryQuerySchema, 'query'),
    authorize(USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT),
    reportController.getPaymentSummary
);

export default router;
