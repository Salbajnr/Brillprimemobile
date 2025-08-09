
// Re-export shared services for mobile app
export { 
  ApiService,
  WebSocketService,
  StorageAdapter,
  useApiCall,
  validateEmail,
  validatePassword,
  formatCurrency,
  APP_CONFIG
} from '@shared';

// Mobile-specific configurations
import { ApiService, WebSocketService } from '@shared';

// Note: StorageAdapter will need platform-specific implementation
export const mobileApiService = new ApiService('http://0.0.0.0:5000');
export const mobileWebSocketService = new WebSocketService({
  url: 'ws://0.0.0.0:5000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5
});

export const mobileWebSocketUrl = 'ws://0.0.0.0:5000';
