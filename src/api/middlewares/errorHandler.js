/**
 * Global Error Handler Middleware
 * Catches and formats all errors in the application
 */

import mongoose from 'mongoose';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

/**
 * Development error response - includes stack trace
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode || 500).json({
        success: false,
        error: {
            message: err.message,
            code: err.code || 'INTERNAL_ERROR',
            status: err.status,
            stack: err.stack,
            ...(err.errors && { errors: err.errors })
        }
    });
};

/**
 * Production error response - minimal info for client
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                code: err.code || 'ERROR'
            }
        });
    } else {
        // Programming or unknown error: don't leak error details
        logger.error('ERROR:', err);

        res.status(500).json({
            success: false,
            error: {
                message: 'Something went wrong',
                code: 'INTERNAL_ERROR'
            }
        });
    }
};

/**
 * Handle MongoDB CastError (invalid ObjectId)
 */
const handleCastError = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

/**
 * Handle MongoDB duplicate key error
 */
const handleDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate value for field '${field}': ${value}. Please use another value.`;
    return new AppError(message, 409);
};

/**
 * Handle MongoDB validation error
 */
const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
    return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
    return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Main error handling middleware
 * Must be last middleware in the chain
 */
export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error
    if (err.statusCode >= 500) {
        logger.error('Server Error:', {
            message: err.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userId: req.user?.userId
        });
    } else {
        logger.warn('Client Error:', {
            message: err.message,
            statusCode: err.statusCode,
            url: req.originalUrl,
            method: req.method
        });
    }

    let error = { ...err };
    error.message = err.message;
    error.isOperational = err.isOperational || false;

    // Handle specific error types
    if (err instanceof mongoose.Error.CastError) {
        error = handleCastError(err);
    }

    if (err.code === 11000) {
        error = handleDuplicateKeyError(err);
    }

    if (err instanceof mongoose.Error.ValidationError) {
        error = handleValidationError(err);
    }

    if (err.name === 'JsonWebTokenError') {
        error = handleJWTError();
    }

    if (err.name === 'TokenExpiredError') {
        error = handleJWTExpiredError();
    }

    // Send error response
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(error, res);
    } else {
        sendErrorProd(error, res);
    }
};

/**
 * Handle 404 - Route not found
 */
export const notFound = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};

export default errorHandler;
