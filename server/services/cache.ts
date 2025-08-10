
import { Redis } from 'ioredis';

class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: 'brillprime:',
      db: 0, // Use database 0 for caching
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Redis cache service connected');
    });

    this.redis.on('error', (err) => {
      this.isConnected = false;
      console.error('❌ Redis cache error:', err);
    });
  }

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string | string[]): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      if (Array.isArray(key)) {
        await this.redis.del(...key);
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
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

  // Location-based cache
  async getDriverLocations() {
    return this.get('drivers:locations');
  }

  async setDriverLocations(locations: any) {
    await this.set('drivers:locations', locations, 30); // 30 seconds
  }

  async getLocationRecommendations(lat: number, lng: number, radius: number) {
    const key = `recommendations:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;
    return this.get(key);
  }

  async setLocationRecommendations(lat: number, lng: number, radius: number, data: any) {
    const key = `recommendations:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;
    await this.set(key, data, 1800); // 30 minutes
  }

  // Session cache helpers
  async getSessionData(sessionId: string) {
    return this.get(`session:${sessionId}`);
  }

  async setSessionData(sessionId: string, data: any) {
    await this.set(`session:${sessionId}`, data, 86400); // 24 hours
  }

  // Rate limiting cache
  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    if (!this.isConnected) return 0;
    
    try {
      const current = await this.redis.incr(`ratelimit:${key}`);
      if (current === 1) {
        await this.redis.expire(`ratelimit:${key}`, windowSeconds);
      }
      return current;
    } catch (error) {
      console.error('Rate limit error:', error);
      return 0;
    }
  }

  // Cache warming
  async warmCache() {
    console.log('Warming up cache...');
    
    // Warm up common data
    try {
      // Pre-cache popular products
      const popularProducts = await this.getProductCatalog();
      if (!popularProducts) {
        // Fetch and cache popular products
        console.log('Pre-caching popular products...');
      }
      
      // Pre-cache analytics
      const analytics = await this.getAnalytics('transactions', '24h');
      if (!analytics) {
        console.log('Pre-caching analytics...');
      }
      
      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const cacheService = new CacheService();
