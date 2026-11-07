export interface RiskFinding {
  ruleCode: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  triggeringData?: Record<string, any>;
  actionRequired: string;
}

export interface RiskEvaluationContext {
  organisationId: string;
  supplierId?: string;
  supplierName?: string;
  recipientId: string;
  recipientName: string;
  recipientAccount: {
    bankName: string;
    accountNumber: string;
    currency: string;
    routingNumber?: string;
    isPrimary?: boolean;
    updatedAt?: Date | string;
  };
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceAmountMinor: bigint;
  invoiceCurrency: string;
  extractedFields?: {
    accountNumber?: string;
    bankName?: string;
    supplierName?: string;
  };
  recipientChangeHistory?: Array<{
    id: string;
    createdAt: Date | string;
    reviewStatus: string;
  }>;
  existingInvoicesWithSameNumber?: number;
  recentPaymentsToSupplier?: Array<{
    id: string;
    amountMinor: bigint;
    createdAt: Date | string;
  }>;
  supplierHistoricalAvgMinor?: bigint;
  recipientCompletedPayoutsCount?: number;
}

export class ProofRailRules {
  /**
   * Rule: Duplicate Invoice Number
   */
  public static checkDuplicateInvoiceNumber(ctx: RiskEvaluationContext): RiskFinding | null {
    if (ctx.existingInvoicesWithSameNumber && ctx.existingInvoicesWithSameNumber > 0) {
      return {
        ruleCode: 'DUPLICATE_INVOICE_NUMBER',
        severity: 'critical',
        title: 'Duplicate Invoice Number Detected',
        description: `Invoice number "${ctx.invoiceNumber}" has already been submitted for supplier "${ctx.supplierName}".`,
        triggeringData: { invoiceNumber: ctx.invoiceNumber, count: ctx.existingInvoicesWithSameNumber },
        actionRequired: 'Verify whether this is an accidental re-submission before proceeding.',
      };
    }
    return null;
  }

  /**
   * Rule: Recipient Bank Changed Protection
   * If recipient bank details changed recently or have pending review.
   */
  public static checkRecipientBankChanged(ctx: RiskEvaluationContext): RiskFinding | null {
    if (ctx.recipientChangeHistory && ctx.recipientChangeHistory.length > 0) {
      const recentChange = ctx.recipientChangeHistory[0];
      const changeDate = new Date(recentChange.createdAt).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      if (changeDate > sevenDaysAgo || recentChange.reviewStatus === 'pending_review') {
        return {
          ruleCode: 'RECIPIENT_BANK_CHANGED',
          severity: 'critical',
          title: 'Recipient Banking Details Recently Altered',
          description: `The bank details for recipient "${ctx.recipientName}" were modified on ${new Date(recentChange.createdAt).toLocaleDateString()}. Fraudsters frequently compromise supplier emails to redirect payouts to attacker accounts.`,
          triggeringData: {
            changeId: recentChange.id,
            status: recentChange.reviewStatus,
            changedAt: recentChange.createdAt,
          },
          actionRequired: 'Conduct out-of-band verification (phone/video callback) with supplier prior to payment authorization.',
        };
      }
    }
    return null;
  }

  /**
   * Rule: Repeated Payment Amount to Same Supplier
   */
  public static checkRepeatedAmount(ctx: RiskEvaluationContext): RiskFinding | null {
    if (ctx.recentPaymentsToSupplier && ctx.recentPaymentsToSupplier.length > 0) {
      const matching = ctx.recentPaymentsToSupplier.find(
        (p) => p.amountMinor === ctx.invoiceAmountMinor
      );
      if (matching) {
        return {
          ruleCode: 'REPEATED_AMOUNT_SUPPLIER',
          severity: 'warning',
          title: 'Identical Payment Amount to Supplier Within 30 Days',
          description: `A payout of the identical amount (${ctx.invoiceAmountMinor}) was recently executed for this supplier on ${new Date(matching.createdAt).toLocaleDateString()}.`,
          triggeringData: { priorPaymentId: matching.id },
          actionRequired: 'Confirm this is a separate recurring obligation and not an accidental duplicate billing.',
        };
      }
    }
    return null;
  }

  /**
   * Rule: Invoice vs Recipient Currency Mismatch
   */
  public static checkCurrencyMismatch(ctx: RiskEvaluationContext): RiskFinding | null {
    if (
      ctx.invoiceCurrency &&
      ctx.recipientAccount.currency &&
      ctx.invoiceCurrency.toUpperCase() !== ctx.recipientAccount.currency.toUpperCase()
    ) {
      return {
        ruleCode: 'CURRENCY_MISMATCH',
        severity: 'info',
        title: 'Invoice and Recipient Account Currency Divergence',
        description: `Invoice is denominated in ${ctx.invoiceCurrency}, but recipient account expects ${ctx.recipientAccount.currency}. Auto-FX conversion will occur.`,
        triggeringData: {
          invoiceCurrency: ctx.invoiceCurrency,
          recipientCurrency: ctx.recipientAccount.currency,
        },
        actionRequired: 'Ensure recipient bank account accepts settlement in target currency.',
      };
    }
    return null;
  }

  /**
   * Rule: Invoice Extracted vs Recipient Account Mismatch
   */
  public static checkInvoiceAccountMismatch(ctx: RiskEvaluationContext): RiskFinding | null {
    if (ctx.extractedFields?.accountNumber && ctx.recipientAccount.accountNumber) {
      const cleanExtracted = ctx.extractedFields.accountNumber.replace(/[^a-zA-Z0-9]/g, '');
      const cleanSaved = ctx.recipientAccount.accountNumber.replace(/[^a-zA-Z0-9]/g, '');

      if (cleanExtracted && cleanSaved && !cleanSaved.includes(cleanExtracted) && !cleanExtracted.includes(cleanSaved)) {
        return {
          ruleCode: 'INVOICE_RECIPIENT_MISMATCH',
          severity: 'critical',
          title: 'Extracted Invoice Bank Account Mismatch',
          description: `Bank details printed on invoice (${ctx.extractedFields.accountNumber}) do not match the selected recipient account (${ctx.recipientAccount.accountNumber}).`,
          triggeringData: {
            extracted: ctx.extractedFields.accountNumber,
            saved: ctx.recipientAccount.accountNumber,
          },
          actionRequired: 'Verify remittance instructions with vendor to avoid misdirected wire.',
        };
      }
    }
    return null;
  }

  /**
   * Rule: Unusual Spike in Payment Amount (>200% average)
   */
  public static checkUnusualAmount(ctx: RiskEvaluationContext): RiskFinding | null {
    if (ctx.supplierHistoricalAvgMinor && ctx.supplierHistoricalAvgMinor > 0n) {
      const threshold = ctx.supplierHistoricalAvgMinor * 2n;
      if (ctx.invoiceAmountMinor > threshold) {
        return {
          ruleCode: 'UNUSUAL_AMOUNT',
          severity: 'warning',
          title: 'Unusually High Payment Amount',
          description: `Invoice amount is more than 200% above historical average payments for supplier "${ctx.supplierName}".`,
          triggeringData: {
            currentMinor: ctx.invoiceAmountMinor.toString(),
            historicalAvgMinor: ctx.supplierHistoricalAvgMinor.toString(),
          },
          actionRequired: 'Requires explicit manager verification against contract or procurement purchase order.',
        };
      }
    }
    return null;
  }

  /**
   * Rule: New Recipient First-Time Payout
   */
  public static checkNewRecipient(ctx: RiskEvaluationContext): RiskFinding | null {
    if (ctx.recipientCompletedPayoutsCount === 0) {
      return {
        ruleCode: 'NEW_RECIPIENT_PROBATION',
        severity: 'info',
        title: 'First-Time Recipient Payment',
        description: `This is the initial payment to recipient "${ctx.recipientName}".`,
        actionRequired: 'Perform initial beneficiary verification check.',
      };
    }
    return null;
  }
}

