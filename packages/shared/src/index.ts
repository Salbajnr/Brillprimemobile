
// Export all shared modules for cross-platform use
export * from './types';
export * from './api';
export * from './hooks';
export * from './constants';
export * from './utils';

// Re-export commonly used items with convenient names
export { ApiClient as SharedApiClient } from './api';
export { useAuth as useSharedAuth } from './hooks';
export { APP_CONFIG, COLORS, USER_ROLES, ORDER_STATUSES } from './constants';
export { 
  formatCurrency, 
  formatDate, 
  validateEmail, 
  getOrderStatusColor 
} from './utils';
