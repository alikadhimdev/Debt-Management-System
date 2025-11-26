/**
 * Report Controller
 * Handles report generation endpoints
 */

import * as reportService from '../../services/reportService.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/v1/reports/aging
 * Get aging report
 */
export const getAgingReport = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { detailed, agingBucket } = req.query;

        let report;

        if (detailed === true || detailed === 'true') {
            report = await reportService.getAgingReportDetailed(companyId, agingBucket);
        } else {
            report = await reportService.getAgingReport(companyId);
        }

        res.status(200).json({
            success: true,
            data: { report }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/reports/customer-balance
 * Get customer balance summary
 */
export const getCustomerBalanceSummary = async (req, res, next) => {
    try {
        const { companyId } = req;

        const summary = await reportService.getCustomerBalanceSummary(companyId);

        res.status(200).json({
            success: true,
            data: { summary }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/reports/payment-summary
 * Get payment summary for a period
 */
export const getPaymentSummary = async (req, res, next) => {
    try {
        const { companyId } = req;
        const { startDate, endDate } = req.query;

        const summary = await reportService.getPaymentSummary(companyId, startDate, endDate);

        res.status(200).json({
            success: true,
            data: { summary }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getAgingReport,
    getCustomerBalanceSummary,
    getPaymentSummary
};
