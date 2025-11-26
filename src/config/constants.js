/**
 * Application Constants
 * Centralized configuration for enums and constant values
 */

export const USER_ROLES = {
    ADMIN: 'admin',
    ACCOUNTANT: 'accountant',
    CASHIER: 'cashier',
    VIEWER: 'viewer'
};

export const DEBT_STATUS = {
    OPEN: 'open',
    PARTIAL: 'partial',
    PAID: 'paid',
    CANCELLED: 'cancelled'
};

export const PAYMENT_METHODS = {
    CASH: 'cash',
    CARD: 'card',
    TRANSFER: 'transfer',
    WALLET_ADJUSTMENT: 'wallet_adjustment'
};

export const AGING_BUCKETS = {
    CURRENT: 'current',
    DAYS_0_30: '0-30',
    DAYS_31_60: '31-60',
    DAYS_61_90: '61-90',
    DAYS_90_PLUS: '90+'
};

export const AUDIT_ACTIONS = {
    DEBT_CREATE: 'debt_create',
    DEBT_UPDATE: 'debt_update',
    DEBT_DELETE: 'debt_delete',
    PAYMENT_CREATE: 'payment_create',
    CUSTOMER_CREATE: 'customer_create',
    CUSTOMER_UPDATE: 'customer_update',
    CUSTOMER_DELETE: 'customer_delete',
    USER_LOGIN: 'user_login',
    USER_CREATE: 'user_create',
    USER_UPDATE: 'user_update'
};

export const CONTACT_TYPES = {
    PHONE: 'phone',
    EMAIL: 'email',
    ADDRESS: 'address'
};

// Default pagination
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Idempotency
export const IDEMPOTENCY_KEY_PREFIX = 'idempotency:';
export const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours
