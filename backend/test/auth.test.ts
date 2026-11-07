import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('ATLAS Authentication & Business Onboarding Test Suite', () => {
  const uniqueId = Date.now().toString(36);
  const testEmail = `founder_${uniqueId}@pan-african-logistics.ng`;
  const testPassword = 'StrongPassword123!';
  let authToken: string;
  let userId: string;
  let verificationToken: string;
  let createdOrgId: string;

  it('POST /api/v1/auth/signup creates a new account with hashed password and verification token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: testEmail,
        password: testPassword,
        fullName: 'Folake Adeyemi',
        phoneNumber: '+2348039201928',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.is_email_verified).toBe(false);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('verificationToken');

    authToken = res.body.token;
    userId = res.body.user.id;
    verificationToken = res.body.verificationToken;
  });

  it('POST /api/v1/auth/verify-email validates verification code and activates verified status', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({
        email: testEmail,
        token: verificationToken,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.is_email_verified).toBe(true);
  });

  it('POST /api/v1/auth/login validates credentials and issues fresh JWT session', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.is_email_verified).toBe(true);
    expect(res.body).toHaveProperty('token');
    authToken = res.body.token;
  });

  it('GET /api/v1/auth/session returns authenticated session context via Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/session')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.id).toBe(userId);
    expect(res.body.needsOnboarding).toBe(true);
  });

  it('POST /api/v1/auth/forgot-password and /reset-password successfully resets password', async () => {
    // 1. Request reset
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testEmail });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    const resetToken = forgotRes.body.resetToken;

    // 2. Perform reset
    const newPassword = 'NewStrongPassword456!';
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        email: testEmail,
        token: resetToken,
        newPassword,
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 3. Verify login works with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: newPassword,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    authToken = loginRes.body.token;
  });

  it('POST /api/v1/onboarding/save-draft persists progressive onboarding progress', async () => {
    const res = await request(app)
      .post('/api/v1/onboarding/save-draft')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        step: 2,
        draftData: {
          businessName: 'Pan-African Cargo Rail Ltd',
          country: 'NGA',
          businessType: 'limited_company',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.step).toBe(2);
  });

  it('POST /api/v1/onboarding/complete creates an honest pending-verification business workspace and assigns Owner role', async () => {
    const res = await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        jobTitle: 'Managing Director & Founder',
        phoneNumber: '+2348039201928',
        userRole: 'owner',
        businessName: 'Pan-African Cargo Rail Ltd',
        country: 'NGA',
        businessType: 'limited_company',
        baseCurrency: 'NGN',
        contactEmail: testEmail,
        contactPhone: '+2348039201928',
        website: 'https://panafricancargo.ng',
        operatingAddress: {
          street: '14 Marina Boulevard, Lagos Island',
          city: 'Lagos',
          state: 'Lagos State',
          country: 'Nigeria',
        },
        registrationNumber: `RC-${Date.now().toString().slice(-7)}`,
        taxId: `TIN-${Date.now().toString().slice(-8)}-0001`,
        kybDocuments: [
          {
            documentType: 'certificate_of_incorporation',
            fileName: 'CAC_Certificate_Incorporation.pdf',
            referenceNumber: 'RC-1928410',
          },
          {
            documentType: 'director_id',
            fileName: 'National_Identity_Slip.pdf',
            referenceNumber: 'NIN-8291048192',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.organisation.name).toBe('Pan-African Cargo Rail Ltd');
    expect(res.body.organisation.onboarding_status).toBe('pending_verification');
    expect(res.body.organisation.kyb_verification_status).toBe('pending_review');
    expect(res.body.role).toBe('owner');
    createdOrgId = res.body.organisation.id;
  });

  it('Cross-workspace data isolation: user cannot access other organisations data', async () => {
    const demoOrgId = 'a1000000-0000-0000-0000-000000000001'; // Apex Global Imports
    
    // Attempting to query an unauthorized workspace returns 403 Forbidden
    const forbiddenRes = await request(app)
      .get(`/api/v1/invoices?orgId=${demoOrgId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error).toContain('Access denied');

    // Querying authorized workspace returns 200 with empty state
    const res = await request(app)
      .get(`/api/v1/invoices?orgId=${createdOrgId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.invoices.length).toBe(0);

    // Analytics overview for fresh workspace has zero fabricated figures
    const analyticsRes = await request(app)
      .get(`/api/v1/analytics/overview?orgId=${createdOrgId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.summary.paymentStatus).toHaveLength(0);
    expect(analyticsRes.body.summary.corridors).toHaveLength(0);
    expect(analyticsRes.body.summary.invoices.total_invoices).toBe('0');
  });
});
