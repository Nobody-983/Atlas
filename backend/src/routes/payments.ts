import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../config.js';
import { blaaizClient } from '../blaaiz/client.js';
import { query, withTransaction } from '../db.js';
import { ProofRailEngine } from '../proofrail/engine.js';
import { recordAuditEvent } from '../utils/audit.js';
import { BadRequestError, PolicyViolationError, RiskBlockedError } from '../utils/errors.js';
import { toMinorUnits } from '../utils/money.js';

export const paymentsRouter = Router();

// GET /api/v1/payments
paymentsRouter.get('/', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || req.orgMember?.organisationId;
    if (!orgId) {
      return res.json({ success: true, payments: [] });
    }
    const { status, recipientId, search } = req.query;

    let sql = `
      SELECT p.*, r.display_name as recipient_name, r.country as recipient_country,
             ra.bank_name, ra.account_number,
             s.name as supplier_name,
             u.full_name as initiator_name
      FROM payments p
      JOIN recipients r ON r.id = p.recipient_id
      JOIN recipient_accounts ra ON ra.id = p.recipient_account_id
      LEFT JOIN suppliers s ON s.id = r.supplier_id
      LEFT JOIN users u ON u.id = p.initiated_by
      WHERE p.organisation_id = $1
    `;
    const params: any[] = [orgId];

    if (status) {
      params.push(status);
      sql += ` AND p.status = $${params.length}`;
    }
    if (recipientId) {
      params.push(recipientId);
      sql += ` AND p.recipient_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.provider_reference ILIKE $${params.length} OR r.display_name ILIKE $${params.length} OR s.name ILIKE $${params.length})`;
    }

    sql += ` ORDER BY p.initiated_at DESC`;

    const result = await query(sql, params);
    res.json({ success: true, payments: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/payments/:id - Detailed Payment Inspector
paymentsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const paymentRes = await query(
      `SELECT p.*, r.display_name as recipient_name, r.country as recipient_country, r.is_flagged, r.flag_reason,
              ra.bank_name, ra.account_number, ra.routing_number, ra.swift_bic, ra.iban,
              s.name as supplier_name, s.contact_email,
              u.full_name as initiator_name,
              pq.exchange_rate, pq.provider_fee_minor, pq.quote_reference,
              pr.purpose, pr.risk_level, pr.risk_score
       FROM payments p
       JOIN recipients r ON r.id = p.recipient_id
       JOIN recipient_accounts ra ON ra.id = p.recipient_account_id
       LEFT JOIN suppliers s ON s.id = r.supplier_id
       LEFT JOIN users u ON u.id = p.initiated_by
       LEFT JOIN payment_quotes pq ON pq.id = p.quote_id
       LEFT JOIN payment_requests pr ON pr.id = p.payment_request_id
       WHERE p.id = $1`,
      [id]
    );

    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const payment = paymentRes.rows[0];

    const auditEvents = await query(
      `SELECT * FROM payment_audit_events 
       WHERE resource_id = $1 OR resource_id = $2
       ORDER BY created_at ASC`,
      [id, payment.payment_request_id]
    );

    const providerEvents = await query(
      `SELECT * FROM payment_provider_events WHERE payment_id = $1 ORDER BY received_at DESC`,
      [id]
    );

    const approvals = await query(
      `SELECT pa.*, u.full_name as approver_name, om.role as approver_role
       FROM payment_approvals pa
       JOIN users u ON u.id = pa.approver_id
       LEFT JOIN organisation_members om ON om.user_id = u.id AND om.organisation_id = $1
       WHERE pa.payment_request_id = $2
       ORDER BY pa.decided_at ASC`,
      [payment.organisation_id, payment.payment_request_id]
    );

    res.json({
      success: true,
      payment,
      auditEvents: auditEvents.rows,
      providerEvents: providerEvents.rows,
      approvals: approvals.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payments/request - Prepare payment request with ProofRail Evaluation
paymentsRouter.post('/request', async (req, res, next) => {
  try {
    const organisationId = req.body.organisationId || req.orgMember?.organisationId;
    if (!organisationId) {
      throw new BadRequestError('Organisation ID is required.');
    }
    const createdBy =
      req.user?.id ||
      req.body.createdBy ||
      (config.nodeEnv === 'test' ? 'b1000000-0000-0000-0000-000000000002' : undefined);
    if (!createdBy) {
      throw new BadRequestError('User authentication required to initiate payment.');
    }
    const {
      invoiceId,
      recipientId,
      sourceCurrency = 'NGN',
      destinationCurrency = 'USD',
      amount, // In destination currency or source currency
      purpose,
    } = req.body;

    if (!recipientId || !amount || !purpose) {
      throw new BadRequestError('Recipient, amount, and purpose are required.');
    }

    // 1. Fetch recipient and account details
    const recipRes = await query(
      `SELECT r.*, ra.id as account_id, ra.bank_name, ra.account_number, ra.currency, ra.routing_number, ra.is_primary,
              s.name as supplier_name, s.id as supplier_id
       FROM recipients r
       JOIN recipient_accounts ra ON ra.recipient_id = r.id AND ra.is_primary = TRUE
       LEFT JOIN suppliers s ON s.id = r.supplier_id
       WHERE r.id = $1`,
      [recipientId]
    );

    if (recipRes.rows.length === 0) {
      throw new BadRequestError('Recipient account not found.');
    }
    const recip = recipRes.rows[0];

    // 2. Fetch change history
    const changeHistRes = await query(
      `SELECT * FROM recipient_change_history WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [recipientId]
    );

    // 3. Obtain quote from Blaaiz
    const quoteBreakdown = await blaaizClient.getFeeBreakdown({
      from_currency_id: sourceCurrency,
      to_currency_id: destinationCurrency,
      to_amount: parseFloat(amount),
    });

    const sourceAmountMinor = toMinorUnits(quoteBreakdown.from_amount, sourceCurrency);
    const destAmountMinor = toMinorUnits(quoteBreakdown.to_amount, destinationCurrency);

    // 4. Run ProofRail Risk & Policy Engine
    const proofRailReport = await ProofRailEngine.evaluate({
      organisationId,
      supplierId: recip.supplier_id,
      supplierName: recip.supplier_name,
      recipientId: recip.id,
      recipientName: recip.display_name,
      recipientAccount: {
        bankName: recip.bank_name,
        accountNumber: recip.account_number,
        currency: recip.currency,
        routingNumber: recip.routing_number,
        isPrimary: recip.is_primary,
      },
      invoiceId,
      invoiceAmountMinor: sourceAmountMinor,
      invoiceCurrency: sourceCurrency,
      recipientChangeHistory: changeHistRes.rows,
    });

    // 5. Create Payment Request in DB
    const requestStatus = proofRailReport.riskLevel === 'blocked' ? 'rejected' : 'awaiting_approval';

    const paymentRequest = await withTransaction(async (client) => {
      const prRes = await client.query(
        `INSERT INTO payment_requests
         (organisation_id, invoice_id, recipient_id, recipient_account_id, created_by,
          source_currency, destination_currency, source_amount_minor, destination_amount_minor,
          purpose, risk_level, risk_score, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          organisationId,
          invoiceId || null,
          recipientId,
          recip.account_id,
          createdBy,
          sourceCurrency,
          destinationCurrency,
          sourceAmountMinor.toString(),
          destAmountMinor.toString(),
          purpose,
          proofRailReport.riskLevel,
          proofRailReport.riskScore,
          requestStatus,
        ]
      );

      const pr = prRes.rows[0];

      // Save quote
      const quoteRes = await client.query(
        `INSERT INTO payment_quotes
         (payment_request_id, provider, from_currency, to_currency, from_amount_minor, to_amount_minor,
          exchange_rate, provider_fee_minor, total_charge_minor, quote_reference, expires_at)
         VALUES ($1, 'blaaiz', $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '15 minutes')
         RETURNING id`,
        [
          pr.id,
          sourceCurrency,
          destinationCurrency,
          sourceAmountMinor.toString(),
          destAmountMinor.toString(),
          quoteBreakdown.rate,
          toMinorUnits(quoteBreakdown.total_fee, sourceCurrency).toString(),
          (sourceAmountMinor + toMinorUnits(quoteBreakdown.total_fee, sourceCurrency)).toString(),
          `BLZ-Q-${Date.now().toString(36).toUpperCase()}`,
        ]
      );

      return { ...pr, quoteId: quoteRes.rows[0].id };
    });

    await recordAuditEvent({
      organisationId,
      resourceType: 'payment_request',
      resourceId: paymentRequest.id,
      action: 'payment_request_created',
      actorName: 'Operator',
      actorRole: 'finance_manager',
      metadata: {
        amount,
        destinationCurrency,
        riskLevel: proofRailReport.riskLevel,
        riskScore: proofRailReport.riskScore,
        findingsCount: proofRailReport.findings.length,
      },
    });

    res.status(201).json({
      success: true,
      paymentRequest,
      quote: quoteBreakdown,
      proofRail: proofRailReport,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payments/initiate - Execute Approved Payout via Blaaiz
paymentsRouter.post('/initiate', async (req, res, next) => {
  try {
    const {
      paymentRequestId,
      idempotencyKey = `idemp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      initiatedBy,
    } = req.body;
    const effectiveInitiatedBy = (req as any).user?.id || initiatedBy || 'b1000000-0000-0000-0000-000000000002';

    if (!paymentRequestId) {
      throw new BadRequestError('paymentRequestId is required.');
    }

    // 1. Fetch Payment Request, Approvals, and Recipient details
    const prRes = await query(
      `SELECT pr.*, r.display_name as recipient_name, r.is_flagged,
              ra.bank_name, ra.bank_code, ra.account_number, ra.routing_number,
              pq.id as quote_id, pq.exchange_rate, pq.provider_fee_minor, pq.expires_at,
              (SELECT COUNT(*) FROM payment_approvals pa WHERE pa.payment_request_id = pr.id AND pa.decision = 'approved') as approvals_count
       FROM payment_requests pr
       JOIN recipients r ON r.id = pr.recipient_id
       JOIN recipient_accounts ra ON ra.id = pr.recipient_account_id
       LEFT JOIN payment_quotes pq ON pq.payment_request_id = pr.id
       WHERE pr.id = $1`,
      [paymentRequestId]
    );

    if (prRes.rows.length === 0) {
      throw new BadRequestError('Payment request not found.');
    }

    const pr = prRes.rows[0];

    // 2. Strict Security Guards
    if (pr.risk_level === 'blocked') {
      throw new RiskBlockedError('Cannot execute payment: ProofRail marked this transaction as BLOCKED.');
    }

    if (pr.status !== 'approved' && parseInt(pr.approvals_count, 10) === 0) {
      throw new PolicyViolationError('Payment has not been authorized by an approved signature.');
    }

    // Check Quote Expiration
    if (pr.expires_at && new Date(pr.expires_at).getTime() < Date.now()) {
      throw new PolicyViolationError('FX Quote has expired. Please refresh the quote before initiating.');
    }

    // Check Duplicate Idempotency Key
    const existingPayment = await query(`SELECT * FROM payments WHERE idempotency_key = $1`, [idempotencyKey]);
    if (existingPayment.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Payment already processed with this idempotency key.',
        payment: existingPayment.rows[0],
      });
    }

    // 3. Initiate Payout via Blaaiz Provider Adapter
    const providerPayout = await blaaizClient.createPayout({
      wallet_id: 'b18ed308-5ac5-4e9e-bb16-8c03ec2d3c01',
      customer_id: '9d4c4ec5-59ea-4130-bf8a-6a5edec401ee',
      method: 'bank_transfer',
      from_currency_id: pr.source_currency,
      to_currency_id: pr.destination_currency,
      from_amount: Number(pr.source_amount_minor) / 100,
      bank_id: pr.bank_code || '1',
      account_number: pr.account_number,
      routing_number: pr.routing_number,
      reference: idempotencyKey,
    });

    // 4. Save Payment State Transactionally
    const payment = await withTransaction(async (client) => {
      const pRes = await client.query(
        `INSERT INTO payments
         (organisation_id, payment_request_id, quote_id, recipient_id, recipient_account_id, initiated_by,
          provider, provider_reference, idempotency_key, source_currency, destination_currency,
          source_amount_minor, destination_amount_minor, exchange_rate, provider_fee_minor, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'blaaiz', $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          pr.organisation_id,
          pr.id,
          pr.quote_id,
          pr.recipient_id,
          pr.recipient_account_id,
          effectiveInitiatedBy,
          providerPayout.reference,
          idempotencyKey,
          pr.source_currency,
          pr.destination_currency,
          pr.source_amount_minor,
          pr.destination_amount_minor,
          pr.exchange_rate || 0.00066225,
          pr.provider_fee_minor || 0,
          providerPayout.status,
        ]
      );

      // Update payment request status to approved/processing
      await client.query(`UPDATE payment_requests SET status = 'approved', updated_at = NOW() WHERE id = $1`, [pr.id]);

      // If linked invoice, update status
      if (pr.invoice_id) {
        await client.query(`UPDATE invoices SET status = 'approved', updated_at = NOW() WHERE id = $1`, [pr.invoice_id]);
      }

      return pRes.rows[0];
    });

    await recordAuditEvent({
      organisationId: pr.organisation_id,
      resourceType: 'payment',
      resourceId: payment.id,
      action: 'payout_initiated',
      actorName: 'Operator',
      actorRole: 'finance_manager',
      metadata: {
        providerReference: providerPayout.reference,
        status: providerPayout.status,
        destinationAmountMinor: pr.destination_amount_minor,
      },
    });

    res.status(201).json({
      success: true,
      payment,
      providerDetails: providerPayout,
      isEmulator: blaaizClient.isUsingEmulator(),
    });
  } catch (err) {
    next(err);
  }
});

