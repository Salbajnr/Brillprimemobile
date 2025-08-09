
// Example: Using shared code in web app
import { 
  SharedApiService, 
  SharedWebSocketService, 
  WebStorageAdapter,
  useApiCall,
  validators,
  formatCurrency,
  APP_CONFIG 
} from '@shared';

// Initialize services
const storageAdapter = new WebStorageAdapter();
const apiService = new SharedApiService('http://0.0.0.0:5000', storageAdapter);
const websocketService = new SharedWebSocketService({
  url: 'ws://0.0.0.0:5000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
});

// Use shared constants
console.log('API Base URL:', APP_CONFIG.api.baseUrl);

// Use shared hooks (works with React)
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
