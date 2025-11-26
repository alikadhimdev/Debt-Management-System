/**
 * Server Entry Point
 * Starts the Express server and initializes connections
 */

import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { initializeWorkers, shutdownWorkers } from './jobs/worker.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;

/**
 * Start the server
 */
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDatabase();

        // Connect to Redis
        await connectRedis();

        // Initialize background workers
        await initializeWorkers();

        // Start Express server
        server = app.listen(PORT, () => {
            logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║      Debt Management System API v2.0                      ║
║                                                            ║
║      Environment: ${NODE_ENV.padEnd(15)}                       ║
║      Port:        ${PORT.toString().padEnd(15)}                       ║
║      Status:      RUNNING                                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
            logger.info(`API available at http://localhost:${PORT}/api/v1`);
        });

    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
    logger.info(`\n${signal} received. Starting graceful shutdown...`);

    try {
        // Stop accepting new requests
        if (server) {
            server.close(() => {
                logger.info('HTTP server closed');
            });
        }

        // Shutdown workers
        await shutdownWorkers();

        // Disconnect from databases
        await disconnectRedis();
        await disconnectDatabase();

        logger.info('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error(`Error during shutdown: ${error.message}`);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
