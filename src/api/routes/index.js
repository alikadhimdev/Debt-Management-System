/**
 * Routes Index
 * Mounts all route modules with API versioning
 */

import express from 'express';
import authRoutes from './authRoutes.js';
import customerRoutes from './customerRoutes.js';
import debtRoutes from './debtRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import reportRoutes from './reportRoutes.js';
import syncRoutes from './syncRoutes.js';

const router = express.Router();

// API version prefix: /api/v1
const API_VERSION = process.env.API_VERSION || 'v1';

// Mount routes
router.use(`/api/${API_VERSION}/auth`, authRoutes);
router.use(`/api/${API_VERSION}/customers`, customerRoutes);
router.use(`/api/${API_VERSION}/debts`, debtRoutes);
router.use(`/api/${API_VERSION}/payments`, paymentRoutes);
router.use(`/api/${API_VERSION}/reports`, reportRoutes);
router.use(`/api/${API_VERSION}/sync`, syncRoutes);

// Health check endpoint
router.get(`/api/${API_VERSION}/health`, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Debt Management System API is running',
        version: API_VERSION,
        timestamp: new Date().toISOString()
    });
});

export default router;
