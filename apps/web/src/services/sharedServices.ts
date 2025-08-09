
// Setup shared services for web app
import { SharedApiClient, API_CONFIG } from '@shared';
import { WebStorageAdapter } from './storageAdapter';

// Initialize shared services
export const storageAdapter = new WebStorageAdapter();

export const apiClient = new SharedApiClient({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Export for use in components
export { useSharedAuth, useOrders, useNotifications, useWebSocket } from '@shared';
