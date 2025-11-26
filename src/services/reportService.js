/**
 * Report Service
 * Generates financial reports and analytics
 */

import Debt from '../models/Debt.js';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import * as decimalMath from '../utils/decimalMath.js';
import { AGING_BUCKETS, DEBT_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Get aging report - debts grouped by aging buckets
 */
export const getAgingReport = async (companyId) => {
    try {
        const agingBuckets = Object.values(AGING_BUCKETS);

        const pipeline = [
            {
                $match: {
                    companyId: companyId,
                    status: { $in: [DEBT_STATUS.OPEN, DEBT_STATUS.PARTIAL] }
                }
            },
            {
                $group: {
                    _id: '$agingBucket',
                    count: { $sum: 1 },
                    totalOutstanding: { $sum: { $toDouble: '$outstandingAmount' } }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ];

        const results = await Debt.aggregate(pipeline);

        // Format results
        const report = {
            buckets: {},
            total: {
                count: 0,
                amount: 0
            }
        };

        // Initialize all buckets
        agingBuckets.forEach(bucket => {
            report.buckets[bucket] = {
                count: 0,
                totalOutstanding: 0
            };
        });

        // Fill in actual data
        results.forEach(result => {
            report.buckets[result._id] = {
                count: result.count,
                totalOutstanding: result.totalOutstanding
            };
            report.total.count += result.count;
            report.total.amount += result.totalOutstanding;
        });

        return report;
    } catch (error) {
        logger.error(`Failed to generate aging report: ${error.message}`);
        throw error;
    }
};

/**
 * Get aging report with customer breakdown
 */
export const getAgingReportDetailed = async (companyId, agingBucket = null) => {
    try {
        const query = {
            companyId,
            status: { $in: [DEBT_STATUS.OPEN, DEBT_STATUS.PARTIAL] }
        };

        if (agingBucket) {
            query.agingBucket = agingBucket;
        }

        const debts = await Debt.find(query)
            .populate('customer', 'name contact debtBalance')
            .sort({ agingBucket: 1, dueAt: 1 });

        // Group by customer
        const customerMap = new Map();

        for (const debt of debts) {
            const customerId = debt.customerId.toString();

            if (!customerMap.has(customerId)) {
                customerMap.set(customerId, {
                    customer: debt.customer,
                    debts: [],
                    totalOutstanding: 0,
                    count: 0
                });
            }

            const entry = customerMap.get(customerId);
            entry.debts.push({
                id: debt._id,
                reference: debt.reference,
                totalAmount: decimalMath.toNumber(debt.totalAmount),
                outstandingAmount: decimalMath.toNumber(debt.outstandingAmount),
                dueAt: debt.dueAt,
                agingBucket: debt.agingBucket
            });
            entry.totalOutstanding += decimalMath.toNumber(debt.outstandingAmount);
            entry.count += 1;
        });

        const customers = Array.from(customerMap.values())
            .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

        return {
            totalCustomers: customers.length,
            totalDebts: debts.length,
            customers
        };
    } catch (error) {
        logger.error(`Failed to generate detailed aging report: ${error.message}`);
        throw error;
    }
};

/**
 * Get customer balance summary
 */
export const getCustomerBalanceSummary = async (companyId) => {
    try {
        const pipeline = [
            {
                $match: {
                    companyId: companyId,
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalCustomers: { $sum: 1 },
                    totalDebtBalance: { $sum: { $toDouble: '$debtBalance' } },
                    totalCreditBalance: { $sum: { $toDouble: '$creditBalance' } },
                    customersWithDebt: {
                        $sum: {
                            $cond: [{ $gt: [{ $toDouble: '$debtBalance' }, 0] }, 1, 0]
                        }
                    },
                    customersWithCredit: {
                        $sum: {
                            $cond: [{ $gt: [{ $toDouble: '$creditBalance' }, 0] }, 1, 0]
                        }
                    }
                }
            }
        ];

        const results = await Customer.aggregate(pipeline);

        if (results.length === 0) {
            return {
                totalCustomers: 0,
                totalDebtBalance: 0,
                totalCreditBalance: 0,
                customersWithDebt: 0,
                customersWithCredit: 0
            };
        }

        return results[0];
    } catch (error) {
        logger.error(`Failed to generate customer balance summary: ${error.message}`);
        throw error;
    }
};

/**
 * Get payment summary for a time period
 */
export const getPaymentSummary = async (companyId, startDate, endDate) => {
    try {
        const query = {
            companyId,
            paidAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        const pipeline = [
            { $match: query },
            {
                $group: {
                    _id: '$method',
                    count: { $sum: 1 },
                    totalAmount: { $sum: { $toDouble: '$amount' } }
                }
            },
            {
                $sort: { totalAmount: -1 }
            }
        ];

        const results = await Payment.aggregate(pipeline);

        const summary = {
            period: { startDate, endDate },
            byMethod: results,
            total: {
                count: 0,
                amount: 0
            }
        };

        results.forEach(result => {
            summary.total.count += result.count;
            summary.total.amount += result.totalAmount;
        });

        return summary;
    } catch (error) {
        logger.error(`Failed to generate payment summary: ${error.message}`);
        throw error;
    }
};

export default {
    getAgingReport,
    getAgingReportDetailed,
    getCustomerBalanceSummary,
    getPaymentSummary
};
