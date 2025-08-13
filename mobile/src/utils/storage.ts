
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileConfig } from '../shared/config';

class MobileStorageService {
  private prefix = 'brillprime_';

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(this.getKey(key), jsonValue);
    } catch (error) {
      console.error('Error storing data:', error);
      throw new Error('Failed to store data');
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(this.getKey(key));
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Error removing data:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => key.startsWith(this.prefix));
      await AsyncStorage.multiRemove(appKeys);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  async getUserSession() {
    return this.getItem(mobileConfig.storageKeys.userSession);
  }

  async setUserSession(session: any) {
    return this.setItem(mobileConfig.storageKeys.userSession, session);
  }

  async removeUserSession() {
    return this.removeItem(mobileConfig.storageKeys.userSession);
  }

  async getUserPreferences() {
    return this.getItem(mobileConfig.storageKeys.userPreferences) || {};
  }

  async setUserPreferences(preferences: any) {
    return this.setItem(mobileConfig.storageKeys.userPreferences, preferences);
  }

  async getCachedData(key: string) {
    const cached = await this.getItem(`cached_${key}`);
    if (cached && cached.timestamp && 
        Date.now() - cached.timestamp < mobileConfig.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  async setCachedData(key: string, data: any) {
    return this.setItem(`cached_${key}`, {
      data,
      timestamp: Date.now(),
    });
  }
}

export const storageService = new MobileStorageService();
export default storageService;
