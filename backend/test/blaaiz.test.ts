import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { query } from '../src/db.js';
import { BLAIIZ_USER_AGENT, BlaaizClient, blaaizClient } from '../src/blaaiz/client.js';
import { BlaaizSandboxEmulator } from '../src/blaaiz/emulator.js';
import { generateBlaaizWebhookSignature, verifyBlaaizWebhookSignature } from '../src/blaaiz/webhook.js';
import { config } from '../src/config.js';
import { ProviderError } from '../src/utils/errors.js';

describe('Blaaiz Provider Integration & Webhook Security', () => {
  it('calculates accurate fee breakdown and FX rate via emulator', () => {
    const feeRes = BlaaizSandboxEmulator.calculateFeeBreakdown({
      from_currency_id: 'NGN',
      to_currency_id: 'USD',
      to_amount: 1000,
    });

    expect(feeRes.from_currency_id).toBe('NGN');
    expect(feeRes.to_currency_id).toBe('USD');
    expect(feeRes.rate).toBeGreaterThan(0);
    expect(feeRes.from_amount).toBeGreaterThan(1000000); // 1000 USD is > 1.5M NGN
    expect(feeRes.fee).toBeGreaterThan(0);
    expect(feeRes.vat).toBeGreaterThan(0);
    expect(feeRes.total_fee).toBe(parseFloat((feeRes.fee + feeRes.vat).toFixed(2)));
  });

  it('lists multi-corridor market rates', () => {
    const rates = BlaaizSandboxEmulator.listRates();
    expect(rates.length).toBeGreaterThan(5);
    const usdNgn = rates.find((r) => r.from_currency_id === 'USD' && r.to_currency_id === 'NGN');
    expect(usdNgn).toBeDefined();
    expect(usdNgn!.rate).toBeGreaterThan(1000);
  });

  it('verifies valid HMAC SHA-256 webhook signatures from Blaaiz', () => {
    const secret = 'test_blaaiz_webhook_secret_key_88219';
    const payload = JSON.stringify({
      event: 'payout.completed',
      data: {
        id: 'payout_882910',
        reference: 'BLZ_PAY_TEST_01',
        status: 'completed',
        amount: 5000,
        currency: 'USD',
      },
      timestamp: new Date().toISOString(),
    });

    const signature = generateBlaaizWebhookSignature(payload, secret);
    const isValid = verifyBlaaizWebhookSignature(signature, payload, secret);
    expect(isValid).toBe(true);
  });

  it('rejects tampered or invalid webhook signatures', () => {
    const secret = 'test_blaaiz_webhook_secret_key_88219';
    const payload = JSON.stringify({ event: 'payout.completed' });
    const forgedSignature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    const isValid = verifyBlaaizWebhookSignature(forgedSignature, payload, secret);
    expect(isValid).toBe(false);
  });

  it('ensures User-Agent header is set to Atlas-Platform/1.0', () => {
    expect(BLAIIZ_USER_AGENT).toBe('Atlas-Platform/1.0');
  });

  it('implements scope-aware token caching: fees:read token cannot be reused for payout:create', async () => {
    const client = new BlaaizClient();
    (client as any).useEmulator = false;
    (client as any).clientId = 'test_client_id';
    (client as any).clientSecret = 'test_client_secret';

    const recordedScopes: string[] = [];
    const recordedHeaders: any[] = [];

    const mockFetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      recordedHeaders.push(opts.headers);
      const params = new URLSearchParams(opts.body);
      const scope = params.get('scope') || '';
      recordedScopes.push(scope);

      return {
        ok: true,
        json: async () => ({
          access_token: `token_for_${scope.replace(/\s+/g, '_')}`,
          token_type: 'Bearer',
          expires_in: 3600,
          scope,
        }),
      };
    });

    const originalFetch = global.fetch;
    global.fetch = mockFetch;

    try {
      // 1. Request fees:read token
      const token1 = await client.getAccessToken('fees:read');
      expect(token1).toBe('token_for_fees:read');
      expect(recordedScopes).toContain('fees:read');

      // Check User-Agent header was included
      expect(recordedHeaders[0]['User-Agent']).toBe('Atlas-Platform/1.0');

      // 2. Request payout:create token - MUST NOT reuse token1!
      const token2 = await client.getAccessToken('payout:create');
      expect(token2).toBe('token_for_payout:create');
      expect(recordedScopes).toContain('payout:create');
      expect(token2).not.toBe(token1);

      // 3. Request fees:read again - SHOULD reuse cached token1 without another fetch
      const initialCallCount = mockFetch.mock.calls.length;
      const token1Cached = await client.getAccessToken('fees:read');
      expect(token1Cached).toBe(token1);
      expect(mockFetch.mock.calls.length).toBe(initialCallCount);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('CRITICAL: failed real payout throws ProviderError and NEVER falls back to emulator', async () => {
    const client = new BlaaizClient();
    (client as any).useEmulator = false;
    (client as any).clientId = 'test_client_id';
    (client as any).clientSecret = 'test_client_secret';

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/oauth/token')) {
        return {
          ok: true,
          json: async () => ({
            access_token: 'valid_test_token',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'payout:create',
          }),
        };
      }
      // Payout network error or timeout
      throw new Error('ETIMEDOUT connection to api.blaaiz.com timed out');
    });

    try {
      await expect(
        client.createPayout({
          wallet_id: 'w1',
          customer_id: 'c1',
          method: 'bank_transfer',
          from_currency_id: 'NGN',
          to_currency_id: 'USD',
          from_amount: 5000,
          account_number: '1234567890',
        })
      ).rejects.toThrow(ProviderError);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('CRITICAL: duplicate webhook events are safely deduplicated using atomic event_id constraint', async () => {
    const secret = config.blaaiz.webhookSecret;
    const testEventId = `evt_test_dedup_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const testReference = `ref_test_dedup_${Date.now()}`;

    const payload = {
      event_id: testEventId,
      event: 'payout.processing',
      data: {
        id: 'payout_item_991',
        reference: testReference,
        status: 'processing',
        amount: 2500,
        currency: 'USD',
      },
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(payload);
    const signature = generateBlaaizWebhookSignature(payloadString, secret);

    // 1. First webhook delivery: should be accepted and processed
    const res1 = await request(app)
      .post('/api/v1/webhooks/blaaiz')
      .set('x-blaaiz-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.duplicate).toBeUndefined();

    // 2. Second webhook delivery with identical event_id: must be recognized as duplicate
    const res2 = await request(app)
      .post('/api/v1/webhooks/blaaiz')
      .set('x-blaaiz-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.duplicate).toBe(true);

    // Verify database only persisted 1 record for this event_id
    const dbEvents = await query(
      `SELECT COUNT(*) FROM payment_provider_events WHERE event_id = $1`,
      [testEventId]
    );
    expect(parseInt(dbEvents.rows[0].count, 10)).toBe(1);
  });
});
