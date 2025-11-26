/**
 * Auth Routes
 * Public authentication endpoints
 */

import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, refreshTokenSchema } from '../validations/index.js';

const router = express.Router();

// POST /api/v1/auth/login - Login user
router.post('/login', validate(loginSchema), authController.login);

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// GET /api/v1/auth/me - Get current user (protected)
router.get('/me', authenticate, authController.getMe);

export default router;
