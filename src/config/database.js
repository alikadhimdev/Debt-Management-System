/**
 * MongoDB Database Configuration
 * Handles connection setup, error handling, and graceful shutdown
 */

import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDatabase = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/debt_management';

        const options = {
            // Recommended options for production
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
            // Enable retryable writes for replica sets
            retryWrites: true,
            w: 'majority'
        };

        const conn = await mongoose.connect(MONGODB_URI, options);

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        logger.info(`Database Name: ${conn.connection.name}`);

        // Check if replica set is available (required for transactions)
        const admin = conn.connection.db.admin();
        try {
            const replStatus = await admin.command({ replSetGetStatus: 1 });
            logger.info('Replica set detected - Transactions enabled');
        } catch (error) {
            logger.warn('⚠️  WARNING: Not running in replica set mode. Multi-document transactions will fail!');
            logger.warn('   For development, you can run a single-node replica set.');
            logger.warn('   See: https://docs.mongodb.com/manual/tutorial/convert-standalone-to-replica-set/');
        }

        // Connection event handlers
        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// Graceful shutdown
const disconnectDatabase = async () => {
    try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
    } catch (error) {
        logger.error(`Error closing MongoDB connection: ${error.message}`);
        throw error;
    }
};

export { connectDatabase, disconnectDatabase };
