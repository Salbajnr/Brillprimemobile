import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache';

// Advanced caching middleware factory
export function createCacheMiddleware(options: {
  keyGenerator?: (req: Request) => string;
  ttl?: number;
  tags?: string[];
  varyOn?: string[];
  skipCache?: (req: Request) => boolean;
}) {
  const {
    keyGenerator = (req) => `${req.method}:${req.path}:${JSON.stringify(req.query)}`,
    ttl = 300, // 5 minutes default
    tags = [],
    varyOn = [],
    skipCache = () => false
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip cache for certain conditions
    if (skipCache(req) || req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    // Add vary headers to key if specified
    let finalKey = cacheKey;
    if (varyOn.length > 0) {
      const varyValues = varyOn.map(header => req.headers[header.toLowerCase()]).join(':');
      finalKey = `${cacheKey}:${varyValues}`;
    }

    try {
      // Check cache
      const cached = await cacheService.get(finalKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', finalKey);
        return res.json(JSON.parse(cached));
      }

      // Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(finalKey, JSON.stringify(data), ttl, tags).catch(console.error);
        }
        
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-TTL', ttl.toString());
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// User-specific cache middleware
export const userCache = createCacheMiddleware({
  keyGenerator: (req) => `user:${req.session?.userId}:${req.path}:${JSON.stringify(req.query)}`,
  ttl: 60, // 1 minute for user-specific data
  skipCache: (req) => !req.session?.userId
});

// Products cache with category variation
export const productsCache = createCacheMiddleware({
  keyGenerator: (req) => {
    const { category, search, page, limit } = req.query;
    return `products:${category || 'all'}:${search || ''}:${page || 1}:${limit || 20}`;
  },
  ttl: 300, // 5 minutes
  tags: ['products', 'categories']
});

// Analytics cache with role-based access
export const analyticsCache = createCacheMiddleware({
  keyGenerator: (req) => `analytics:${req.session?.userId}:${req.path}:${JSON.stringify(req.query)}`,
  ttl: 900, // 15 minutes
  skipCache: (req) => !req.session?.userId || !['ADMIN', 'MERCHANT'].includes(req.session?.userRole)
});

// Dashboard cache with personalization
export const dashboardCache = createCacheMiddleware({
  keyGenerator: (req) => `dashboard:${req.session?.userId}:${req.session?.userRole}`,
  ttl: 120, // 2 minutes for dashboard data
  skipCache: (req) => !req.session?.userId
});

// Location-based cache
export const locationCache = createCacheMiddleware({
  keyGenerator: (req) => {
    const { lat, lng, radius } = req.query;
    return `location:${lat}:${lng}:${radius || 10}`;
  },
  ttl: 600, // 10 minutes for location data
  varyOn: ['user-agent'] // Vary on device type
});

// API response compression and optimization
export const optimizeResponse = (req: Request, res: Response, next: NextFunction) => {
  // Add performance headers
  res.setHeader('X-Response-Time', Date.now().toString());
  
  // Enable browser caching for static content
  if (req.path.includes('/assets/') || req.path.includes('/images/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
  }
  
  // API responses caching
  if (req.path.startsWith('/api/')) {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes for GET APIs
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }

  next();
};

// Cache warming strategy
export class CacheWarmer {
  private static warmingInProgress = false;

  static async warmCache() {
    if (this.warmingInProgress) return;
    
    this.warmingInProgress = true;
    console.log('🔥 Starting cache warming...');

    try {
      // Warm popular routes
      await Promise.all([
        this.warmProducts(),
        this.warmCategories(),
        this.warmAnalytics(),
        this.warmLocation()
      ]);

      console.log('✅ Cache warming completed successfully');
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
    } finally {
      this.warmingInProgress = false;
    }
  }

  private static async warmProducts() {
    const cacheKey = 'products:all:::20';
    await cacheService.set(cacheKey, JSON.stringify({
      success: true,
      products: [],
      cached: true,
      warmed: true
    }), 300, ['products']);
  }

  private static async warmCategories() {
    const cacheKey = 'categories:all';
    await cacheService.set(cacheKey, JSON.stringify({
      success: true,
      categories: [],
      cached: true,
      warmed: true
    }), 600, ['categories']);
  }

  private static async warmAnalytics() {
    const cacheKey = 'analytics:overview';
    await cacheService.set(cacheKey, JSON.stringify({
      success: true,
      analytics: {
        totalUsers: 0,
        totalOrders: 0,
        revenue: 0
      },
      cached: true,
      warmed: true
    }), 900, ['analytics']);
  }

  private static async warmLocation() {
    // Warm popular city locations
    const popularCities = [
      { lat: 6.5244, lng: 3.3792 }, // Lagos
      { lat: 9.0765, lng: 7.3986 }, // Abuja
      { lat: 7.3775, lng: 3.9470 }  // Ibadan
    ];

    for (const city of popularCities) {
      const cacheKey = `location:${city.lat}:${city.lng}:10`;
      await cacheService.set(cacheKey, JSON.stringify({
        success: true,
        locations: [],
        cached: true,
        warmed: true
      }), 600, ['locations']);
    }
  }
}

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isSlowRequest = duration > 1000; // 1 second threshold
    
    if (isSlowRequest) {
      console.warn(`⚠️  Slow request detected: ${req.method} ${req.path} - ${duration}ms`, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        query: req.query
      });
    }

    // Set response time header
    res.setHeader('X-Response-Time', `${duration}ms`);
  });

  next();
};