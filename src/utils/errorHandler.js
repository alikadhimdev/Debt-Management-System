/**
 * Custom Error Classes and Error Handler
 * Provides consistent error handling across the application
 */

/**
 * Base Application Error
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 400 - Bad Request / Validation Error
 */
export class ValidationError extends AppError {
    constructor(message = 'Validation failed') {
        super(message, 400);
    }
}

/**
 * 401 - Unauthorized
 */
export class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
    }
}

/**
 * 403 - Forbidden
 */
export class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403);
    }
}

/**
 * 404 - Not Found
 */
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
    }
}

/**
 * 409 - Conflict (e.g., version mismatch, duplicate key)
 */
export class ConflictError extends AppError {
    constructor(message = 'Conflict occurred') {
        super(message, 409);
    }
}

/**
 * 422 - Unprocessable Entity (business logic validation)
 */
export class UnprocessableEntityError extends AppError {
    constructor(message = 'Cannot process request') {
        super(message, 422);
    }
}

/**
 * 500 - Internal Server Error
 */
export class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500);
    }
}
