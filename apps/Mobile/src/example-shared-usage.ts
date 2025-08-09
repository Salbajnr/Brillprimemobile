// Example: Using shared code in mobile app
import {
  SharedApiService,
  SharedWebSocketService,
  useApiCall,
  validators,
  formatCurrency,
  APP_CONFIG
} from '@shared';
import { ReactNativeStorageAdapter } from './services/storageAdapter';

// Initialize services
const storageAdapter = new ReactNativeStorageAdapter();
const apiService = new SharedApiService('http://0.0.0.0:5000', storageAdapter);
const websocketService = new SharedWebSocketService({
  url: 'ws://0.0.0.0:5000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
});

// Use shared constants
console.log('API Base URL:', APP_CONFIG.api.baseUrl);

// Use shared hooks (works with React Native)
export function useSharedExample() {
  return useApiCall(() => apiService.getProducts());
}

// Use shared utilities
export function formatPrice(amount: number) {
  return formatCurrency(amount);
}

// Use shared validation
export function validateUserInput(email: string, password: string) {
  const emailValidation = validators.email(email);
  const passwordValidation = validators.password(password);

  return {
    isValid: emailValidation.isValid && passwordValidation.isValid,
    errors: [...emailValidation.errors, ...passwordValidation.errors],
  };
}

// Example WebSocket usage
export function initializeWebSocket() {
  websocketService.onConnect(() => {
    console.log('WebSocket connected');
  });

  websocketService.onMessage('order_update', (data) => {
    console.log('Order update received:', data);
  });

  websocketService.connect();
}