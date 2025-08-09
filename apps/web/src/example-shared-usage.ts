
// Example: Using shared code in web app
import { API_CONFIG, COLORS, useApiCall, formatCurrency } from '@shared';

// Use shared constants
console.log('API Base URL:', API_CONFIG.BASE_URL);
console.log('Primary Color:', COLORS.primary);

// Use shared hooks
export function useSharedExample() {
  return useApiCall('/api/example');
}

// Use shared utilities
export function formatPrice(amount: number) {
  return formatCurrency(amount);
}
