/**
 * User Model
 * Manages user authentication and authorization with multi-tenant support
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
        },
        passwordHash: {
            type: String,
            required: [true, 'Password is required'],
            select: false // Don't include password in queries by default
        },
        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            required: [true, 'User role is required'],
            default: USER_ROLES.VIEWER
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company ID is required'],
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        lastLoginAt: {
            type: Date
        }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.passwordHash;
                return ret;
            }
        },
        toObject: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.passwordHash;
                return ret;
            }
        }
    }
);

// Compound unique index: email must be unique per company
userSchema.index({ companyId: 1, email: 1 }, { unique: true });
userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for company
userSchema.virtual('company', {
    ref: 'Company',
    localField: 'companyId',
    foreignField: '_id',
    justOne: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('passwordHash')) return next();

    try {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        this.passwordHash = await bcrypt.hash(this.passwordHash, rounds);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.passwordHash);
    } catch (error) {
        return false;
    }
};

// Instance method to check if user has specific role
userSchema.methods.hasRole = function (...roles) {
    return roles.includes(this.role);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function () {
    this.lastLoginAt = new Date();
    await this.save();
};

const User = mongoose.model('User', userSchema);

export default User;
