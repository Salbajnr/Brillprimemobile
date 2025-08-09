// Core exports
export * from './types';
export * from './api';
export * from './hooks';
export * from './constants';
export * from './utils';

// API Services
export { ApiService } from './api/apiService';
export { NativeFileSyncService } from './api/nativeFileSync';

// WebSocket Services
export { WebSocketService } from './websocket/websocketService';
export { WebSocketClient, createWebSocketClient, useWebSocket } from './websocket/websocketClient';
export type { WebSocketConfig, WebSocketMessage } from './websocket/websocketClient';

// Storage Services
export { StorageAdapter } from './storage/storageAdapter';
export { WebStorageAdapter } from './storage/webStorageAdapter';

// Hooks
export { useApiCall } from './hooks/useApiCall';
export { useAuth } from './hooks';

// Validation
export { validators, validateForm } from './validation/validators';
export { validateEmail, validatePassword } from './validation/validators';

// Formatters
export { formatCurrency, formatNumber, parseCurrency } from './formatters/currency';

// Constants
export { APP_CONFIG, COLORS, USER_ROLES, ORDER_STATUSES } from './constants';

// Utils
export { formatDate, getOrderStatusColor } from './utils';

// Convenient aliases for backward compatibility
export { ApiService as SharedApiService } from './api/apiService';
export { WebSocketService as SharedWebSocketService } from './websocket/websocketService';
export { useAuth as useSharedAuth } from './hooks';

// Export everything from shared packages
export * from './api/apiService';
export * from './api/nativeFileSync';
export * from './websocket/websocketClient';
export * from './websocket/websocketService';
export * from './storage/storageAdapter';
export * from './storage/webStorageAdapter';
export * from './hooks/useApiCall';
export * from './hooks/useAuth';
export * from './hooks/useOrders';
export * from './hooks/useProducts';
export * from './validation/validators';
export * from './formatters/currency';

// Re-export types
export * from './types';

// Export default configurations
export { APP_CONFIG } from './constants';

// Create convenient service aliases for backward compatibility
export { WebSocketService as WebSocketClient } from './websocket/websocketService';
export { createWebSocketClient, useWebSocket } from './websocket/websocketClient';

// Export validators with convenient names
export { 
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired
} from './validation/validators';

// Export formatters
export { formatCurrency } from './formatters/currency';