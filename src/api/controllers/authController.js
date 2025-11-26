/**
 * Auth Controller
 * Handles authentication endpoints
 */

import * as authService from '../../services/authService.js';
import logger from '../../utils/logger.js';

/**
 * POST /api/v1/auth/login
 * Authenticates user and returns JWT tokens
 */
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await authService.login(email, password, ipAddress, userAgent);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/refresh
 * Refreshes access token using refresh token
 */
export const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        const result = await authService.refreshToken(refreshToken);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/auth/me
 * Returns current authenticated user info
 */
export const getMe = async (req, res, next) => {
    try {
        const user = req.userObject;

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    companyId: user.companyId,
                    isActive: user.isActive,
                    lastLoginAt: user.lastLoginAt
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    login,
    refresh,
    getMe
};
