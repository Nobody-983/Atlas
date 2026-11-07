import {
  BlaaizFeeBreakdownRequest,
  BlaaizFeeBreakdownResponse,
  BlaaizPayoutRequest,
  BlaaizPayoutResponse,
  BlaaizRateItem,
} from './types.js';

// Realistic market rates matrix (Base Currency: NGN, USD, KES, EUR, GBP, CAD)
const BASE_FX_RATES: Record<string, Record<string, number>> = {
  NGN: {
    USD: 0.00066225, // ~1,510 NGN/USD
    KES: 0.08620689, // ~11.6 NGN/KES
    EUR: 0.00060975, // ~1,640 NGN/EUR
    GBP: 0.00051813, // ~1,930 NGN/GBP
    CAD: 0.00090090, // ~1,110 NGN/CAD
    NGN: 1.0,
  },
  USD: {
    NGN: 1510.0,
    KES: 130.2,
    EUR: 0.92,
    GBP: 0.78,
    CAD: 1.36,
    USD: 1.0,
  },
  KES: {
    NGN: 11.6,
    USD: 0.00768,
    EUR: 0.00707,
    GBP: 0.00599,
    KES: 1.0,
  },
};

export class BlaaizSandboxEmulator {
  public static getRate(from: string, to: string): number {
    const fromCur = from.toUpperCase();
    const toCur = to.toUpperCase();

    if (fromCur === toCur) return 1.0;

    if (BASE_FX_RATES[fromCur]?.[toCur]) {
      return BASE_FX_RATES[fromCur][toCur];
    }

    if (BASE_FX_RATES[toCur]?.[fromCur]) {
      return 1 / BASE_FX_RATES[toCur][fromCur];
    }

    // Triangular arbitrage through USD
    const fromToUsd = BASE_FX_RATES[fromCur]?.['USD'] || (1 / (BASE_FX_RATES['USD']?.[fromCur] || 1));
    const usdToDest = BASE_FX_RATES['USD']?.[toCur] || 1;
    return fromToUsd * usdToDest;
  }

  public static calculateFeeBreakdown(req: BlaaizFeeBreakdownRequest): BlaaizFeeBreakdownResponse {
    const rate = this.getRate(req.from_currency_id, req.to_currency_id);
    let fromAmount = req.from_amount || 0;
    let toAmount = req.to_amount || 0;

    if (req.from_amount && !req.to_amount) {
      toAmount = parseFloat((fromAmount * rate).toFixed(2));
    } else if (req.to_amount && !req.from_amount) {
      fromAmount = parseFloat((toAmount / rate).toFixed(2));
    }

    // Blaaiz fee model: 0.35% processing fee + flat base charge
    const flatBase = req.from_currency_id.toUpperCase() === 'NGN' ? 1500 : 15;
    const variableFee = fromAmount * 0.0035;
    const baseFee = parseFloat((flatBase + variableFee).toFixed(2));
    const vat = parseFloat((baseFee * 0.075).toFixed(2)); // 7.5% VAT
    const totalFee = parseFloat((baseFee + vat).toFixed(2));

    return {
      rate,
      from_amount: fromAmount,
      to_amount: toAmount,
      fee: baseFee,
      vat,
      total_fee: totalFee,
      from_currency_id: req.from_currency_id.toUpperCase(),
      to_currency_id: req.to_currency_id.toUpperCase(),
    };
  }

  public static listRates(): BlaaizRateItem[] {
    const timestamp = new Date().toISOString();
    const items: BlaaizRateItem[] = [];

    for (const [from, dests] of Object.entries(BASE_FX_RATES)) {
      for (const [to, rate] of Object.entries(dests)) {
        if (from !== to) {
          items.push({
            id: `rate_${from}_${to}`,
            from_currency_id: from,
            to_currency_id: to,
            rate,
            inverse_rate: 1 / rate,
            timestamp,
          });
        }
      }
    }
    return items;
  }

  public static createPayout(req: BlaaizPayoutRequest): BlaaizPayoutResponse {
    const rate = this.getRate(req.from_currency_id, req.to_currency_id);
    const toAmount = parseFloat((req.from_amount * rate).toFixed(2));
    const fee = req.from_currency_id.toUpperCase() === 'NGN' ? 1612.5 : 16.12;
    const reference = `BLZ_PAY_${Date.now().toString(36).toUpperCase()}_${Math.floor(Math.random() * 9000 + 1000)}`;

    return {
      id: `payout_${Date.now()}`,
      reference,
      status: 'processing',
      from_amount: req.from_amount,
      to_amount: toAmount,
      from_currency: req.from_currency_id.toUpperCase(),
      to_currency: req.to_currency_id.toUpperCase(),
      fee,
      created_at: new Date().toISOString(),
      customer_id: req.customer_id,
    };
  }
}

