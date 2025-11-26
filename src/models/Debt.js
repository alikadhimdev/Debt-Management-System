/**
 * Debt Model
 * Manages invoices/debts with aging bucket support
 */

import mongoose from 'mongoose';
import tenantIsolationPlugin from './plugins/tenantIsolation.js';
import { DEBT_STATUS, AGING_BUCKETS } from '../config/constants.js';
import * as decimalMath from '../utils/decimalMath.js';

const debtItemSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'Item description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative']
    },
    price: {
        type: mongoose.Schema.Types.Decimal128,
        required: [true, 'Price is required'],
        get: (value) => value ? parseFloat(value.toString()) : 0
    },
    total: {
        type: mongoose.Schema.Types.Decimal128,
        get: (value) => value ? parseFloat(value.toString()) : 0
    }
}, { _id: false });

const debtSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: [true, 'Customer ID is required'],
            index: true
        },
        reference: {
            type: String,
            required: [true, 'Reference/Invoice number is required'],
            trim: true,
            maxlength: [100, 'Reference cannot exceed 100 characters']
        },
        totalAmount: {
            type: mongoose.Schema.Types.Decimal128,
            required: [true, 'Total amount is required'],
            get: (value) => value ? parseFloat(value.toString()) : 0
        },
        outstandingAmount: {
            type: mongoose.Schema.Types.Decimal128,
            required: [true, 'Outstanding amount is required'],
            get: (value) => value ? parseFloat(value.toString()) : 0,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(DEBT_STATUS),
            required: true,
            default: DEBT_STATUS.OPEN,
            index: true
        },
        agingBucket: {
            type: String,
            enum: Object.values(AGING_BUCKETS),
            default: AGING_BUCKETS.CURRENT,
            index: true
        },
        dueAt: {
            type: Date,
            required: [true, 'Due date is required'],
            index: true
        },
        items: {
            type: [debtItemSchema],
            required: [true, 'At least one item is required'],
            validate: {
                validator: function (items) {
                    return items && items.length > 0;
                },
                message: 'Debt must have at least one item'
            }
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
debtSchema.plugin(tenantIsolationPlugin);

// Indexes for efficient querying
debtSchema.index({ companyId: 1, customerId: 1, status: 1 });
debtSchema.index({ companyId: 1, agingBucket: 1 });
debtSchema.index({ companyId: 1, dueAt: 1 });
debtSchema.index({ companyId: 1, reference: 1 });
debtSchema.index({ dueAt: 1, status: 1 }); // For aging job

// Virtual for customer
debtSchema.virtual('customer', {
    ref: 'Customer',
    localField: 'customerId',
    foreignField: '_id',
    justOne: true
});

// Calculate item totals before validation
debtSchema.pre('validate', function (next) {
    if (this.items && this.items.length > 0) {
        this.items.forEach(item => {
            const quantity = item.quantity || 0;
            const price = decimalMath.fromDecimal128(item.price);
            const total = price.times(quantity);
            item.total = decimalMath.toDecimal128(total);
        });
    }
    next();
});

// Auto-update status based on outstanding amount
debtSchema.methods.updateStatus = function () {
    const outstanding = decimalMath.fromDecimal128(this.outstandingAmount);
    const total = decimalMath.fromDecimal128(this.totalAmount);

    if (this.status === DEBT_STATUS.CANCELLED) {
        // Don't change cancelled status
        return this.status;
    }

    if (outstanding.isZero()) {
        this.status = DEBT_STATUS.PAID;
    } else if (outstanding.lessThan(total)) {
        this.status = DEBT_STATUS.PARTIAL;
    } else {
        this.status = DEBT_STATUS.OPEN;
    }

    return this.status;
};

// Calculate aging bucket based on due date
debtSchema.methods.calculateAgingBucket = function () {
    if (this.status === DEBT_STATUS.PAID || this.status === DEBT_STATUS.CANCELLED) {
        return AGING_BUCKETS.CURRENT;
    }

    const now = new Date();
    const dueDate = new Date(this.dueAt);
    const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

    if (daysOverdue < 0) {
        return AGING_BUCKETS.CURRENT;
    } else if (daysOverdue <= 30) {
        return AGING_BUCKETS.DAYS_0_30;
    } else if (daysOverdue <= 60) {
        return AGING_BUCKETS.DAYS_31_60;
    } else if (daysOverdue <= 90) {
        return AGING_BUCKETS.DAYS_61_90;
    } else {
        return AGING_BUCKETS.DAYS_90_PLUS;
    }
};

// Static method to update aging buckets (used by background job)
debtSchema.statics.updateAgingBuckets = async function (companyId = null) {
    const query = {
        status: { $in: [DEBT_STATUS.OPEN, DEBT_STATUS.PARTIAL] }
    };

    if (companyId) {
        query.companyId = companyId;
    }

    const debts = await this.find(query);
    const bulkOps = [];

    for (const debt of debts) {
        const newBucket = debt.calculateAgingBucket();
        if (debt.agingBucket !== newBucket) {
            bulkOps.push({
                updateOne: {
                    filter: { _id: debt._id },
                    update: { $set: { agingBucket: newBucket } }
                }
            });
        }
    }

    if (bulkOps.length > 0) {
        return await this.bulkWrite(bulkOps);
    }

    return { modifiedCount: 0 };
};

const Debt = mongoose.model('Debt', debtSchema);

export default Debt;
