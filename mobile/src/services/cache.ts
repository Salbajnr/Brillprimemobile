
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class MobileCacheService {
  private static instance: MobileCacheService;
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxCacheSize = 50 * 1024 * 1024; // 50MB

  static getInstance(): MobileCacheService {
    if (!this.instance) {
      this.instance = new MobileCacheService();
    }
    return this.instance;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const expiresAt = Date.now() + (ttl || this.defaultTTL);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt,
      };

      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      if (Date.now() > entry.expiresAt) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async optimizeCacheSize(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      // Get all cache entries with their sizes
      const entries: Array<{ key: string; size: number; timestamp: number }> = [];
      
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const entry: CacheEntry<any> = JSON.parse(value);
          entries.push({
            key,
            size: new Blob([value]).size,
            timestamp: entry.timestamp,
          });
        }
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      let totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

      // Remove oldest entries if cache is too large
      while (totalSize > this.maxCacheSize && entries.length > 0) {
        const oldestEntry = entries.shift()!;
        await AsyncStorage.removeItem(oldestEntry.key);
        totalSize -= oldestEntry.size;
      }

      console.log(`📦 Cache optimized: ${entries.length} entries, ${Math.round(totalSize / 1024)}KB`);
    } catch (error) {
      console.error('Cache optimization error:', error);
    }
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      let totalSize = 0;
      let oldestEntry = Date.now();
      let newestEntry = 0;

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const entry: CacheEntry<any> = JSON.parse(value);
          totalSize += new Blob([value]).size;
          oldestEntry = Math.min(oldestEntry, entry.timestamp);
          newestEntry = Math.max(newestEntry, entry.timestamp);
        }
      }

      return {
        totalEntries: cacheKeys.length,
        totalSize,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: 0,
        newestEntry: 0,
      };
    }
  }
}

export const mobileCacheService = MobileCacheService.getInstance();
export default mobileCacheService;
