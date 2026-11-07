import { describe, expect, it } from 'vitest';
import { ProofRailEngine } from '../src/proofrail/engine.js';
import { ProofRailRules } from '../src/proofrail/rules.js';

describe('ProofRail Trust Engine & Security Rules', () => {
  it('detects duplicate invoice numbers for the same vendor', () => {
    const finding = ProofRailRules.checkDuplicateInvoiceNumber({
      organisationId: 'test_org',
      recipientId: 'recip_1',
      recipientName: 'Test Recipient',
      recipientAccount: { bankName: 'Test Bank', accountNumber: '123456', currency: 'USD' },
      invoiceNumber: 'INV-2026-9041',
      invoiceAmountMinor: 345000n,
      invoiceCurrency: 'USD',
      existingInvoicesWithSameNumber: 1,
      supplierName: 'Global Freight',
    });

    expect(finding).not.toBeNull();
    expect(finding?.ruleCode).toBe('DUPLICATE_INVOICE_NUMBER');
    expect(finding?.severity).toBe('critical');
  });

  it('detects altered recipient bank details (Recipient Change Protection)', () => {
    const finding = ProofRailRules.checkRecipientBankChanged({
      organisationId: 'test_org',
      recipientId: 'recip_2',
      recipientName: 'Global Freight',
      recipientAccount: { bankName: 'Coastal Credit Union', accountNumber: '9912048821', currency: 'USD' },
      invoiceAmountMinor: 345000n,
      invoiceCurrency: 'USD',
      recipientChangeHistory: [
        {
          id: 'change_1',
          createdAt: new Date().toISOString(), // Modified today
          reviewStatus: 'pending_review',
        },
      ],
    });

    expect(finding).not.toBeNull();
    expect(finding?.ruleCode).toBe('RECIPIENT_BANK_CHANGED');
    expect(finding?.severity).toBe('critical');
    expect(finding?.actionRequired).toContain('out-of-band verification');
  });

  it('detects invoice-to-recipient account mismatch', () => {
    const finding = ProofRailRules.checkInvoiceAccountMismatch({
      organisationId: 'test_org',
      recipientId: 'recip_3',
      recipientName: 'Shenzhen Microtech',
      recipientAccount: { bankName: 'HSBC Hong Kong', accountNumber: '848-291049-001', currency: 'USD' },
      invoiceAmountMinor: 1250000n,
      invoiceCurrency: 'USD',
      extractedFields: {
        accountNumber: '999-111222-333', // Mismatch!
      },
    });

    expect(finding).not.toBeNull();
    expect(finding?.ruleCode).toBe('INVOICE_RECIPIENT_MISMATCH');
    expect(finding?.severity).toBe('critical');
  });

  it('flags unusual payment amounts exceeding 200% of historical average', () => {
    const finding = ProofRailRules.checkUnusualAmount({
      organisationId: 'test_org',
      recipientId: 'recip_4',
      recipientName: 'Small Vendor',
      recipientAccount: { bankName: 'Test Bank', accountNumber: '112233', currency: 'USD' },
      invoiceAmountMinor: 5000000n, // $50,000
      invoiceCurrency: 'USD',
      supplierHistoricalAvgMinor: 1000000n, // $10,000 (50k is 500% of average)
    });

    expect(finding).not.toBeNull();
    expect(finding?.ruleCode).toBe('UNUSUAL_AMOUNT');
    expect(finding?.severity).toBe('warning');
  });
});

