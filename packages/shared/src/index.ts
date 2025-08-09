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