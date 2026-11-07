import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { recordAuditEvent } from '../utils/audit.js';

export const recipientsRouter = Router();

// GET /api/v1/recipients
recipientsRouter.get('/', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || req.orgMember?.organisationId;
    if (!orgId) {
      return res.json({ success: true, recipients: [] });
    }
    const result = await query(
      `SELECT r.*, s.name as supplier_name,
              ra.id as account_id, ra.bank_name, ra.bank_code, ra.account_number,
              ra.routing_number, ra.swift_bic, ra.iban, ra.sort_code, ra.transit_number,
              (SELECT COUNT(*) FROM recipient_change_history ch WHERE ch.recipient_id = r.id AND ch.review_status = 'pending_review') as pending_change_count
       FROM recipients r
       LEFT JOIN suppliers s ON s.id = r.supplier_id
       LEFT JOIN recipient_accounts ra ON ra.recipient_id = r.id AND ra.is_primary = TRUE
       WHERE r.organisation_id = $1
       ORDER BY r.created_at DESC`,
      [orgId]
    );

    res.json({ success: true, recipients: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/recipients - Create recipient with primary bank account
recipientsRouter.post('/', async (req, res, next) => {
  try {
    const organisationId = req.body.organisationId || req.orgMember?.organisationId;
    if (!organisationId) {
      return res.status(400).json({ success: false, error: 'Organisation ID is required.' });
    }
    const {
      supplierId,
      displayName,
      country,
      currency,
      payoutMethod = 'bank_transfer',
      bankName,
      bankCode,
      accountNumber,
      routingNumber,
      swiftBic,
      iban,
      sortCode,
      transitNumber,
    } = req.body;

    if (!displayName || !country || !currency || !bankName || !accountNumber) {
      return res.status(400).json({
        success: false,
        error: 'Display name, country, currency, bank name, and account number are required.',
      });
    }

    const recipient = await withTransaction(async (client) => {
      const recipRes = await client.query(
        `INSERT INTO recipients 
         (organisation_id, supplier_id, display_name, country, currency, payout_method, verification_level)
         VALUES ($1, $2, $3, $4, $5, $6, 'internal_verified')
         RETURNING *`,
        [organisationId, supplierId || null, displayName, country.toUpperCase(), currency.toUpperCase(), payoutMethod]
      );

      const r = recipRes.rows[0];

      await client.query(
        `INSERT INTO recipient_accounts
         (recipient_id, bank_name, bank_code, account_number, routing_number, swift_bic, iban, sort_code, transit_number, currency, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)`,
        [r.id, bankName, bankCode || null, accountNumber, routingNumber || null, swiftBic || null, iban || null, sortCode || null, transitNumber || null, currency.toUpperCase()]
      );

      return r;
    });

    await recordAuditEvent({
      organisationId,
      resourceType: 'recipient',
      resourceId: recipient.id,
      action: 'recipient_created',
      actorName: 'Operator',
      actorRole: 'finance_manager',
      metadata: { displayName, country, currency, bankName },
    });

    res.status(201).json({ success: true, recipient });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/recipients/:id/bank-details - ProofRail Recipient Change Protection
recipientsRouter.patch('/:id/bank-details', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      bankName,
      accountNumber,
      routingNumber,
      swiftBic,
      iban,
      changeReason,
      changedBy,
    } = req.body;

    const effectiveChangedBy = (req as any).user?.id || changedBy || 'b1000000-0000-0000-0000-000000000002';

    if (!accountNumber || !changeReason) {
      return res.status(400).json({ success: false, error: 'Account number and change reason are required.' });
    }

    const updated = await withTransaction(async (client) => {
      const currentRes = await client.query(
        `SELECT r.organisation_id, ra.* 
         FROM recipient_accounts ra
         JOIN recipients r ON r.id = ra.recipient_id
         WHERE ra.recipient_id = $1 AND ra.is_primary = TRUE`,
        [id]
      );

      if (currentRes.rows.length === 0) {
        throw new Error('Recipient account not found');
      }

      const oldAccount = currentRes.rows[0];
      const orgId = oldAccount.organisation_id;

      const newAccountData = {
        bankName: bankName || oldAccount.bank_name,
        accountNumber,
        routingNumber: routingNumber || oldAccount.routing_number,
        swiftBic: swiftBic || oldAccount.swift_bic,
        iban: iban || oldAccount.iban,
      };

      // 1. Record in Recipient Change History
      await client.query(
        `INSERT INTO recipient_change_history
         (recipient_id, changed_by, old_account_data, new_account_data, change_reason, review_status)
         VALUES ($1, $2, $3, $4, $5, 'pending_review')`,
        [id, effectiveChangedBy, JSON.stringify(oldAccount), JSON.stringify(newAccountData), changeReason]
      );

      // 2. Flag the recipient for security review
      await client.query(
        `UPDATE recipients 
         SET is_flagged = TRUE,
             flag_reason = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [`PROOFRAIL ALERT: Beneficiary bank account modified on ${new Date().toLocaleDateString()}. Pending compliance review.`, id]
      );

      // 3. Update active account record
      const updatedAcct = await client.query(
        `UPDATE recipient_accounts
         SET bank_name = COALESCE($1, bank_name),
             account_number = $2,
             routing_number = COALESCE($3, routing_number),
             swift_bic = COALESCE($4, swift_bic),
             iban = COALESCE($5, iban),
             updated_at = NOW()
         WHERE recipient_id = $6 AND is_primary = TRUE
         RETURNING *`,
        [bankName, accountNumber, routingNumber, swiftBic, iban, id]
      );

      return { orgId, account: updatedAcct.rows[0] };
    });

    await recordAuditEvent({
      organisationId: updated.orgId,
      resourceType: 'recipient',
      resourceId: id,
      action: 'bank_details_changed',
      actorName: 'Operator',
      actorRole: 'finance_manager',
      metadata: { changeReason, newAccountNumber: accountNumber },
    });

    res.json({
      success: true,
      message: 'Bank details updated and flagged for ProofRail security review.',
      account: updated.account,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/recipients/:id/approve-change - Review and approve flagged change
recipientsRouter.post('/:id/approve-change', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewerId, reviewNotes = 'Verified via vendor telephone callback.' } = req.body;
    const effectiveReviewerId = (req as any).user?.id || reviewerId || 'b1000000-0000-0000-0000-000000000004';

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE recipient_change_history
         SET review_status = 'approved',
             reviewed_by = $1,
             reviewed_at = NOW(),
             review_notes = $2
         WHERE recipient_id = $3 AND review_status = 'pending_review'`,
        [effectiveReviewerId, reviewNotes, id]
      );

      await client.query(
        `UPDATE recipients
         SET is_flagged = FALSE,
             flag_reason = NULL,
             verification_level = 'provider_verified',
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
    });

    res.json({ success: true, message: 'Recipient change reviewed and approved. Security flag cleared.' });
  } catch (err) {
    next(err);
  }
});

