import { Router } from 'express';
import crypto from 'crypto';
import { query, withTransaction } from '../db.js';
import { InvoiceExtractor } from '../ocr/extractor.js';
import { ProofRailRules } from '../proofrail/rules.js';
import { recordAuditEvent } from '../utils/audit.js';
import { toMinorUnits } from '../utils/money.js';

export const invoicesRouter = Router();

// GET /api/v1/invoices
invoicesRouter.get('/', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || req.orgMember?.organisationId;
    if (!orgId) {
      return res.json({ success: true, invoices: [] });
    }
    const { status, supplierId } = req.query;

    let sql = `
      SELECT i.*, s.name as supplier_name, r.display_name as recipient_name,
             (SELECT COUNT(*) FROM invoice_risk_findings f WHERE f.invoice_id = i.id) as risk_count,
             (SELECT severity FROM invoice_risk_findings f WHERE f.invoice_id = i.id ORDER BY CASE WHEN severity = 'critical' THEN 1 WHEN severity = 'warning' THEN 2 ELSE 3 END LIMIT 1) as max_severity
      FROM invoices i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      LEFT JOIN recipients r ON r.id = i.recipient_id
      WHERE i.organisation_id = $1
    `;
    const params: any[] = [orgId];

    if (status) {
      params.push(status);
      sql += ` AND i.status = $${params.length}`;
    }
    if (supplierId) {
      params.push(supplierId);
      sql += ` AND i.supplier_id = $${params.length}`;
    }

    sql += ` ORDER BY i.created_at DESC`;

    const result = await query(sql, params);
    res.json({ success: true, invoices: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/invoices/:id
invoicesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const invRes = await query(
      `SELECT i.*, s.name as supplier_name, s.contact_email, s.country as supplier_country,
              r.display_name as recipient_name, ra.bank_name, ra.account_number, ra.currency as account_currency
       FROM invoices i
       LEFT JOIN suppliers s ON s.id = i.supplier_id
       LEFT JOIN recipients r ON r.id = i.recipient_id
       LEFT JOIN recipient_accounts ra ON ra.recipient_id = r.id AND ra.is_primary = TRUE
       WHERE i.id = $1`,
      [id]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const extractionRes = await query(`SELECT * FROM invoice_extractions WHERE invoice_id = $1`, [id]);
    const findingsRes = await query(`SELECT * FROM invoice_risk_findings WHERE invoice_id = $1 ORDER BY created_at DESC`, [id]);
    const paymentsRes = await query(`SELECT * FROM payments WHERE payment_request_id IN (SELECT id FROM payment_requests WHERE invoice_id = $1)`, [id]);

    res.json({
      success: true,
      invoice: invRes.rows[0],
      extraction: extractionRes.rows[0] || null,
      riskFindings: findingsRes.rows,
      payments: paymentsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/invoices/upload - Upload and extract invoice intelligence
invoicesRouter.post('/upload', async (req, res, next) => {
  try {
    const organisationId = req.body.organisationId || req.orgMember?.organisationId;
    if (!organisationId) {
      return res.status(400).json({ success: false, error: 'Organisation ID is required.' });
    }
    const {
      supplierId,
      recipientId,
      fileName = 'invoice_upload.pdf',
      rawText = '',
      manualFields,
    } = req.body;

    // 1. Run Intelligence Extraction
    const extraction = InvoiceExtractor.extract(rawText);

    // Merge manual fields if provided
    const invoiceNumber = manualFields?.invoiceNumber || extraction.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
    const currency = manualFields?.currency || extraction.currency || 'USD';
    const amount = manualFields?.amount || extraction.amount || 1000;
    const dueDate = manualFields?.dueDate || extraction.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const amountMinor = toMinorUnits(amount, currency);

    const fileHash = crypto.createHash('sha256').update(rawText || fileName + Date.now()).digest('hex');

    // 2. Check for Duplicate Invoices
    const duplicateCheck = await query(
      `SELECT id, invoice_number FROM invoices 
       WHERE organisation_id = $1 AND (invoice_number = $2 OR file_hash = $3)`,
      [organisationId, invoiceNumber, fileHash]
    );

    const isDuplicate = duplicateCheck.rows.length > 0;

    // 3. Persist Invoice and Extraction
    const invoice = await withTransaction(async (client) => {
      const invRes = await client.query(
        `INSERT INTO invoices
         (organisation_id, supplier_id, recipient_id, invoice_number, issue_date, due_date, currency, amount_minor, description, file_url, file_name, file_size_bytes, file_hash, status, is_duplicate)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          organisationId,
          supplierId || null,
          recipientId || null,
          invoiceNumber,
          dueDate,
          currency,
          amountMinor.toString(),
          extraction.supplierName ? `Invoice from ${extraction.supplierName}` : 'Uploaded invoice document',
          `/invoices/${fileName}`,
          fileName,
          rawText.length * 2,
          fileHash,
          isDuplicate ? 'pending_review' : 'pending_review',
          isDuplicate,
        ]
      );

      const inv = invRes.rows[0];

      await client.query(
        `INSERT INTO invoice_extractions
         (invoice_id, raw_text, extracted_fields, confidence_scores, review_state)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          inv.id,
          rawText,
          JSON.stringify({ ...extraction, invoiceNumber, amount, currency, dueDate }),
          JSON.stringify(extraction.confidenceScores),
          manualFields ? 'user_modified' : 'auto_extracted',
        ]
      );

      // Check ProofRail rules for invoice
      if (isDuplicate) {
        await client.query(
          `INSERT INTO invoice_risk_findings
           (invoice_id, rule_code, severity, title, description, triggering_data, action_required)
           VALUES ($1, 'DUPLICATE_INVOICE_NUMBER', 'critical', 'Duplicate Invoice Submission', 
                   $2, $3, 'Review prior payment history to verify if this invoice was already settled.')`,
          [
            inv.id,
            `An invoice with number ${invoiceNumber} already exists in the system.`,
            JSON.stringify({ duplicateInvoiceId: duplicateCheck.rows[0].id }),
          ]
        );
      }

      return inv;
    });

    await recordAuditEvent({
      organisationId,
      resourceType: 'invoice',
      resourceId: invoice.id,
      action: 'invoice_uploaded',
      actorName: 'Operator',
      actorRole: 'finance_manager',
      metadata: { invoiceNumber, amount, currency, isDuplicate },
    });

    res.status(201).json({
      success: true,
      invoice,
      extraction: { ...extraction, invoiceNumber, amount, currency, dueDate },
      isDuplicate,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/invoices/:id/correct - Manual field correction
invoicesRouter.patch('/:id/correct', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { invoiceNumber, amount, currency, dueDate, supplierId, recipientId } = req.body;

    const updated = await withTransaction(async (client) => {
      const currentRes = await client.query(`SELECT organisation_id, currency FROM invoices WHERE id = $1`, [id]);
      if (currentRes.rows.length === 0) throw new Error('Invoice not found');

      const orgId = currentRes.rows[0].organisation_id;
      const targetCurrency = currency || currentRes.rows[0].currency;
      const amountMinor = amount ? toMinorUnits(amount, targetCurrency).toString() : undefined;

      const invRes = await client.query(
        `UPDATE invoices
         SET invoice_number = COALESCE($1, invoice_number),
             amount_minor = COALESCE($2, amount_minor),
             currency = COALESCE($3, currency),
             due_date = COALESCE($4, due_date),
             supplier_id = COALESCE($5, supplier_id),
             recipient_id = COALESCE($6, recipient_id),
             status = 'approved',
             updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [invoiceNumber, amountMinor, currency, dueDate, supplierId, recipientId, id]
      );

      await client.query(
        `UPDATE invoice_extractions
         SET review_state = 'user_modified'
         WHERE invoice_id = $1`,
        [id]
      );

      return { orgId, invoice: invRes.rows[0] };
    });

    await recordAuditEvent({
      organisationId: updated.orgId,
      resourceType: 'invoice',
      resourceId: id,
      action: 'invoice_corrected_manually',
      actorName: 'Operator',
      actorRole: 'finance_manager',
      metadata: req.body,
    });

    res.json({ success: true, invoice: updated.invoice });
  } catch (err) {
    next(err);
  }
});

