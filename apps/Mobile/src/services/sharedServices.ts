
import { SharedApiService, SharedWebSocketService } from '@shared';
import { ReactNativeStorageAdapter } from './storageAdapter';

// Initialize shared services
export const storageAdapter = new ReactNativeStorageAdapter();

export const apiService = new SharedApiService('http://0.0.0.0:5000', storageAdapter);

export const websocketService = new SharedWebSocketService({
  url: 'ws://0.0.0.0:5000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
});

// Export shared hooks and utilities
export { useSharedAuth, useOrders, useNotifications } from '@shared';
