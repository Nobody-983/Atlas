import { Router } from 'express';
import { query } from '../db.js';

export const analyticsRouter = Router();

// GET /api/v1/analytics/overview
analyticsRouter.get('/overview', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || req.orgMember?.organisationId;
    if (!orgId) {
      return res.json({
        success: true,
        summary: {
          paymentStatus: [],
          pendingApprovals: { count: '0', total_minor: '0' },
          invoices: { total_invoices: '0', pending_review: '0', approved_unpaid: '0', outstanding_minor: '0' },
          corridors: [],
          topSuppliers: [],
          risks: { total_warnings: '0', critical_count: '0', warning_count: '0' },
        },
      });
    }

    // 1. Payment Status Aggregates
    const statusStats = await query(
      `SELECT 
         status,
         COUNT(*) as count,
         COALESCE(SUM(source_amount_minor), 0) as total_source_minor,
         COALESCE(SUM(destination_amount_minor), 0) as total_dest_minor,
         COALESCE(SUM(provider_fee_minor), 0) as total_fees_minor
       FROM payments
       WHERE organisation_id = $1
       GROUP BY status`,
      [orgId]
    );

    // 2. Pending Approvals Volume
    const pendingRes = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(source_amount_minor), 0) as total_minor
       FROM payment_requests
       WHERE organisation_id = $1 AND status = 'awaiting_approval'`,
      [orgId]
    );

    // 3. Invoices Due & Outstanding
    const invoiceStats = await query(
      `SELECT 
         COUNT(*) as total_invoices,
         COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review,
         COUNT(*) FILTER (WHERE status = 'approved') as approved_unpaid,
         COALESCE(SUM(amount_minor) FILTER (WHERE status IN ('pending_review', 'approved')), 0) as outstanding_minor
       FROM invoices
       WHERE organisation_id = $1`,
      [orgId]
    );

    // 4. Volume by Corridor / Destination Currency
    const corridorStats = await query(
      `SELECT 
         destination_currency,
         COUNT(*) as tx_count,
         COALESCE(SUM(destination_amount_minor), 0) as total_volume_minor
       FROM payments
       WHERE organisation_id = $1 AND status IN ('completed', 'processing')
       GROUP BY destination_currency
       ORDER BY total_volume_minor DESC`,
      [orgId]
    );

    // 5. Top Suppliers by Payout Volume
    const supplierStats = await query(
      `SELECT s.id, s.name, s.country, 
              COALESCE(SUM(p.destination_amount_minor), 0) as total_volume_minor,
              COUNT(p.id) as payment_count
       FROM suppliers s
       LEFT JOIN recipients r ON r.supplier_id = s.id
       LEFT JOIN payments p ON p.recipient_id = r.id AND p.status IN ('completed', 'processing')
       WHERE s.organisation_id = $1
       GROUP BY s.id, s.name, s.country
       ORDER BY total_volume_minor DESC
       LIMIT 5`,
      [orgId]
    );

    // 6. Active Risk Warnings Count
    const riskStats = await query(
      `SELECT 
         COUNT(*) as total_warnings,
         COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
         COUNT(*) FILTER (WHERE severity = 'warning') as warning_count
       FROM invoice_risk_findings irf
       JOIN invoices i ON i.id = irf.invoice_id
       WHERE i.organisation_id = $1 AND irf.is_resolved = FALSE`,
      [orgId]
    );

    res.json({
      success: true,
      summary: {
        paymentStatus: statusStats.rows,
        pendingApprovals: pendingRes.rows[0],
        invoices: invoiceStats.rows[0],
        corridors: corridorStats.rows,
        topSuppliers: supplierStats.rows,
        risks: riskStats.rows[0],
      },
    });
  } catch (err) {
    next(err);
  }
});

