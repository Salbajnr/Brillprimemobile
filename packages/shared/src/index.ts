
// Export all shared modules for cross-platform use
export * from './types';
export * from './api';
export * from './hooks';
export * from './constants';
export * from './utils';

// Export new modules
export * from './api/apiService';
export * from './websocket/websocketService';
export * from './storage/storageAdapter';
export * from './hooks/useApiCall';
export * from './validation/validators';
export * from './formatters/currency';

// Re-export commonly used items with convenient names
export { ApiClient as SharedApiClient } from './api';
export { ApiService as SharedApiService } from './api/apiService';
export { WebSocketService as SharedWebSocketService } from './websocket/websocketService';
export { StorageAdapter, WebStorageAdapter } from './storage/storageAdapter';
export { WebStorageAdapter } from './storage/webStorageAdapter';
export { NativeFileSyncService } from './api/nativeFileSync';
export { useAuth as useSharedAuth } from './hooks';
export { useApiCall } from './hooks/useApiCall';
export { validators, validateForm } from './validation/validators';
export { formatCurrency, formatNumber, parseCurrency } from './formatters/currency';
export { APP_CONFIG, COLORS, USER_ROLES, ORDER_STATUSES } from './constants';
export { 
  formatDate, 
  validateEmail, 
  getOrderStatusColor 
} from './utils';
