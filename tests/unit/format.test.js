import { test, expect, describe } from 'bun:test';
import { formatToDollar } from '../../renderer/utils/format';

describe('formatToDollar', () => {
  test('returns $0 for zero', () => {
    expect(formatToDollar(0)).toBe('$0');
    expect(formatToDollar('0')).toBe('$0');
  });

  test('returns < $0.01 for very small values', () => {
    expect(formatToDollar(0.001)).toBe('< $0.01');
    expect(formatToDollar(0.009)).toBe('< $0.01');
  });

  test('formats small dollar amounts', () => {
    expect(formatToDollar(0.01)).toBe('$0.01');
    expect(formatToDollar(1.5)).toBe('$1.50');
    expect(formatToDollar(99.99)).toBe('$99.99');
  });

  test('formats thousands with commas', () => {
    expect(formatToDollar(1000)).toBe('$1,000.00');
    expect(formatToDollar(12345.67)).toBe('$12,345.67');
    expect(formatToDollar(1000000)).toBe('$1,000,000.00');
  });

  test('handles string input', () => {
    expect(formatToDollar('1234.56')).toBe('$1,234.56');
  });

  test('handles null/undefined as zero', () => {
    expect(formatToDollar(null)).toBe('$0');
    expect(formatToDollar(undefined)).toBe('$0');
  });

  test('rounds to two decimal places', () => {
    expect(formatToDollar(1.999)).toBe('$2.00');
    expect(formatToDollar(1.005)).toBe('$1.01');
  });
});
