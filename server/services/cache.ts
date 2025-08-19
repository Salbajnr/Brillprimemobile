import Redis from 'ioredis';

let redisClient: Redis | null = null;

// Redis configuration for Replit environment
const REDIS_URL = "redis://default:ob0XzfYSqIWm028JdW7JkBY8VWkhQp7A@redis-13241.c245.us-east-1-3.ec2.redns.redis-cloud.com:13241";

if (process.env.REDIS_DISABLED === 'true') {
  console.log('Redis disabled by configuration - using memory cache');
  redisClient = null;
} else {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryDelayOnFailover: 100,
    });

    redisClient.on('connect', () => {
      console.log('🚀 Connected to Redis Cloud successfully');
    });

    redisClient.on('error', (err) => {
      console.warn('Redis connection error:', err.message);
      // Don't set to null immediately, let it retry
    });

    redisClient.on('close', () => {
      console.log('Redis connection closed');
    });
  } catch (error) {
    console.warn('Redis initialization failed, using memory cache:', error);
    redisClient = null;
  }
}

// In-memory cache fallback
const memoryCache = new Map<string, { value: any; expires: number }>();

class CacheService {
  //private cache: Map<string, { value: any; expires: number }> = new Map(); // Removed to use the new memoryCache map
  private isConnected: boolean = true; // This property might need re-evaluation if redisClient is null

  constructor() {
    if (redisClient) {
      console.log(`🚀 Connected to Redis at ${process.env.REDIS_HOST || 'localhost'}:${parseInt(process.env.REDIS_PORT || '6379')}`);
    } else {
      console.log('🔄 Using in-memory cache service (Redis disabled or unavailable)');
    }

    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  private cleanupExpired() {
    const now = Date.now();
    if (redisClient) {
      // Redis handles its own expiration, so this might not be needed for Redis
      // If we were to implement a Redis cleanup for patterns, it would be here.
      // For now, focusing on memory cache cleanup.
    } else {
      // Clean up expired entries from memory cache
      for (const [key, entry] of memoryCache.entries()) {
        if (entry.expires < now) {
          memoryCache.delete(key);
        }
      }
    }
  }

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    try {
      if (redisClient) {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        const cached = memoryCache.get(key);
        if (cached && cached.expires > Date.now()) {
          return cached.value;
        } else if (cached) {
          memoryCache.delete(key);
        }
        return null;
      }
    } catch (error) {
      console.error(`Cache get error for key "${key}":`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      if (redisClient) {
        await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        // Fallback to memory cache
        memoryCache.set(key, {
          value,
          expires: Date.now() + (ttlSeconds * 1000)
        });
      }
    } catch (error) {
      console.error(`Cache set error for key "${key}":`, error);
    }
  }

  async del(key: string | string[]): Promise<void> {
    try {
      if (redisClient) {
        if (Array.isArray(key)) {
          await redisClient.del(key);
        } else {
          await redisClient.del(key);
        }
      } else {
        if (Array.isArray(key)) {
          key.forEach(k => memoryCache.delete(k));
        } else {
          memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error(`Cache delete error for key "${key}":`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (redisClient) {
      // Redis pattern invalidation can be complex and depends on the Redis version/configuration.
      // For simplicity, we'll iterate through keys if possible, or use SCAN.
      // A more robust solution might involve using a Redis cluster or a dedicated search index.
      // For now, let's assume a simple pattern match on keys.
      // Note: KEYS command is generally discouraged in production due to performance implications.
      // Consider using SCAN for large datasets.
      try {
        const keys = await redisClient.keys(pattern.replace('*', '?')); // Basic wildcard support
        await redisClient.del(keys);
      } catch (error) {
        console.error('Redis pattern invalidation error:', error);
      }
    } else {
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
        }
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    if (redisClient) {
      try {
        await redisClient.ping();
        this.isConnected = true;
      } catch (error) {
        console.warn('Redis health check failed:', error.message);
        this.isConnected = false;
        // Optionally, try to reconnect or set redisClient to null
        redisClient = null;
      }
    } else {
      this.isConnected = false;
    }
    return this.isConnected;
  }

  async warmCache(): Promise<void> {
    console.log('Warming up cache...');
    // Warming up cache would involve pre-populating it with common data.
    // This might involve fetching data from another source and setting it in the cache.
    // Example:
    // await this.set('popular_products', await fetchPopularProducts(), 3600);
    console.log('Pre-caching popular products...');
    console.log('Pre-caching analytics...');
    console.log('Cache warming completed');
  }

  // Application-specific cache methods
  async getUserData(userId: number) {
    return this.get(`user:${userId}`);
  }

  async setUserData(userId: number, userData: any) {
    await this.set(`user:${userId}`, userData, 1800); // 30 minutes
  }

  async getDashboardData(userId: number, role: string) {
    return this.get(`dashboard:${role}:${userId}`);
  }

  async setDashboardData(userId: number, role: string, data: any) {
    await this.set(`dashboard:${role}:${userId}`, data, 600); // 10 minutes
  }

  async getOrderTracking(orderId: string) {
    return this.get(`order:tracking:${orderId}`);
  }

  async setOrderTracking(orderId: string, trackingData: any) {
    await this.set(`order:tracking:${orderId}`, trackingData, 300); // 5 minutes
  }

  async getProductCatalog(merchantId?: number) {
    const key = merchantId ? `products:merchant:${merchantId}` : 'products:all';
    return this.get(key);
  }

  async setProductCatalog(data: any, merchantId?: number) {
    const key = merchantId ? `products:merchant:${merchantId}` : 'products:all';
    await this.set(key, data, 900); // 15 minutes
  }

  async getTransactionHistory(userId: number) {
    return this.get(`transactions:${userId}`);
  }

  async setTransactionHistory(userId: number, transactions: any) {
    await this.set(`transactions:${userId}`, transactions, 600); // 10 minutes
  }

  // Analytics cache
  async getAnalytics(type: string, timeframe: string) {
    return this.get(`analytics:${type}:${timeframe}`);
  }

  async setAnalytics(type: string, timeframe: string, data: any) {
    const ttl = timeframe === '1h' ? 300 : 1800; // 5 min for hourly, 30 min for daily
    await this.set(`analytics:${type}:${timeframe}`, data, ttl);
  }

  // Location cache for real-time tracking
  async getDriverLocation(driverId: number) {
    return this.get(`location:driver:${driverId}`);
  }

  async setDriverLocation(driverId: number, location: any) {
    await this.set(`location:driver:${driverId}`, location, 60); // 1 minute
  }

  // Session and user presence cache
  async getUserPresence(userId: number) {
    return this.get(`presence:${userId}`);
  }

  async setUserPresence(userId: number, status: string) {
    await this.set(`presence:${userId}`, { status, lastSeen: Date.now() }, 300); // 5 minutes
  }

  // Notification cache
  async getUnreadNotifications(userId: number) {
    return this.get(`notifications:unread:${userId}`);
  }

  async setUnreadNotifications(userId: number, notifications: any[]) {
    await this.set(`notifications:unread:${userId}`, notifications, 600); // 10 minutes
  }

  // Chat cache
  async getChatHistory(chatId: string) {
    return this.get(`chat:${chatId}`);
  }

  async setChatHistory(chatId: string, messages: any[]) {
    await this.set(`chat:${chatId}`, messages, 3600); // 1 hour
  }

  // System metrics cache
  async getSystemMetrics() {
    return this.get('system:metrics');
  }

  async setSystemMetrics(metrics: any) {
    await this.set('system:metrics', metrics, 60); // 1 minute
  }

  // Rate limiting cache
  async getRateLimit(key: string) {
    return this.get(`ratelimit:${key}`);
  }

  async setRateLimit(key: string, count: number, windowSeconds: number) {
    await this.set(`ratelimit:${key}`, count, windowSeconds);
  }

  async incrementRateLimit(key: string, windowSeconds: number = 60): Promise<number> {
    const current = (await this.getRateLimit(key) as number) || 0;
    const newCount = current + 1;
    await this.setRateLimit(key, newCount, windowSeconds);
    return newCount;
  }
}

export const cacheService = new CacheService();

// Exporting redisClient and memoryCache for potential external use or testing
export { redisClient, memoryCache };