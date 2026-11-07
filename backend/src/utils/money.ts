export interface CurrencyMetadata {
  code: string;
  decimals: number;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyMetadata> = {
  USD: { code: 'USD', decimals: 2, symbol: '$', name: 'US Dollar' },
  NGN: { code: 'NGN', decimals: 2, symbol: '₦', name: 'Nigerian Naira' },
  KES: { code: 'KES', decimals: 2, symbol: 'KSh', name: 'Kenyan Shilling' },
  EUR: { code: 'EUR', decimals: 2, symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', decimals: 2, symbol: '£', name: 'British Pound' },
  CAD: { code: 'CAD', decimals: 2, symbol: 'CA$', name: 'Canadian Dollar' },
  GHS: { code: 'GHS', decimals: 2, symbol: 'GH₵', name: 'Ghanaian Cedi' },
  ZAR: { code: 'ZAR', decimals: 2, symbol: 'R', name: 'South African Rand' },
};

export function getCurrencyMetadata(currency: string): CurrencyMetadata {
  const meta = SUPPORTED_CURRENCIES[currency.toUpperCase()];
  if (!meta) {
    return { code: currency.toUpperCase(), decimals: 2, symbol: currency.toUpperCase(), name: currency.toUpperCase() };
  }
  return meta;
}

/**
 * Converts a decimal amount (e.g. 100.50) into exact integer minor units (e.g. 10050n).
 * Uses string manipulation to prevent floating point inaccuracies.
 */
export function toMinorUnits(amount: number | string, currency: string): bigint {
  const meta = getCurrencyMetadata(currency);
  const str = typeof amount === 'number' ? amount.toFixed(meta.decimals) : amount.trim();
  
  const [wholePart, fractionalPart = ''] = str.split('.');
  const paddedFraction = fractionalPart.padEnd(meta.decimals, '0').slice(0, meta.decimals);
  
  const combined = `${wholePart}${paddedFraction}`.replace(/^(-?)0+(?=\d)/, '$1');
  return BigInt(combined || '0');
}

/**
 * Converts integer minor units back to a standard floating-point representation for display.
 */
export function fromMinorUnits(minor: bigint | number | string, currency: string): number {
  const meta = getCurrencyMetadata(currency);
  const minorBig = BigInt(minor.toString());
  const divisor = Math.pow(10, meta.decimals);
  return Number(minorBig) / divisor;
}

/**
 * Formats minor units into an international currency string with symbol (e.g. "$1,250.00").
 */
export function formatMoney(minor: bigint | number | string, currency: string): string {
  const meta = getCurrencyMetadata(currency);
  const decimalAmount = fromMinorUnits(minor, currency);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: meta.code,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(decimalAmount);
}

