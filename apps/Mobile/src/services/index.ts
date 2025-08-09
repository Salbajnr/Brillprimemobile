
// Re-export shared services for mobile app
export { 
  ApiService,
  WebSocketService,
  StorageAdapter,
  useApiCall,
  useAuth,
  useOrders,
  useProducts,
  validateEmail,
  validatePassword,
  formatCurrency,
  APP_CONFIG
} from '@shared';

// Mobile-specific configurations
import { ApiService, WebSocketService, StorageAdapter } from '@shared';

// React Native storage adapter implementation
class AsyncStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('AsyncStorage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('AsyncStorage multiRemove error:', error);
    }
  }
}

export const mobileStorage = new AsyncStorageAdapter();
export const mobileApiService = new ApiService('http://0.0.0.0:5000', mobileStorage);
export const mobileWebSocketService = new WebSocketService({
  url: 'ws://0.0.0.0:5000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5
});

export const mobileWebSocketUrl = 'ws://0.0.0.0:5000';
