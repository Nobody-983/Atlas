import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatMinorUnits, getStatusBadgeStyle, truncateAccount } from '../src/lib/formatters.js';

describe('ATLAS Frontend Formatters & Visual Helpers', () => {
  it('formats minor units accurately for international currencies', () => {
    expect(formatMinorUnits(1250000, 'USD')).toContain('$12,500.00');
    expect(formatMinorUnits('5000000', 'NGN')).toContain('50,000.00');
    expect(formatMinorUnits(48000000, 'KES')).toContain('480,000.00');
    expect(formatMinorUnits(380000, 'GBP')).toContain('3,800.00');
    expect(formatMinorUnits(420000, 'CAD')).toContain('4,200.00');
  });

  it('safely formats dates and timestamps', () => {
    const formatted = formatDate('2026-11-06T12:00:00Z');
    expect(formatted).not.toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('truncates sensitive bank account numbers with dots', () => {
    expect(truncateAccount('848291049001')).toBe('••• 9001');
    expect(truncateAccount('12345')).toBe('12345');
    expect(truncateAccount(undefined)).toBe('—');
  });

  it('maps financial and risk statuses to distinct theme badges', () => {
    const completed = getStatusBadgeStyle('completed');
    expect(completed.text).toBe('text-emerald-400');

    const blocked = getStatusBadgeStyle('blocked');
    expect(blocked.text).toBe('text-rose-400');

    const review = getStatusBadgeStyle('review_required');
    expect(review.text).toBe('text-amber-400');
  });
});

