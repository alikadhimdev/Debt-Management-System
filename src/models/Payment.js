/**
 * Payment Model
 * Tracks customer payments with idempotency support
 */

import mongoose from 'mongoose';
import tenantIsolationPlugin from './plugins/tenantIsolation.js';
import { PAYMENT_METHODS } from '../config/constants.js';

const appliedDebtSchema = new mongoose.Schema({
    debtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Debt',
        required: true
    },
    amount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        get: (value) => value ? parseFloat(value.toString()) : 0
    }
}, { _id: false });

const paymentSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: [true, 'Customer ID is required'],
            index: true
        },
        amount: {
            type: mongoose.Schema.Types.Decimal128,
            required: [true, 'Payment amount is required'],
            get: (value) => value ? parseFloat(value.toString()) : 0
        },
        method: {
            type: String,
            enum: Object.values(PAYMENT_METHODS),
            required: [true, 'Payment method is required'],
            default: PAYMENT_METHODS.CASH
        },
        appliedToDebts: {
            type: [appliedDebtSchema],
            default: []
        },
        addedToCreditBalance: {
            type: mongoose.Schema.Types.Decimal128,
            default: () => mongoose.Types.Decimal128.fromString('0'),
            get: (value) => value ? parseFloat(value.toString()) : 0
        },
        idempotencyKey: {
            type: String,
            sparse: true,
            unique: true,
            index: true
        },
        paidAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Created by user is required']
        },
        notes: {
            type: String,
            maxlength: [500, 'Notes cannot exceed 500 characters']
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true, getters: true },
        toObject: { virtuals: true, getters: true }
    }
);

// Apply tenant isolation plugin
paymentSchema.plugin(tenantIsolationPlugin);

// Indexes
paymentSchema.index({ companyId: 1, customerId: 1, paidAt: -1 });
paymentSchema.index({ companyId: 1, paidAt: -1 });
paymentSchema.index({ companyId: 1, createdBy: 1 });
paymentSchema.index({ idempotencyKey: 1 }, { sparse: true, unique: true });

// Virtual for customer
paymentSchema.virtual('customer', {
    ref: 'Customer',
    localField: 'customerId',
    foreignField: '_id',
    justOne: true
});

// Virtual for creator
paymentSchema.virtual('creator', {
    ref: 'User',
    localField: 'createdBy',
    foreignField: '_id',
    justOne: true
});

// Validate that sum of applied amounts doesn't exceed payment amount
paymentSchema.pre('validate', function (next) {
    if (this.appliedToDebts && this.appliedToDebts.length > 0) {
        const totalApplied = this.appliedToDebts.reduce((sum, applied) => {
            const amount = parseFloat(applied.amount.toString());
            return sum + amount;
        }, 0);

        const paymentAmount = parseFloat(this.amount.toString());
        const creditBalance = parseFloat(this.addedToCreditBalance.toString());

        // Total applied + credit balance should equal payment amount
        const total = totalApplied + creditBalance;
        const diff = Math.abs(total - paymentAmount);

        if (diff > 0.01) { // Allow 1 cent tolerance for rounding
            return next(new Error(
                `Sum of applied amounts (${totalApplied}) and credit balance (${creditBalance}) ` +
                `must equal payment amount (${paymentAmount})`
            ));
        }
    }

    next();
});

// Static method to find by idempotency key
paymentSchema.statics.findByIdempotencyKey = function (key) {
    return this.findOne({ idempotencyKey: key });
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
