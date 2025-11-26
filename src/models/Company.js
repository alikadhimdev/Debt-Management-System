/**
 * Company Model
 * Root entity for multi-tenant architecture
 */

import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
            maxlength: [200, 'Company name cannot exceed 200 characters']
        },
        currency: {
            type: String,
            required: [true, 'Currency is required'],
            uppercase: true,
            trim: true,
            default: 'USD',
            maxlength: [3, 'Currency code must be 3 characters (ISO 4217)'],
            minlength: [3, 'Currency code must be 3 characters (ISO 4217)']
        },
        timezone: {
            type: String,
            required: [true, 'Timezone is required'],
            default: 'UTC'
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
companySchema.index({ name: 1 });
companySchema.index({ isActive: 1, createdAt: -1 });

// Virtual for users
companySchema.virtual('users', {
    ref: 'User',
    localField: '_id',
    foreignField: 'companyId'
});

// Virtual for customers
companySchema.virtual('customers', {
    ref: 'Customer',
    localField: '_id',
    foreignField: 'companyId'
});

const Company = mongoose.model('Company', companySchema);

export default Company;
