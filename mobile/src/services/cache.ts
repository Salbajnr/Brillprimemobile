
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePerformance } from '../hooks/usePerformance';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiryTime: number;
}

class MobileCacheService {
  private memoryCache = new Map<string, any>();
  private maxMemoryCacheSize = 100;

  constructor() {
    this.optimizeCacheSize();
  }

  private async optimizeCacheSize() {
    const { getOptimalCacheSize } = usePerformance();
    this.maxMemoryCacheSize = getOptimalCacheSize();
  }

  async set<T>(key: string, data: T, ttl: number = 300000): Promise<void> {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiryTime: Date.now() + ttl
    };

    // Store in memory cache for quick access
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(key, item);

    // Store in persistent storage
    try {
      await AsyncStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to store in persistent cache:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key) as CacheItem<T>;
      if (Date.now() < item.expiryTime) {
        return item.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check persistent storage
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const item: CacheItem<T> = JSON.parse(stored);
        if (Date.now() < item.expiryTime) {
          // Add back to memory cache
          this.memoryCache.set(key, item);
          return item.data;
        } else {
          // Expired, remove from storage
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Failed to get from persistent cache:', error);
    }

    return null;
  }

  async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from persistent cache:', error);
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  // Performance-aware caching for API responses
  async cacheApiResponse(endpoint: string, data: any, customTtl?: number): Promise<void> {
    const { shouldReduceQuality } = usePerformance();
    
    // Reduce cache TTL on slower devices to save memory
    const ttl = customTtl || (shouldReduceQuality() ? 180000 : 300000); // 3 or 5 minutes
    await this.set(`api_${endpoint}`, data, ttl);
  }

  async getCachedApiResponse<T>(endpoint: string): Promise<T | null> {
    return this.get<T>(`api_${endpoint}`);
  }

  // Image caching with performance optimization
  async cacheImage(url: string, base64Data: string): Promise<void> {
    const { getOptimalCacheSize } = usePerformance();
    const maxSize = getOptimalCacheSize();
    
    // Only cache if we have sufficient space
    if (this.memoryCache.size < maxSize * 0.8) {
      await this.set(`image_${url}`, base64Data, 3600000); // 1 hour
    }
  }

  async getCachedImage(url: string): Promise<string | null> {
    return this.get<string>(`image_${url}`);
  }
}

export const mobileCacheService = new MobileCacheService();
