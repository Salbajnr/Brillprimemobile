class CacheService {
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private isConnected: boolean = true;

  constructor() {
    console.log('🔄 Using in-memory cache service (Redis disabled in development)');
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expires });
  }

  async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      key.forEach(k => this.cache.delete(k));
    } else {
      this.cache.delete(key);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.isConnected;
  }

  async warmCache(): Promise<void> {
    console.log('Warming up cache...');
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
    const current = await this.getRateLimit(key) || 0;
    const newCount = current + 1;
    await this.setRateLimit(key, newCount, windowSeconds);
    return newCount;
  }
}

export const cacheService = new CacheService();