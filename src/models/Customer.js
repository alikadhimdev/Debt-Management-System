/**
 * Customer Model
 * Manages customer information with wallet and credit balance logic
 */

import mongoose from 'mongoose';
import tenantIsolationPlugin from './plugins/tenantIsolation.js';
import { CONTACT_TYPES } from '../config/constants.js';
import * as decimalMath from '../utils/decimalMath.js';

const contactSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: Object.values(CONTACT_TYPES),
        required: true
    },
    value: {
        type: String,
        required: true,
        trim: true
    },
    isPrimary: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Customer name is required'],
            trim: true,
            maxlength: [200, 'Customer name cannot exceed 200 characters'],
            index: true
        },
        contact: {
            type: [contactSchema],
            default: []
        },
        creditLimit: {
            type: mongoose.Schema.Types.Decimal128,
            required: true,
            default: () => mongoose.Types.Decimal128.fromString('0'),
            get: (value) => value ? parseFloat(value.toString()) : 0
        },
        debtBalance: {
            type: mongoose.Schema.Types.Decimal128,
            required: true,
            default: () => mongoose.Types.Decimal128.fromString('0'),
            get: (value) => value ? parseFloat(value.toString()) : 0,
            index: true
        },
        creditBalance: {
            type: mongoose.Schema.Types.Decimal128,
            required: true,
            default: () => mongoose.Types.Decimal128.fromString('0'),
            get: (value) => value ? parseFloat(value.toString()) : 0
        },
        lastTransactionAt: {
            type: Date,
            index: true
        },
        version: {
            type: Number,
            required: true,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        notes: {
            type: String,
            maxlength: [1000, 'Notes cannot exceed 1000 characters']
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true, getters: true },
        toObject: { virtuals: true, getters: true }
    }
);

// Apply tenant isolation plugin
customerSchema.plugin(tenantIsolationPlugin);

// Indexes
customerSchema.index({ companyId: 1, name: 1 });
customerSchema.index({ companyId: 1, debtBalance: -1 });
customerSchema.index({ companyId: 1, lastTransactionAt: -1 });
customerSchema.index({ companyId: 1, isActive: 1 });

// Text index for search functionality
customerSchema.index({ name: 'text', notes: 'text' });

// Virtual for company
customerSchema.virtual('company', {
    ref: 'Company',
    localField: 'companyId',
    foreignField: '_id',
    justOne: true
});

// Virtual for debts
customerSchema.virtual('debts', {
    ref: 'Debt',
    localField: '_id',
    foreignField: 'customerId'
});

// Virtual for payments
customerSchema.virtual('payments', {
    ref: 'Payment',
    localField: '_id',
    foreignField: 'customerId'
});

// Instance method to check if customer can accept new debt
customerSchema.methods.canAcceptDebt = function (amount) {
    const currentDebt = decimalMath.fromDecimal128(this.debtBalance);
    const newAmount = decimalMath.fromDecimal128(amount);
    const limit = decimalMath.fromDecimal128(this.creditLimit);

    const totalDebt = currentDebt.plus(newAmount);
    return totalDebt.lessThanOrEqualTo(limit);
};

// Instance method to get remaining credit
customerSchema.methods.getRemainingCredit = function () {
    const limit = decimalMath.fromDecimal128(this.creditLimit);
    const currentDebt = decimalMath.fromDecimal128(this.debtBalance);
    return limit.minus(currentDebt);
};

// Instance method to increment version (for optimistic locking)
customerSchema.methods.incrementVersion = function () {
    this.version += 1;
    return this.version;
};

// Static method to search customers
customerSchema.statics.search = function (companyId, searchTerm, options = {}) {
    const query = { companyId, isActive: true };

    if (searchTerm) {
        query.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { 'contact.value': { $regex: searchTerm, $options: 'i' } }
        ];
    }

    return this.find(query)
        .sort(options.sortBy || { name: 1 })
        .limit(options.limit || 20)
        .skip(options.skip || 0);
};

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
