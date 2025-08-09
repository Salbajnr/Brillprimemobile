import { Platform } from './platform'

/**
 * Cross-platform storage abstraction
 */
export class Storage {
  private static async getWebStorage(): Promise<globalThis.Storage> {
    if (typeof window === 'undefined') {
      throw new Error('Web storage not available')
    }
    return window.localStorage
  }
  
  private static async getNativeStorage(): Promise<any> {
    if (Platform.isWeb) {
      throw new Error('Native storage not available on web')
    }
    
    // For React Native, AsyncStorage would be imported in the mobile app
    // This is a placeholder that will be properly implemented in React Native environment
    throw new Error('AsyncStorage not configured - implement in React Native app');
  }
  
  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.isWeb) {
      const storage = await this.getWebStorage()
      storage.setItem(key, value)
    } else {
      const storage = await this.getNativeStorage()
      await storage.setItem(key, value)
    }
  }
  
  static async getItem(key: string): Promise<string | null> {
    if (Platform.isWeb) {
      const storage = await this.getWebStorage()
      return storage.getItem(key)
    } else {
      const storage = await this.getNativeStorage()
      return await storage.getItem(key)
    }
  }
  
  static async removeItem(key: string): Promise<void> {
    if (Platform.isWeb) {
      const storage = await this.getWebStorage()
      storage.removeItem(key)
    } else {
      const storage = await this.getNativeStorage()
      await storage.removeItem(key)
    }
  }
  
  static async clear(): Promise<void> {
    if (Platform.isWeb) {
      const storage = await this.getWebStorage()
      storage.clear()
    } else {
      const storage = await this.getNativeStorage()
      await storage.clear()
    }
  }
  
  // Convenience methods for JSON storage
  static async setObject(key: string, value: any): Promise<void> {
    await this.setItem(key, JSON.stringify(value))
  }
  
  static async getObject<T = any>(key: string): Promise<T | null> {
    const value = await this.getItem(key)
    if (!value) return null
    
    try {
      return JSON.parse(value) as T
    } catch (error) {
      console.warn(`Failed to parse stored object for key "${key}":`, error)
      return null
    }
  }
}