import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('ATLAS Payroll & Cross-Border Workforce API Test Suite', () => {
  const demoOrgId = 'a1000000-0000-0000-0000-000000000001';
  let createdWorkerId: string;
  let createdRunId: string;

  it('GET /api/v1/payroll/overview returns real database aggregations and currency exposure', async () => {
    const res = await request(app).get(`/api/v1/payroll/overview?orgId=${demoOrgId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('workforce');
    expect(Number(res.body.workforce.total_active_workers)).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('settledStats');
    expect(res.body).toHaveProperty('currencyExposure');
  });

  it('GET /api/v1/payroll/recipients lists categorized employees and contractors', async () => {
    const res = await request(app).get(`/api/v1/payroll/recipients?orgId=${demoOrgId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.recipients)).toBe(true);
    expect(res.body.recipients.length).toBeGreaterThan(0);
    const worker = res.body.recipients[0];
    expect(worker).toHaveProperty('recipient_type');
    expect(['employee', 'contractor']).toContain(worker.recipient_type);
  });

  it('POST /api/v1/payroll/recipients onboards a new global workforce member', async () => {
    const res = await request(app)
      .post('/api/v1/payroll/recipients')
      .send({
        organisationId: demoOrgId,
        displayName: 'Amara Nwosu',
        recipientType: 'employee',
        country: 'NGA',
        currency: 'NGN',
        department: 'Operations',
        jobTitle: 'Logistics Coordinator',
        email: 'amara.nwosu@apeximports.ng',
        defaultSalaryMinor: 180000000, // 1.8M NGN
        bankName: 'Access Bank PLC',
        accountNumber: '0812948192',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.recipient.display_name).toBe('Amara Nwosu');
    expect(res.body.recipient.recipient_type).toBe('employee');
    createdWorkerId = res.body.recipient.id;
  });

  it('POST /api/v1/payroll/runs initiates a guided batch payroll run with live FX rates', async () => {
    // Fetch a couple of recipients
    const listRes = await request(app).get(`/api/v1/payroll/recipients?orgId=${demoOrgId}`);
    const recipients = listRes.body.recipients;
    expect(recipients.length).toBeGreaterThan(0);

    const items = recipients.slice(0, 2).map((r: any) => ({
      recipientId: r.id,
      itemType: r.recipient_type === 'employee' ? 'salary' : 'contractor_fee',
      destinationAmountMinor: r.default_salary_minor > 0 ? r.default_salary_minor : 100000,
      notes: 'End of month cycle',
    }));

    const res = await request(app)
      .post('/api/v1/payroll/runs')
      .send({
        organisationId: demoOrgId,
        title: 'December 2026 Test Workforce Run',
        payPeriodStart: '2026-12-01',
        payPeriodEnd: '2026-12-31',
        payDate: '2026-12-28',
        fundingCurrency: 'NGN',
        items,
        notes: 'End-to-end integration test payroll batch',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.run.status).toBe('draft');
    expect(Number(res.body.run.total_funding_minor)).toBeGreaterThan(0);
    createdRunId = res.body.run.id;
  });

  it('POST /api/v1/payroll/runs/:id/submit submits draft run for approval', async () => {
    const res = await request(app).post(`/api/v1/payroll/runs/${createdRunId}/submit`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.run.status).toBe('pending_approval');
  });

  it('POST /api/v1/payroll/runs/:id/approve authorizes payroll run with audit record', async () => {
    const res = await request(app)
      .post(`/api/v1/payroll/runs/${createdRunId}/approve`)
      .send({
        approverId: 'b1000000-0000-0000-0000-000000000001', // Amara Okafor (Owner)
        notes: 'Authorized test batch payroll after dual verification.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.run.status).toBe('approved');
  });

  it('POST /api/v1/payroll/runs/:id/execute dispatches batch payouts via Blaaiz Relay', async () => {
    const res = await request(app)
      .post(`/api/v1/payroll/runs/${createdRunId}/execute`)
      .send({
        initiatedBy: 'b1000000-0000-0000-0000-000000000002', // Tunde Bakare
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.run.status).toBe('completed');
    expect(res.body.successful).toBeGreaterThan(0);
  });
});

