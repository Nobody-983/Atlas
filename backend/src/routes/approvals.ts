import { Router } from 'express';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { recordAuditEvent } from '../utils/audit.js';
import { ForbiddenError, NotFoundError, RiskBlockedError } from '../utils/errors.js';

export const approvalsRouter = Router();

// GET /api/v1/approvals/pending - Inbox of payment requests awaiting authorization
approvalsRouter.get('/pending', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || req.orgMember?.organisationId;
    if (!orgId) {
      return res.json({ success: true, pendingApprovals: [] });
    }

    const result = await query(
      `SELECT pr.*, 
              r.display_name as recipient_name, r.country as recipient_country, r.is_flagged, r.flag_reason,
              ra.bank_name, ra.account_number, ra.currency as account_currency,
              s.name as supplier_name,
              i.invoice_number, i.file_url,
              u.full_name as creator_name,
              pq.exchange_rate, pq.provider_fee_minor, pq.total_charge_minor, pq.expires_at,
              (SELECT COUNT(*) FROM payment_approvals pa WHERE pa.payment_request_id = pr.id AND pa.decision = 'approved') as current_approvals_count
       FROM payment_requests pr
       JOIN recipients r ON r.id = pr.recipient_id
       JOIN recipient_accounts ra ON ra.id = pr.recipient_account_id
       LEFT JOIN suppliers s ON s.id = r.supplier_id
       LEFT JOIN invoices i ON i.id = pr.invoice_id
       LEFT JOIN users u ON u.id = pr.created_by
       LEFT JOIN payment_quotes pq ON pq.payment_request_id = pr.id
       WHERE pr.organisation_id = $1 
         AND pr.status = 'awaiting_approval'
       ORDER BY pr.created_at DESC`,
      [orgId]
    );

    res.json({ success: true, pendingApprovals: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/approvals/decide - Authorize or reject a payment request
approvalsRouter.post('/decide', async (req, res, next) => {
  try {
    const approverId =
      req.user?.id ||
      req.body.approverId ||
      (config.nodeEnv === 'test' ? 'b1000000-0000-0000-0000-000000000001' : undefined);
    if (!approverId) {
      throw new ForbiddenError('Authenticated approver ID is required.');
    }
    const {
      paymentRequestId,
      decision, // 'approved' | 'rejected'
      rejectionReason,
      notes,
    } = req.body;

    if (!paymentRequestId || !decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'paymentRequestId and valid decision (approved/rejected) required.' });
    }

    const prRes = await query(
      `SELECT pr.*, u.full_name as approver_name, om.role as approver_role
       FROM payment_requests pr
       LEFT JOIN users u ON u.id = $1
       LEFT JOIN organisation_members om ON om.user_id = $1 AND om.organisation_id = pr.organisation_id
       WHERE pr.id = $2`,
      [approverId, paymentRequestId]
    );

    if (prRes.rows.length === 0) {
      throw new NotFoundError('Payment request not found.');
    }

    const pr = prRes.rows[0];

    // Verify approver permission
    if (!pr.approver_role || !['owner', 'admin', 'finance_manager', 'approver'].includes(pr.approver_role)) {
      throw new ForbiddenError('You do not have authorization to approve payment requests.');
    }

    // Guard: Cannot approve a transaction marked BLOCKED by ProofRail
    if (decision === 'approved' && pr.risk_level === 'blocked') {
      throw new RiskBlockedError('Cannot approve: ProofRail marked this payment request as BLOCKED due to severe security violations.');
    }

    const approvalResult = await withTransaction(async (client) => {
      // Record approval decision
      const appRes = await client.query(
        `INSERT INTO payment_approvals
         (payment_request_id, approver_id, step_number, decision, rejection_reason, notes)
         VALUES ($1, $2, 1, $3, $4, $5)
         RETURNING *`,
        [paymentRequestId, approverId, decision, rejectionReason || null, notes || null]
      );

      // Update payment request status
      const newStatus = decision === 'approved' ? 'approved' : 'rejected';
      await client.query(
        `UPDATE payment_requests
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [newStatus, paymentRequestId]
      );

      return appRes.rows[0];
    });

    await recordAuditEvent({
      organisationId: pr.organisation_id,
      resourceType: 'approval',
      resourceId: approvalResult.id,
      action: decision === 'approved' ? 'payment_approved' : 'payment_rejected',
      actorId: approverId,
      actorName: pr.approver_name || 'Approver',
      actorRole: pr.approver_role,
      metadata: {
        paymentRequestId,
        decision,
        rejectionReason,
        notes,
      },
    });

    res.json({
      success: true,
      message: `Payment request has been ${decision}.`,
      approval: approvalResult,
    });
  } catch (err) {
    next(err);
  }
});

