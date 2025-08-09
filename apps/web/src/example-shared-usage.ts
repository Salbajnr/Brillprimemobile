
// Example: Using shared code in web app
import { 
  ApiService,
  WebSocketService, 
  WebSocketClient,
  createWebSocketClient,
  useWebSocket,
  useApiCall,
  validators,
  formatCurrency,
  APP_CONFIG,
  NativeFileSyncService,
  WebStorageAdapter
} from '@shared';

// Initialize services
const storageAdapter = new WebStorageAdapter();
const apiService = new ApiService('http://0.0.0.0:5000', storageAdapter);
const websocketService = new WebSocketService({
  url: 'ws://0.0.0.0:5000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
});
const nativeFileSyncService = new NativeFileSyncService('http://0.0.0.0:5000');

// Use shared constants
console.log('API Base URL:', APP_CONFIG.api.baseUrl);

// Use shared hooks (works with React)
export function useSharedExample() {
  return useApiCall(() => apiService.get('/api/products'));
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

// Example file sync usage
export async function syncFiles() {
  const files = await nativeFileSyncService.getFileList();
  console.log('Available files:', files);
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

// Example WebSocket hook usage
export function useWebSocketExample() {
  const { client, connected, send, subscribe, unsubscribe } = useWebSocket({
    url: 'ws://0.0.0.0:5000'
  });

  return {
    client,
    connected,
    sendMessage: (message: any) => send({ type: 'message', payload: message }),
    subscribe,
    unsubscribe
  };
}
