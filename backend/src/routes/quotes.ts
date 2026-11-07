import { Router } from 'express';
import { blaaizClient } from '../blaaiz/client.js';
import { query } from '../db.js';
import { toMinorUnits } from '../utils/money.js';

export const quotesRouter = Router();

// POST /api/v1/quotes - Request live FX quote and fee breakdown from Blaaiz
quotesRouter.post('/', async (req, res, next) => {
  try {
    const { fromCurrency, toCurrency, fromAmount, toAmount, paymentRequestId } = req.body;

    if (!fromCurrency || !toCurrency || (!fromAmount && !toAmount)) {
      return res.status(400).json({
        success: false,
        error: 'fromCurrency, toCurrency, and either fromAmount or toAmount are required.',
      });
    }

    // Call Blaaiz Provider API
    const feeBreakdown = await blaaizClient.getFeeBreakdown({
      from_currency_id: fromCurrency,
      to_currency_id: toCurrency,
      from_amount: fromAmount ? parseFloat(fromAmount) : undefined,
      to_amount: toAmount ? parseFloat(toAmount) : undefined,
    });

    const fromMinor = toMinorUnits(feeBreakdown.from_amount, fromCurrency);
    const toMinor = toMinorUnits(feeBreakdown.to_amount, toCurrency);
    const feeMinor = toMinorUnits(feeBreakdown.total_fee, fromCurrency);
    const totalChargeMinor = fromMinor + feeMinor;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute quote validity
    const quoteRef = `BLZ-Q-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

    const quoteRes = await query(
      `INSERT INTO payment_quotes
       (payment_request_id, provider, from_currency, to_currency, from_amount_minor, to_amount_minor,
        exchange_rate, provider_fee_minor, total_charge_minor, quote_reference, expires_at)
       VALUES ($1, 'blaaiz', $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        paymentRequestId || null,
        fromCurrency.toUpperCase(),
        toCurrency.toUpperCase(),
        fromMinor.toString(),
        toMinor.toString(),
        feeBreakdown.rate,
        feeMinor.toString(),
        totalChargeMinor.toString(),
        quoteRef,
        expiresAt,
      ]
    );

    res.json({
      success: true,
      quote: {
        ...quoteRes.rows[0],
        provider: 'blaaiz',
        isEmulator: blaaizClient.isUsingEmulator(),
        details: feeBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/quotes/rates - List available market rates
quotesRouter.get('/rates', async (req, res, next) => {
  try {
    const { search } = req.query;
    const rates = await blaaizClient.getRates(search as string);
    res.json({ success: true, isEmulator: blaaizClient.isUsingEmulator(), rates });
  } catch (err) {
    next(err);
  }
});

