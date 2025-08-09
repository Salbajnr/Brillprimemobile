
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage adapter for React Native
export class ReactNativeStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get item from storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to set item in storage:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item from storage:', error);
      throw error;
    }
  }
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAdapter } from '@shared';

export class ReactNativeStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async multiRemove(keys: string[]): Promise<void> {
    await AsyncStorage.multiRemove(keys);
  }

  async getAllKeys(): Promise<string[]> {
    return AsyncStorage.getAllKeys();
  }

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  }
}
