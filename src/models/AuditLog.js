/**
 * AuditLog Model
 * Tracks all financial and critical operations for compliance and debugging
 */

import mongoose from 'mongoose';
import tenantIsolationPlugin from './plugins/tenantIsolation.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

const auditLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true
        },
        action: {
            type: String,
            enum: Object.values(AUDIT_ACTIONS),
            required: [true, 'Action is required'],
            index: true
        },
        entity: {
            type: String,
            required: [true, 'Entity type is required'],
            index: true
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Entity ID is required'],
            index: true
        },
        payload: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        ipAddress: {
            type: String,
            trim: true
        },
        userAgent: {
            type: String,
            trim: true
        },
        timestamp: {
            type: Date,
            required: true,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: false, // Using custom timestamp field
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Apply tenant isolation plugin
auditLogSchema.plugin(tenantIsolationPlugin);

// Indexes for efficient querying
auditLogSchema.index({ companyId: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, userId: 1, timestamp: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, action: 1, timestamp: -1 });

// Virtual for user
auditLogSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});

// Static method to log an action
auditLogSchema.statics.logAction = async function ({
    companyId,
    userId,
    action,
    entity,
    entityId,
    payload,
    ipAddress = null,
    userAgent = null
}) {
    try {
        const log = new this({
            companyId,
            userId,
            action,
            entity,
            entityId,
            payload,
            ipAddress,
            userAgent,
            timestamp: new Date()
        });

        await log.save();
        return log;
    } catch (error) {
        // Don't let audit log failures break the main operation
        console.error('Failed to create audit log:', error);
        return null;
    }
};

// Static method to get recent logs for an entity
auditLogSchema.statics.getEntityHistory = function (companyId, entity, entityId, limit = 50) {
    return this.find({ companyId, entity, entityId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('user', 'email role');
};

// Static method to get changes since a timestamp (for sync)
auditLogSchema.statics.getChangesSince = function (companyId, since, limit = 100) {
    return this.find({
        companyId,
        timestamp: { $gt: new Date(since) }
    })
        .sort({ timestamp: 1 })
        .limit(limit);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
