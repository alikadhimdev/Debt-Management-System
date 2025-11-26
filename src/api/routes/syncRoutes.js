/**
 * Sync Routes
 * Client synchronization endpoints
 */

import express from 'express';
import * as syncController from '../controllers/syncController.js';
import { authenticate } from '../middlewares/auth.js';
import tenantIsolation from '../middlewares/tenantIsolation.js';
import { validate } from '../middlewares/validate.js';
import {
    pushChangesSchema,
    getChangesQuerySchema,
    getFullSyncQuerySchema
} from '../validations/index.js';

const router = express.Router();

// Apply authentication and tenant isolation to all routes
router.use(authenticate);
router.use(tenantIsolation);

// POST /api/v1/sync/push - Push changes to server
router.post(
    '/push',
    validate(pushChangesSchema),
    syncController.pushChanges
);

// GET /api/v1/sync/changes - Get changes since timestamp
router.get(
    '/changes',
    validate(getChangesQuerySchema, 'query'),
    syncController.getChanges
);

// GET /api/v1/sync/full - Get full sync data
router.get(
    '/full',
    validate(getFullSyncQuerySchema, 'query'),
    syncController.getFullSync
);

export default router;
