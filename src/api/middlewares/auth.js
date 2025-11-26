/**
 * Authentication Middleware
 * Handles JWT token verification and role-based authorization
 */

import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errorHandler.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Middleware to authenticate JWT token
 * Extracts and verifies JWT from Authorization header
 * Attaches user info to req.user
 */
export const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!token) {
            throw new UnauthorizedError('No token provided');
        }

        // Verify token
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) {
            logger.error('JWT_ACCESS_SECRET not configured');
            throw new Error('Authentication configuration error');
        }

        let decoded;
        try {
            decoded = jwt.verify(token, secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new UnauthorizedError('Token expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new UnauthorizedError('Invalid token');
            } else {
                throw new UnauthorizedError('Token verification failed');
            }
        }

        // Validate decoded token has required fields
        if (!decoded.userId || !decoded.companyId) {
            throw new UnauthorizedError('Invalid token payload');
        }

        // Optional: Verify user still exists and is active
        const user = await User.findById(decoded.userId).select('+passwordHash');
        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        if (!user.isActive) {
            throw new UnauthorizedError('User account is inactive');
        }

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            companyId: decoded.companyId,
            role: decoded.role,
            email: decoded.email
        };

        // Also attach the full user object for convenience
        req.userObject = user;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware factory for role-based authorization
 * Usage: authorize('admin', 'accountant')
 * 
 * @param {...string} allowedRoles - Roles that are allowed access
 */
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError('Authentication required');
            }

            if (!allowedRoles.includes(req.user.role)) {
                throw new ForbiddenError(
                    `Access denied. Required roles: ${allowedRoles.join(', ')}`
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Optional authentication - doesn't fail if no token provided
 * But verifies token if present
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // No token, continue without auth
        }

        // Has token, try to authenticate
        await authenticate(req, res, next);
    } catch (error) {
        // If authentication fails, just continue without user
        next();
    }
};

export default {
    authenticate,
    authorize,
    optionalAuth
};
