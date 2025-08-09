
<old_str>// Setup shared services for web app
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
export { useSharedAuth, useOrders, useNotifications, useWebSocket } from '@shared';</old_str>
<new_str>// Setup shared services for web app
import { 
  SharedApiService, 
  SharedWebSocketService, 
  WebStorageAdapter,
  NativeFileSyncService,
  APP_CONFIG 
} from '@shared';

// Initialize shared services
export const storageAdapter = new WebStorageAdapter();

export const apiService = new SharedApiService(APP_CONFIG.api.baseUrl, storageAdapter);

export const websocketService = new SharedWebSocketService({
  url: `ws://${window.location.host}`,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
});

export const nativeFileSyncService = new NativeFileSyncService(apiService);

// Export for use in components
export { useSharedAuth, useApiCall } from '@shared';</new_str>
