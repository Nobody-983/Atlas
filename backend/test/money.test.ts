import { describe, expect, it } from 'vitest';
import { formatMoney, fromMinorUnits, toMinorUnits } from '../src/utils/money.js';

describe('ATLAS Money & Currency Precision Engine', () => {
  it('converts decimal amounts to exact integer minor units without float drift', () => {
    expect(toMinorUnits(100.5, 'USD')).toBe(10050n);
    expect(toMinorUnits('12500.00', 'USD')).toBe(1250000n);
    expect(toMinorUnits(50000, 'NGN')).toBe(5000000n);
    expect(toMinorUnits('0.99', 'EUR')).toBe(99n);
  });

  it('converts minor units back to decimal numbers correctly', () => {
    expect(fromMinorUnits(10050n, 'USD')).toBe(100.5);
    expect(fromMinorUnits(1250000n, 'USD')).toBe(12500);
    expect(fromMinorUnits(5000000n, 'NGN')).toBe(50000);
  });

  it('formats minor units with international currency symbols', () => {
    const usd = formatMoney(1250000n, 'USD');
    expect(usd).toContain('$12,500.00');

    const ngn = formatMoney(5000000n, 'NGN');
    expect(ngn).toContain('50,000.00');
  });
});

