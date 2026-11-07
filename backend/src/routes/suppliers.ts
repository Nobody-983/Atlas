import { Router } from 'express';
import { query } from '../db.js';
import { recordAuditEvent } from '../utils/audit.js';

export const suppliersRouter = Router();

// GET /api/v1/suppliers
suppliersRouter.get('/', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || req.orgMember?.organisationId;
    if (!orgId) {
      return res.json({ success: true, suppliers: [] });
    }
    const suppliers = await query(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM invoices i WHERE i.supplier_id = s.id) as invoice_count,
              (SELECT COUNT(*) FROM recipients r WHERE r.supplier_id = s.id) as recipient_count
       FROM suppliers s
       WHERE s.organisation_id = $1
       ORDER BY s.created_at DESC`,
      [orgId]
    );

    res.json({ success: true, suppliers: suppliers.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/suppliers - Create supplier
suppliersRouter.post('/', async (req, res, next) => {
  try {
    const organisationId = req.body.organisationId || req.orgMember?.organisationId;
    if (!organisationId) {
      return res.status(400).json({ success: false, error: 'Organisation ID is required.' });
    }
    const {
      name,
      contactEmail,
      contactPhone,
      country,
      businessType = 'supplier',
      registrationNumber,
      taxId,
      notes,
    } = req.body;

    if (!name || !contactEmail || !country) {
      return res.status(400).json({ success: false, error: 'Name, email, and country are required.' });
    }

    const inserted = await query(
      `INSERT INTO suppliers 
       (organisation_id, name, contact_email, contact_phone, country, business_type, registration_number, tax_id, notes, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
      [organisationId, name, contactEmail, contactPhone || null, country.toUpperCase(), businessType, registrationNumber || null, taxId || null, notes || null]
    );

    const supplier = inserted.rows[0];

    await recordAuditEvent({
      organisationId,
      resourceType: 'recipient',
      resourceId: supplier.id,
      action: 'supplier_created',
      actorName: 'Operator',
      actorRole: 'finance_manager',
      metadata: { name, country, businessType },
    });

    res.status(201).json({ success: true, supplier });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/suppliers/:id - Supplier details
suppliersRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const suppRes = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    if (suppRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    const invoices = await query(`SELECT * FROM invoices WHERE supplier_id = $1 ORDER BY issue_date DESC`, [id]);
    const recipients = await query(
      `SELECT r.*, ra.bank_name, ra.account_number, ra.currency, ra.routing_number, ra.swift_bic
       FROM recipients r
       LEFT JOIN recipient_accounts ra ON ra.recipient_id = r.id AND ra.is_primary = TRUE
       WHERE r.supplier_id = $1`,
      [id]
    );

    res.json({
      success: true,
      supplier: suppRes.rows[0],
      invoices: invoices.rows,
      recipients: recipients.rows,
    });
  } catch (err) {
    next(err);
  }
});

