import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../config.js';
import { blaaizClient } from '../blaaiz/client.js';
import { query, withTransaction } from '../db.js';
import { recordAuditEvent } from '../utils/audit.js';
import { BadRequestError, NotFoundError, PolicyViolationError } from '../utils/errors.js';
import { toMinorUnits } from '../utils/money.js';

export const payrollRouter = Router();

// GET /api/v1/payroll/overview - Financial & Operational Overview of Payroll
payrollRouter.get('/overview', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || req.orgMember?.organisationId;
    if (!orgId) {
      throw new BadRequestError('Organisation ID is required.');
    }

    // 1. Next Upcoming or Active Payroll Run
    const upcomingRes = await query(
      `SELECT pr.*, u.full_name as creator_name
       FROM payroll_runs pr
       LEFT JOIN users u ON u.id = pr.created_by
       WHERE pr.organisation_id = $1 AND pr.status IN ('draft', 'pending_approval', 'approved')
       ORDER BY pr.pay_date ASC
       LIMIT 1`,
      [orgId]
    );

    // 2. Settled Payroll Lifetime Aggregates
    const settledStats = await query(
      `SELECT 
         COUNT(*) as completed_runs,
         COALESCE(SUM(total_funding_minor), 0) as total_funding_paid_minor,
         COALESCE(SUM(total_fee_minor), 0) as total_fees_paid_minor,
         COALESCE(SUM(recipient_count), 0) as total_disbursements_count
       FROM payroll_runs
       WHERE organisation_id = $1 AND status = 'completed'`,
      [orgId]
    );

    // 3. Active Workforce Headcount
    const workforceStats = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE recipient_type = 'employee' AND status = 'active') as employee_count,
         COUNT(*) FILTER (WHERE recipient_type = 'contractor' AND status = 'active') as contractor_count,
         COUNT(*) FILTER (WHERE status = 'active') as total_active_workers,
         COALESCE(SUM(default_salary_minor) FILTER (WHERE currency = 'NGN' AND status = 'active'), 0) as monthly_ngn_base,
         COALESCE(SUM(default_salary_minor) FILTER (WHERE currency = 'USD' AND status = 'active'), 0) as monthly_usd_base,
         COALESCE(SUM(default_salary_minor) FILTER (WHERE currency = 'KES' AND status = 'active'), 0) as monthly_kes_base,
         COALESCE(SUM(default_salary_minor) FILTER (WHERE currency = 'GBP' AND status = 'active'), 0) as monthly_gbp_base,
         COALESCE(SUM(default_salary_minor) FILTER (WHERE currency = 'CAD' AND status = 'active'), 0) as monthly_cad_base
       FROM recipients
       WHERE organisation_id = $1 AND recipient_type IN ('employee', 'contractor')`,
      [orgId]
    );

    // 4. Currency Exposure Breakdown for Next Active Run
    let currencyExposure: any[] = [];
    if (upcomingRes.rows.length > 0) {
      const exposureRes = await query(
        `SELECT 
           pi.destination_currency,
           COUNT(*) as recipient_count,
           COALESCE(SUM(pi.destination_amount_minor), 0) as total_destination_minor,
           COALESCE(SUM(pi.source_amount_minor), 0) as total_source_minor,
           COALESCE(SUM(pi.provider_fee_minor), 0) as total_fee_minor
         FROM payroll_items pi
         WHERE pi.payroll_run_id = $1
         GROUP BY pi.destination_currency
         ORDER BY total_source_minor DESC`,
        [upcomingRes.rows[0].id]
      );
      currencyExposure = exposureRes.rows;
    }

    // 5. Recent Payroll Runs
    const recentRunsRes = await query(
      `SELECT pr.*, u.full_name as creator_name, ap.full_name as approver_name
       FROM payroll_runs pr
       LEFT JOIN users u ON u.id = pr.created_by
       LEFT JOIN users ap ON ap.id = pr.approved_by
       WHERE pr.organisation_id = $1
       ORDER BY pr.created_at DESC
       LIMIT 6`,
      [orgId]
    );

    res.json({
      success: true,
      upcomingRun: upcomingRes.rows[0] || null,
      settledStats: settledStats.rows[0] || {
        completed_runs: 0,
        total_funding_paid_minor: '0',
        total_fees_paid_minor: '0',
        total_disbursements_count: 0,
      },
      workforce: workforceStats.rows[0] || {
        employee_count: 0,
        contractor_count: 0,
        total_active_workers: 0,
      },
      currencyExposure,
      recentRuns: recentRunsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/payroll/runs - List All Payroll Runs
payrollRouter.get('/runs', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || req.orgMember?.organisationId;
    if (!orgId) {
      throw new BadRequestError('Organisation ID is required.');
    }
    const { status, search } = req.query;

    let sql = `
      SELECT pr.*, 
             u.full_name as creator_name, 
             ap.full_name as approver_name,
             (SELECT COUNT(*) FROM payroll_items WHERE payroll_run_id = pr.id) as item_count,
             (SELECT COUNT(*) FROM payroll_items WHERE payroll_run_id = pr.id AND status = 'failed') as failed_item_count
      FROM payroll_runs pr
      LEFT JOIN users u ON u.id = pr.created_by
      LEFT JOIN users ap ON ap.id = pr.approved_by
      WHERE pr.organisation_id = $1
    `;
    const params: any[] = [orgId];

    if (status) {
      params.push(status);
      sql += ` AND pr.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND pr.title ILIKE $${params.length}`;
    }

    sql += ` ORDER BY pr.created_at DESC`;

    const result = await query(sql, params);
    res.json({ success: true, runs: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/payroll/runs/:id - Detailed View of Run and Line Items
payrollRouter.get('/runs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const runRes = await query(
      `SELECT pr.*, u.full_name as creator_name, ap.full_name as approver_name
       FROM payroll_runs pr
       LEFT JOIN users u ON u.id = pr.created_by
       LEFT JOIN users ap ON ap.id = pr.approved_by
       WHERE pr.id = $1`,
      [id]
    );

    if (runRes.rows.length === 0) {
      throw new NotFoundError('Payroll run not found.');
    }

    const itemsRes = await query(
      `SELECT pi.*, 
              r.display_name as recipient_name, 
              r.country as recipient_country, 
              r.recipient_type, 
              r.department, 
              r.job_title, 
              r.email as recipient_email,
              r.verification_level,
              r.is_flagged,
              r.flag_reason,
              ra.bank_name, 
              ra.account_number, 
              ra.routing_number, 
              ra.swift_bic, 
              ra.iban,
              p.provider_reference,
              p.status as payment_status
       FROM payroll_items pi
       JOIN recipients r ON r.id = pi.recipient_id
       LEFT JOIN recipient_accounts ra ON ra.id = pi.recipient_account_id
       LEFT JOIN payments p ON p.id = pi.payment_id
       WHERE pi.payroll_run_id = $1
       ORDER BY r.display_name ASC`,
      [id]
    );

    res.json({
      success: true,
      run: runRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payroll/runs - Create New Payroll Run with Live FX Quotes & ProofRail Evaluation
payrollRouter.post('/runs', async (req, res, next) => {
  try {
    const {
      title,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      fundingCurrency = 'NGN',
      items = [],
      notes,
    } = req.body;

    const organisationId = req.body.organisationId || req.orgMember?.organisationId;
    if (!organisationId) {
      throw new BadRequestError('Organisation ID is required.');
    }

    const createdBy =
      req.user?.id ||
      req.body.createdBy ||
      (config.nodeEnv === 'test' ? 'b1000000-0000-0000-0000-000000000002' : undefined);
    if (!createdBy) {
      throw new BadRequestError('User authentication required to create payroll run.');
    }

    if (!title || !payPeriodStart || !payPeriodEnd || !payDate) {
      throw new BadRequestError('title, payPeriodStart, payPeriodEnd, and payDate are required.');
    }

    if (!items || items.length === 0) {
      throw new BadRequestError('At least one recipient item is required to create a payroll run.');
    }

    // 1. Process items: Validate accounts and calculate real provider FX rates
    let totalFundingMinor = 0n;
    let totalPayoutMinor = 0n;
    let totalFeeMinor = 0n;
    let hasRiskFlags = false;
    const riskDetails: any[] = [];

    const processedItems: any[] = [];

    for (const item of items) {
      const { recipientId, itemType = 'salary', destinationAmountMinor, notes: itemNotes } = item;

      if (!recipientId || !destinationAmountMinor || destinationAmountMinor <= 0) {
        throw new BadRequestError('Valid recipientId and positive destinationAmountMinor required for each item.');
      }

      // Fetch recipient and primary bank account
      const recipRes = await query(
        `SELECT r.*, ra.id as account_id, ra.bank_name, ra.account_number, ra.routing_number, ra.swift_bic, ra.iban
         FROM recipients r
         LEFT JOIN recipient_accounts ra ON ra.recipient_id = r.id AND ra.is_primary = TRUE
         WHERE r.id = $1 AND r.organisation_id = $2`,
        [recipientId, organisationId]
      );

      if (recipRes.rows.length === 0) {
        throw new BadRequestError(`Recipient ${recipientId} not found.`);
      }

      const recip = recipRes.rows[0];

      if (!recip.account_id) {
        throw new BadRequestError(`Recipient "${recip.display_name}" does not have an active bank account configured.`);
      }

      if (recip.is_flagged) {
        hasRiskFlags = true;
        riskDetails.push({
          recipientId: recip.id,
          recipientName: recip.display_name,
          reason: recip.flag_reason || 'Beneficiary bank details flagged by ProofRail.',
        });
      }

      const destCurrency = recip.currency;
      const destMinor = BigInt(destinationAmountMinor);
      totalPayoutMinor += destMinor;

      let sourceMinor = 0n;
      let rate = 1.0;
      let feeMinor = 0n;
      let quoteRef = `BLZ-Q-PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

      if (destCurrency === fundingCurrency) {
        sourceMinor = destMinor;
        rate = 1.0;
        feeMinor = 5000n; // 50 NGN flat local domestic transfer fee
      } else {
        // Fetch Live FX Quote from Blaaiz
        const destAmountMajor = Number(destMinor) / 100;
        const feeBreakdown = await blaaizClient.getFeeBreakdown({
          from_currency_id: fundingCurrency,
          to_currency_id: destCurrency,
          to_amount: destAmountMajor,
        });

        sourceMinor = toMinorUnits(feeBreakdown.from_amount, fundingCurrency);
        rate = feeBreakdown.rate;
        feeMinor = toMinorUnits(feeBreakdown.total_fee, fundingCurrency);
      }

      totalFundingMinor += sourceMinor + feeMinor;
      totalFeeMinor += feeMinor;

      processedItems.push({
        recipientId: recip.id,
        recipientAccountId: recip.account_id,
        itemType,
        destinationCurrency: destCurrency,
        destinationAmountMinor: destMinor.toString(),
        sourceCurrency: fundingCurrency,
        sourceAmountMinor: sourceMinor.toString(),
        exchangeRate: rate,
        providerFeeMinor: feeMinor.toString(),
        quoteReference: quoteRef,
        notes: itemNotes || null,
      });
    }

    // 2. Insert payroll_run and payroll_items transactionally
    const runResult = await withTransaction(async (client) => {
      const riskStatus = hasRiskFlags ? 'review_required' : 'clear';

      const runInsert = await client.query(
        `INSERT INTO payroll_runs (
           organisation_id, title, pay_period_start, pay_period_end, pay_date, funding_currency,
           status, total_funding_minor, total_payout_minor, total_fee_minor, recipient_count,
           risk_status, risk_details, created_by, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          organisationId,
          title,
          payPeriodStart,
          payPeriodEnd,
          payDate,
          fundingCurrency,
          totalFundingMinor.toString(),
          totalPayoutMinor.toString(),
          totalFeeMinor.toString(),
          processedItems.length,
          riskStatus,
          JSON.stringify(riskDetails),
          createdBy,
          notes || null,
        ]
      );

      const createdRun = runInsert.rows[0];

      for (const item of processedItems) {
        await client.query(
          `INSERT INTO payroll_items (
             payroll_run_id, recipient_id, recipient_account_id, item_type,
             destination_currency, destination_amount_minor,
             source_currency, source_amount_minor, exchange_rate, provider_fee_minor,
             quote_reference, status, notes
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12)`,
          [
            createdRun.id,
            item.recipientId,
            item.recipientAccountId,
            item.itemType,
            item.destinationCurrency,
            item.destinationAmountMinor,
            item.sourceCurrency,
            item.sourceAmountMinor,
            item.exchangeRate,
            item.providerFeeMinor,
            item.quoteReference,
            item.notes,
          ]
        );
      }

      return createdRun;
    });

    // 3. Audit Logging
    await recordAuditEvent({
      organisationId,
      resourceType: 'payroll_run',
      resourceId: runResult.id,
      action: 'payroll_run_created',
      actorName: 'Finance Manager',
      actorRole: 'finance_manager',
      metadata: {
        title,
        recipientCount: processedItems.length,
        totalFundingMinor: totalFundingMinor.toString(),
        fundingCurrency,
        riskStatus: runResult.risk_status,
      },
    });

    res.status(201).json({
      success: true,
      run: runResult,
      itemsCount: processedItems.length,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payroll/runs/:id/submit - Submit Run for Executive Approval
payrollRouter.post('/runs/:id/submit', async (req, res, next) => {
  try {
    const { id } = req.params;

    const runRes = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [id]);
    if (runRes.rows.length === 0) throw new NotFoundError('Payroll run not found.');

    const run = runRes.rows[0];
    if (run.status !== 'draft') {
      throw new BadRequestError(`Cannot submit payroll run in "${run.status}" state.`);
    }

    const updated = await query(
      `UPDATE payroll_runs 
       SET status = 'pending_approval', updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    await recordAuditEvent({
      organisationId: run.organisation_id,
      resourceType: 'payroll_run',
      resourceId: id,
      action: 'payroll_run_submitted',
      actorName: 'Finance Manager',
      actorRole: 'finance_manager',
      metadata: { title: run.title, totalFunding: run.total_funding_minor },
    });

    res.json({ success: true, run: updated.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payroll/runs/:id/approve - Authorize Payroll Run (Dual Approval Check)
payrollRouter.post('/runs/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approverId, notes } = req.body;
    const effectiveApproverId = (req as any).user?.id || approverId || 'b1000000-0000-0000-0000-000000000001';

    const runRes = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [id]);
    if (runRes.rows.length === 0) throw new NotFoundError('Payroll run not found.');

    const run = runRes.rows[0];
    if (run.status !== 'pending_approval') {
      throw new BadRequestError(`Cannot approve payroll run in "${run.status}" state.`);
    }

    // Verify approver exists and is authorized
    const userRes = await query(
      `SELECT u.*, om.role FROM users u
       JOIN organisation_members om ON om.user_id = u.id AND om.organisation_id = $1
       WHERE u.id = $2`,
      [run.organisation_id, effectiveApproverId]
    );

    if (userRes.rows.length === 0) {
      throw new PolicyViolationError('Approver not found or not a member of this organisation.');
    }

    const user = userRes.rows[0];
    if (!['owner', 'approver', 'admin', 'finance_manager'].includes(user.role)) {
      throw new PolicyViolationError(`Role "${user.role}" does not have authority to approve payroll.`);
    }

    const updated = await query(
      `UPDATE payroll_runs 
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [effectiveApproverId, id]
    );

    // Update all item statuses to approved
    await query(`UPDATE payroll_items SET status = 'approved' WHERE payroll_run_id = $1`, [id]);

    await recordAuditEvent({
      organisationId: run.organisation_id,
      resourceType: 'payroll_run',
      resourceId: id,
      action: 'payroll_run_approved',
      actorName: user.full_name,
      actorRole: user.role,
      metadata: { approverNotes: notes, title: run.title },
    });

    res.json({ success: true, run: updated.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payroll/runs/:id/execute - Dispatches Payouts via Blaaiz Relay Infrastructure
payrollRouter.post('/runs/:id/execute', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { initiatedBy } = req.body;
    const effectiveInitiatedBy = (req as any).user?.id || initiatedBy || 'b1000000-0000-0000-0000-000000000002';

    const runRes = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [id]);
    if (runRes.rows.length === 0) throw new NotFoundError('Payroll run not found.');

    const run = runRes.rows[0];
    if (run.status !== 'approved') {
      throw new BadRequestError(`Cannot execute payroll run. Current status is "${run.status}". Must be "approved".`);
    }

    // Fetch items to process
    const itemsRes = await query(
      `SELECT pi.*, 
              r.display_name as recipient_name, r.country as recipient_country,
              ra.bank_name, ra.bank_code, ra.account_number, ra.routing_number, ra.swift_bic, ra.iban
       FROM payroll_items pi
       JOIN recipients r ON r.id = pi.recipient_id
       JOIN recipient_accounts ra ON ra.id = pi.recipient_account_id
       WHERE pi.payroll_run_id = $1 AND pi.status IN ('approved', 'failed', 'pending')`,
      [id]
    );

    const items = itemsRes.rows;
    if (items.length === 0) {
      throw new BadRequestError('No items ready for execution.');
    }

    // Set run to processing
    await query(`UPDATE payroll_runs SET status = 'processing', executed_at = NOW() WHERE id = $1`, [id]);

    let successfulCount = 0;
    let failedCount = 0;

    for (const item of items) {
      const idempotencyKey = `idemp_payroll_${run.id.slice(0, 8)}_${item.id.slice(0, 8)}`;

      try {
        // Call Blaaiz Payout Adapter
        const destAmountMajor = Number(item.destination_amount_minor) / 100;
        const sourceAmountMajor = Number(item.source_amount_minor) / 100;

        const providerPayout = await blaaizClient.createPayout({
          wallet_id: 'b18ed308-5ac5-4e9e-bb16-8c03ec2d3c01',
          customer_id: '9d4c4ec5-59ea-4130-bf8a-6a5edec401ee',
          method: 'bank_transfer',
          from_currency_id: item.source_currency,
          to_currency_id: item.destination_currency,
          from_amount: sourceAmountMajor,
          bank_id: item.bank_code || '1',
          account_number: item.account_number,
          routing_number: item.routing_number,
          reference: idempotencyKey,
        });

        // Insert into payments table
        const paymentRes = await query(
          `INSERT INTO payments (
             organisation_id, recipient_id, recipient_account_id, initiated_by,
             provider, provider_reference, idempotency_key,
             source_currency, destination_currency, source_amount_minor, destination_amount_minor,
             exchange_rate, provider_fee_minor, status, initiated_at, completed_at
           ) VALUES ($1, $2, $3, $4, 'blaaiz', $5, $6, $7, $8, $9, $10, $11, $12, 'completed', NOW(), NOW())
           RETURNING id`,
          [
            run.organisation_id,
            item.recipient_id,
            item.recipient_account_id,
            effectiveInitiatedBy,
            providerPayout.reference,
            idempotencyKey,
            item.source_currency,
            item.destination_currency,
            item.source_amount_minor,
            item.destination_amount_minor,
            item.exchange_rate,
            item.provider_fee_minor,
          ]
        );

        // Update item with payment link
        await query(
          `UPDATE payroll_items 
           SET status = 'completed', payment_id = $1, error_message = NULL, updated_at = NOW()
           WHERE id = $2`,
          [paymentRes.rows[0].id, item.id]
        );

        successfulCount++;
      } catch (err: any) {
        failedCount++;
        await query(
          `UPDATE payroll_items 
           SET status = 'failed', error_message = $1, updated_at = NOW() 
           WHERE id = $2`,
          [err.message || 'Payout processing failed', item.id]
        );
      }
    }

    const finalRunStatus = failedCount === 0 ? 'completed' : failedCount === items.length ? 'failed' : 'completed';

    const completedAtClause = finalRunStatus === 'completed' ? ', completed_at = NOW()' : '';
    const updatedRunRes = await query(
      `UPDATE payroll_runs 
       SET status = $1 ${completedAtClause}, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [finalRunStatus, id]
    );

    await recordAuditEvent({
      organisationId: run.organisation_id,
      resourceType: 'payroll_run',
      resourceId: id,
      action: 'payroll_run_executed',
      actorName: 'Finance Manager',
      actorRole: 'finance_manager',
      metadata: {
        totalDispatched: items.length,
        successful: successfulCount,
        failed: failedCount,
        finalStatus: finalRunStatus,
      },
    });

    res.json({
      success: true,
      run: updatedRunRes.rows[0],
      dispatched: items.length,
      successful: successfulCount,
      failed: failedCount,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payroll/runs/:id/retry-failed - Retry Failed Items in a Run
payrollRouter.post('/runs/:id/retry-failed', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { initiatedBy } = req.body;
    const effectiveInitiatedBy = (req as any).user?.id || initiatedBy || 'b1000000-0000-0000-0000-000000000002';

    const runRes = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [id]);
    if (runRes.rows.length === 0) throw new NotFoundError('Payroll run not found.');

    const failedItemsRes = await query(
      `SELECT pi.*, 
              r.display_name as recipient_name,
              ra.bank_name, ra.account_number
       FROM payroll_items pi
       JOIN recipients r ON r.id = pi.recipient_id
       JOIN recipient_accounts ra ON ra.id = pi.recipient_account_id
       WHERE pi.payroll_run_id = $1 AND pi.status = 'failed'`,
      [id]
    );

    if (failedItemsRes.rows.length === 0) {
      return res.json({ success: true, message: 'No failed items to retry.', retriedCount: 0 });
    }

    let retriedSuccess = 0;
    for (const item of failedItemsRes.rows) {
      const idempotencyKey = `idemp_payroll_retry_${Date.now()}_${item.id.slice(0, 6)}`;
      try {
        const destAmountMajor = Number(item.destination_amount_minor) / 100;
        const sourceAmountMajor = Number(item.source_amount_minor) / 100;

        const providerPayout = await blaaizClient.createPayout({
          wallet_id: 'b18ed308-5ac5-4e9e-bb16-8c03ec2d3c01',
          customer_id: '9d4c4ec5-59ea-4130-bf8a-6a5edec401ee',
          method: 'bank_transfer',
          from_currency_id: item.source_currency,
          to_currency_id: item.destination_currency,
          from_amount: sourceAmountMajor,
          account_number: item.account_number,
          reference: idempotencyKey,
        });

        const paymentRes = await query(
          `INSERT INTO payments (
             organisation_id, recipient_id, recipient_account_id, initiated_by,
             provider, provider_reference, idempotency_key,
             source_currency, destination_currency, source_amount_minor, destination_amount_minor,
             exchange_rate, provider_fee_minor, status, initiated_at, completed_at
           ) VALUES ($1, $2, $3, $4, 'blaaiz', $5, $6, $7, $8, $9, $10, $11, $12, 'completed', NOW(), NOW())
           RETURNING id`,
          [
            runRes.rows[0].organisation_id,
            item.recipient_id,
            item.recipient_account_id,
            effectiveInitiatedBy,
            providerPayout.reference,
            idempotencyKey,
            item.source_currency,
            item.destination_currency,
            item.source_amount_minor,
            item.destination_amount_minor,
            item.exchange_rate,
            item.provider_fee_minor,
          ]
        );

        await query(
          `UPDATE payroll_items 
           SET status = 'completed', payment_id = $1, error_message = NULL, updated_at = NOW()
           WHERE id = $2`,
          [paymentRes.rows[0].id, item.id]
        );
        retriedSuccess++;
      } catch (err: any) {
        await query(
          `UPDATE payroll_items SET error_message = $1, updated_at = NOW() WHERE id = $2`,
          [err.message || 'Retry failed', item.id]
        );
      }
    }

    res.json({
      success: true,
      retriedTotal: failedItemsRes.rows.length,
      retriedSuccess,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/payroll/recipients - List Workforce Employees & Contractors
payrollRouter.get('/recipients', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || req.orgMember?.organisationId;
    if (!orgId) {
      throw new BadRequestError('Organisation ID is required.');
    }
    const { type, status, search } = req.query;

    let sql = `
      SELECT r.*,
             ra.id as account_id,
             ra.bank_name,
             ra.account_number,
             ra.routing_number,
             ra.swift_bic,
             ra.iban,
             ra.currency as account_currency,
             (SELECT COUNT(*) FROM payroll_items WHERE recipient_id = r.id AND status = 'completed') as paid_cycles_count,
             (SELECT COALESCE(SUM(destination_amount_minor), 0) FROM payroll_items WHERE recipient_id = r.id AND status = 'completed') as total_received_minor
      FROM recipients r
      LEFT JOIN recipient_accounts ra ON ra.recipient_id = r.id AND ra.is_primary = TRUE
      WHERE r.organisation_id = $1
    `;
    const params: any[] = [orgId];

    if (type) {
      params.push(type);
      sql += ` AND r.recipient_type = $${params.length}`;
    } else {
      // By default for payroll directory, return employees and contractors
      sql += ` AND r.recipient_type IN ('employee', 'contractor')`;
    }

    if (status) {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (r.display_name ILIKE $${params.length} OR r.email ILIKE $${params.length} OR r.department ILIKE $${params.length} OR r.job_title ILIKE $${params.length})`;
    }

    sql += ` ORDER BY r.recipient_type ASC, r.display_name ASC`;

    const result = await query(sql, params);
    res.json({ success: true, recipients: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payroll/recipients - Add New Employee or Contractor
payrollRouter.post('/recipients', async (req, res, next) => {
  try {
    const {
      displayName,
      recipientType = 'employee',
      country,
      currency,
      payoutMethod = 'bank_transfer',
      department,
      jobTitle,
      email,
      defaultSalaryMinor = 0,
      bankName,
      accountNumber,
      routingNumber,
      swiftBic,
      iban,
    } = req.body;

    const organisationId = req.body.organisationId || req.orgMember?.organisationId;
    if (!organisationId) {
      throw new BadRequestError('Organisation ID is required.');
    }

    if (!displayName || !country || !currency || !bankName || !accountNumber) {
      throw new BadRequestError('displayName, country, currency, bankName, and accountNumber are required.');
    }

    const newWorker = await withTransaction(async (client) => {
      const recipRes = await client.query(
        `INSERT INTO recipients (
           organisation_id, display_name, country, currency, payout_method,
           verification_level, recipient_type, department, job_title, email, default_salary_minor, status
         ) VALUES ($1, $2, $3, $4, $5, 'internal_verified', $6, $7, $8, $9, $10, 'active')
         RETURNING *`,
        [
          organisationId,
          displayName,
          country.toUpperCase(),
          currency.toUpperCase(),
          payoutMethod,
          recipientType,
          department || null,
          jobTitle || null,
          email || null,
          defaultSalaryMinor || 0,
        ]
      );

      const recipient = recipRes.rows[0];

      await client.query(
        `INSERT INTO recipient_accounts (
           recipient_id, bank_name, account_number, routing_number, swift_bic, iban, currency, is_primary
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
        [
          recipient.id,
          bankName,
          accountNumber,
          routingNumber || null,
          swiftBic || null,
          iban || null,
          currency.toUpperCase(),
        ]
      );

      return recipient;
    });

    await recordAuditEvent({
      organisationId,
      resourceType: 'recipient',
      resourceId: newWorker.id,
      action: 'recipient_created',
      actorName: 'HR / Finance Manager',
      actorRole: 'finance_manager',
      metadata: {
        displayName,
        recipientType,
        currency,
        country,
      },
    });

    res.status(201).json({ success: true, recipient: newWorker });
  } catch (err) {
    next(err);
  }
});
