export function formatToDollar(number) {
  const num = Number(number);
  if (!num || num === 0) return '$0';
  if (num < 0.01) return '< $0.01';

  const formatted = num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatted;
}
