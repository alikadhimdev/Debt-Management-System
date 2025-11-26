/**
 * Validation Middleware
 * Uses Joi for request validation
 */

import { ValidationError } from '../../utils/errorHandler.js';

/**
 * Middleware factory for Joi validation
 * 
 * @param {Object} schema - Joi schema object
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
export const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        try {
            const { error, value } = schema.validate(req[property], {
                abortEarly: false, // Return all errors, not just the first one
                stripUnknown: true // Remove unknown keys
            });

            if (error) {
                const errorMessages = error.details.map(detail => detail.message).join(', ');
                throw new ValidationError(errorMessages);
            }

            // Replace request property with validated and sanitized value
            req[property] = value;

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Validate multiple parts of the request
 * 
 * @param {Object} schemas - Object with schemas for different parts { body: schema, query: schema }
 */
export const validateMultiple = (schemas) => {
    return (req, res, next) => {
        try {
            const errors = [];

            for (const [property, schema] of Object.entries(schemas)) {
                const { error, value } = schema.validate(req[property], {
                    abortEarly: false,
                    stripUnknown: true
                });

                if (error) {
                    const messages = error.details.map(detail => `${property}.${detail.message}`);
                    errors.push(...messages);
                } else {
                    req[property] = value;
                }
            }

            if (errors.length > 0) {
                throw new ValidationError(errors.join(', '));
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export default validate;
