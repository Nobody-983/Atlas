import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { generateBlaaizWebhookSignature } from '../src/blaaiz/webhook.js';
import { config } from '../src/config.js';
import { query } from '../src/db.js';

describe('ATLAS Backend End-to-End API Test Suite', () => {
  const demoOrgId = 'a1000000-0000-0000-0000-000000000001';
  let createdPaymentRequestId: string;

  beforeAll(async () => {
    // Clean up any transient test records from prior runs to maintain test idempotency
    await query("DELETE FROM payments WHERE idempotency_key LIKE 'test_%' OR idempotency_key LIKE 'payroll_item_%' OR idempotency_key LIKE 'idemp_%'");
    await query("DELETE FROM payment_requests WHERE purpose LIKE '%Engineering platform architecture%' OR purpose LIKE '%Test%'");
  });

  it('GET /api/v1/health returns healthy operational status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database.status).toBe('connected');
    expect(res.body.modules.commerce).toBe('online');
    expect(res.body.modules.proofrail).toBe('online');
    expect(res.body.modules.relay).toBe('online');
  });

  it('GET /api/v1/auth/session returns active user and organisation context', async () => {
    const res = await request(app).get(`/api/v1/auth/session?orgId=${demoOrgId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.organisation.slug).toBe('apex-global');
    expect(res.body.availablePersonas.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/suppliers lists organisation suppliers', async () => {
    const res = await request(app).get(`/api/v1/suppliers?orgId=${demoOrgId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.suppliers.length).toBeGreaterThan(0);
    expect(res.body.suppliers[0]).toHaveProperty('name');
  });

  it('POST /api/v1/suppliers creates a new verified supplier', async () => {
    const res = await request(app)
      .post('/api/v1/suppliers')
      .send({
        organisationId: demoOrgId,
        name: 'Kyoto Robotics K.K.',
        contactEmail: 'billing@kyoto-robotics.jp',
        country: 'JPN',
        businessType: 'supplier',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.supplier.name).toBe('Kyoto Robotics K.K.');
  });

  it('GET /api/v1/recipients lists recipients with bank accounts', async () => {
    const res = await request(app).get(`/api/v1/recipients?orgId=${demoOrgId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recipients.length).toBeGreaterThan(0);
  });

  it('PATCH /api/v1/recipients/:id/bank-details triggers Recipient Change Protection', async () => {
    // Modify Shenzhen Microtech's bank account
    const recipId = 'd1000000-0000-0000-0000-000000000001';
    const res = await request(app)
      .patch(`/api/v1/recipients/${recipId}/bank-details`)
      .send({
        bankName: 'Standard Chartered Hong Kong',
        accountNumber: '998-112233-001',
        changeReason: 'Vendor corporate treasury reorganization',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('flagged for ProofRail security review');
  });

  it('POST /api/v1/invoices/upload extracts invoice intelligence and detects duplicates', async () => {
    const rawInvoiceText = `
      Shenzhen Microtech Electronics Ltd
      INVOICE # INV-2026-9901
      Date: 2026-11-05
      Payment Due: 2026-11-20
      Amount: $8,900.00 USD
      Account Number: 848-291049-001
      SWIFT: HSBCHKHHXXX
    `;

    const res = await request(app)
      .post('/api/v1/invoices/upload')
      .send({
        organisationId: demoOrgId,
        fileName: 'microtech_batch99.pdf',
        rawText: rawInvoiceText,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.invoice.invoice_number).toBe('INV-2026-9901');
    expect(res.body.extraction.amount).toBe(8900);
    expect(res.body.extraction.currency).toBe('USD');
  });

  it('POST /api/v1/quotes returns transparent live FX quote from Blaaiz', async () => {
    const res = await request(app)
      .post('/api/v1/quotes')
      .send({
        fromCurrency: 'NGN',
        toCurrency: 'USD',
        toAmount: 5000,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(parseFloat(res.body.quote.exchange_rate)).toBeGreaterThan(0);
    expect(res.body.quote.provider_fee_minor).toBeDefined();
    expect(res.body.quote.details.total_fee).toBeGreaterThan(0);
  });

  it('POST /api/v1/payments/request creates payment request and evaluates ProofRail risk', async () => {
    const recipId = 'd1000000-0000-0000-0000-000000000003'; // Nairobi Cloud
    const res = await request(app)
      .post('/api/v1/payments/request')
      .send({
        organisationId: demoOrgId,
        recipientId: recipId,
        sourceCurrency: 'NGN',
        destinationCurrency: 'KES',
        amount: 250000,
        purpose: 'Engineering platform architecture sprint payment',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.paymentRequest).toBeDefined();
    expect(res.body.proofRail).toBeDefined();
    expect(res.body.proofRail.riskLevel).toBeDefined();

    createdPaymentRequestId = res.body.paymentRequest.id;
  });

  it('POST /api/v1/approvals/decide authorizes payment request', async () => {
    expect(createdPaymentRequestId).toBeDefined();

    const res = await request(app)
      .post('/api/v1/approvals/decide')
      .send({
        paymentRequestId: createdPaymentRequestId,
        decision: 'approved',
        notes: 'Verified against contract milestones.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.approval.decision).toBe('approved');
  });

  it('POST /api/v1/payments/initiate executes payout via Blaaiz adapter with idempotency', async () => {
    const idempKey = `test_idemp_${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/payments/initiate')
      .send({
        paymentRequestId: createdPaymentRequestId,
        idempotencyKey: idempKey,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.payment.provider_reference).toBeDefined();
    expect(res.body.payment.status).toBe('processing');

    // Test duplicate idempotency
    const dupRes = await request(app)
      .post('/api/v1/payments/initiate')
      .send({
        paymentRequestId: createdPaymentRequestId,
        idempotencyKey: idempKey,
      });

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.message).toContain('Payment already processed');
  });

  it('POST /api/v1/webhooks/blaaiz verifies HMAC signature and updates payout status', async () => {
    const payload = {
      event: 'payout.completed',
      data: {
        id: 'payout_sim_01',
        reference: 'BLZ_PAY_99182941',
        status: 'completed',
        amount: 12500,
        currency: 'USD',
      },
      timestamp: new Date().toISOString(),
    };

    const signature = generateBlaaizWebhookSignature(payload, config.blaaiz.webhookSecret);

    const res = await request(app)
      .post('/api/v1/webhooks/blaaiz')
      .set('x-blaaiz-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/v1/reconciliation/run detects and reconciles discrepancies', async () => {
    const res = await request(app)
      .post('/api/v1/reconciliation/run')
      .send({ organisationId: demoOrgId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reconciliation).toHaveProperty('recordsInspected');
  });

  it('GET /api/v1/audit returns append-only immutable financial audit history', async () => {
    const res = await request(app).get(`/api/v1/audit?orgId=${demoOrgId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.auditEvents.length).toBeGreaterThan(0);
  });
});
