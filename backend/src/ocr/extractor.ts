export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  supplierName?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  amount?: number;
  description?: string;
  bankAccount?: string;
  routingNumber?: string;
  swiftBic?: string;
  iban?: string;
  rawText: string;
  confidenceScores: Record<string, number>;
}

export class InvoiceExtractor {
  /**
   * Deterministic pattern-matching extractor for financial invoices.
   * Can ingest raw text from PDF/OCR or image text.
   */
  public static extract(rawText: string): ExtractedInvoiceData {
    const text = rawText || '';
    const confidenceScores: Record<string, number> = {};

    // 1. Invoice Number Extraction
    let invoiceNumber: string | undefined;
    const invMatch = text.match(/(?:invoice\s*(?:#|no\.?|number\s*:?))\s*([A-Z0-9\-_/]+)/i);
    if (invMatch) {
      invoiceNumber = invMatch[1].trim();
      confidenceScores['invoiceNumber'] = 0.98;
    } else {
      const fallbackInv = text.match(/(INV-[0-9]{4}-[0-9]{3,6})/i);
      if (fallbackInv) {
        invoiceNumber = fallbackInv[1].trim();
        confidenceScores['invoiceNumber'] = 0.95;
      }
    }

    // 2. Amount and Currency Extraction
    let amount: number | undefined;
    let currency: string | undefined;

    const currencyMatch = text.match(/\b(USD|NGN|KES|EUR|GBP|CAD|GHS|ZAR|\$|₦|€|£)\b/i);
    if (currencyMatch) {
      const symbol = currencyMatch[1].toUpperCase();
      if (symbol === '$' || symbol === 'USD') currency = 'USD';
      else if (symbol === '₦' || symbol === 'NGN') currency = 'NGN';
      else if (symbol === '€' || symbol === 'EUR') currency = 'EUR';
      else if (symbol === '£' || symbol === 'GBP') currency = 'GBP';
      else currency = symbol;
      confidenceScores['currency'] = 0.96;
    }

    // Prefer explicit currency symbol followed by amount (e.g. $8,900.00)
    const currencyAmountMatch = text.match(/[$₦€£]\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
    const amountLabelMatch = text.match(/(?:amount|total\s*due|grand\s*total|invoice\s*amount|balance)\s*[:$₦€£]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i);

    if (currencyAmountMatch) {
      amount = parseFloat(currencyAmountMatch[1].replace(/,/g, ''));
      confidenceScores['amount'] = 0.99;
    } else if (amountLabelMatch) {
      amount = parseFloat(amountLabelMatch[1].replace(/,/g, ''));
      confidenceScores['amount'] = 0.95;
    }

    // 3. Due Date Extraction
    let dueDate: string | undefined;
    const dueMatch = text.match(/(?:due\s*date|payment\s*due)\s*[:\-]?\s*([A-Za-z0-9\s,\/\-]+)/i);
    if (dueMatch) {
      const parsed = Date.parse(dueMatch[1].trim());
      if (!isNaN(parsed)) {
        dueDate = new Date(parsed).toISOString().split('T')[0];
        confidenceScores['dueDate'] = 0.92;
      }
    }

    // 4. Bank Account & Routing
    let bankAccount: string | undefined;
    const acctMatch = text.match(/(?:account\s*(?:#|no\.?|number))\s*[:\-]?\s*([0-9A-Z\-]{6,20})/i);
    if (acctMatch) {
      bankAccount = acctMatch[1].trim();
      confidenceScores['bankAccount'] = 0.95;
    }

    let routingNumber: string | undefined;
    const routingMatch = text.match(/(?:routing\s*(?:#|no\.?|number)|aba|sort\s*code)\s*[:\-]?\s*([0-9]{9}|[0-9\-]{6,8})/i);
    if (routingMatch) {
      routingNumber = routingMatch[1].trim();
      confidenceScores['routingNumber'] = 0.94;
    }

    let swiftBic: string | undefined;
    const swiftMatch = text.match(/\b([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/);
    if (swiftMatch && swiftMatch[1] !== 'INVOICE') {
      swiftBic = swiftMatch[1];
      confidenceScores['swiftBic'] = 0.91;
    }

    // 5. Supplier Name (first prominent non-empty line)
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
    let supplierName: string | undefined;
    if (lines.length > 0) {
      supplierName = lines[0];
      confidenceScores['supplierName'] = 0.88;
    }

    return {
      invoiceNumber,
      supplierName,
      dueDate,
      currency: currency || 'USD',
      amount,
      bankAccount,
      routingNumber,
      swiftBic,
      rawText: text,
      confidenceScores,
    };
  }
}
