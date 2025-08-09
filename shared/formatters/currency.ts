
export interface CurrencyOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatCurrency(
  amount: number,
  options: CurrencyOptions = {}
): string {
  const {
    currency = 'NGN',
    locale = 'en-NG',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported locales
    return `₦${amount.toFixed(2)}`;
  }
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  };

  try {
    return new Intl.NumberFormat('en-NG', { ...defaultOptions, ...options }).format(value);
  } catch (error) {
    return value.toString();
  }
}

export function parseCurrency(currencyString: string): number {
  // Remove currency symbols and formatting
  const cleanString = currencyString.replace(/[₦,\s]/g, '');
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
}
