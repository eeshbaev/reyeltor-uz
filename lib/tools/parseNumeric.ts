export function parseNumericInput(value: string): number {
  const cleaned = value.replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Format a whole number with thousands separators for text inputs. */
export function formatIntegerInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(Math.round(value));
}

/** Format a decimal number (e.g. interest rate) for display. */
export function formatDecimalInput(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  return new Intl.NumberFormat('uz-UZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatToolNumber(value: number, currency: 'UZS' | 'USD', usdRate: number): string {
  if (currency === 'USD') {
    const usd = value / usdRate;
    return (
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: usd >= 1000 ? 0 : 2,
      }).format(usd)
    );
  }
  return new Intl.NumberFormat('uz-UZ').format(Math.round(value)) + ' UZS';
}
