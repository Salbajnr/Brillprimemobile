
// Re-export shared services for mobile app
export { 
  ApiService,
  WebSocketService,
  StorageAdapter,
  useApiCall,
  validateEmail,
  validatePassword,
  formatCurrency 
} from '@shared';

// Mobile-specific configurations
export const mobileWebSocketUrl = 'ws://localhost:8000';
