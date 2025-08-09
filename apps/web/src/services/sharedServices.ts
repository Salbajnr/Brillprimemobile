
// Re-export shared services for web app
export { 
  ApiService,
  WebSocketService,
  WebSocketClient,
  createWebSocketClient,
  StorageAdapter,
  WebStorageAdapter,
  useApiCall,
  validateEmail,
  validatePassword,
  formatCurrency 
} from '@shared';

// Web-specific service configurations
import { WebStorageAdapter } from '@shared';

export const webStorage = new WebStorageAdapter();
export const webSocketUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
