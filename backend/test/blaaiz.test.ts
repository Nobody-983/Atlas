import { describe, expect, it } from 'vitest';
import { blaaizClient } from '../src/blaaiz/client.js';
import { BlaaizSandboxEmulator } from '../src/blaaiz/emulator.js';
import { generateBlaaizWebhookSignature, verifyBlaaizWebhookSignature } from '../src/blaaiz/webhook.js';

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
});

