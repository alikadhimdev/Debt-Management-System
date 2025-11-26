/**
 * Authentication Service
 * Handles user authentication, token generation, and token refresh
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { UnauthorizedError, ValidationError } from '../utils/errorHandler.js';
import { AUDIT_ACTIONS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Generate JWT access and refresh tokens
 */
const generateTokens = (user) => {
    const payload = {
        userId: user._id,
        companyId: user.companyId,
        role: user.role,
        email: user.email
    };

    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
        throw new Error('JWT secrets not configured');
    }

    const accessToken = jwt.sign(
        payload,
        accessSecret,
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '24h' }
    );

    const refreshToken = jwt.sign(
        { userId: user._id },
        refreshSecret,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    return { accessToken, refreshToken };
};

/**
 * Login user with email and password
 */
export const login = async (email, password, ipAddress = null, userAgent = null) => {
    try {
        if (!email || !password) {
            throw new ValidationError('Email and password are required');
        }

        // Find user and include password hash
        const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
            .select('+passwordHash')
            .populate('company', 'name currency timezone');

        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Generate tokens
        const tokens = generateTokens(user);

        // Update last login
        await user.updateLastLogin();

        // Log login action
        await AuditLog.logAction({
            companyId: user.companyId,
            userId: user._id,
            action: AUDIT_ACTIONS.USER_LOGIN,
            entity: 'User',
            entityId: user._id,
            payload: { email: user.email },
            ipAddress,
            userAgent
        });

        logger.info(`User logged in: ${user.email}`);

        // Return user without password hash
        const userObject = user.toObject();
        delete userObject.passwordHash;

        return {
            user: userObject,
            ...tokens
        };
    } catch (error) {
        logger.error(`Login failed for ${email}: ${error.message}`);
        throw error;
    }
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (refreshTokenString) => {
    try {
        if (!refreshTokenString) {
            throw new ValidationError('Refresh token is required');
        }

        const refreshSecret = process.env.JWT_REFRESH_SECRET;

        if (!refreshSecret) {
            throw new Error('JWT refresh secret not configured');
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshTokenString, refreshSecret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new UnauthorizedError('Refresh token expired. Please log in again.');
            } else {
                throw new UnauthorizedError('Invalid refresh token');
            }
        }

        // Find user
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
            throw new UnauthorizedError('User not found or inactive');
        }

        // Generate new access token
        const tokens = generateTokens(user);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken // Also return new refresh token
        };
    } catch (error) {
        logger.error(`Token refresh failed: ${error.message}`);
        throw error;
    }
};

/**
 * Verify a token
 */
export const verifyToken = async (token, type = 'access') => {
    try {
        const secret = type === 'access'
            ? process.env.JWT_ACCESS_SECRET
            : process.env.JWT_REFRESH_SECRET;

        if (!secret) {
            throw new Error('JWT secret not configured');
        }

        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired token');
    }
};

export default {
    login,
    refreshToken,
    verifyToken,
    generateTokens
};
