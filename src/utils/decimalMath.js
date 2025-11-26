/**
 * Decimal Math Utility
 * Wrapper around decimal.js for precise financial calculations
 * Prevents floating-point errors in monetary operations
 */

import Decimal from 'decimal.js';
import mongoose from 'mongoose';

// Configure Decimal.js for financial precision
Decimal.set({
    precision: 20,
    rounding: Decimal.ROUND_HALF_UP,
    toExpNeg: -9,
    toExpPos: 9,
    minE: -9,
    maxE: 9
});

/**
 * Convert MongoDB Decimal128 to Decimal.js instance
 */
export const fromDecimal128 = (value) => {
    if (!value) return new Decimal(0);
    if (value instanceof mongoose.Types.Decimal128) {
        return new Decimal(value.toString());
    }
    return new Decimal(value);
};

/**
 * Convert number/string/Decimal to MongoDB Decimal128
 */
export const toDecimal128 = (value) => {
    if (!value) return mongoose.Types.Decimal128.fromString('0');
    if (value instanceof mongoose.Types.Decimal128) return value;

    const decimal = value instanceof Decimal ? value : new Decimal(value);
    return mongoose.Types.Decimal128.fromString(decimal.toString());
};

/**
 * Add two decimal values
 */
export const add = (a, b) => {
    const decimalA = fromDecimal128(a);
    const decimalB = fromDecimal128(b);
    return decimalA.plus(decimalB);
};

/**
 * Subtract b from a
 */
export const subtract = (a, b) => {
    const decimalA = fromDecimal128(a);
    const decimalB = fromDecimal128(b);
    return decimalA.minus(decimalB);
};

/**
 * Multiply two decimal values
 */
export const multiply = (a, b) => {
    const decimalA = fromDecimal128(a);
    const decimalB = fromDecimal128(b);
    return decimalA.times(decimalB);
};

/**
 * Divide a by b
 */
export const divide = (a, b) => {
    const decimalA = fromDecimal128(a);
    const decimalB = fromDecimal128(b);
    if (decimalB.isZero()) {
        throw new Error('Division by zero');
    }
    return decimalA.dividedBy(decimalB);
};

/**
 * Check if a is greater than b
 */
export const isGreaterThan = (a, b) => {
    const decimalA = fromDecimal128(a);
    const decimalB = fromDecimal128(b);
    return decimalA.greaterThan(decimalB);
};

/**
 * Check if a is less than b
 */
export const isLessThan = (a, b) => {
    const decimalA = fromDecimal128(a);
    const decimalB = fromDecimal128(b);
    return decimalA.lessThan(decimalB);
};

/**
 * Check if a is greater than or equal to b
 */
export const isGreaterThanOrEqual = (a, b) => {
    const decimalA = fromDecimal128(a);
    const decimalB = fromDecimal128(b);
    return decimalA.greaterThanOrEqualTo(decimalB);
};

/**
 * Check if a is less than or equal to b
 */
export const isLessThanOrEqual = (a, b) => {
    const decimalA = fromDecimal128(a);
    const decimalB = fromDecimal128(b);
    return decimalA.lessThanOrEqualTo(decimalB);
};

/**
 * Check if two decimal values are equal
 */
export const equals = (a, b) => {
    const decimalA = fromDecimal128(a);
    const decimalB = fromDecimal128(b);
    return decimalA.equals(decimalB);
};

/**
 * Check if value is zero
 */
export const isZero = (value) => {
    const decimal = fromDecimal128(value);
    return decimal.isZero();
};

/**
 * Check if value is positive
 */
export const isPositive = (value) => {
    const decimal = fromDecimal128(value);
    return decimal.isPositive();
};

/**
 * Check if value is negative
 */
export const isNegative = (value) => {
    const decimal = fromDecimal128(value);
    return decimal.isNegative();
};

/**
 * Sum an array of decimal values
 */
export const sum = (values) => {
    return values.reduce((total, value) => add(total, value), new Decimal(0));
};

/**
 * Get absolute value
 */
export const abs = (value) => {
    const decimal = fromDecimal128(value);
    return decimal.abs();
};

/**
 * Round to specified decimal places
 */
export const round = (value, decimalPlaces = 2) => {
    const decimal = fromDecimal128(value);
    return decimal.toDecimalPlaces(decimalPlaces);
};

/**
 * Convert to plain number (use with caution, only for display)
 */
export const toNumber = (value) => {
    const decimal = fromDecimal128(value);
    return decimal.toNumber();
};

/**
 * Convert to string
 */
export const toString = (value) => {
    const decimal = fromDecimal128(value);
    return decimal.toString();
};

export default {
    fromDecimal128,
    toDecimal128,
    add,
    subtract,
    multiply,
    divide,
    isGreaterThan,
    isLessThan,
    isGreaterThanOrEqual,
    isLessThanOrEqual,
    equals,
    isZero,
    isPositive,
    isNegative,
    sum,
    abs,
    round,
    toNumber,
    toString
};
