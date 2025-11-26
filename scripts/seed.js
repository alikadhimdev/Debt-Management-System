/**
 * Database Seeder
 * Creates sample data for development and testing
 * 
 * WARNING: This will delete all existing data!
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import Company from '../src/models/Company.js';
import User from '../src/models/User.js';
import Customer from '../src/models/Customer.js';
import Debt from '../src/models/Debt.js';
import logger from '../src/utils/logger.js';

const seedDatabase = async () => {
    try {
        logger.info('Starting database seed...');

        // Connect to database
        await connectDatabase();

        // Clear existing data
        logger.info('Clearing existing data...');
        await Promise.all([
            Company.deleteMany({}),
            User.deleteMany({}),
            Customer.deleteMany({}),
            Debt.deleteMany({})
        ]);

        // Create companies
        logger.info('Creating companies...');
        const company1 = await Company.create({
            name: 'Demo Store Inc.',
            currency: 'USD',
            timezone: 'America/New_York'
        });

        const company2 = await Company.create({
            name: 'بقالة النور',
            currency: 'IQD',
            timezone: 'Asia/Baghdad'
        });

        // Create users
        logger.info('Creating users...');
        const passwordHash = await bcrypt.hash('password123', 10);

        const users = await User.create([
            {
                email: 'admin@demo.com',
                passwordHash,
                role: 'admin',
                companyId: company1._id,
                isActive: true
            },
            {
                email: 'accountant@demo.com',
                passwordHash,
                role: 'accountant',
                companyId: company1._id,
                isActive: true
            },
            {
                email: 'cashier@demo.com',
                passwordHash,
                role: 'cashier',
                companyId: company1._id,
                isActive: true
            },
            {
                email: 'admin@noor.com',
                passwordHash,
                role: 'admin',
                companyId: company2._id,
                isActive: true
            }
        ]);

        // Create customers
        logger.info('Creating customers...');
        const customers = await Customer.create([
            {
                companyId: company1._id,
                name: 'John\'s Restaurant',
                contact: [
                    { type: 'phone', value: '+1-555-0101', isPrimary: true },
                    { type: 'email', value: 'john@restaurant.com', isPrimary: false }
                ],
                creditLimit: mongoose.Types.Decimal128.fromString('10000'),
                debtBalance: mongoose.Types.Decimal128.fromString('2500'),
                creditBalance: mongoose.Types.Decimal128.fromString('0'),
                version: 0
            },
            {
                companyId: company1._id,
                name: 'Sarah\'s Bakery',
                contact: [
                    { type: 'phone', value: '+1-555-0202', isPrimary: true }
                ],
                creditLimit: mongoose.Types.Decimal128.fromString('5000'),
                debtBalance: mongoose.Types.Decimal128.fromString('1250'),
                creditBalance: mongoose.Types.Decimal128.fromString('100'),
                version: 0
            },
            {
                companyId: company1._id,
                name: 'Mike\'s Coffee Shop',
                contact: [
                    { type: 'phone', value: '+1-555-0303', isPrimary: true },
                    { type: 'email', value: 'mike@coffee.com', isPrimary: false }
                ],
                creditLimit: mongoose.Types.Decimal128.fromString('3000'),
                debtBalance: mongoose.Types.Decimal128.fromString('750.50'),
                creditBalance: mongoose.Types.Decimal128.fromString('0'),
                version: 0
            },
            {
                companyId: company2._id,
                name: 'محل الرحمن',
                contact: [
                    { type: 'phone', value: '+964-770-1234567', isPrimary: true }
                ],
                creditLimit: mongoose.Types.Decimal128.fromString('5000000'),
                debtBalance: mongoose.Types.Decimal128.fromString('1500000'),
                creditBalance: mongoose.Types.Decimal128.fromString('0'),
                version: 0
            }
        ]);

        // Create debts
        logger.info('Creating debts...');
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

        await Debt.create([
            {
                companyId: company1._id,
                customerId: customers[0]._id,
                reference: 'INV-001',
                totalAmount: mongoose.Types.Decimal128.fromString('1500'),
                outstandingAmount: mongoose.Types.Decimal128.fromString('1500'),
                status: 'open',
                agingBucket: '31-60',
                dueAt: sixtyDaysAgo,
                items: [
                    {
                        description: 'Fresh vegetables - bulk order',
                        quantity: 50,
                        price: mongoose.Types.Decimal128.fromString('30'),
                        total: mongoose.Types.Decimal128.fromString('1500')
                    }
                ]
            },
            {
                companyId: company1._id,
                customerId: customers[0]._id,
                reference: 'INV-002',
                totalAmount: mongoose.Types.Decimal128.fromString('1000'),
                outstandingAmount: mongoose.Types.Decimal128.fromString('1000'),
                status: 'open',
                agingBucket: 'current',
                dueAt: fifteenDaysFromNow,
                items: [
                    {
                        description: 'Meat products',
                        quantity: 25,
                        price: mongoose.Types.Decimal128.fromString('40'),
                        total: mongoose.Types.Decimal128.fromString('1000')
                    }
                ]
            },
            {
                companyId: company1._id,
                customerId: customers[1]._id,
                reference: 'INV-003',
                totalAmount: mongoose.Types.Decimal128.fromString('1250'),
                outstandingAmount: mongoose.Types.Decimal128.fromString('1250'),
                status: 'open',
                agingBucket: '0-30',
                dueAt: thirtyDaysAgo,
                items: [
                    {
                        description: 'Flour - 50kg bags',
                        quantity: 10,
                        price: mongoose.Types.Decimal128.fromString('50'),
                        total: mongoose.Types.Decimal128.fromString('500')
                    },
                    {
                        description: 'Sugar - 25kg bags',
                        quantity: 15,
                        price: mongoose.Types.Decimal128.fromString('50'),
                        total: mongoose.Types.Decimal128.fromString('750')
                    }
                ]
            },
            {
                companyId: company1._id,
                customerId: customers[2]._id,
                reference: 'INV-004',
                totalAmount: mongoose.Types.Decimal128.fromString('750.50'),
                outstandingAmount: mongoose.Types.Decimal128.fromString('750.50'),
                status: 'open',
                agingBucket: '90+',
                dueAt: ninetyDaysAgo,
                items: [
                    {
                        description: 'Coffee beans - premium blend',
                        quantity: 15,
                        price: mongoose.Types.Decimal128.fromString('50.03'),
                        total: mongoose.Types.Decimal128.fromString('750.50')
                    }
                ]
            }
        ]);

        logger.info('✓ Database seeded successfully!');
        logger.info('\nDemo Credentials:');
        logger.info('=================');
        logger.info('Admin: admin@demo.com / password123');
        logger.info('Accountant: accountant@demo.com / password123');
        logger.info('Cashier: cashier@demo.com / password123');
        logger.info('\nCompanies:');
        logger.info('- Demo Store Inc. (English)');
        logger.info('- بقالة النور (Arabic)');

    } catch (error) {
        logger.error(`Seed failed: ${error.message}`);
        throw error;
    } finally {
        await disconnectDatabase();
    }
};

// Run seeder
seedDatabase();
