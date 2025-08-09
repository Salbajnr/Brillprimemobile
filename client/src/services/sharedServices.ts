
// Re-export shared services for web app
export { 
  ApiService,
  WebSocketService,
  WebSocketClient,
  createWebSocketClient,
  useWebSocket,
  StorageAdapter,
  WebStorageAdapter,
  useApiCall,
  validateEmail,
  validatePassword,
  formatCurrency,
  APP_CONFIG
} from '@shared';

// Web-specific service configurations
import { WebStorageAdapter, ApiService, WebSocketService } from '@shared';

export const webStorage = new WebStorageAdapter();
export const apiService = new ApiService('http://0.0.0.0:5000', webStorage);
export const websocketService = new WebSocketService({
  url: import.meta.env.VITE_WS_URL || 'ws://0.0.0.0:5000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5
});

export const webSocketUrl = import.meta.env.VITE_WS_URL || 'ws://0.0.0.0:5000';
