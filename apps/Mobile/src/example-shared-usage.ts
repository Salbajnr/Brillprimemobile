
// Example: Using shared code in mobile app
import {
  ApiService,
  WebSocketService,
  useApiCall,
  validators,
  formatCurrency,
  APP_CONFIG
} from '@shared';

// For React Native, you'll need a platform-specific storage adapter
// This is a placeholder - implement based on AsyncStorage or SecureStore
class ReactNativeStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    // Implement with AsyncStorage or SecureStore
    return null;
  }
  
  async setItem(key: string, value: string): Promise<void> {
    // Implement with AsyncStorage or SecureStore
  }
  
  async removeItem(key: string): Promise<void> {
    // Implement with AsyncStorage or SecureStore
  }
}

// Initialize services
const storageAdapter = new ReactNativeStorageAdapter();
const apiService = new ApiService('http://0.0.0.0:5000', storageAdapter);
const websocketService = new WebSocketService({
  url: 'ws://0.0.0.0:5000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
});

// Use shared constants
console.log('API Base URL:', APP_CONFIG.api.baseUrl);

// Use shared hooks (works with React Native)
export function useSharedExample() {
  return useApiCall(() => mobileApiService.getProducts());
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
